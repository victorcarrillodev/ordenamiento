// Fuente de verdad frontend para constantes POETDUM/POEL
export const CATEGORIAS_POEL = ['Talleres Sectoriales', 'Consulta pública'] as const
export type CategoriaPoel = (typeof CATEGORIAS_POEL)[number]

export const TIPOS_DOCUMENTO = [
  'Convenios y anexos',
  'Acuerdos',
  'Actas y minutas',
  'Convocatorias',
  'Documentos técnicos',
  'Cartografía',
  'Avances y resultados',
  'Programa',
] as const
export type TipoDocumento = (typeof TIPOS_DOCUMENTO)[number]

export const ETAPAS_DOCUMENTO = ['En proceso', 'Dictaminada', 'Notificada'] as const
export type EtapaDocumento = (typeof ETAPAS_DOCUMENTO)[number]

export const ESTADOS_ACTIVIDAD = ['proxima', 'realizada', 'cancelada'] as const
export type EstadoActividad = (typeof ESTADOS_ACTIVIDAD)[number]
