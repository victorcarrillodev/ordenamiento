export const MAX_FILE_MB = Number(process.env.MAX_UPLOAD_MB ?? 50)
export const MAX_FILES = Number(process.env.MAX_UPLOAD_FILES ?? 5)
export const MAX_FILE_BYTES = MAX_FILE_MB * 1024 * 1024
export const MAX_TOTAL_BYTES = MAX_FILE_BYTES * MAX_FILES

/**
 * Genera el texto legible de límites para la interfaz ciudadana derivado de la configuración.
 * Lista alineada con la whitelist real de backend/src/services/upload-guard.ts (ALLOWED_MIMES).
 */
export function textoLimites(maxMb = MAX_FILE_MB, maxFiles = MAX_FILES): string {
  return `PDF, DOC(X), XLS(X), PPT(X), ODT/ODS/ODP, RTF, TXT, CSV, MD, JPG, PNG, GIF, WEBP, BMP, TIFF, ICO, DWG, SHP/SHX/DBF, KMZ, ZIP, RAR, 7Z, MP3, WAV, MP4, MOV, AVI, MKV · hasta ${maxMb} MB por archivo, máximo ${maxFiles}`
}

/**
 * Extrae la extensión final en minúsculas tras limpiar rutas (`foto.jpg.php` -> `php`).
 *
 * Espejo de `getExtension` en backend/src/services/upload-guard.ts (misma lógica de
 * seguridad). Se duplica a propósito en el frontend para NO acoplar el build web al
 * directorio `backend/` (el Dockerfile de la web solo copia `app/`, `public/`, `scripts/`).
 */
export function getExtension(filename: string): string {
  const base = filename.split(/[\\/]/).pop() ?? ''
  const parts = base.split('.')
  if (parts.length < 2) return ''
  return (parts.pop() ?? '').toLowerCase()
}

/**
 * Sanea un nombre de archivo original para mostrarlo/guardarlo:
 * sin rutas, sin caracteres de control, sin prefijos peligrosos, largo acotado.
 *
 * Espejo de `sanitizeFilename` en backend/src/services/upload-guard.ts. Igual que
 * `getExtension`, se duplica en el frontend para evitar la dependencia cruzada FE→BE
 * que rompía el arranque del contenedor web (ERR_MODULE_NOT_FOUND en Docker).
 */
export function sanitizeFilename(filename: string): string {
  let base = filename.split(/[\\/]/).pop() ?? ''
  // Elimina caracteres de control (incluye CRLF: evita inyección de cabeceras).
  base = Array.from(base)
    .filter((ch) => {
      const code = ch.codePointAt(0) ?? 0
      return code > 31 && code !== 127
    })
    .join('')
  base = base.replace(/[^a-zA-Z0-9_.()[\] áéíóúÁÉÍÓÚñÑüÜ-]/g, '_')
  base = base.replace(/^[.\s-]+/, '') // sin puntos/espacios/guiones iniciales
  base = base.replace(/\.{2,}/g, '.') // sin puntos consecutivos (traversal)
  if (base.length > 120) {
    const ext = getExtension(base)
    base = `${base.slice(0, 120 - ext.length - 1)}.${ext}`
  }
  return base || 'archivo'
}
