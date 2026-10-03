/**
 * «Participaciones y respuestas», vistas desde el portal. Lo público es lo
 * mínimo: folio, fecha de recepción y, si ya se publicó, el oficio de respuesta
 * con su número y fecha (ver backend/src/services/publicas.ts).
 */

export const TITULO_PARTICIPACIONES = 'Participaciones y respuestas'

export const TEXTO_PARTICIPACIONES =
  'Consulta las versiones públicas de las participaciones recibidas durante la consulta pública, así como los oficios de respuesta correspondientes.'

export const INDICACION_BUSCADOR = 'Ingresa el folio de participación'

export const RESPUESTA_PENDIENTE = 'Respuesta pendiente de publicación'

export interface RegistroPublico {
  folio: string
  /** Fecha de recepción, `AAAA-MM-DD`. */
  fecha: string
  oficio: { numero: string; fecha: string | null } | null
}

export interface PaginaPublica {
  items: RegistroPublico[]
  total: number
  page: number
  limit: number
}

export const PAGINA_VACIA: PaginaPublica = { items: [], total: 0, page: 1, limit: 10 }

/** Ventana de páginas: las dos extremas, el rango alrededor de la actual y «…» en los huecos. */
export function paginasVisibles(actual: number, total: number): Array<number | '…'> {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1)
  const resultado: Array<number | '…'> = [1]
  const inicio = Math.max(2, actual - 1)
  const fin = Math.min(total - 1, actual + 1)
  if (inicio > 2) resultado.push('…')
  for (let i = inicio; i <= fin; i++) resultado.push(i)
  if (fin < total - 1) resultado.push('…')
  resultado.push(total)
  return resultado
}
