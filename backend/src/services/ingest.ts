import { sql } from '../db/pool.ts'
import { chunkText } from '../text/chunk.ts'
import { extractPdfText, TextLayerMissingError } from '../text/pdf-extract.ts'
import { featurizeWeighted, toVectorLiteral, tokenize } from '../vector/tfidf.ts'
import { getIdfMap } from './knowledge.ts'

export interface IngestResult {
  chunks: number
  needsOcr: boolean
}

export interface IngestAttachmentPayload {
  nombreOriginal: string
  mime: string
  rutaLocal: string
}

/**
 * Vectoriza el contenido de una participación:
 *  - El texto de sus adjuntos PDF (si el archivo es PDF con capa de texto).
 *  - Sus campos de formulario (observación, nombre, colonia, institución...).
 * Acepta cualquier tipo de archivo; solo intenta parsear texto en PDFs.
 * Cada sección se convierte en chunks con embedding TF-IDF 512D.
 */
export async function ingestParticipation(
  participationId: number,
  fields: Record<string, string>,
  fileBuffer?: Buffer,
  fileMeta?: IngestAttachmentPayload,
): Promise<IngestResult> {
  let chunks = 0
  let needsOcr = false

  // 1) Adjunto: guardar registro + vectorizar si es PDF
  if (fileBuffer && fileMeta) {
    await sql`--sql
      INSERT INTO attachments (participation_id, nombre_original, mime, size, ruta_local)
      VALUES (
        ${participationId},
        ${fileMeta.nombreOriginal},
        ${fileMeta.mime},
        ${fileBuffer.length},
        ${fileMeta.rutaLocal}
      )
    `

    // Solo extraer texto si el adjunto es PDF (no intentar parsear DWG, JPG, etc.)
    const isPdf =
      fileMeta.mime === 'application/pdf' ||
      fileMeta.nombreOriginal.toLowerCase().endsWith('.pdf')

    let text = ''
    if (isPdf) {
      try {
        text = await extractPdfText(fileBuffer)
      } catch (err) {
        if (err instanceof TextLayerMissingError) {
          needsOcr = true
        } else {
          throw err
        }
      }
    }

    if (text) {
      for (const chunk of chunkText(text)) {
        await insertChunk(participationId, chunk.position, chunk.content)
        chunks++
      }
    }
  }

  // 2) Campos del formulario (siempre)
  const formText = Object.entries(fields)
    .filter(([, v]) => v && v.trim())
    .map(([k, v]) => `${k}: ${v}`)
    .join('\n')

  if (formText) {
    for (const chunk of chunkText(formText, 512)) {
      await insertChunk(participationId, chunks + chunk.position, chunk.content)
      chunks++
    }
  }

  return { chunks, needsOcr }
}

async function insertChunk(participationId: number, position: number, content: string) {
  const terms = [...new Set(tokenize(content))]
  const idfWeights = await getIdfMap(terms)
  const vector = featurizeWeighted(content, idfWeights)
  await sql`--sql
    INSERT INTO participation_chunks (participation_id, position, content, embedding)
    VALUES (${participationId}, ${position}, ${content}, ${toVectorLiteral(vector)}::vector)
  `
}
