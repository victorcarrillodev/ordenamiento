import { describe, expect, it } from 'bun:test'
import { extractPdfText, TextLayerMissingError } from './pdf-extract.ts'

describe('text/pdf-extract', () => {
  it('lanza TextLayerMissingError para buffers vacíos o no válidos (PDF de solo imágenes o corrupto)', async () => {
    const fakeImagePdf = Buffer.from('%PDF-1.4 ... fake binary stream without text layer ...')
    await expect(extractPdfText(fakeImagePdf)).rejects.toThrow(TextLayerMissingError)
  })

  it('sanitiza texto eliminando bytes nulos (0x00) incompatibles con PostgreSQL', async () => {
    // Si data.text devuelve texto con \x00, debe removerse
    const textWithNulls = 'Propuesta de Ordenamiento Territorial\x00 para la Zona Metropolitana\x00'
    const cleaned = textWithNulls.replace(/\0/g, '').replace(/[\u0001-\u0008\u000B\u000C\u000E-\u001F]/g, '').trim()
    expect(cleaned).toBe('Propuesta de Ordenamiento Territorial para la Zona Metropolitana')
    expect(cleaned.includes('\0')).toBe(false)
  })
})
