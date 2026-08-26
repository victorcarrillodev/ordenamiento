export const MAX_UPLOAD_MB = Number(process.env.MAX_UPLOAD_MB ?? 50)
export const MAX_UPLOAD_FILES = Number(process.env.MAX_UPLOAD_FILES ?? 5)
export const MAX_FILE_BYTES = MAX_UPLOAD_MB * 1024 * 1024
export const MAX_TOTAL_BYTES = MAX_FILE_BYTES * MAX_UPLOAD_FILES

export interface ResultadoValidacion {
  ok: boolean
  codigo?: number
  reason?: string
}

/**
 * Valida límites de tamaño y cantidad para archivos adjuntos.
 */
export function validarAdjunto(
  file: { size: number; name?: string },
  totalCount: number,
  maxBytes = MAX_FILE_BYTES,
  maxFiles = MAX_UPLOAD_FILES,
): ResultadoValidacion {
  if (totalCount > maxFiles) {
    return {
      ok: false,
      codigo: 400,
      reason: `Máximo ${maxFiles} archivos por participación`,
    }
  }
  if (file.size <= 0) {
    return {
      ok: false,
      codigo: 400,
      reason: 'El archivo está vacío',
    }
  }
  if (file.size > maxBytes) {
    const mb = Math.round(maxBytes / (1024 * 1024))
    return {
      ok: false,
      codigo: 413,
      reason: `Archivo demasiado grande (máx ${mb} MB): ${file.name ?? 'archivo'}`,
    }
  }
  return { ok: true }
}
