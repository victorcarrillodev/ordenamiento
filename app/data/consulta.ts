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
export function etapaDeConsulta(
  theme: ThemeData | undefined,
  ahora: Date = new Date(),
): EtapaConsulta {
  const periodo = theme?.programa?.consultaProgramacion
  if (periodo && Date.parse(periodo.inicio) < Date.parse(periodo.cierre)) {
    return ahora.getTime() < Date.parse(periodo.inicio)
      ? 'pendiente'
      : ahora.getTime() < Date.parse(periodo.cierre)
        ? 'abierta'
        : 'concluida'
  }
  const etapa = theme?.programa?.consulta
  return esEtapaConsulta(etapa) ? etapa : 'pendiente'
}

export const TITULO_CONSULTA_CONCLUIDA = 'El periodo de consulta pública ha concluido.'

export const TEXTO_CONSULTA_CONCLUIDA =
  'El periodo para recibir observaciones y propuestas sobre el Proyecto del Programa ha finalizado. Agradecemos su participación.\nPuede consultar las participaciones publicadas y las respuestas disponibles en este portal.'

export const TITULO_CONSULTA_PENDIENTE = 'La consulta pública aún no ha iniciado'

export const TEXTO_CONSULTA_PENDIENTE =
  'El formulario para enviar observaciones y propuestas estará disponible durante el periodo de consulta pública. Las fechas se darán a conocer en este portal.'

export const TEXTOS_CONSULTA_PORTAL = {
  consultaPendienteTitulo: TITULO_CONSULTA_PENDIENTE,
  consultaPendienteTexto: TEXTO_CONSULTA_PENDIENTE,
  consultaConcluidaTitulo: TITULO_CONSULTA_CONCLUIDA,
  consultaConcluidaTexto: TEXTO_CONSULTA_CONCLUIDA,
  documentosTitulo: 'Consulta los documentos del Programa',
  documentosTexto:
    'Consulta y descarga las convocatorias, actas, acuerdos, dictámenes y demás documentos generados durante el proceso',
  documentosBoton: 'Ver documentos',
}

/** Lo que se muestra en lugar del formulario cuando no se reciben participaciones. */
export function avisoSinRecepcion(
  etapa: EtapaConsulta,
  theme?: ThemeData,
): { titulo: string; texto: string } | null {
  const textos = theme?.usuario?.textos ?? {}
  if (etapa === 'concluida') {
    return {
      titulo: textos.consultaConcluidaTitulo || TITULO_CONSULTA_CONCLUIDA,
      texto: textos.consultaConcluidaTexto || TEXTO_CONSULTA_CONCLUIDA,
    }
  }
  if (etapa === 'pendiente') {
    return {
      titulo: textos.consultaPendienteTitulo || TITULO_CONSULTA_PENDIENTE,
      texto: textos.consultaPendienteTexto || TEXTO_CONSULTA_PENDIENTE,
    }
  }
  return null
}
