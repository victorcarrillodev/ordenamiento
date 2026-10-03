/**
 * Enlace de descarga del acuse para quien acaba de participar.
 *
 * Quien participa no tiene cuenta, y el folio es consecutivo (`…-E-0018`): si el
 * acuse se descargara solo con el folio, cualquiera podría bajar los de los
 * demás —con nombre, correo y propuesta— probando folios. Por eso el enlace
 * lleva una firma HMAC del folio con la clave del servidor y una vigencia: solo
 * lo tiene quien recibió la confirmación (o el correo) de esa participación.
 *
 * El acuse también llega adjunto al correo, así que la vigencia es corta.
 */
import { createHmac, timingSafeEqual } from 'node:crypto'

/** Misma clave y mismo criterio que las cookies de sesión (ver auth/auth.ts). */
const SECRETO = process.env.SESSION_SECRET ?? 'cambia-este-secreto-en-produccion'

export const VIGENCIA_ACUSE_MS = 48 * 60 * 60 * 1000

function firma(folio: string, vence: number): string {
  // El prefijo separa esta firma de cualquier otra que use la misma clave.
  return createHmac('sha256', SECRETO).update(`acuse|${folio}|${vence}`).digest('base64url')
}

/** `<vence>.<firma>`: el momento en que deja de valer y la firma de folio + momento. */
export function firmarAcuse(folio: string, ahora = Date.now()): string {
  const vence = ahora + VIGENCIA_ACUSE_MS
  return `${vence}.${firma(folio, vence)}`
}

/** ¿Es `token` la firma vigente de este folio? */
export function acuseFirmaValida(folio: string, token: string, ahora = Date.now()): boolean {
  const punto = token.indexOf('.')
  if (punto <= 0) return false
  const vence = Number(token.slice(0, punto))
  if (!Number.isSafeInteger(vence) || vence < ahora) return false

  const recibida = Buffer.from(token.slice(punto + 1))
  const esperada = Buffer.from(firma(folio, vence))
  return recibida.length === esperada.length && timingSafeEqual(recibida, esperada)
}
