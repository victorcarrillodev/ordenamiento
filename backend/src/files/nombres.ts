import { randomBytes } from 'node:crypto'

/**
 * Extrae la extensión en minúsculas tras limpiar rutas.
 */
export function obtenerExtension(nombre: string): string {
  const base = nombre.split(/[\\/]/).pop() ?? ''
  const parts = base.split('.')
  if (parts.length < 2) return ''
  return (parts.pop() ?? '').toLowerCase()
}

/**
 * Sanitiza un nombre de archivo contra path traversal, inyección de cabeceras
 * y caracteres de control, preservando la extensión y truncando a un máximo de bytes.
 */
export function sanitizarNombre(nombre: string, maxBytes = 200): string {
  let base = nombre.split(/[\\/]/).pop() ?? ''

  // Elimina caracteres de control (ASCII <= 31 y 127)
  base = Array.from(base)
    .filter((ch) => {
      const code = ch.codePointAt(0) ?? 0
      return code > 31 && code !== 127
    })
    .join('')

  // Reemplaza caracteres no permitidos
  base = base.replace(/[^a-zA-Z0-9_.()[\] áéíóúÁÉÍÓÚñÑüÜ-]/g, '_')
  base = base.replace(/^[.\s-]+/, '') // sin puntos/espacios/guiones iniciales
  base = base.replace(/\.{2,}/g, '.') // sin puntos consecutivos (traversal)

  const encoder = new TextEncoder()
  if (encoder.encode(base).length > maxBytes) {
    const ext = obtenerExtension(base)
    const dotExt = ext ? `.${ext}` : ''
    const extBytes = encoder.encode(dotExt).length

    // Truncar cuidando límites de caracteres UTF-8
    let truncated = ''
    for (const char of base.slice(0, base.length - dotExt.length)) {
      if (encoder.encode(truncated + char).length + extBytes > maxBytes) {
        break
      }
      truncated += char
    }
    base = `${truncated}${dotExt}`
  }

  return base || 'archivo'
}

/**
 * Genera un nombre de archivo seguro y único para disco: `${ahora}-${hash6}-${sanitizado}`
 */
export function nombreEnDisco(nombre: string, ahora: number = Date.now()): string {
  const hash = randomBytes(3).toString('hex')
  const seguro = sanitizarNombre(nombre)
  return `${ahora}-${hash}-${seguro}`
}

/**
 * Genera una cabecera Content-Disposition segura (RFC 5987).
 */
export function contentDisposition(nombre: string, modo: 'inline' | 'attachment'): string {
  const safeAscii = nombre.replace(/["\\]/g, '_').replace(/[\r\n]/g, '')
  const encodedUtf8 = encodeURIComponent(safeAscii).replace(
    /['()*]/g,
    (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`,
  )
  return `${modo}; filename="${safeAscii}"; filename*=UTF-8''${encodedUtf8}`
}
