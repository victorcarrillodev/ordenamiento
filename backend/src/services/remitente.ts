/**
 * Remitente de los correos del portal.
 *
 * Todo lo que el portal envía —acuses, respuestas, avisos, restablecimientos de
 * contraseña, bienvenidas— sale del correo de contacto oficial del pie de página
 * (`usuario.textos.footerEmail`, que se edita en Personalización → Textos del
 * portal). Así quien recibe un mensaje ve el mismo buzón que el portal publica, y
 * cambiarlo en el panel cambia los dos a la vez; no hay otro dato que mantener.
 *
 * Lo que sí varía es el nombre que acompaña a la dirección: los mensajes de la
 * consulta pública firman como la consulta y el resto como la Bitácora.
 */
import { logger } from '../utils.ts'
import { getCustomizations } from './customizations.ts'

/** Lo que el pie de página muestra mientras el campo está vacío. */
export const CORREO_DE_CONTACTO_POR_DEFECTO = 'ordenamiento@tlaquepaque.gob.mx'

/** Nombre que acompaña a la dirección según el tipo de mensaje. */
export const NOMBRE_REMITENTE = {
  portal: 'Bitácora Tlaquepaque',
  consulta: 'Consulta pública POETDUM',
} as const

/**
 * Forma de una dirección que puede ir en el encabezado `From:`. Es más estricta
 * que la de un formulario a propósito: esta se escribe en un encabezado, y los
 * espacios, comillas, ángulos o comas permitirían meter otros destinatarios o
 * encabezados.
 */
const CORREO_RE = /^[^\s@<>()[\]\\,;:"]+@[A-Za-z0-9](?:[A-Za-z0-9.-]*[A-Za-z0-9])?\.[A-Za-z]{2,}$/

/** ¿Es una dirección que el portal puede usar como remitente? */
export function esCorreoDeContactoValido(valor: unknown): boolean {
  return typeof valor === 'string' && valor.length <= 254 && CORREO_RE.test(valor)
}

/**
 * La dirección que muestra el pie de página: la que se escribió, o la de fábrica
 * mientras el campo esté vacío. Es la misma cuenta de dónde salen los correos.
 */
export function correoDelPie(textos?: { footerEmail?: unknown } | null): string {
  const escrito = typeof textos?.footerEmail === 'string' ? textos.footerEmail.trim() : ''
  return escrito === '' ? CORREO_DE_CONTACTO_POR_DEFECTO : escrito
}

/**
 * Motivo por el que lo que viene en una configuración a guardar no sirve como
 * correo de contacto, o `null` si no hay nada que objetar (también cuando la
 * configuración no toca ese campo). Se usa al guardar para que un valor que no
 * es una dirección no llegue a publicarse en el pie ni a usarse como remitente.
 */
export function errorDelCorreoDelPie(config: unknown): string | null {
  const textos = (config as { usuario?: { textos?: { footerEmail?: unknown } } } | null)?.usuario
    ?.textos
  if (!textos || !('footerEmail' in textos)) return null
  const valor = textos.footerEmail
  if (valor === undefined || valor === null) return null
  if (typeof valor !== 'string') return 'El correo de contacto oficial debe ser un texto.'
  const limpio = valor.trim()
  if (limpio === '' || esCorreoDeContactoValido(limpio)) return null
  return (
    'El correo de contacto oficial no es una dirección válida (por ejemplo, ' +
    `${CORREO_DE_CONTACTO_POR_DEFECTO}). También es el remitente de los correos del portal, ` +
    'así que debe ser solo una dirección, sin otros textos.'
  )
}

/**
 * Valor de `from` para un correo del portal: «Nombre» <correo del pie>. Lee el
 * correo del pie de la personalización en el momento de enviar, de modo que un
 * cambio hecho en el panel aplica al siguiente correo sin reiniciar nada.
 *
 * Si lo guardado no es una dirección (datos de antes de que se validara al
 * guardar), manda desde la de fábrica y lo deja en el registro en vez de dejar
 * sin correo a quien lo espera.
 */
export async function remitenteDelPortal(
  nombre: string = NOMBRE_REMITENTE.portal,
): Promise<string> {
  const { usuario } = await getCustomizations()
  const direccion = correoDelPie(usuario?.textos)

  if (esCorreoDeContactoValido(direccion)) return `"${nombre}" <${direccion}>`

  logger.warn(
    'remitente',
    `El correo de contacto del pie de página («${direccion.slice(0, 80)}») no es una dirección ` +
      `válida; los correos salen de ${CORREO_DE_CONTACTO_POR_DEFECTO}. Corrígelo en ` +
      'Personalización → Textos del portal → Pie de página.',
  )
  return `"${nombre}" <${CORREO_DE_CONTACTO_POR_DEFECTO}>`
}
