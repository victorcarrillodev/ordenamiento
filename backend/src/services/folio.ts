import { sql, type Db } from '../db/pool.ts'

/** `SPAGU-DGTPU-E-0018`: prefijo del área y consecutivo de cuatro dígitos. */
export const formatoDeFolio = (numero: number) => `SPAGU-DGTPU-E-${String(numero).padStart(4, '0')}`

/**
 * Siguiente folio, tomado de una secuencia (ver schema.sql). Cada llamada
 * consume un número aunque después la operación falle: un folio puede quedar sin
 * usar, pero nunca se entrega el mismo a dos participaciones ni se pisa el de un
 * formato que se imprimió y todavía no regresa. Contar filas, como antes, hacía
 * ambas cosas.
 *
 * Admite una transacción para que el folio y la participación que lo usa vayan
 * juntos.
 */
export async function nextFolio(db: Db = sql): Promise<string> {
  const filas = await db<{ n: string }[]>`SELECT nextval('folios_participacion')::text AS n`
  return formatoDeFolio(Number(filas[0].n))
}
