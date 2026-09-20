import * as XLSX from 'xlsx'

import { sql } from '../db/pool.ts'

/**
 * Exportación de tablas a Excel (.xlsx).
 * Lista blanca: solo estas tablas son exportables (nunca interpolar SQL
 * con el nombre que llegue por la URL).
 */

export const EXPORTABLE = {
  actividades: {
    sheet: 'Actividades y avances',
    fetch: () =>
      sql<
        Array<{
          titulo: string
          fase: string
          tipo: string
          estado: string
          fecha: string
          hora_inicio: string
          hora_fin: string
          lugar: string
          direccion: string
          publicacion: string
          aviso: string
          archivos: number
        }>
      >`SELECT a.titulo, a.fase, a.tipo, a.estado, a.fecha::text AS fecha, a.hora_inicio, a.hora_fin,
               a.lugar, a.direccion, a.publicacion,
               CASE WHEN a.aviso_activo
                    THEN COALESCE(NULLIF(a.aviso_titulo, ''), a.titulo) || ' (' || a.aviso_inicio || ' a ' || a.aviso_fin || ')'
                    ELSE '' END AS aviso,
               (SELECT count(*) FROM actividad_archivos f WHERE f.actividad_id = a.id)::int AS archivos
         FROM actividades a ORDER BY a.fecha DESC, a.hora_inicio DESC`,
  },
  participaciones: {
    sheet: 'Participaciones',
    fetch: () =>
      sql<
        Array<{
          id: string
          folio: string
          origen: string
          nombre: string
          correo: string
          estado: string
          created_at: string
        }>
      >`SELECT id::text AS id, folio, origen, nombre, correo, estado, created_at::text AS created_at
         FROM participations ORDER BY id DESC`,
  },
  usuarios: {
    sheet: 'Usuarios',
    fetch: () =>
      sql<
        Array<{ id: string; email: string; name: string; role: string; created_at: string }>
      >`SELECT id::text AS id, email, name, role, created_at::text AS created_at FROM users ORDER BY id`,
  },
} as const

export type ExportableTable = keyof typeof EXPORTABLE

export function isExportable(table: string): table is ExportableTable {
  return Object.prototype.hasOwnProperty.call(EXPORTABLE, table)
}

/**
 * Genera el .xlsx de una tabla exportable como Buffer.
 * Encabezados = nombres de columnas del primer row (postgres.js devuelve
 * claves snake_case estables).
 */
export async function exportTableToXlsx(table: ExportableTable): Promise<Buffer> {
  const { sheet, fetch } = EXPORTABLE[table]
  const rows = (await fetch()) as Array<Record<string, unknown>>

  const data = rows.length > 0 ? rows : [{ sin: 'registros' }]
  const worksheet = XLSX.utils.json_to_sheet(data, {
    header: Object.keys(data[0]),
  })
  worksheet['!cols'] = Object.keys(data[0]).map(() => ({ wch: 22 }))

  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, sheet)

  const out = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' }) as Buffer
  return out
}
