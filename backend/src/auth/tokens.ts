import { createHash, randomBytes, timingSafeEqual } from 'node:crypto'

/**
 * Tokens de un solo uso que viajan por correo (restablecer contraseña,
 * confirmar un correo nuevo).
 *
 * La regla común a todos: el token viaja en claro en la URL del mensaje, pero
 * en la base solo se guarda su SHA-256. Un volcado de la tabla —backup, dump,
 * inyección SQL— no permite reconstruir ningún enlace válido. No hace falta
 * HMAC con secreto como en las cookies de sesión: aquí no se verifica la
 * autenticidad de un valor emitido, se busca una fila que ya existe, y el
 * token son 256 bits de aleatoriedad que nadie adivina.
 */

/** 32 bytes aleatorios en base64url (43 caracteres). */
export function generarToken(): string {
  return randomBytes(32).toString('base64url')
}

export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}

/** Forma esperada de un token. Lo que no encaja no llega a tocar la base. */
const TOKEN_RE = /^[A-Za-z0-9_-]{32,128}$/

export function formaValida(token: string): boolean {
  return typeof token === 'string' && TOKEN_RE.test(token)
}

/**
 * Compara dos hashes hex en tiempo constante. Postgres ya filtró por
 * `token_hash`, así que esto es defensa en profundidad frente a un `=` que
 * cortocircuite; nunca compara el token en claro.
 */
export function hashesIguales(a: string, b: string): boolean {
  const bufA = Buffer.from(a, 'hex')
  const bufB = Buffer.from(b, 'hex')
  return bufA.length === bufB.length && timingSafeEqual(bufA, bufB)
}
