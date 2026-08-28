import { sql, type Db } from '../db/pool.ts'
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

export interface IngestFile {
  buffer: Buffer
  meta: IngestAttachmentPayload
}

/**
 * Vectoriza el contenido de una participación:
 *  - El texto de sus adjuntos PDF (si el archivo es PDF con capa de texto).
 *  - Sus campos de formulario (observación, nombre, colonia, institución...).
 * Acepta cualquier tipo de archivo permitido; solo intenta parsear texto en PDFs.
 * Cada sección se convierte en chunks con embedding TF-IDF 512D.
 */
export async function ingestParticipation(
  dbOrParticipationId: Db | number,
  participationIdOrFields: number | Record<string, string>,
  maybeFieldsOrFiles?: Record<string, string> | IngestFile[],
  maybeFiles?: IngestFile[],
): Promise<IngestResult> {
  const isDb = typeof dbOrParticipationId === 'function' && 'unsafe' in dbOrParticipationId
  const db: Db = isDb ? (dbOrParticipationId as Db) : sql
  const participationId = isDb
    ? (participationIdOrFields as number)
    : (dbOrParticipationId as number)
  const fields = isDb
    ? (maybeFieldsOrFiles as Record<string, string>)
    : (participationIdOrFields as Record<string, string>)
  const files = isDb ? maybeFiles : (maybeFieldsOrFiles as IngestFile[] | undefined)

  let chunks = 0
  let needsOcr = false

  // 1) Adjuntos: guardar registro + vectorizar si es PDF
  for (const file of files ?? []) {
    await db`--sql
      INSERT INTO attachments (participation_id, nombre_original, mime, size, ruta_local)
      VALUES (
        ${participationId},
        ${file.meta.nombreOriginal},
        ${file.meta.mime},
        ${file.buffer.length},
        ${file.meta.rutaLocal}
      )
    `

    // Solo extraer texto si el adjunto es PDF (no intentar parsear DWG, JPG, etc.)
    const isPdf =
      file.meta.mime === 'application/pdf' ||
      file.meta.nombreOriginal.toLowerCase().endsWith('.pdf')

    let text = ''
    if (isPdf) {
      try {
        text = await extractPdfText(file.buffer)
      } catch (err) {
        // Si el PDF es un escaneo, solo imágenes o no tiene capa de texto,
        // no fallamos la transacción: el archivo se preserva y se marca para OCR.
        needsOcr = true
      }
    }

    if (text) {
      for (const chunk of chunkText(text)) {
        const cleanContent = chunk.content.replace(/\0/g, '').trim()
        if (cleanContent) {
          await insertChunk(db, participationId, chunk.position, cleanContent)
          chunks++
        }
      }
    }
  }

  // 2) Campos del formulario (siempre)
  const formText = Object.entries(fields ?? {})
    .filter(([, v]) => v && v.trim())
    .map(([k, v]) => `${k}: ${v}`)
    .join('\n')

  if (formText) {
    for (const chunk of chunkText(formText, 512)) {
      const cleanFormContent = chunk.content.replace(/\0/g, '').trim()
      if (cleanFormContent) {
        await insertChunk(db, participationId, chunks + chunk.position, cleanFormContent)
        chunks++
      }
    }
  }

  return { chunks, needsOcr }
}

async function insertChunk(db: Db, participationId: number, position: number, content: string) {
  const sanitized = content.replace(/\0/g, '').trim()
  if (!sanitized) return
  const terms = [...new Set(tokenize(sanitized))]
  const idfWeights = await getIdfMap(terms)
  const vector = featurizeWeighted(sanitized, idfWeights)
  await db`--sql
    INSERT INTO participation_chunks (participation_id, position, content, embedding)
    VALUES (${participationId}, ${position}, ${sanitized}, ${toVectorLiteral(vector)}::vector)
  `
}
