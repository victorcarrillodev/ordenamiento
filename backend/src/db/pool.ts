import postgres from 'postgres'

const DATABASE_URL =
  process.env.DATABASE_URL ?? 'postgres://postgres:postgres@localhost:5432/ordenamiento'

export const sql = postgres(DATABASE_URL, {
  max: 10,
  // No usamos prepared statements por defecto para máxima compatibilidad
  prepare: false,
})
