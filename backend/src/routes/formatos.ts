/**
 * Formatos de participación para llenar a mano (solo personal del panel).
 *
 *  · `GET  /api/formatos?estado=pendiente` — los formatos generados; con
 *    `pendiente`, solo los que todavía no regresan («Pendiente de recepción»).
 *  · `POST /api/formatos` — genera uno nuevo y reserva su folio. Solo mientras la
 *    consulta recibe participaciones.
 *  · `GET  /api/formatos/:id/pdf` — el formato en blanco, con su folio, listo para
 *    imprimir.
 */
import { generarFormatoManuscrito, NOMBRE_ARCHIVO_FORMATO } from '../services/formato-manuscrito.ts'
import { crearFormato, listarFormatos, obtenerFormato } from '../services/formatos.ts'
import { leerEstadoConsulta } from '../services/consulta.ts'
import { contentDispositionHeader } from '../services/upload-guard.ts'
import { json, logger } from '../utils.ts'
import { exigirAdmin, matchPath, uuidInvalido, type ManejadorRuta } from './ruta.ts'

export const rutasFormatos: ManejadorRuta = async (ctx) => {
  const { pathname } = ctx.url

  if (pathname === '/api/formatos' && ctx.method === 'GET') {
    const prohibido = exigirAdmin(ctx)
    if (prohibido) return prohibido
    const formatos = await listarFormatos(ctx.url.searchParams.get('estado') === 'pendiente')
    return json({ formatos })
  }

  if (pathname === '/api/formatos' && ctx.method === 'POST') {
    const prohibido = exigirAdmin(ctx)
    if (prohibido) return prohibido
    const { etapa } = await leerEstadoConsulta()
    if (etapa !== 'abierta') {
      return json(
        {
          error:
            etapa === 'pendiente'
              ? 'La consulta pública aún no inicia: todavía no se reciben participaciones'
              : 'La consulta pública concluyó: ya no se generan formatos nuevos',
          codigo: 'consulta_no_abierta',
          etapa,
        },
        403,
      )
    }
    try {
      return json(await crearFormato(ctx.user!.id), 201)
    } catch (err) {
      logger.error('formatos.crear', err)
      return json({ error: 'No se pudo generar el formato' }, 500)
    }
  }

  const pdf = ctx.method === 'GET' ? matchPath(pathname, '/api/formatos/:id/pdf') : null
  if (pdf) {
    const prohibido = exigirAdmin(ctx)
    if (prohibido) return prohibido
    const invalido = uuidInvalido(pdf.id)
    if (invalido) return invalido
    const formato = await obtenerFormato(pdf.id)
    if (!formato) return json({ error: 'No encontrado' }, 404)
    const contenido = await generarFormatoManuscrito(formato.folio)
    return new Response(new Uint8Array(contenido), {
      headers: {
        'content-type': 'application/pdf',
        'content-disposition': contentDispositionHeader(
          'attachment',
          NOMBRE_ARCHIVO_FORMATO(formato.folio),
        ),
        'content-length': String(contenido.byteLength),
        'x-content-type-options': 'nosniff',
        'cache-control': 'private, no-store',
      },
    })
  }

  return null
}
