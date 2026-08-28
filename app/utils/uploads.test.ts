import { describe, expect, it } from 'vitest'
import { MAX_FILE_BYTES, MAX_FILE_MB, MAX_FILES, MAX_TOTAL_BYTES, textoLimites } from './uploads.ts'

describe('uploads utils', () => {
  it('calcula los bytes a partir de los MB y número de archivos', () => {
    expect(MAX_FILE_BYTES).toBe(MAX_FILE_MB * 1024 * 1024)
    expect(MAX_TOTAL_BYTES).toBe(MAX_FILE_BYTES * MAX_FILES)
  })

  it('genera el texto de límites derivado correctamente', () => {
    const texto = textoLimites(50, 5)
    expect(texto).toBe('PDF, SHP, JPG, DWG · hasta 50 MB por archivo, máximo 5')
  })
})
