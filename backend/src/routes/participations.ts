import { mkdir, rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { Buffer } from 'node:buffer'

import { type SessionUser } from '../auth/auth.ts'
import { puedeEntrarAlPanel } from '../auth/roles.ts'
import { sql } from '../db/pool.ts'
import {
  MAX_FILE_BYTES,
  MAX_TOTAL_BYTES,
  MAX_UPLOAD_FILES,
  validarAdjunto,
} from '../files/limits.ts'
import { acortarNombre, nombreEnDisco, sanitizarNombre } from '../files/nombres.ts'
import { leerEstadoConsulta, type EtapaConsulta } from '../services/consulta.ts'
import type { Alcance } from '../services/participacion-campos.ts'
import { validateUpload } from '../services/upload-guard.ts'
import { firmarAcuse } from '../services/acuse-token.ts'
import {
  escribirPdf,
  guardarDocumento,
  validarPdf,
  type ResultadoPdf,
} from '../services/documentos-participacion.ts'
import { marcarFormatoRecibido, obtenerFormato, type Formato } from '../services/formatos.ts'
import { nextFolio } from '../services/folio.ts'
import { ingestParticipation, type IngestFile } from '../services/ingest.ts'
import { enviarAcuseReciboParticipacion, mailConfigurado } from '../services/mail.ts'
import {
  camposDelFormulario,
  createParticipation,
  VERSION_AVISO_POR_OMISION,
  type Origen,
} from '../services/participations.ts'
import { json, bodyTooLarge, logger } from '../utils.ts'
import { esUuid } from './ruta.ts'

const UPLOAD_DIR = join(process.cwd(), 'uploads')

const MENSAJE_SIN_RECEPCION: Record<EtapaConsulta, string> = {
  pendiente: 'La consulta pública aún no inicia: todavía no se reciben participaciones',
  abierta: '',
  concluida: 'La consulta pública concluyó: ya no se reciben participaciones nuevas',
}

function isOrigen(value: string): value is Origen {
  return value === 'digital' || value === 'fisica'
}

/**
 * Handler atómico para POST /api/participations:
 *  - Valida consentimiento ciudadano
 *  - Aplica límites y whitelist por magic bytes a cada archivo
 *  - Ejecuta creación, persistencia de adjuntos y vectorización en una transacción
 *  - En caso de error: rollback en BD y borrado de archivos escritos en disco
 *  - Envío de acuse por correo fire-and-forget post-commit
 */
export async function handleCreateParticipation(
  request: Request,
  user: SessionUser | null,
  /** Etapa de la consulta; las pruebas pasan la suya en vez de leer la configuración. */
  leerEtapa: () => Promise<EtapaConsulta> = async () => (await leerEstadoConsulta()).etapa,
): Promise<Response> {
  if (bodyTooLarge(request, MAX_TOTAL_BYTES + 1024 * 1024)) {
    return json({ error: 'El cuerpo de la petición excede el tamaño máximo permitido' }, 413)
  }

  let form: FormData
  try {
    form = await request.formData()
  } catch {
    return json({ error: 'Formulario inválido' }, 400)
  }
  const validado = camposDelFormulario(form)
  if (!validado.ok) return json({ error: validado.error }, 422)
  const campos = validado.campos
  const origin = String(form.get('origen') ?? 'digital') as Origen
  if (!isOrigen(origin)) {
    return json({ error: 'origen inválido' }, 400)
  }

  // La participación física solo la crea un admin autenticado
  if (origin === 'fisica' && !puedeEntrarAlPanel(user?.role)) {
    return json({ error: 'Requiere rol admin' }, 403)
  }

  // Un formato que se imprimió para llenar a mano y ya regresó se registra con el
  // folio que ya tiene: no genera uno nuevo.
  const formatoId = String(form.get('formato_id') ?? '').trim()
  let formato: Formato | null = null
  let escaneado: Extract<ResultadoPdf, { ok: true }> | null = null
  if (formatoId) {
    if (origin !== 'fisica') {
      return json({ error: 'Solo una participación presencial puede venir de un formato' }, 400)
    }
    if (!esUuid(formatoId)) return json({ error: 'Formato inválido' }, 400)
    formato = await obtenerFormato(formatoId)
    if (!formato) return json({ error: 'El formato no existe' }, 404)
    if (!formato.pendiente) {
      return json(
        {
          error: `El formato ${formato.folio} ya se registró como participación`,
          folio: formato.folio,
        },
        409,
      )
    }
    // El formato escaneado es la constancia del escrito de puño y letra: sin él
    // no se registra, porque quedaría una participación sin su documento.
    const archivo = form.get('escaneado')
    if (!(archivo instanceof File) || archivo.size === 0) {
      return json({ error: 'Carga el formato escaneado en PDF' }, 422)
    }
    const pdf = await validarPdf(archivo)
    if (!pdf.ok) return json({ error: pdf.error }, pdf.status)
    escaneado = pdf
  }

  // Solo se reciben participaciones nuevas mientras la consulta está abierta:
  // antes de iniciar no hay a qué responder y después de concluir el periodo se
  // cerró. Un formato que se generó con la consulta abierta sí se puede registrar
  // al regresar, aunque ya haya concluido: la persona participó en tiempo.
  if (!formato) {
    const etapa = await leerEtapa()
    if (etapa !== 'abierta') {
      return json(
        { error: MENSAJE_SIN_RECEPCION[etapa], codigo: 'consulta_no_abierta', etapa },
        403,
      )
    }
  }

  // Consentimiento ciudadano obligatorio para origen digital
  const consentimiento = String(form.get('consentimiento') ?? '')
  const consentimientoVersion = campos.consentimiento_version || VERSION_AVISO_POR_OMISION
  if (origin === 'digital' && consentimiento !== '1') {
    return json({ error: 'Debes aceptar el aviso de privacidad para enviar tu participación' }, 400)
  }

  // Procesar archivos adjuntos (acepta 'archivos', 'archivo', o legacy 'pdf')
  const rawFiles = [...form.getAll('archivos'), ...form.getAll('archivo'), ...form.getAll('pdf')]
  const validFiles = rawFiles.filter(
    (entry): entry is File => entry instanceof File && entry.size > 0,
  )

  if (validFiles.length > MAX_UPLOAD_FILES) {
    return json({ error: `Máximo ${MAX_UPLOAD_FILES} archivos por participación` }, 400)
  }

  const filesParaIngest: IngestFile[] = []
  const escritos: string[] = []
  // Los archivos se escriben a disco antes de saber si la participación va a
  // cuajar. Si el handler sale por cualquier vía que no sea el commit —una
  // excepción, o un `return` temprano al rechazar el 2.º adjunto cuando el 1.º
  // ya estaba escrito— hay que borrarlos o quedan huérfanos en `uploads/`.
  let persistido = false

  try {
    for (const file of validFiles) {
      const validacion = validarAdjunto(
        { size: file.size, name: file.name },
        validFiles.length,
        MAX_FILE_BYTES,
        MAX_UPLOAD_FILES,
      )
      if (!validacion.ok) {
        return json({ error: validacion.reason }, validacion.codigo ?? 400)
      }

      const buffer = Buffer.from(await file.arrayBuffer())
      const verdict = validateUpload({ filename: file.name, buffer })

      if (!verdict.ok) {
        return json(
          {
            error: `Archivo rechazado (${sanitizarNombre(file.name)}): ${verdict.reason}`,
          },
          415,
        )
      }

      await mkdir(UPLOAD_DIR, { recursive: true })
      const nombreArchivoDisco = nombreEnDisco(file.name)
      const rutaDestino = join(UPLOAD_DIR, nombreArchivoDisco)
      await writeFile(rutaDestino, buffer)
      escritos.push(rutaDestino)

      filesParaIngest.push({
        size: buffer.length,
        meta: {
          nombreOriginal: acortarNombre(sanitizarNombre(file.name)),
          mime: verdict.safeMime!,
          rutaLocal: rutaDestino,
        },
      })
    }

    const folio = formato?.folio ?? (await nextFolio())

    // El formato escaneado, junto a los adjuntos: si algo falla, se borra con ellos.
    let rutaEscaneado: string | null = null
    if (escaneado) {
      rutaEscaneado = await escribirPdf(escaneado.buffer, escaneado.nombre)
      escritos.push(rutaEscaneado)
    }

    const camposFormulario: Record<string, string> = {
      nombre: campos.nombre,
      correo: campos.correo,
      colonia: campos.colonia,
      municipio: campos.municipio,
      institucion: campos.institucion,
      ocupacion: campos.ocupacion,
      fuente: campos.fuente,
      fuente_otra: campos.fuente_otra,
      genero: campos.genero,
      tematica: campos.tematica,
      tematica_otra: campos.tematica_otra,
      observacion: campos.observacion,
      codigo_postal: campos.codigo_postal,
      direccion_origen: campos.direccion_origen,
      // Domicilio personal, independiente de la ubicación de la propuesta.
      domicilio: campos.domicilio,
      municipio_participante: campos.municipio_participante,
      folio,
    }

    const resultado = await sql.begin(async (tx) => {
      const creada = await createParticipation(
        tx,
        {
          folio,
          origen: origin,
          nombre: camposFormulario.nombre,
          correo: camposFormulario.correo,
          calle: campos.calle,
          numero: campos.numero,
          colonia: camposFormulario.colonia,
          municipio: camposFormulario.municipio,
          codigo_postal: camposFormulario.codigo_postal,
          direccion_origen: camposFormulario.direccion_origen,
          domicilio: camposFormulario.domicilio,
          municipio_participante: camposFormulario.municipio_participante,
          consentimiento_en: origin === 'digital' ? new Date() : null,
          consentimiento_version: origin === 'digital' ? consentimientoVersion : '',
          institucion: camposFormulario.institucion,
          ocupacion: camposFormulario.ocupacion,
          fuente: camposFormulario.fuente,
          fuente_otra: camposFormulario.fuente_otra,
          genero: camposFormulario.genero,
          tematica: camposFormulario.tematica,
          tematica_otra: camposFormulario.tematica_otra,
          alcance_ubicacion: campos.alcance_ubicacion as Alcance,
          latitud: campos.latitud,
          longitud: campos.longitud,
          observacion: camposFormulario.observacion,
          captura: formato ? 'manuscrita' : origin === 'fisica' ? 'asistida' : '',
          creadoPor: user?.id,
        },
        folio,
      )

      if (formato && escaneado && rutaEscaneado) {
        if (!(await marcarFormatoRecibido(tx, formato.id, creada.participationId))) {
          throw Object.assign(new Error('Ese formato ya se registró como participación'), {
            status: 409,
          })
        }
        await guardarDocumento(tx, creada.participationId, 'formato_escaneado', {
          nombreOriginal: escaneado.nombre,
          size: escaneado.buffer.length,
          rutaLocal: rutaEscaneado,
          subidoPor: user?.id,
        })
      }

      const ingest = await ingestParticipation(
        tx,
        creada.participationId,
        camposFormulario,
        filesParaIngest,
      )

      return { ...creada, ...ingest }
    })
    persistido = true

    // El acuse se envía DESPUÉS del commit exitoso (fire-and-forget con catch)
    const userEmail = camposFormulario.correo.trim()
    if (userEmail && mailConfigurado()) {
      void enviarAcuseReciboParticipacion(resultado.participationId, userEmail).catch((err) => {
        logger.error('participations.acuse', err)
      })
    }

    // El spread ya aporta folio y participationId; `id` es el alias que espera el cliente.
    // `acuse_token` es el enlace firmado para descargar el acuse (ver acuse-token.ts).
    return json(
      {
        ...resultado,
        id: resultado.participationId,
        acuse_token: firmarAcuse(resultado.folio),
      },
      201,
    )
  } catch (err) {
    // Un rechazo previsto (el formato ya se registró, por ejemplo) se explica; lo demás es un 500.
    const status = (err as { status?: number }).status
    if (status && status >= 400 && status < 500)
      return json({ error: (err as Error).message }, status)
    throw err
  } finally {
    // Cubre tanto la excepción como los `return` de rechazo (400/415).
    if (!persistido) {
      await Promise.allSettled(escritos.map((p) => rm(p, { force: true })))
    }
  }
}
