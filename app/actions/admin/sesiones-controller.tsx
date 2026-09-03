/**
 * Bitácora de sesiones — datos y render de GET /admin/sesiones.
 *
 * Es una ruta `get()` suelta, así que se registra como acción del controller
 * principal del admin (igual que `estadisticas` o `exportar`); la lógica vive
 * aquí para no engordar aquel archivo.
 *
 * `requireAdminUser` deja fuera a las cuentas sin rol administrador, que es la
 * condición para poder ver quién entró y cuándo.
 */
import type { RemixNode } from 'remix/ui'

import { fetchJsonOr, requireAdminUser } from '../../backend.ts'
import { SesionesPage, type ResumenSesiones, type SesionRegistrada } from './sesiones-page.tsx'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

interface RespuestaSesiones {
  items: SesionRegistrada[]
  total: number
  page: number
  limit: number
  resumen: ResumenSesiones
}

const VACIO: RespuestaSesiones = {
  items: [],
  total: 0,
  page: 1,
  limit: 25,
  resumen: { usuarios: 0, sesiones: 0, activas: 0, segundos_totales: 0 },
}

function entero(valor: string | null, porDefecto: number): number {
  const n = Number(valor)
  return Number.isInteger(n) && n > 0 ? n : porDefecto
}

/** Lo mínimo del contexto de Remix que necesita esta acción. */
interface ContextoRender {
  request: Request
  render: (node: RemixNode, init?: ResponseInit) => Response
}

export async function sesionesAction(context: ContextoRender): Promise<Response> {
  const user = await requireAdminUser(context.request)
  if (user instanceof Response) return user

  const params = new URL(context.request.url).searchParams
  const usuarioParam = params.get('user_id') ?? ''
  // Un `user_id` con basura se descarta aquí: así un filtro inválido enseña la
  // lista completa en vez de un 400 del backend.
  const usuarioId = UUID_RE.test(usuarioParam) ? usuarioParam : ''
  const page = entero(params.get('page'), 1)
  const limit = Math.min(entero(params.get('limit'), 25), 100)

  const consulta = new URLSearchParams({ page: String(page), limit: String(limit) })
  if (usuarioId) consulta.set('user_id', usuarioId)

  const data = await fetchJsonOr<RespuestaSesiones>(
    context.request,
    `/api/sessions?${consulta.toString()}`,
    VACIO,
  )

  const items = data.items ?? []
  // El nombre del encabezado sale de las propias filas: si el filtro no
  // devolvió ninguna, no hay a quién nombrar y se muestra la vista sin filtro.
  const filtrado =
    usuarioId && items.length > 0 ? { id: usuarioId, nombre: items[0].nombre } : undefined

  return context.render(
    <SesionesPage
      user={user}
      items={items}
      resumen={data.resumen ?? VACIO.resumen}
      total={typeof data.total === 'number' ? data.total : items.length}
      page={data.page ?? page}
      limit={data.limit ?? limit}
      usuarioFiltrado={filtrado}
    />,
  )
}
