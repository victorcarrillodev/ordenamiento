/**
 * Constancia de los correos que se envían a quien participó: el acuse al
 * registrar y la respuesta que manda el área responsable. Cada intento deja su
 * fecha, hora, destino y resultado, y si falló, por qué, para que el panel lo
 * muestre y se pueda reintentar con conocimiento de causa.
 */
import { sql, type Db } from '../db/pool.ts'
import { linea } from './texto.ts'

export type TipoEnvio = 'acuse' | 'respuesta'
export type ResultadoEnvio = 'enviado' | 'error'

export interface Envio {
  id: string
  participation_id: string
  tipo: TipoEnvio
  para: string
  asunto: string
  resultado: ResultadoEnvio
  /** Si falló, el motivo; vacío si salió bien. */
  detalle: string
  /** Quién lo envió; vacío si salió solo (el acuse) o esa cuenta ya no existe. */
  enviado_por: string
  created_at: string
}

interface Fila extends Omit<Envio, 'created_at'> {
  created_at: Date
}

const LARGO_DETALLE = 300

/** El motivo de un fallo como texto de una línea y de largo acotado: lo escribe el servidor SMTP, no confiamos en él. */
export function detalleDeError(err: unknown): string {
  const texto = err instanceof Error ? err.message : String(err)
  return linea(texto).slice(0, LARGO_DETALLE)
}

export interface NuevoEnvio {
  participationId: string
  tipo: TipoEnvio
  para: string
  asunto: string
  resultado: ResultadoEnvio
  detalle?: string
  enviadoPor?: string | null
}

export async function registrarEnvio(entrada: NuevoEnvio, db: Db = sql): Promise<Envio> {
  const filas = await db.unsafe<Fila[]>(
    `WITH nuevo AS (
       INSERT INTO participacion_envios
         (participation_id, tipo, para, asunto, resultado, detalle, enviado_por)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *
     )
     SELECT n.id::text AS id, n.participation_id::text AS participation_id, n.tipo, n.para,
            n.asunto, n.resultado, n.detalle, COALESCE(u.name, '') AS enviado_por, n.created_at
       FROM nuevo n LEFT JOIN users u ON u.id = n.enviado_por`,
    [
      entrada.participationId,
      entrada.tipo,
      entrada.para,
      entrada.asunto,
      entrada.resultado,
      entrada.detalle ?? '',
      entrada.enviadoPor ?? null,
    ],
  )
  return aEnvio(filas[0])
}

const aEnvio = (f: Fila): Envio => ({ ...f, created_at: new Date(f.created_at).toISOString() })

/** Los envíos de una participación, del más reciente al más antiguo. */
export async function listarEnvios(participationId: string): Promise<Envio[]> {
  const filas = await sql<Fila[]>`
    SELECT e.id::text AS id, e.participation_id::text AS participation_id, e.tipo, e.para, e.asunto,
           e.resultado, e.detalle, COALESCE(u.name, '') AS enviado_por, e.created_at
      FROM participacion_envios e LEFT JOIN users u ON u.id = e.enviado_por
     WHERE e.participation_id = ${participationId}
     ORDER BY e.created_at DESC
     LIMIT 50
  `
  return filas.map(aEnvio)
}
