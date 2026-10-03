/**
 * «Participaciones y respuestas»: lo que el portal muestra de las participaciones
 * y los oficios de respuesta publicados. Todo es público, y por eso solo entrega
 * lo que el área responsable revisó y publicó.
 *
 *  · `GET /api/participaciones-publicas?folio=&page=&limit=`   el listado (folio y fecha) con su buscador
 *  · `GET /api/participaciones-publicas/:folio/participacion`   la versión pública de la participación
 *  · `GET /api/participaciones-publicas/:folio/oficio`          la versión pública del oficio de respuesta
 *    (`?download=1` descarga el PDF)
 */
import { servirPdf } from '../files/servir-pdf.ts'
import {
  documentoPublicado,
  LIMITE_MAXIMO,
  LIMITE_POR_PAGINA,
  listarPublicas,
  MAX_LARGO_BUSQUEDA,
} from '../services/publicas.ts'
import { clientIp, json, rateLimit } from '../utils.ts'
import { matchPath, type ManejadorRuta } from './ruta.ts'

const FOLIO_RE = /^[A-Za-z0-9-]{3,60}$/
/**
 * Consultas por minuto. Sin TRUST_PROXY todas llegan del contenedor web, así que
 * el tope es de todo el servidor (ver routes/acuse.ts): solo frena un abuso, no
 * debe notarlo quien consulta.
 */
const BUSQUEDAS_POR_MINUTO = 600

const entero = (valor: string | null, porOmision: number) => {
  const n = Number(valor)
  return Number.isInteger(n) && n > 0 ? n : porOmision
}

export const rutasPublicas: ManejadorRuta = async (ctx) => {
  if (ctx.method !== 'GET') return null
  const { pathname, searchParams } = ctx.url

  if (pathname === '/api/participaciones-publicas') {
    if (rateLimit(`publicas:${clientIp(ctx.request, null)}`, BUSQUEDAS_POR_MINUTO, 60_000)) {
      return json({ error: 'Demasiadas consultas. Intenta de nuevo en un momento.' }, 429)
    }
    const pagina = await listarPublicas({
      folio: (searchParams.get('folio') ?? '').slice(0, MAX_LARGO_BUSQUEDA),
      page: entero(searchParams.get('page'), 1),
      limit: Math.min(entero(searchParams.get('limit'), LIMITE_POR_PAGINA), LIMITE_MAXIMO),
    })
    return json(pagina)
  }

  const documento = matchPath(pathname, '/api/participaciones-publicas/:folio/:documento')
  if (documento) {
    const tipo =
      documento.documento === 'participacion'
        ? 'version_publica'
        : documento.documento === 'oficio'
          ? 'oficio_publico'
          : null
    // Mismo 404 para un folio inexistente, uno sin publicar y un documento que no existe:
    // no se revela qué folios hay ni qué tienen cargado.
    if (!tipo || !FOLIO_RE.test(documento.folio)) return json({ error: 'No encontrado' }, 404)
    const publicado = await documentoPublicado(documento.folio, tipo)
    if (!publicado) return json({ error: 'No encontrado' }, 404)
    return servirPdf({
      ruta: publicado.ruta,
      nombre: publicado.nombre,
      descarga: searchParams.get('download') === '1',
    })
  }

  return null
}
