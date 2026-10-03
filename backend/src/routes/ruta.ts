/**
 * Piezas comunes de los módulos de rutas del backend.
 *
 * `app.ts` despacha a mano y ya pasa de 1800 líneas (ver la decisión A2 sobre su
 * router). Las rutas nuevas viven cada una en su módulo y devuelven `null` si la
 * petición no es suya; `handleRequest` las recorre por orden y la primera que
 * responde gana.
 */
import { puedeEntrarAlPanel } from '../auth/roles.ts'
import type { SessionUser } from '../auth/auth.ts'
import { json } from '../utils.ts'

export interface ContextoRuta {
  request: Request
  url: URL
  method: string
  /** Quien hace la petición, o null si no hay sesión. */
  user: SessionUser | null
}

/** Un módulo de rutas: responde si la petición le toca y devuelve null si no. */
export type ManejadorRuta = (ctx: ContextoRuta) => Promise<Response | null>

/** Compara la ruta con un patrón de segmentos (`/api/x/:id`) y devuelve sus parámetros. */
export function matchPath(pathname: string, pattern: string): Record<string, string> | null {
  const pathParts = pathname.split('/').filter(Boolean)
  const patternParts = pattern.split('/').filter(Boolean)
  if (pathParts.length !== patternParts.length) return null

  const params: Record<string, string> = {}
  for (let i = 0; i < patternParts.length; i++) {
    const p = patternParts[i]
    if (p.startsWith(':')) {
      params[p.slice(1)] = pathParts[i]
    } else if (p !== pathParts[i]) {
      return null
    }
  }
  return params
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export const esUuid = (valor: string): boolean => UUID_RE.test(valor)

/** 400 si el identificador no es un UUID; null si lo es. */
export const uuidInvalido = (id: string): Response | null =>
  esUuid(id) ? null : json({ error: 'id inválido' }, 400)

/** 403 si quien llama no entra al panel (admin o root); null si puede. */
export const exigirAdmin = (ctx: ContextoRuta): Response | null =>
  puedeEntrarAlPanel(ctx.user?.role) ? null : json({ error: 'Requiere rol admin' }, 403)
