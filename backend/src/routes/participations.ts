import { mkdir, rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { Buffer } from 'node:buffer'

import { type SessionUser } from '../auth/auth.ts'
import { sql } from '../db/pool.ts'
import {
  MAX_FILE_BYTES,
  MAX_TOTAL_BYTES,
  MAX_UPLOAD_FILES,
  validarAdjunto,
} from '../files/limits.ts'
import { nombreEnDisco, sanitizarNombre } from '../files/nombres.ts'
import { validateUpload } from '../services/upload-guard.ts'
import { nextFolio } from '../services/folio.ts'
import { ingestParticipation, type IngestFile } from '../services/ingest.ts'
import { enviarAcuseReciboParticipacion, mailConfigurado } from '../services/mail.ts'
import { createParticipation, type Origen } from '../services/participations.ts'
import { json, bodyTooLarge, logger } from '../utils.ts'

const UPLOAD_DIR = join(process.cwd(), 'uploads')

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
): Promise<Response> {
  if (bodyTooLarge(request, MAX_TOTAL_BYTES + 1024 * 1024)) {
    return json({ error: 'El cuerpo de la petición excede el tamaño máximo permitido' }, 413)
  }

  const form = await request.formData()
  const origin = String(form.get('origen') ?? 'digital') as Origen
  if (!isOrigen(origin)) {
    return json({ error: 'origen inválido' }, 400)
  }

  // La participación física solo la crea un admin autenticado
  if (origin === 'fisica' && user?.role !== 'admin') {
    return json({ error: 'Requiere rol admin' }, 403)
  }

  // Consentimiento ciudadano obligatorio para origen digital
  const consentimiento = String(form.get('consentimiento') ?? '')
  const consentimientoVersion = String(form.get('consentimiento_version') ?? 'lgpdppso-2026-01')
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
        buffer,
        meta: {
          nombreOriginal: sanitizarNombre(file.name),
          mime: verdict.safeMime!,
          rutaLocal: rutaDestino,
        },
      })
    }

    const folio = await nextFolio()

    const camposFormulario: Record<string, string> = {
      nombre: String(form.get('nombre') ?? ''),
      correo: String(form.get('correo') ?? ''),
      colonia: String(form.get('colonia') ?? ''),
      municipio: String(form.get('municipio') ?? ''),
      institucion: String(form.get('institucion') ?? ''),
      ocupacion: String(form.get('ocupacion') ?? ''),
      observacion: String(form.get('observacion') ?? ''),
      codigo_postal: String(form.get('codigo_postal') ?? ''),
      direccion_origen: String(form.get('direccion_origen') ?? ''),
      // Domicilio de quien participa: sólo lo captura el alta física desde el
      // panel, y es independiente del lugar del aporte.
      domicilio: String(form.get('domicilio') ?? ''),
      municipio_participante: String(form.get('municipio_participante') ?? ''),
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
          calle: String(form.get('calle') ?? ''),
          numero: String(form.get('numero') ?? ''),
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
          latitud: String(form.get('latitud') ?? ''),
          longitud: String(form.get('longitud') ?? ''),
          observacion: camposFormulario.observacion,
          creadoPor: user?.id,
        },
        folio,
      )

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
    return json({ ...resultado, id: resultado.participationId }, 201)
  } finally {
    // Cubre tanto la excepción como los `return` de rechazo (400/415).
    if (!persistido) {
      await Promise.allSettled(escritos.map((p) => rm(p, { force: true })))
    }
  }
}
