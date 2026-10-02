export const MAX_FILE_MB = Number(process.env.MAX_UPLOAD_MB ?? 100)
export const MAX_FILES = Number(process.env.MAX_UPLOAD_FILES ?? 5)
export const MAX_FILE_BYTES = MAX_FILE_MB * 1024 * 1024
export const MAX_TOTAL_BYTES = MAX_FILE_BYTES * MAX_FILES
export const UPLOAD_TIMEOUT_MS = 5 * 60 * 1000
export const ACCEPTED_UPLOADS =
  '.pdf,.doc,.docx,.odt,.rtf,.txt,.csv,.md,.xls,.xlsx,.ods,.ppt,.pptx,.odp,.jpg,.jpeg,.png,.webp,.gif,.bmp,.tif,.tiff,.ico,.dwg,.shp,.shx,.gpkg,.zip,.kmz,.rar,.7z,.dbf,.mp3,.wav,.mp4,.mov,.avi,.mkv'

/**
 * Formatos con que se ilustra la convocatoria en la portada. Los admitidos
 * son todos los de `ACCEPTED_UPLOADS`; estos solo dan una idea de qué se puede
 * enviar, así que no se duplica la lista completa.
 */
export const FORMATOS_DESTACADOS = ['.PDF', '.SHP', '.JPG', '.DWG'] as const

/**
 * «Hasta 5 archivos de 100 MB cada uno». Es la única redacción de la cantidad y
 * el peso máximos: la portada, el formulario ciudadano y las capturas del panel
 * la toman de aquí, de modo que una cifra distinta en una pantalla no se
 * produzca por haberla escrito a mano.
 */
export function textoCantidadYPeso(maxMb = MAX_FILE_MB, maxFiles = MAX_FILES): string {
  const archivos = maxFiles === 1 ? '1 archivo' : `${maxFiles} archivos`
  return `Hasta ${archivos} de ${maxMb} MB ${maxFiles === 1 ? '' : 'cada uno'}`.trim()
}

/**
 * Genera el texto legible de límites para la interfaz ciudadana derivado de la configuración.
 * Lista alineada con la whitelist real de backend/src/services/upload-guard.ts (ALLOWED_MIMES).
 */
export function textoLimites(maxMb = MAX_FILE_MB, maxFiles = MAX_FILES): string {
  return `PDF, DOC(X), XLS(X), PPT(X), ODT/ODS/ODP, RTF, TXT, CSV, MD, JPG, PNG, GIF, WEBP, BMP, TIFF, ICO, DWG, SHP/SHX/DBF, GeoPackage (GPKG), KMZ, ZIP, RAR, 7Z, MP3, WAV, MP4, MOV, AVI, MKV · hasta ${maxMb} MB por archivo, máximo ${maxFiles}`
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
