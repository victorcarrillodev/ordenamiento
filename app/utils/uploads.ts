export const MAX_FILE_MB = Number(process.env.MAX_UPLOAD_MB ?? 50)
export const MAX_FILES = Number(process.env.MAX_UPLOAD_FILES ?? 5)
export const MAX_FILE_BYTES = MAX_FILE_MB * 1024 * 1024
export const MAX_TOTAL_BYTES = MAX_FILE_BYTES * MAX_FILES

/**
 * Genera el texto legible de límites para la interfaz ciudadana derivado de la configuración.
 */
export function textoLimites(maxMb = MAX_FILE_MB, maxFiles = MAX_FILES): string {
  return `PDF, SHP, JPG, DWG · hasta ${maxMb} MB por archivo, máximo ${maxFiles}`
}
