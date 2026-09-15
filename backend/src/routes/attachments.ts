import { sql } from '../db/pool.ts'
import { attachmentPath } from '../files/attachment-path.ts'
import {
  canonicalMimeFor,
  contentDispositionHeader,
  getExtension,
  shouldServeInline,
} from '../services/upload-guard.ts'
import { docxPreview } from '../text/docx-preview.ts'
import { json } from '../utils.ts'

/** Se invoca tras comprobar el rol y validar ambos UUID en app.ts. */
export async function getAttachment(
  request: Request,
  ids: { id: string; aid: string },
  uploadDir: string,
): Promise<Response> {
  const rows = await sql<Array<{ ruta_local: string; nombre_original: string; origen: string }>>`
    SELECT a.ruta_local, a.nombre_original, p.origen FROM attachments a
    JOIN participations p ON p.id = a.participation_id
    WHERE a.id = ${ids.aid} AND a.participation_id = ${ids.id}
  `
  if (!rows[0]) return json({ error: 'Adjunto no encontrado' }, 404)
  const attachment = rows[0]
  let path: string
  try {
    path = await attachmentPath(uploadDir, attachment.ruta_local)
  } catch (error) {
    const denied = error instanceof Error && error.message === 'ATTACHMENT_PATH_DENIED'
    return json(
      { error: denied ? 'Acceso a archivo no autorizado' : 'Archivo en disco no disponible' },
      denied ? 403 : 404,
    )
  }
  const file = Bun.file(path)
  const ext = getExtension(attachment.nombre_original || attachment.ruta_local)
  const params = new URL(request.url).searchParams
  if (params.get('preview') === '1') {
    if (ext !== 'docx') return json({ error: 'Este formato no tiene vista de texto' }, 415)
    if (file.size > 100 * 1024 * 1024)
      return json(
        { error: 'El documento supera el límite de vista previa; puedes descargar el original' },
        413,
      )
    try {
      const texto = await docxPreview(Buffer.from(await file.arrayBuffer()))
      return new Response(
        JSON.stringify({ nombre: attachment.nombre_original, origen: attachment.origen, texto }),
        {
          headers: {
            'content-type': 'application/json; charset=utf-8',
            'cache-control': 'private, no-store',
          },
        },
      )
    } catch {
      return json(
        {
          error:
            'No se pudo generar la vista de texto. Descarga el documento original para abrirlo.',
        },
        422,
      )
    }
  }

  const download = params.get('download') === '1'
  const headers = new Headers({
    'content-type': canonicalMimeFor(ext) ?? 'application/octet-stream',
    'content-disposition': contentDispositionHeader(
      download || !shouldServeInline(ext) ? 'attachment' : 'inline',
      attachment.nombre_original,
    ),
    'content-length': String(file.size),
    'accept-ranges': 'bytes',
    'x-content-type-options': 'nosniff',
    'content-security-policy': "default-src 'none'; sandbox; frame-ancestors 'none'",
    'cross-origin-resource-policy': 'same-origin',
    'cache-control': 'private, no-store',
  })
  const range = request.headers.get('range')
  if (range) {
    const match = /^bytes=(\d*)-(\d*)$/.exec(range)
    const start = match?.[1] ? Number(match[1]) : Math.max(0, file.size - Number(match?.[2]))
    const end = match?.[1] && match[2] ? Math.min(Number(match[2]), file.size - 1) : file.size - 1
    if (
      !match ||
      (!match[1] && !match[2]) ||
      !Number.isSafeInteger(start) ||
      !Number.isSafeInteger(end) ||
      start > end ||
      start >= file.size
    ) {
      headers.set('content-range', `bytes */${file.size}`)
      headers.delete('content-length')
      return new Response(null, { status: 416, headers })
    }
    headers.set('content-range', `bytes ${start}-${end}/${file.size}`)
    headers.set('content-length', String(end - start + 1))
    return new Response(file.slice(start, end + 1), { status: 206, headers })
  }
  return new Response(file, { headers })
}
