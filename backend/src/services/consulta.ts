/**
 * Etapa de la consulta pública del Proyecto del Programa.
 *
 *  · `pendiente`: todavía no inicia. «Proyecto del Programa» se puede preparar
 *    pero no se ve, y no se reciben participaciones.
 *  · `abierta`: «Proyecto del Programa» es visible y se reciben participaciones.
 *  · `concluida`: ya no se reciben participaciones nuevas. El Proyecto, las
 *    participaciones y los oficios publicados siguen disponibles, y el área
 *    responsable puede seguir cargando y publicando respuestas.
 *
 * La etapa vive en la configuración del portal (`programa.consulta`), junto a la
 * aprobación del Programa, y la cambia una persona del panel; no se calcula por
 * fechas porque el inicio y el cierre los decide el área responsable.
 */
import { getCustomizations, saveCustomizations } from './customizations.ts'

export const ETAPAS_CONSULTA = ['pendiente', 'abierta', 'concluida'] as const
export type EtapaConsulta = (typeof ETAPAS_CONSULTA)[number]

export const esEtapaConsulta = (valor: unknown): valor is EtapaConsulta =>
  typeof valor === 'string' && (ETAPAS_CONSULTA as readonly string[]).includes(valor)

export interface EstadoConsulta {
  etapa: EtapaConsulta
  inicio: string | null
  cierre: string | null
}

/**
 * Cambios permitidos. Se puede reabrir una consulta concluida (por si se cerró
 * antes de tiempo) y deshacer un inicio, pero no volver a «pendiente» una
 * consulta que ya concluyó: ya hubo participaciones y el Proyecto ya fue público.
 */
const TRANSICIONES: Record<EtapaConsulta, readonly EtapaConsulta[]> = {
  pendiente: ['abierta'],
  abierta: ['concluida', 'pendiente'],
  concluida: ['abierta'],
}

export const puedePasarA = (de: EtapaConsulta, a: EtapaConsulta): boolean =>
  TRANSICIONES[de].includes(a)

/** Lee la etapa actual. Un valor desconocido en la configuración se trata como «pendiente»: nunca abre sola. */
export async function leerEstadoConsulta(): Promise<EstadoConsulta> {
  const { programa } = await getCustomizations()
  return {
    etapa: esEtapaConsulta(programa?.consulta) ? programa.consulta : 'pendiente',
    inicio: programa?.consultaInicio ?? null,
    cierre: programa?.consultaCierre ?? null,
  }
}

/** ¿Se están recibiendo participaciones nuevas? */
export async function recibeParticipaciones(): Promise<boolean> {
  return (await leerEstadoConsulta()).etapa === 'abierta'
}

export type ResultadoCambio = { ok: true; estado: EstadoConsulta } | { ok: false; error: string }

const MOTIVO: Record<EtapaConsulta, string> = {
  pendiente: 'Consulta pública: se deshizo el inicio',
  abierta: 'Consulta pública: se inició (se reciben participaciones)',
  concluida: 'Consulta pública: se concluyó el periodo',
}

/** Cambia la etapa, registrando cuándo ocurrió y quién lo hizo en la bitácora de cambios. */
export async function cambiarEtapaConsulta(
  nueva: EtapaConsulta,
  user: { id: string; name: string; email: string },
  ahora: Date = new Date(),
): Promise<ResultadoCambio> {
  const actual = await leerEstadoConsulta()
  if (actual.etapa === nueva) return { ok: true, estado: actual }
  if (!puedePasarA(actual.etapa, nueva)) {
    return { ok: false, error: `No se puede pasar de «${actual.etapa}» a «${nueva}»` }
  }

  const marca = ahora.toISOString()
  const programa = {
    consulta: nueva,
    // Iniciar (o reabrir) fija el inicio la primera vez y limpia el cierre; concluir fija el cierre.
    consultaInicio: nueva === 'pendiente' ? null : (actual.inicio ?? marca),
    consultaCierre: nueva === 'concluida' ? marca : null,
  }
  await saveCustomizations({
    config: { programa } as never,
    user,
    motivo: MOTIVO[nueva],
    section: 'general',
  })
  return {
    ok: true,
    estado: { etapa: nueva, inicio: programa.consultaInicio, cierre: programa.consultaCierre },
  }
}
