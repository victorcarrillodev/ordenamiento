import pdfParse from 'pdf-parse'

/**
 * Extrae texto de un PDF digital (con texto seleccionable).
 * Lanza TextLayerMissingError si el PDF no tiene capa de texto (solo imágenes / escaneo).
 * Sanitiza caracteres nulos (0x00) y de control para evitar fallos de codificación en PostgreSQL.
 */
export async function extractPdfText(buffer: Buffer): Promise<string> {
  try {
    const data = await pdfParse(buffer)
    const raw = (data.text ?? '')
      // Elimina bytes nulos 0x00 que provocan error 22021 en PostgreSQL
      .replace(/\0/g, '')
      // Elimina caracteres de control no imprimibles excepto tabuladores y saltos de línea
      .replace(/[\u0001-\u0008\u000B\u000C\u000E-\u001F]/g, '')
      .trim()

    if (!raw) {
      throw new TextLayerMissingError()
    }
    return raw
  } catch (err) {
    if (err instanceof TextLayerMissingError) {
      throw err
    }
    throw new TextLayerMissingError(
      err instanceof Error ? err.message : 'No fue posible extraer capa de texto del PDF (posible imagen)',
    )
  }
}

export class TextLayerMissingError extends Error {
  constructor(message = 'El PDF no tiene capa de texto (posible escaneo o solo imágenes). Se requiere OCR.') {
    super(message)
    this.name = 'TextLayerMissingError'
  }
}

