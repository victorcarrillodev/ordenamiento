/**
 * Cifras de las gráficas de la vista general y de Estadísticas.
 *
 * Las gráficas se dibujan con lo que sale de aquí, así que lo que importa es que
 * el orden y el eje del tiempo sean los mismos siempre, consulta tras consulta:
 *
 *  · Los empates se desempatan por nombre. Con `ORDER BY count(*) DESC` solo, las
 *    categorías con el mismo total salían en el orden que el motor quisiera, y una
 *    gráfica cambiaba de orden al recargar o al pasar de una pestaña a otra.
 *  · El resultado del dictamen sale siempre como Procedente, En proceso, No
 *    procedente (antes, en el orden en que `GROUP BY` agrupara).
 *  · Los meses se cuentan en la hora de Tlaquepaque, no en la del servidor de base
 *    de datos: una participación de las 8 de la noche del 31 de octubre es de
 *    octubre aunque en UTC ya sea 1 de noviembre.
 *  · La serie mensual no se salta meses: uno sin participaciones aparece con 0,
 *    porque de lo contrario enero y abril se dibujan como meses seguidos.
 */
import { sql } from '../db/pool.ts'

export type Origen = 'digital' | 'fisica'

/** Zona horaria de Tlaquepaque. La misma con la que el panel dice la fecha y la hora. */
export const ZONA_HORARIA = 'America/Mexico_City'

/** Cuántos meses como máximo dibuja la serie mensual (los más recientes). */
export const MAX_MESES = 24

export interface PuntoMensual {
  /** `YYYY-MM`. */
  mes: string
  total: number
}

export interface FilaEstado {
  estado: string
  total: number
}

export type SerieCategorias = Array<[string, number]>

// ---------------------------------------------------------------------------
// Orden y eje del tiempo (puro, sin base de datos)
// ---------------------------------------------------------------------------

/** El orden fijo del resultado del dictamen. Lo desconocido va al final, por nombre. */
const ORDEN_ESTADOS = ['Procedente', 'En proceso', 'No procedente']

export function ordenarEstados(filas: FilaEstado[]): FilaEstado[] {
  const posicion = (estado: string) => {
    const i = ORDEN_ESTADOS.indexOf(estado)
    return i === -1 ? ORDEN_ESTADOS.length : i
  }
  return [...filas].sort(
    (a, b) => posicion(a.estado) - posicion(b.estado) || a.estado.localeCompare(b.estado, 'es'),
  )
}

/** Mayor total primero; a igual total, por nombre (sin distinguir acentos ni mayúsculas). */
export function ordenarCategorias(serie: SerieCategorias): SerieCategorias {
  return [...serie].sort(
    ([nombreA, totalA], [nombreB, totalB]) =>
      totalB - totalA || nombreA.localeCompare(nombreB, 'es', { sensitivity: 'base' }),
  )
}

/** `YYYY-MM` del instante dado en la hora de Tlaquepaque. */
export function mesActual(ahora: Date = new Date(), zona: string = ZONA_HORARIA): string {
  const partes = new Intl.DateTimeFormat('en-CA', {
    timeZone: zona,
    year: 'numeric',
    month: '2-digit',
  }).formatToParts(ahora)
  const anio = partes.find((p) => p.type === 'year')?.value ?? '1970'
  const mes = partes.find((p) => p.type === 'month')?.value ?? '01'
  return `${anio}-${mes}`
}

const MES_RE = /^(\d{4})-(\d{2})$/

/** Índice absoluto del mes (año × 12 + mes), o null si no es un `YYYY-MM` válido. */
function indiceDeMes(clave: string): number | null {
  const m = MES_RE.exec(clave)
  if (!m) return null
  const mes = Number(m[2])
  if (mes < 1 || mes > 12) return null
  return Number(m[1]) * 12 + (mes - 1)
}

function claveDeIndice(indice: number): string {
  const anio = Math.floor(indice / 12)
  const mes = (indice % 12) + 1
  return `${String(anio).padStart(4, '0')}-${String(mes).padStart(2, '0')}`
}

/**
 * Serie mensual sin huecos: desde el primer mes con participaciones hasta el mes en
 * curso (`hasta`), con 0 en los meses vacíos. Si hay más de `maximo` meses se
 * conservan los más recientes. Sin ninguna participación no hay serie.
 */
export function completarMeses(
  puntos: PuntoMensual[],
  hasta: string,
  maximo: number = MAX_MESES,
): PuntoMensual[] {
  const porMes = new Map<number, number>()
  for (const { mes, total } of puntos) {
    const i = indiceDeMes(mes)
    if (i !== null) porMes.set(i, (porMes.get(i) ?? 0) + total)
  }
  if (porMes.size === 0) return []

  const indices = [...porMes.keys()]
  const primero = Math.min(...indices)
  const limite = indiceDeMes(hasta)
  // El mes en curso solo alarga la serie: nunca recorta meses con datos posteriores a él.
  const ultimo = Math.max(Math.max(...indices), limite ?? Number.NEGATIVE_INFINITY)
  const desde = Math.max(primero, ultimo - maximo + 1)

  const serie: PuntoMensual[] = []
  for (let i = desde; i <= ultimo; i++) {
    serie.push({ mes: claveDeIndice(i), total: porMes.get(i) ?? 0 })
  }
  return serie
}

// ---------------------------------------------------------------------------
// Consultas
// ---------------------------------------------------------------------------

export interface EstadisticasParticipaciones {
  digitales: number
  fisicas: number
  resultado: FilaEstado[]
  fuente: SerieCategorias
  genero: SerieCategorias
  tematica: SerieCategorias
  participacionesPorMes: PuntoMensual[]
}

/**
 * Distribuciones de las participaciones, de todas o de un origen. Las categorías
 * sin clasificar (texto vacío) no entran: cada gráfica muestra cuántas están
 * clasificadas.
 */
export async function estadisticasDeParticipaciones(
  origen: Origen | null,
  ahora: Date = new Date(),
): Promise<EstadisticasParticipaciones> {
  const donde = origen ? sql`WHERE origen = ${origen}` : sql``

  const categorias = async (
    columna: 'fuente' | 'genero' | 'tematica',
  ): Promise<SerieCategorias> => {
    const filas = await sql<Array<{ k: string; n: string }>>`--sql
      SELECT ${sql(columna)} AS k, count(*)::text AS n
      FROM participations ${donde}
      GROUP BY ${sql(columna)}
    `
    return ordenarCategorias(filas.filter((r) => r.k).map((r) => [r.k, Number(r.n)]))
  }

  const [conteo, estados, fuente, genero, tematica, meses] = await Promise.all([
    sql<Array<{ origen: string; n: string }>>`--sql
      SELECT origen, count(*)::text AS n FROM participations GROUP BY origen
    `,
    sql<Array<{ estado: string; n: string }>>`--sql
      SELECT estado, count(*)::text AS n FROM participations ${donde} GROUP BY estado
    `,
    categorias('fuente'),
    categorias('genero'),
    categorias('tematica'),
    sql<Array<{ mes: string; n: string }>>`--sql
      SELECT to_char(date_trunc('month', created_at AT TIME ZONE ${ZONA_HORARIA}), 'YYYY-MM') AS mes,
             count(*)::text AS n
      FROM participations ${donde}
      GROUP BY 1
    `,
  ])

  const total = (clave: Origen) => Number(conteo.find((f) => f.origen === clave)?.n ?? 0)

  return {
    // Siempre sin filtrar: la pestaña «Totales» los suma y cada pestaña muestra el suyo.
    digitales: total('digital'),
    fisicas: total('fisica'),
    resultado: ordenarEstados(estados.map((r) => ({ estado: r.estado, total: Number(r.n) }))),
    fuente,
    genero,
    tematica,
    participacionesPorMes: completarMeses(
      meses.map((r) => ({ mes: r.mes, total: Number(r.n) })),
      mesActual(ahora),
    ),
  }
}
