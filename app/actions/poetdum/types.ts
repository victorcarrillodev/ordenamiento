// Formas públicas del Seguimiento y evaluación (indicadores del Programa).
// Las de las actividades viven en app/data/programa.ts.

export interface Medicion {
  id: string
  periodo: string
  /** NUMERIC de Postgres: llega como texto. */
  valor: number | string
}

export interface Indicador {
  id: string
  nombre: string
  descripcion: string
  unidad: string
  meta: number | string | null
  fecha_evaluacion: string | null
  resultado_texto: string | null
  updated_at?: string
  /** Archivo de una actividad publicada que respalda el indicador. */
  documento_respaldo: { id: string; titulo: string; tipo: string; actividad_id: string } | null
  mediciones: Medicion[]
}
