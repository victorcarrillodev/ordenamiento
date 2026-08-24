/**
 * Cliente del Backend de Ordenamiento.
 * El servidor Remix actúa como intermediario: hace fetch al backend (5920)
 * y reenvía la cookie de sesión del admin al navegador.
 */
import { redirect } from 'remix/response/redirect'

import { routes } from './routes.ts'

export const BACKEND_URL = process.env.BACKEND_URL ?? 'http://localhost:5920'

export interface LoginResponse {
  ok: boolean
  status: number
  user?: { id: number; name: string; role: string } | null
  error?: string
  setCookie?: string
}

/**
 * Autentica contra el backend y devuelve el usuario + la cookie de sesión.
 */
export async function loginBackend(email: string, password: string): Promise<LoginResponse> {
  const response = await fetch(`${BACKEND_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email, password }),
  })

  const data = (await response.json().catch(() => ({}))) as {
    user?: { id: number; name: string; role: string }
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
}

export interface AdminUser {
  id: number
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
  return fetch(`${BACKEND_URL}${path}`, { ...init, headers })
}

/**
 * Usuario autenticado según el backend (o null si no hay sesión válida).
 */
export async function backendUser(request: Request): Promise<AdminUser | null> {
  const response = await backendFetch(request, '/api/auth/me')
  const data = (await response.json().catch(() => ({}))) as { user?: AdminUser | null }
  return data.user ?? null
}

/**
 * Exige sesión de admin: devuelve el usuario, o un redirect a /login listo
 * para retornar directamente desde la action (`if (user instanceof Response) return user`).
 */
export async function requireAdminUser(request: Request): Promise<AdminUser | Response> {
  const user = await backendUser(request)
  return user ?? redirect(routes.login.index.href())
}
