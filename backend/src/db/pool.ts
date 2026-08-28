import postgres, { type Sql, type TransactionSql } from 'postgres'

/**
 * Handle de base de datos que aceptan los servicios.
 *
 * Cubre tanto el pool como una transacción abierta con `sql.begin()`, para que
 * el mismo servicio sirva dentro y fuera de una transacción.
 */
export type Db = Sql | TransactionSql

const DATABASE_URL =
  process.env.DATABASE_URL ?? 'postgres://postgres:postgres@localhost:5432/ordenamiento'

export const sql = postgres(DATABASE_URL, {
  max: 10,
  // Tolerancia a picos: bajo ráfaga, las conexiones ociosas se sueltan en vez
  // de acumularse y un intento de conexión no se cuelga indefinidamente.
  idle_timeout: 30,
  connect_timeout: 10,
  max_lifetime: 60 * 30,
  // No usamos prepared statements por defecto para máxima compatibilidad
  prepare: false,
})
