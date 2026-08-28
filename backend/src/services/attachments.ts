import { sql, type Db } from '../db/pool.ts'

export interface AttachmentMeta {
  nombreOriginal: string
  mime: string
  size: number
  rutaLocal: string
}

/**
 * Registra metadatos de archivos adjuntos en la base de datos dentro de una transacción o con el pool por defecto.
 */
export async function registrarAdjuntos(
  dbOrParticipationId: Db | number,
  participationIdOrAdjuntos: number | AttachmentMeta[],
  maybeAdjuntos?: AttachmentMeta[],
): Promise<void> {
  const isDb = typeof dbOrParticipationId === 'function' && 'unsafe' in dbOrParticipationId
  const db: Db = isDb ? (dbOrParticipationId as Db) : sql
  const participationId = isDb
    ? (participationIdOrAdjuntos as number)
    : (dbOrParticipationId as number)
  const adjuntos = isDb
    ? (maybeAdjuntos as AttachmentMeta[])
    : (participationIdOrAdjuntos as AttachmentMeta[])

  for (const adj of adjuntos ?? []) {
    await db`--sql
      INSERT INTO attachments (participation_id, nombre_original, mime, size, ruta_local)
      VALUES (
        ${participationId},
        ${adj.nombreOriginal},
        ${adj.mime},
        ${adj.size},
        ${adj.rutaLocal}
      )
    `
  }
}
