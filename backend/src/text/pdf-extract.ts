import pdfParse from 'pdf-parse'

/**
 * Extrae texto de un PDF digital (con texto seleccionable).
 * Lanza si el PDF no tiene capa de texto (escaneo puro).
 */
export async function extractPdfText(buffer: Buffer): Promise<string> {
  const data = await pdfParse(buffer)
  const text = (data.text ?? '').trim()
  if (!text) {
    throw new TextLayerMissingError()
  }
  return text
}

export class TextLayerMissingError extends Error {
  constructor() {
    super('El PDF no tiene capa de texto (posible escaneo). Se requiere OCR.')
    this.name = 'TextLayerMissingError'
  }
}
