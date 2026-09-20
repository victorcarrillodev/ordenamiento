/**
 * Fechas del calendario de actividades.
 *
 * Todo trabaja sobre cadenas `YYYY-MM-DD` (días del calendario civil), nunca
 * sobre instantes: pasar '2026-09-20' por `new Date()` lo interpreta como
 * medianoche UTC, que en Guadalajara todavía es el día 19.
 */

export const MESES = [
  'enero',
  'febrero',
  'marzo',
  'abril',
  'mayo',
  'junio',
  'julio',
  'agosto',
  'septiembre',
  'octubre',
  'noviembre',
  'diciembre',
] as const

export const DIAS_SEMANA = [
  'domingo',
  'lunes',
  'martes',
  'miércoles',
  'jueves',
  'viernes',
  'sábado',
] as const

/** Cabecera de la cuadrícula: la semana arranca en lunes. */
export const DIAS_CABECERA = ['L', 'M', 'X', 'J', 'V', 'S', 'D'] as const

/** Descompone 'YYYY-MM-DD'. El mes sale 0-indexado, como en `Date`. */
export function parsearFecha(iso: string): { anio: number; mes: number; dia: number } {
  const [anio, mes, dia] = iso.split('-').map(Number)
  return { anio, mes: mes - 1, dia }
}

export function isoDeDia(anio: number, mes: number, dia: number): string {
  return `${claveMes(anio, mes)}-${String(dia).padStart(2, '0')}`
}

/** 'YYYY-MM' del mes indicado (0-indexado), con el año siempre a 4 dígitos. */
export function claveMes(anio: number, mes: number): string {
  return `${String(anio).padStart(4, '0')}-${String(mes + 1).padStart(2, '0')}`
}

/**
 * Lee un `?mes=YYYY-MM`; null si no es un mes real. Hace la misma ida y vuelta
 * por `Date` que el backend (`rangoDeMes`): descarta el año 0000, que Postgres
 * no tiene, y los años 0–99, que `Date.UTC` confunde con 1900–1999.
 */
export function parsearMes(valor: string | null | undefined): { anio: number; mes: number } | null {
  const m = /^(\d{4})-(\d{2})$/.exec(valor ?? '')
  if (!m) return null
  const anio = Number(m[1])
  const mes = Number(m[2]) - 1
  const primero = new Date(Date.UTC(anio, mes, 1))
  return primero.getUTCFullYear() === anio && primero.getUTCMonth() === mes ? { anio, mes } : null
}

export function desplazarMes(
  anio: number,
  mes: number,
  delta: number,
): { anio: number; mes: number } {
  const total = anio * 12 + mes + delta
  return { anio: Math.floor(total / 12), mes: ((total % 12) + 12) % 12 }
}

/**
 * Clave del mes a `delta` meses, o null si `parsearMes` no la aceptaría (antes
 * del año 0100 o después del 9999): un enlace así caería en el mes actual.
 */
export function claveMesVecino(anio: number, mes: number, delta: number): string | null {
  const destino = desplazarMes(anio, mes, delta)
  const clave = claveMes(destino.anio, destino.mes)
  return parsearMes(clave) ? clave : null
}

/**
 * Día del calendario en México (`YYYY-MM-DD`) de un instante. El portal es
 * municipal y el servidor corre en UTC: cerca de medianoche, el día en UTC ya
 * no es el de Guadalajara. Devuelve '' si el instante no es una fecha válida.
 */
export function diaEnMexico(instante: Date): string {
  if (Number.isNaN(instante.getTime())) return ''
  // `en-CA` formatea como YYYY-MM-DD.
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Mexico_City' }).format(instante)
}

export function hoyEnMexico(): string {
  return diaEnMexico(new Date())
}

export function nombreMes(mes: number): string {
  const nombre = MESES[mes] ?? ''
  return nombre.charAt(0).toUpperCase() + nombre.slice(1)
}

/** '2026-09-20' → '20 de septiembre de 2026'. */
export function fechaLarga(iso: string): string {
  const { anio, mes, dia } = parsearFecha(iso)
  return `${dia} de ${MESES[mes]} de ${anio}`
}

/** '2026-09-20' → 'Domingo 20 de septiembre de 2026'. */
export function fechaConDia(iso: string): string {
  const { anio, mes, dia } = parsearFecha(iso)
  const semana = DIAS_SEMANA[new Date(Date.UTC(anio, mes, dia)).getUTCDay()]
  return `${semana.charAt(0).toUpperCase()}${semana.slice(1)} ${fechaLarga(iso)}`
}

/** Para el bloque de fecha de las tarjetas: `{ dia: '20', mes: 'sep' }`. */
export function diaYMes(iso: string): { dia: string; mes: string } {
  const { mes, dia } = parsearFecha(iso)
  return { dia: String(dia), mes: (MESES[mes] ?? '').slice(0, 3) }
}

/** '10:00 – 12:00'; solo el inicio si no hay fin; '' si no hay horario. */
export function horario(inicio: string, fin: string): string {
  if (inicio && fin) return `${inicio} – ${fin}`
  return inicio
}

export function agruparPorFecha<T extends { fecha: string }>(
  items: readonly T[],
): Map<string, T[]> {
  const porDia = new Map<string, T[]>()
  for (const item of items) {
    const lista = porDia.get(item.fecha)
    if (lista) lista.push(item)
    else porDia.set(item.fecha, [item])
  }
  return porDia
}

export interface CeldaDia<T> {
  dia: number
  /** 'YYYY-MM-DD' */
  fecha: string
  items: T[]
}

/**
 * Cuadrícula del mes en semanas de lunes a domingo: `null` para los huecos
 * antes del día 1 y relleno al final hasta completar la última semana.
 */
export function construirGrilla<T>(
  anio: number,
  mes: number,
  porDia: Map<string, T[]>,
): (CeldaDia<T> | null)[] {
  const totalDias = new Date(Date.UTC(anio, mes + 1, 0)).getUTCDate()
  const primerDia = new Date(Date.UTC(anio, mes, 1)).getUTCDay()
  const huecos = primerDia === 0 ? 6 : primerDia - 1
  const celdas: (CeldaDia<T> | null)[] = Array.from({ length: huecos }, () => null)
  for (let dia = 1; dia <= totalDias; dia++) {
    const fecha = isoDeDia(anio, mes, dia)
    celdas.push({ dia, fecha, items: porDia.get(fecha) ?? [] })
  }
  while (celdas.length % 7 !== 0) celdas.push(null)
  return celdas
}
