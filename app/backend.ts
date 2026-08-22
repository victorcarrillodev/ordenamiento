/**
 * Cliente del Backend de Ordenamiento.
 * El servidor Remix actúa como intermediario: hace fetch al backend (5920)
 * y reenvía la cookie de sesión del admin al navegador.
 */

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
