/** Hora de San Pedro Tlaquepaque (UTC−06:00), independiente de la zona del equipo. */
export function instanteDeConsulta(valor: string): string | null {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(valor)) return null
  const fecha = new Date(`${valor}:00-06:00`)
  if (!Number.isFinite(fecha.getTime())) return null
  // Date normaliza días imposibles (31 de febrero): no los aceptamos.
  return fechaParaCampo(fecha.toISOString()) === valor ? fecha.toISOString() : null
}

export function fechaParaCampo(iso: string | null | undefined): string {
  if (!iso || !Number.isFinite(Date.parse(iso))) return ''
  return new Date(Date.parse(iso) - 6 * 60 * 60 * 1000).toISOString().slice(0, 16)
}

export function duracionConsulta(inicio: string, cierre: string): string {
  const minutos = Math.round((Date.parse(cierre) - Date.parse(inicio)) / 60000)
  const dias = Math.floor(minutos / 1440)
  const horas = Math.floor((minutos % 1440) / 60)
  const resto = minutos % 60
  return `${dias} ${dias === 1 ? 'día' : 'días'}, ${horas} ${horas === 1 ? 'hora' : 'horas'} y ${resto} ${resto === 1 ? 'minuto' : 'minutos'}`
}
