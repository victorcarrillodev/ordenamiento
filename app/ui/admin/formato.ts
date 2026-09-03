/**
 * Formatos compartidos del panel. Viven aquí y no en cada página porque una
 * duración o una fecha escritas de dos maneras distintas en dos pantallas se
 * leen como dos datos distintos.
 */

/** Zona del municipio: el panel siempre habla en hora local de México. */
const ZONA = 'America/Mexico_City'

/**
 * Duración legible a partir de segundos: `2 h 15 min`, `45 min`, `30 s`.
 * Se corta en horas a propósito — «73 h» dice más que «3 d 1 h» para medir
 * tiempo de trabajo acumulado.
 */
export function formatearDuracion(segundos: number): string {
  if (!Number.isFinite(segundos) || segundos <= 0) return '—'
  const total = Math.floor(segundos)
  if (total < 60) return `${total} s`
  const minutos = Math.floor(total / 60)
  if (minutos < 60) return `${minutos} min`
  const horas = Math.floor(minutos / 60)
  const resto = minutos % 60
  return resto === 0 ? `${horas} h` : `${horas} h ${resto} min`
}

/** Fecha y hora completas, p. ej. «2 sept 2026, 18:24». */
export function formatearFechaHora(valor: string | null | undefined): string {
  if (!valor) return '—'
  const fecha = new Date(valor)
  if (Number.isNaN(fecha.getTime())) return '—'
  return fecha.toLocaleString('es-MX', {
    timeZone: ZONA,
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
}

/**
 * Día de la semana, fecha y hora: «mié 02 sept 2026, 18:35».
 * La bitácora de sesiones lo usa porque saber que un acceso fue en domingo
 * dice algo que la fecha sola no dice.
 */
export function formatearDiaFechaHora(valor: string | null | undefined): string {
  if (!valor) return '—'
  const fecha = new Date(valor)
  if (Number.isNaN(fecha.getTime())) return '—'
  return fecha.toLocaleString('es-MX', {
    timeZone: ZONA,
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
}

/** Solo la fecha, p. ej. «02 sept 2026». */
export function formatearFecha(valor: string | null | undefined): string {
  if (!valor) return '—'
  const fecha = new Date(valor)
  if (Number.isNaN(fecha.getTime())) return '—'
  return fecha.toLocaleDateString('es-MX', {
    timeZone: ZONA,
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}
