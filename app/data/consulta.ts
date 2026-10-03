/**
 * Etapa de la consulta pública del Proyecto del Programa, vista desde el portal.
 * La decide una persona del panel (ver backend/src/services/consulta.ts) y viaja
 * en la configuración del portal (`programa.consulta`).
 */
import type { ThemeData } from '../ui/civic-horizon.ts'

export const ETAPAS_CONSULTA = ['pendiente', 'abierta', 'concluida'] as const
export type EtapaConsulta = (typeof ETAPAS_CONSULTA)[number]

export const esEtapaConsulta = (valor: unknown): valor is EtapaConsulta =>
  typeof valor === 'string' && (ETAPAS_CONSULTA as readonly string[]).includes(valor)

/** La etapa que trae el tema; sin dato (o con uno desconocido) la consulta no ha iniciado. */
export function etapaDeConsulta(theme: ThemeData | undefined): EtapaConsulta {
  const etapa = theme?.programa?.consulta
  return esEtapaConsulta(etapa) ? etapa : 'pendiente'
}

export const TITULO_CONSULTA_CONCLUIDA = 'Consulta pública concluida'

export const TEXTO_CONSULTA_CONCLUIDA =
  'Gracias por participar en la consulta pública del Proyecto del Programa. El periodo para recibir observaciones y propuestas ha concluido. En el apartado ‘Participaciones y respuestas’ podrás consultar las versiones públicas de las participaciones recibidas y, conforme se publiquen, los oficios de respuesta correspondientes.'

export const TITULO_CONSULTA_PENDIENTE = 'La consulta pública aún no inicia'

export const TEXTO_CONSULTA_PENDIENTE =
  'Todavía no se reciben observaciones ni propuestas. Cuando inicie la consulta pública podrás registrar aquí tu participación.'

/** Lo que se muestra en lugar del formulario cuando no se reciben participaciones. */
export function avisoSinRecepcion(etapa: EtapaConsulta): { titulo: string; texto: string } | null {
  if (etapa === 'concluida') {
    return { titulo: TITULO_CONSULTA_CONCLUIDA, texto: TEXTO_CONSULTA_CONCLUIDA }
  }
  if (etapa === 'pendiente') {
    return { titulo: TITULO_CONSULTA_PENDIENTE, texto: TEXTO_CONSULTA_PENDIENTE }
  }
  return null
}
