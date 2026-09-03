/**
 * Cliente del Backend de Ordenamiento.
 * El servidor Remix actúa como intermediario: hace fetch al backend (5920)
 * y reenvía la cookie de sesión del admin al navegador.
 */
import { redirect } from 'remix/response/redirect'

import { routes } from './routes.ts'
import { puedeEntrarAlPanel } from './ui/admin/roles.ts'
import { IMAGEN_POR_DEFECTO, imagenUsable, type ThemeData } from './ui/civic-horizon.ts'

export const BACKEND_URL = process.env.BACKEND_URL ?? 'http://localhost:5920'

/**
 * Reenvía al backend quién está del otro lado del navegador, para la bitácora
 * de sesiones. El backend solo recibe peticiones de este servidor, así que sin
 * esto vería siempre la misma IP interna y ningún navegador.
 *
 * `x-forwarded-for` es informativo: lo pone el proxy de enfrente y no es una
 * credencial. Nunca se usa para decidir permisos.
 */
function reenviarDatosCliente(request: Request, headers: Headers): void {
  const userAgent = request.headers.get('user-agent')
  if (userAgent) headers.set('user-agent', userAgent)

  const reenviado = request.headers.get('x-forwarded-for')
  if (reenviado) headers.set('x-forwarded-for', reenviado)
}

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
export async function loginBackend(
  email: string,
  password: string,
  request?: Request,
): Promise<LoginResponse> {
  try {
    const headers = new Headers({ 'content-type': 'application/json' })
    if (request) reenviarDatosCliente(request, headers)
    const response = await fetch(`${BACKEND_URL}/api/auth/login`, {
      method: 'POST',
      headers,
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
 * Llamada JSON sin sesión al backend, para los flujos públicos de acceso.
 * `loginBackend` y la recuperación de contraseña ocurren antes de que exista
 * cookie, así que no pueden usar `backendFetch` (que reenvía la del navegador).
 */
async function publicBackendJson<T>(
  path: string,
  init?: RequestInit,
): Promise<{ status: number; data: T & { error?: string } }> {
  try {
    const response = await fetch(`${BACKEND_URL}${path}`, {
      ...init,
      headers: { 'content-type': 'application/json', ...(init?.headers ?? {}) },
    })
    const data = (await response.json().catch(() => ({}))) as T & { error?: string }
    return { status: response.status, data }
  } catch {
    return {
      status: 503,
      data: { error: 'El servicio no está disponible. Intenta más tarde.' } as T & {
        error?: string
      },
    }
  }
}

export interface RecuperacionResponse {
  status: number
  error?: string
  expiraMinutos?: number
}

/**
 * Pide al backend que envíe el correo de recuperación.
 *
 * Un 200 NO significa "ese correo existe": el backend responde igual exista o
 * no la cuenta, a propósito, para que el formulario no sirva para averiguar
 * qué correos están registrados. La página debe mostrar el mismo mensaje.
 */
export async function solicitarRecuperacion(email: string): Promise<RecuperacionResponse> {
  const { status, data } = await publicBackendJson<{ expiraMinutos?: number }>(
    '/api/auth/forgot-password',
    { method: 'POST', body: JSON.stringify({ email }) },
  )
  return { status, error: data.error, expiraMinutos: data.expiraMinutos }
}

export type MotivoTokenInvalido = 'invalido' | 'expirado'

/** ¿Sigue vivo el enlace? Decide entre mostrar el formulario o el aviso de caducado. */
export async function validarTokenRecuperacion(
  token: string,
): Promise<{ valido: boolean; motivo?: MotivoTokenInvalido }> {
  const { status, data } = await publicBackendJson<{
    valido?: boolean
    motivo?: MotivoTokenInvalido
  }>(`/api/auth/reset-password?token=${encodeURIComponent(token)}`)

  // Un backend caído no es un enlace caducado: se trata como inválido, pero el
  // motivo se deja indefinido para que la página muestre el texto genérico.
  if (status === 503) return { valido: false }
  return { valido: data.valido === true, motivo: data.motivo }
}

/** Canjea el enlace por una contraseña nueva. */
export async function restablecerPassword(
  token: string,
  password: string,
): Promise<{ ok: boolean; status: number; error?: string }> {
  const { status, data } = await publicBackendJson<{ ok?: boolean }>('/api/auth/reset-password', {
    method: 'POST',
    body: JSON.stringify({ token, password }),
  })
  return { ok: data.ok === true, status, error: data.error }
}

/** Consume el enlace que confirma la dirección de correo nueva. */
export async function confirmarCorreoNuevo(
  token: string,
): Promise<{ ok: boolean; status: number; email?: string; error?: string }> {
  const { status, data } = await publicBackendJson<{ ok?: boolean; email?: string }>(
    '/api/auth/confirm-email',
    { method: 'POST', body: JSON.stringify({ token }) },
  )
  return { ok: data.ok === true, status, email: data.email, error: data.error }
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
  reenviarDatosCliente(request, headers)
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
    if (
      !data ||
      (typeof data === 'object' && !Array.isArray(data) && Object.keys(data).length === 0)
    ) {
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
 * Exige sesión con acceso al panel (admin o root): devuelve el usuario, o un
 * redirect a /login listo
 * para retornar directamente desde la action (`if (user instanceof Response) return user`).
 *
 * Antes solo comprobaba "hay sesión", sin importar el rol: cualquier cuenta
 * 'user' autoregistrada en /login podía entrar a /admin/* y, de ahí, a la
 * PII de participaciones (nombre, correo, domicilio, observaciones, adjuntos)
 * porque las páginas admin confían en este guard como si ya filtrara por rol.
 */
export async function requireAdminUser(request: Request): Promise<AdminUser | Response> {
  const user = await backendUser(request)
  return user && puedeEntrarAlPanel(user.role) ? user : redirect(routes.login.index.href())
}

/**
 * Sustituye las imágenes del tema que ya no resuelven por las que trae el
 * proyecto. Se aplica al leer, no al guardar: las filas problemáticas ya están
 * en la base, y arreglarlo solo en el guardado dejaría la portada rota hasta
 * que alguien volviera a pasar por Personalización.
 */
export function normalizarImagenesDelTema(tema: ThemeData): ThemeData {
  if (!tema) return tema

  const img = tema.usuario?.imagenes
  if (img) {
    img.logoNavbar = imagenUsable(img.logoNavbar, IMAGEN_POR_DEFECTO.logo)
    img.logoFooter = imagenUsable(img.logoFooter, IMAGEN_POR_DEFECTO.logo)
    img.imagenEcologia = imagenUsable(img.imagenEcologia, IMAGEN_POR_DEFECTO.ecologia)
    img.imagenPrograma = imagenUsable(img.imagenPrograma, IMAGEN_POR_DEFECTO.programa)
    // Son dos secciones distintas de la portada: repetir la misma ilustración
    // en ambas se lee como un error de carga, no como una decisión.
    if (img.imagenPrograma === img.imagenEcologia) {
      img.imagenPrograma = IMAGEN_POR_DEFECTO.programa
    }

    const hero = Array.isArray(img.heroImagenes)
      ? img.heroImagenes.map((src: unknown) => imagenUsable(src, IMAGEN_POR_DEFECTO.hero))
      : []
    img.heroImagenes = hero.length > 0 ? [...new Set(hero)] : [IMAGEN_POR_DEFECTO.hero]
  }

  if (tema.panel) {
    tema.panel.adminLogo = imagenUsable(tema.panel.adminLogo, IMAGEN_POR_DEFECTO.logo)
  }

  return tema
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
      const t = normalizarImagenesDelTema(data.theme)
      themeCache = { data: t ?? null, expires: now + THEME_TTL_MS }
      return themeCache.data as ThemeData
    }
  } catch (err) {
    console.error('[backend] Error al cargar tema:', err)
  }
  return null
}
