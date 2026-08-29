/**
 * Cliente del Backend de Ordenamiento.
 * El servidor Remix actúa como intermediario: hace fetch al backend (5920)
 * y reenvía la cookie de sesión del admin al navegador.
 */
import { redirect } from 'remix/response/redirect'

import { routes } from './routes.ts'
import type { ThemeData } from './ui/civic-horizon.ts'

export const BACKEND_URL = process.env.BACKEND_URL ?? 'http://localhost:5920'

export interface LoginResponse {
  ok: boolean
  status: number
  user?: { id: string; name: string; role: string } | null
  error?: string
  setCookie?: string
}

/**
 * Autentica contra el backend y devuelve el usuario + la cookie de sesión.
 */
export async function loginBackend(email: string, password: string): Promise<LoginResponse> {
  try {
    const response = await fetch(`${BACKEND_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email, password }),
    })

    const data = (await response.json().catch(() => ({}))) as {
      user?: { id: string; name: string; role: string }
      error?: string
    }

    if (!response.ok) {
      return { ok: false, status: response.status, error: data.error }
    }

    return {
      ok: true,
      status: response.status,
      user: data.user,
      setCookie: response.headers.get('set-cookie') ?? undefined,
    }
  } catch {
    return { ok: false, status: 503, error: 'Servicio de autenticación no disponible' }
  }
}

/**
 * Cierra la sesión contra el backend y devuelve la cookie ya vencida para
 * reenviar al navegador (el backend es quien firma/borra la cookie; este
 * servidor solo hace de intermediario, igual que en loginBackend).
 */
export async function logoutBackend(request: Request): Promise<string | undefined> {
  try {
    const response = await backendFetch(request, '/api/auth/logout', { method: 'POST' })
    return response.headers.get('set-cookie') ?? undefined
  } catch {
    return undefined
  }
}

export interface AdminUser {
  id: string
  name: string
  role: string
}

/**
 * Fetch al backend reenviando la cookie de sesión del navegador.
 */
export async function backendFetch(
  request: Request,
  path: string,
  init?: RequestInit,
): Promise<Response> {
  const headers = new Headers(init?.headers)
  const cookie = request.headers.get('cookie')
  if (cookie) headers.set('cookie', cookie)
  try {
    return await fetch(`${BACKEND_URL}${path}`, { ...init, headers })
  } catch {
    return new Response(JSON.stringify({ error: 'Backend no disponible' }), {
      status: 503,
      headers: { 'content-type': 'application/json' },
    })
  }
}

/**
 * Fetch al backend que devuelve JSON parseado o un fallback, sin nunca lanzar.
 *
 * Cubre tres caminos de fallo que `backendFetch` + `response.json()` no cubren:
 * 1. `response.ok === false` → devuelve `fallback`
 * 2. `response.json()` lanza (body no es JSON) → devuelve `fallback`
 * 3. `response.ok === true` pero el body no tiene la forma esperada → devuelve `fallback`
 *
 * El tercer caso es el que el patron inline `response.ok ? await response.json() : fallback`
 * no cubre: un proxy, un cache intermedio o una version desalineada del backend pueden
 * devolver 200 con un body que no coincide con lo que la pagina espera.
 */
export async function fetchJsonOr<T>(
  request: Request,
  path: string,
  fallback: T,
  init?: RequestInit,
): Promise<T> {
  const response = await backendFetch(request, path, init)
  if (!response.ok) return fallback
  try {
    const data = (await response.json()) as T
    // Si el backend devuelve `{}` (sin datos) o un shape vacío, usamos el
    // fallback tipado del controller (ej. stats con ceros). Un proxy o versión
    // desalineada pueden dejar {}; el fallback evita renderizar con shape roto.
    if (!data || (typeof data === 'object' && !Array.isArray(data) && Object.keys(data).length === 0)) {
      return fallback
    }
    return data
  } catch {
    return fallback
  }
}

/**
 * Usuario autenticado según el backend (o null si no hay sesión válida o backend no responde).
 */
export async function backendUser(request: Request): Promise<AdminUser | null> {
  try {
    const response = await backendFetch(request, '/api/auth/me')
    if (!response.ok) return null
    const data = (await response.json().catch(() => ({}))) as { user?: AdminUser | null }
    return data.user ?? null
  } catch {
    return null
  }
}

/**
 * Exige sesión de ADMIN: devuelve el usuario, o un redirect a /login listo
 * para retornar directamente desde la action (`if (user instanceof Response) return user`).
 *
 * Antes solo comprobaba "hay sesión", sin importar el rol: cualquier cuenta
 * 'user' autoregistrada en /login podía entrar a /admin/* y, de ahí, a la
 * PII de participaciones (nombre, correo, domicilio, observaciones, adjuntos)
 * porque las páginas admin confían en este guard como si ya filtrara por rol.
 */
export async function requireAdminUser(request: Request): Promise<AdminUser | Response> {
  const user = await backendUser(request)
  return user?.role === 'admin' ? user : redirect(routes.login.index.href())
}

// Caché del tema público (TTL corto): la portada se renderiza por cada
// visita y, bajo picos de tráfico, no debe golpear al backend en cada render.
// Un cambio de Personalización tarda como máximo TTL en reflejarse.
const THEME_TTL_MS = 30_000
let themeCache: { data: ThemeData | null; expires: number } | null = null

/**
 * Obtiene la configuración de diseño activa desde el backend
 */
export async function getPublicTheme(request: Request): Promise<ThemeData> {
  const now = Date.now()
  if (themeCache && now < themeCache.expires) return themeCache.data
  try {
    const res = await backendFetch(request, '/api/settings/theme')
    if (res.ok) {
      const data = await res.json()
      themeCache = { data: data.theme ?? null, expires: now + THEME_TTL_MS }
      return themeCache.data as ThemeData
    }
  } catch (err) {
    console.error('[backend] Error al cargar tema:', err)
  }
  return null
}
