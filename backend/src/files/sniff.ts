export interface TipoDetectado {
  mime: string
  extension: string
}

function startsWith(bytes: Uint8Array, pattern: number[], offset = 0): boolean {
  if (bytes.length < offset + pattern.length) return false
  return pattern.every((b, i) => bytes[offset + i] === b)
}

function asciiAt(bytes: Uint8Array, offset: number, text: string): boolean {
  if (bytes.length < offset + text.length) return false
  for (let i = 0; i < text.length; i++) {
    if (bytes[offset + i] !== text.charCodeAt(i)) return false
  }
  return true
}

/**
 * Lee solo los primeros bytes para determinar el tipo real por magic bytes.
 * Devuelve null si el contenido no coincide con ningún tipo permitido en la whitelist.
 */
export function detectarTipo(cabecera: Uint8Array, nombre: string): TipoDetectado | null {
  if (!cabecera || cabecera.length === 0) return null

  // PDF: %PDF- (25 50 44 46 2D) en los primeros 1024 bytes (tolerancia a basura inicial)
  const sampleLimit = Math.min(cabecera.length, 1024)
  for (let i = 0; i <= sampleLimit - 5; i++) {
    if (
      cabecera[i] === 0x25 &&
      cabecera[i + 1] === 0x50 &&
      cabecera[i + 2] === 0x44 &&
      cabecera[i + 3] === 0x46 &&
      cabecera[i + 4] === 0x2d
    ) {
      return { mime: 'application/pdf', extension: 'pdf' }
    }
  }

  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (startsWith(cabecera, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) {
    return { mime: 'image/png', extension: 'png' }
  }

  // JPEG: FF D8 FF
  if (startsWith(cabecera, [0xff, 0xd8, 0xff])) {
    return { mime: 'image/jpeg', extension: 'jpg' }
  }

  // ZIP (DOCX, XLSX, KMZ, SHP comprimido): 50 4B 03 04 o 50 4B 05 06
  if (
    startsWith(cabecera, [0x50, 0x4b, 0x03, 0x04]) ||
    startsWith(cabecera, [0x50, 0x4b, 0x05, 0x06])
  ) {
    const ext = nombre.toLowerCase().split('.').pop() ?? ''
    if (ext === 'docx') {
      return {
        mime: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        extension: 'docx',
      }
    }
    if (ext === 'xlsx') {
      return {
        mime: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        extension: 'xlsx',
      }
    }
    if (ext === 'kmz') {
      return { mime: 'application/vnd.google-earth.kmz', extension: 'kmz' }
    }
    return { mime: 'application/zip', extension: 'zip' }
  }

  // DWG: 41 43 31 30 (AC10)
  if (asciiAt(cabecera, 0, 'AC10')) {
    return { mime: 'image/vnd.dwg', extension: 'dwg' }
  }

  // Shapefile (.shp/.shx): 00 00 27 0A big-endian en offset 0
  if (startsWith(cabecera, [0x00, 0x00, 0x27, 0x0a])) {
    const ext = nombre.toLowerCase().split('.').pop() ?? ''
    return { mime: 'application/octet-stream', extension: ext === 'shx' ? 'shx' : 'shp' }
  }

  // DBF: 03, 05 o 30 en offset 0
  if (
    (cabecera[0] === 0x03 || cabecera[0] === 0x05 || cabecera[0] === 0x30) &&
    cabecera.length >= 32
  ) {
    const ext = nombre.toLowerCase().split('.').pop() ?? ''
    if (ext === 'dbf') {
      return { mime: 'application/octet-stream', extension: 'dbf' }
    }
  }

  return null
}
