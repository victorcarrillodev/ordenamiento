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
 * aprobación del Programa. El panel permite control manual o un periodo programado.
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
  programacion?: { inicio: string; cierre: string } | null
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
export async function leerEstadoConsulta(ahora: Date = new Date()): Promise<EstadoConsulta> {
  const { programa } = await getCustomizations()
  const periodo = programa?.consultaProgramacion
  if (periodo && Date.parse(periodo.inicio) < Date.parse(periodo.cierre)) {
    return {
      etapa:
        ahora.getTime() < Date.parse(periodo.inicio)
          ? 'pendiente'
          : ahora.getTime() < Date.parse(periodo.cierre)
            ? 'abierta'
            : 'concluida',
      inicio: periodo.inicio,
      cierre: periodo.cierre,
      programacion: periodo,
    }
  }
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

/** Valida instantes explícitos: el servidor nunca interpreta la zona horaria del navegador. */
export function periodoValido(inicio: unknown, cierre: unknown): boolean {
  const iso = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d{1,3})?)?(?:Z|[+-]\d{2}:\d{2})$/
  const valido = (valor: unknown): valor is string => {
    if (typeof valor !== 'string' || !iso.test(valor) || !Number.isFinite(Date.parse(valor)))
      return false
    const dia = new Date(`${valor.slice(0, 10)}T00:00:00Z`)
    return (
      dia.toISOString().slice(0, 10) === valor.slice(0, 10) &&
      Number(valor.slice(11, 13)) < 24 &&
      Number(valor.slice(14, 16)) < 60
    )
  }
  return valido(inicio) && valido(cierre) && Date.parse(inicio) < Date.parse(cierre)
}

export async function programarConsulta(
  inicio: unknown,
  cierre: unknown,
  user: { id: string; name: string; email: string },
): Promise<ResultadoCambio> {
  if (!periodoValido(inicio, cierre)) {
    return {
      ok: false,
      error: 'Indica inicio y término válidos; el término debe ser posterior al inicio.',
    }
  }
  const periodo = {
    inicio: new Date(inicio as string).toISOString(),
    cierre: new Date(cierre as string).toISOString(),
  }
  await saveCustomizations({
    config: { programa: { consultaProgramacion: periodo } } as never,
    user,
    section: 'general',
    motivo: `Consulta pública programada: ${periodo.inicio} a ${periodo.cierre}`,
  })
  const ahora = Date.now()
  const etapa =
    ahora < Date.parse(periodo.inicio)
      ? 'pendiente'
      : ahora < Date.parse(periodo.cierre)
        ? 'abierta'
        : 'concluida'
  return { ok: true, estado: { etapa, ...periodo, programacion: periodo } }
}

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
  const actual = await leerEstadoConsulta(ahora)
  if (actual.etapa === nueva && !actual.programacion) return { ok: true, estado: actual }
  if (actual.etapa !== nueva && !puedePasarA(actual.etapa, nueva)) {
    return { ok: false, error: `No se puede pasar de «${actual.etapa}» a «${nueva}»` }
  }

  const marca = ahora.toISOString()
  const programa = {
    consulta: nueva,
    ...(actual.programacion ? { consultaProgramacion: null } : {}),
    // Iniciar (o reabrir) fija el inicio la primera vez y limpia el cierre; concluir fija el cierre.
    consultaInicio:
      nueva === 'pendiente' ? null : actual.inicio && actual.inicio < marca ? actual.inicio : marca,
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
