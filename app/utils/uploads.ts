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
