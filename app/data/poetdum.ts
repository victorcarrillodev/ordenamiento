// Fuente de verdad frontend para constantes POETDUM/POEL
// Las tres secciones en las que el sitio público agrupa las sesiones. Faltaba
// la del Comité: sin ella no se podían capturar sus sesiones (el backend
// rechazaba la categoría con 400) aunque la página sí tenga ese bloque.
export const CATEGORIAS_POEL = [
  'Comité del Ordenamiento Ecológico',
  'Talleres Sectoriales',
  'Consulta pública',
] as const
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
