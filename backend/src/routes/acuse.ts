/**
 * Descarga del acuse de recepción en PDF.
 *
 *  · `GET /api/participations/:id/acuse` — el panel, para imprimirlo e
 *    integrarlo al expediente como constancia física. Solo admin.
 *  · `GET /api/acuse/:folio?t=…` — quien acaba de participar, con el enlace
 *    firmado que recibe al terminar (ver services/acuse-token.ts).
 */
import { contentDispositionHeader } from '../services/upload-guard.ts'
import { generarAcuse, nombreArchivoAcuse } from '../services/acuse.ts'
import { acuseFirmaValida } from '../services/acuse-token.ts'
import { datosDeParticipacion } from '../services/acuse-datos.ts'
import { clientIp, json, logger, rateLimit } from '../utils.ts'
import { exigirAdmin, matchPath, uuidInvalido, type ManejadorRuta } from './ruta.ts'

/** Un folio es letras, números y guiones: nada que no sea eso llega a la consulta. */
const FOLIO_RE = /^[A-Za-z0-9-]{3,60}$/

/**
 * Descargas del acuse por minuto. La firma ya impide adivinar; esto es un
 * cortafuegos para el CPU (generar el PDF cuesta ~0.1 s). Sin TRUST_PROXY el
 * backend no distingue visitantes (todos llegan del contenedor web), así que el
 * tope es de todo el servidor y por eso es holgado: tras una fecha límite cientos
 * de personas descargan su acuse a la vez, y no deben toparse unas con otras.
 */
const MAX_DESCARGAS_POR_MINUTO = 300

async function respuestaDelAcuse(
  datos: NonNullable<Awaited<ReturnType<typeof datosDeParticipacion>>>,
): Promise<Response> {
  const { pdf, completo, escala } = await generarAcuse(datos)
  if (!completo)
    logger.error('acuse.desborde', new Error(`${datos.folio}: no cupo a escala ${escala}`))
  return new Response(new Uint8Array(pdf), {
    headers: {
      'content-type': 'application/pdf',
      'content-disposition': contentDispositionHeader(
        'attachment',
        nombreArchivoAcuse(datos.folio),
      ),
      'content-length': String(pdf.byteLength),
      'x-content-type-options': 'nosniff',
      // Lleva datos personales: ningún caché intermedio debe guardarlo.
      'cache-control': 'private, no-store',
    },
  })
}

type Cargador = typeof datosDeParticipacion

/** El módulo con su cargador de datos; las pruebas pasan uno propio en vez de leer la base. */
export function crearRutasAcuse(cargar: Cargador = datosDeParticipacion): ManejadorRuta {
  return async (ctx) => {
    if (ctx.method !== 'GET') return null

    const delPanel = matchPath(ctx.url.pathname, '/api/participations/:id/acuse')
    if (delPanel) {
      const prohibido = exigirAdmin(ctx)
      if (prohibido) return prohibido
      const invalido = uuidInvalido(delPanel.id)
      if (invalido) return invalido
      const datos = await cargar({ id: delPanel.id })
      return datos ? respuestaDelAcuse(datos) : json({ error: 'No encontrado' }, 404)
    }

    const delCiudadano = matchPath(ctx.url.pathname, '/api/acuse/:folio')
    if (delCiudadano) {
      const ip = clientIp(ctx.request, null)
      if (rateLimit(`acuse:${ip}`, MAX_DESCARGAS_POR_MINUTO, 60_000)) {
        return json({ error: 'Demasiadas descargas. Intenta de nuevo en un momento.' }, 429)
      }
      const { folio } = delCiudadano
      const token = ctx.url.searchParams.get('t') ?? ''
      // Mismo mensaje para folio inexistente y firma mala: no se revela cuáles folios existen.
      if (!FOLIO_RE.test(folio) || !acuseFirmaValida(folio, token)) {
        return json({ error: 'El enlace del acuse no es válido o ya venció' }, 404)
      }
      const datos = await cargar({ folio })
      return datos
        ? respuestaDelAcuse(datos)
        : json({ error: 'El enlace del acuse no es válido o ya venció' }, 404)
    }

    return null
  }
}

export const rutasAcuse = crearRutasAcuse()
