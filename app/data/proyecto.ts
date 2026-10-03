/**
 * Documentos del Proyecto del Programa, vistos desde el portal y el panel. Los
 * tipos y las secciones son los del backend (`services/proyecto.ts`).
 */

export const SECCIONES_PROYECTO = ['tecnico', 'grafico'] as const
export type SeccionProyecto = (typeof SECCIONES_PROYECTO)[number]

export const esSeccionProyecto = (valor: unknown): valor is SeccionProyecto =>
  typeof valor === 'string' && (SECCIONES_PROYECTO as readonly string[]).includes(valor)

export const ETIQUETA_SECCION: Record<SeccionProyecto, string> = {
  tecnico: 'Documento técnico',
  grafico: 'Documentos gráficos',
}

export const TITULO_PROYECTO = 'Proyecto del Programa'

export const TEXTO_PROYECTO =
  'Consulta el documento técnico y los documentos gráficos del Proyecto del Programa.'

export interface DocumentoProyecto {
  id: string
  seccion: SeccionProyecto
  titulo: string
  nombre_original: string
  size: number
  orden: number
  created_at: string
}

/** Lo que entrega `/api/proyecto`: con la consulta pendiente, `visible` es falso y no hay nada. */
export interface ProyectoPublico {
  visible: boolean
  tecnico: DocumentoProyecto[]
  grafico: DocumentoProyecto[]
}

export const PROYECTO_VACIO: ProyectoPublico = { visible: false, tecnico: [], grafico: [] }
