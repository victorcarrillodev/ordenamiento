import { sql, type Db } from '../db/pool.ts'
import { extractPdfText } from '../text/pdf-extract.ts'

export interface IngestResult {
  /** Adjuntos de los que sí se pudo extraer capa de texto. */
  indexados: number
  /** Hubo al menos un PDF sin capa de texto (escaneo): solo se podrá ver/descargar. */
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
 * Registra los adjuntos de una participación y, si son PDF con capa de texto,
 * guarda ese texto en `attachments.texto_extraido` para poder buscarlo.
 *
 * No hay embeddings ni base vectorial: la columna generada `texto_tsv` (y la
 * `busqueda_tsv` de participations) indexan el contenido con full-text nativo
 * de Postgres, que es lo que consume `services/search.ts`.
 *
 * El archivo se preserva siempre, sea cual sea su tipo: un PDF escaneado o un
 * DWG simplemente no aporta texto buscable, pero se ve y se descarga igual.
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
  const files = isDb ? maybeFiles : (maybeFieldsOrFiles as IngestFile[] | undefined)

  let indexados = 0
  let needsOcr = false

  for (const file of files ?? []) {
    const esPdf =
      file.meta.mime === 'application/pdf' ||
      file.meta.nombreOriginal.toLowerCase().endsWith('.pdf')

    let texto = ''
    if (esPdf) {
      try {
        texto = await extractPdfText(file.buffer)
      } catch {
        // PDF escaneado o sin capa de texto: no se falla la transacción, el
        // archivo se conserva y queda marcado como pendiente de OCR.
        needsOcr = true
      }
    }

    // Postgres rechaza el byte nulo dentro de TEXT: hay PDFs que lo emiten.
    const limpio = texto.replace(/\0/g, '').trim()
    if (esPdf && !limpio) needsOcr = true
    if (limpio) indexados++

    await db`--sql
      INSERT INTO attachments (participation_id, nombre_original, mime, size, ruta_local, texto_extraido)
      VALUES (
        ${participationId},
        ${file.meta.nombreOriginal},
        ${file.meta.mime},
        ${file.buffer.length},
        ${file.meta.rutaLocal},
        ${limpio}
      )
    `
  }

  return { indexados, needsOcr }
}
