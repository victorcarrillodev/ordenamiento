// Tipos compartidos del hub POETDUM (extraídos de los sub-controllers para centralizar)

export interface Foto {
  id: string
  nombre_original: string
  mime: string
}

export interface DocumentoRef {
  id: string
  titulo: string
  tipo: string
}

export interface Actividad {
  id: string
  titulo: string
  fecha: string
  hora_inicio: string | null
  hora_fin: string | null
  lugar: string
  descripcion: string
  estado: string
  resultados: string | null
  fotos: Foto[]
  documentos: DocumentoRef[]
}

export interface Documento {
  id: string
  titulo: string
  tipo: string
  etapa: string
  fecha: string
  descripcion: string
}

export interface Medicion {
  id: string
  periodo: string
  valor: number
}

export interface Indicador {
  id: string
  nombre: string
  descripcion: string
  unidad: string
  meta: number | null
  fecha_evaluacion: string | null
  resultado_texto: string | null
  documento_respaldo: { id: string; titulo: string } | null
  mediciones: Medicion[]
}

// Espejo del shape público del backend (app/data + backend poel.ts)
export type PublicPoelSesion = {
  id: string
  categoria: string
  orden: number
  titulo: string
  descripcion: string
  fecha: string | null
  ubicacion: string
  latitud: string
  longitud: string
}
