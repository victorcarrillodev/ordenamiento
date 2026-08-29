import * as XLSX from 'xlsx'

import { sql } from '../db/pool.ts'

/**
 * Exportación de tablas a Excel (.xlsx).
 * Lista blanca: solo estas tablas son exportables (nunca interpolar SQL
 * con el nombre que llegue por la URL).
 */

export const EXPORTABLE = {
  reuniones: {
    sheet: 'Reuniones',
    fetch: () =>
      sql<
        Array<{ id: string; titulo: string; fecha: string; hora_inicio: string; hora_fin: string }>
      >`SELECT id::text AS id, titulo, fecha::text AS fecha, hora_inicio, hora_fin FROM reuniones ORDER BY fecha DESC, id DESC`,
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
