/**
 * Documentos PDF de una participación y respuesta al participante (solo
 * personal del panel). El área responsable prepara los PDF fuera del sistema y
 * aquí los carga, los revisa y decide cuáles se publican.
 *
 *  · `GET    /api/participations/:id/documentos`                  los documentos y los correos enviados
 *  · `GET    /api/participations/:id/documentos/:tipo`            el PDF (`?download=1` lo descarga)
 *  · `PUT    /api/participations/:id/documentos/:tipo`            carga o sustituye (multipart: archivo, numero_oficio, fecha_oficio)
 *  · `PATCH  /api/participations/:id/documentos/:tipo`            número y fecha del oficio
 *  · `DELETE /api/participations/:id/documentos/:tipo`            lo quita
 *  · `POST   /api/participations/:id/documentos/:tipo/publicacion` `{ publicado }` publica o retira del portal
 *  · `POST   /api/participations/:id/respuesta/enviar`            envía el oficio al correo registrado
 */
import { servirPdf } from '../files/servir-pdf.ts'
import {
  actualizarDatosOficio,
  borrarArchivoDeDisco,
  eliminarDocumento,
  escribirPdf,
  esTipoDocumento,
  esTipoPublicable,
  fijarPublicacion,
  guardarDocumento,
  listarDocumentos,
  obtenerDocumento,
  validarPdf,
  type DocumentoParticipacion,
  type TipoDocumento,
} from '../services/documentos-participacion.ts'
import { listarEnvios } from '../services/envios.ts'
import { enviarRespuesta, existeParticipacion } from '../services/respuestas.ts'
import { linea } from '../services/texto.ts'
import { sql } from '../db/pool.ts'
import { bodyTooLarge, json, logger } from '../utils.ts'
import { MAX_FILE_BYTES } from '../files/limits.ts'
import { exigirAdmin, matchPath, uuidInvalido, type ManejadorRuta } from './ruta.ts'

/** Lo que el panel ve de un documento: sin la ruta interna del archivo. */
const publico = (d: DocumentoParticipacion): Omit<DocumentoParticipacion, 'ruta_local'> => {
  const copia: Partial<DocumentoParticipacion> = { ...d }
  delete copia.ruta_local
  return copia as Omit<DocumentoParticipacion, 'ruta_local'>
}

const NUMERO_MAX = 60
const FECHA_RE = /^\d{4}-\d{2}-\d{2}$/

/** `AAAA-MM-DD` real (no 2026-02-31); null si no lo es. */
function fechaValida(texto: string): string | null {
  if (!FECHA_RE.test(texto)) return null
  const d = new Date(`${texto}T00:00:00Z`)
  return !Number.isNaN(d.getTime()) && d.toISOString().startsWith(texto) ? texto : null
}

type DatosOficio = { ok: true; numero: string; fecha: string | null } | { ok: false; error: string }

/** Número y fecha del oficio, saneados. Vacíos son válidos; una fecha mal escrita no. */
function datosDeOficio(numero: unknown, fecha: unknown): DatosOficio {
  const n = linea(typeof numero === 'string' ? numero : '')
  if (Array.from(n).length > NUMERO_MAX) {
    return { ok: false, error: `El número de oficio admite hasta ${NUMERO_MAX} caracteres` }
  }
  const f = typeof fecha === 'string' ? fecha.trim() : ''
  if (f === '') return { ok: true, numero: n, fecha: null }
  const valida = fechaValida(f)
  return valida
    ? { ok: true, numero: n, fecha: valida }
    : { ok: false, error: 'La fecha del oficio no es válida (usa AAAA-MM-DD)' }
}

export const rutasDocumentos: ManejadorRuta = async (ctx) => {
  const { pathname } = ctx.url

  const enviar =
    ctx.method === 'POST' ? matchPath(pathname, '/api/participations/:id/respuesta/enviar') : null
  const publicacion =
    ctx.method === 'POST'
      ? matchPath(pathname, '/api/participations/:id/documentos/:tipo/publicacion')
      : null
  const documento = matchPath(pathname, '/api/participations/:id/documentos/:tipo')
  const lista =
    ctx.method === 'GET' ? matchPath(pathname, '/api/participations/:id/documentos') : null
  const coincide = enviar ?? publicacion ?? documento ?? lista
  if (!coincide) return null

  const prohibido = exigirAdmin(ctx)
  if (prohibido) return prohibido
  const invalido = uuidInvalido(coincide.id)
  if (invalido) return invalido
  const id = coincide.id

  if (enviar) {
    const r = await enviarRespuesta(id, ctx.user!.id)
    if (r.ok) return json({ ok: true, envio: r.envio })
    return json({ error: r.error, envio: r.envio ?? null }, r.status)
  }

  if (lista) {
    if (!(await existeParticipacion(id))) return json({ error: 'No encontrado' }, 404)
    const [documentos, envios] = await Promise.all([listarDocumentos(id), listarEnvios(id)])
    return json({ documentos: documentos.map(publico), envios })
  }

  const tipo = (publicacion ?? documento)!.tipo
  if (!esTipoDocumento(tipo)) return json({ error: 'Tipo de documento inválido' }, 400)

  if (publicacion) {
    const cuerpo = (await ctx.request.json().catch(() => ({}))) as { publicado?: unknown }
    if (typeof cuerpo.publicado !== 'boolean') {
      return json({ error: 'Indica si se publica o se retira (publicado: true o false)' }, 400)
    }
    if (!esTipoPublicable(tipo)) {
      return json({ error: 'Este documento es interno: no se publica en el portal' }, 400)
    }
    const actual = await obtenerDocumento(id, tipo)
    if (!actual) return json({ error: 'Primero carga el documento' }, 409)
    if (
      cuerpo.publicado &&
      tipo === 'oficio_publico' &&
      (!actual.numero_oficio || !actual.fecha_oficio)
    ) {
      return json(
        { error: 'Para publicar el oficio indica su número y su fecha: se muestran en el portal' },
        409,
      )
    }
    const resultado = await fijarPublicacion(id, tipo, cuerpo.publicado)
    return resultado
      ? json({ documento: publico(resultado) })
      : json({ error: 'No encontrado' }, 404)
  }

  switch (ctx.method) {
    case 'GET': {
      const doc = await obtenerDocumento(id, tipo)
      if (!doc) return json({ error: 'Documento no encontrado' }, 404)
      return servirPdf({
        ruta: doc.ruta_local,
        nombre: doc.nombre_original,
        descarga: ctx.url.searchParams.get('download') === '1',
      })
    }

    case 'PUT': {
      if (bodyTooLarge(ctx.request, MAX_FILE_BYTES + 1024 * 1024)) {
        return json({ error: 'El archivo supera el tamaño máximo permitido' }, 413)
      }
      if (!(await existeParticipacion(id))) return json({ error: 'No encontrado' }, 404)
      let form: FormData
      try {
        form = await ctx.request.formData()
      } catch {
        return json({ error: 'Formulario inválido' }, 400)
      }
      const archivo = form.get('archivo')
      if (!(archivo instanceof File) || archivo.size === 0) {
        return json({ error: 'Elige el archivo PDF que quieres cargar' }, 422)
      }
      const oficio = datosDeOficio(form.get('numero_oficio'), form.get('fecha_oficio'))
      if (!oficio.ok) return json({ error: oficio.error }, 422)
      const pdf = await validarPdf(archivo)
      if (!pdf.ok) return json({ error: pdf.error }, pdf.status)

      const ruta = await escribirPdf(pdf.buffer, pdf.nombre)
      try {
        const guardado = await guardarDocumento(sql, id, tipo as TipoDocumento, {
          nombreOriginal: pdf.nombre,
          size: pdf.buffer.length,
          rutaLocal: ruta,
          numeroOficio: oficio.numero,
          fechaOficio: oficio.fecha,
          subidoPor: ctx.user!.id,
        })
        // El archivo anterior ya nadie lo usa: se borra solo con la fila nueva a salvo.
        await borrarArchivoDeDisco(guardado.rutaAnterior)
        return json({ documento: publico(guardado.documento) }, 201)
      } catch (err) {
        await borrarArchivoDeDisco(ruta)
        logger.error('documentos.guardar', err)
        return json({ error: 'No se pudo guardar el documento' }, 500)
      }
    }

    case 'PATCH': {
      const cuerpo = (await ctx.request.json().catch(() => ({}))) as {
        numero_oficio?: unknown
        fecha_oficio?: unknown
      }
      const oficio = datosDeOficio(cuerpo.numero_oficio, cuerpo.fecha_oficio)
      if (!oficio.ok) return json({ error: oficio.error }, 422)
      const actualizado = await actualizarDatosOficio(id, tipo, oficio.numero, oficio.fecha)
      return actualizado
        ? json({ documento: publico(actualizado) })
        : json({ error: 'Documento no encontrado' }, 404)
    }

    case 'DELETE': {
      return (await eliminarDocumento(id, tipo))
        ? json({ ok: true })
        : json({ error: 'Documento no encontrado' }, 404)
    }
  }

  return null
}
