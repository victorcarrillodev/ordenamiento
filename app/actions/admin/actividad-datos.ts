/**
 * Formulario de una actividad del Programa ↔ contrato del backend.
 *
 * El backend recibe multipart con los campos de texto y un par
 * `archivo` + `archivo_tipo` por cada archivo (ver guardarActividad en
 * backend/src/app.ts). El formulario del panel, en cambio, separa las
 * fotografías de los documentos y agrupa los documentos en filas con su tipo.
 */
import { esTipoArchivo, TIPO_FOTOGRAFIA, type ActividadGestion } from '../../data/programa.ts'

export const CAMPOS_TEXTO = [
  'titulo',
  'fase',
  'tipo',
  'estado',
  'fecha',
  'hora_inicio',
  'hora_fin',
  'lugar',
  'direccion',
  'latitud',
  'longitud',
  'descripcion',
  'resultados',
  'acuerdos',
  'publicacion',
  'aviso_activo',
  'aviso_titulo',
  'aviso_descripcion',
  'aviso_inicio',
  'aviso_fin',
] as const

export type CampoTexto = (typeof CAMPOS_TEXTO)[number]
export type ValoresActividad = Partial<Record<CampoTexto, string>>

/** Filas de «tipo + archivos» que ofrece el formulario para los documentos. */
export const FILAS_DOCUMENTOS = 3

/** Lo que se escribió en el formulario, para volver a mostrarlo si hay un error. */
export function valoresDeFormulario(fd: FormData): ValoresActividad {
  const valores: ValoresActividad = {}
  for (const campo of CAMPOS_TEXTO) {
    const valor = fd.get(campo)
    if (typeof valor === 'string') valores[campo] = valor
  }
  return valores
}

/** Valores iniciales del formulario de edición a partir del registro guardado. */
export function valoresDeActividad(a: ActividadGestion): ValoresActividad {
  return {
    titulo: a.titulo,
    fase: a.fase,
    tipo: a.tipo,
    estado: a.estado,
    fecha: a.fecha,
    hora_inicio: a.hora_inicio,
    hora_fin: a.hora_fin,
    lugar: a.lugar,
    direccion: a.direccion,
    latitud: a.latitud,
    longitud: a.longitud,
    descripcion: a.descripcion,
    resultados: a.resultados,
    acuerdos: a.acuerdos,
    publicacion: a.publicacion,
    aviso_activo: a.aviso_activo ? '1' : '',
    aviso_titulo: a.aviso_titulo,
    aviso_descripcion: a.aviso_descripcion,
    aviso_inicio: a.aviso_inicio ?? '',
    aviso_fin: a.aviso_fin ?? '',
  }
}

function archivosDe(fd: FormData, clave: string): File[] {
  return fd.getAll(clave).filter((f): f is File => f instanceof File && f.size > 0)
}

export type CuerpoBackend = { ok: true; cuerpo: FormData } | { ok: false; error: string }

/**
 * Arma el multipart para el backend. Las fotografías llevan su tipo fijo; los
 * documentos, el de su fila. Una fila con archivos pero sin tipo se rechaza
 * aquí con un mensaje claro en vez de mandar al backend algo que no aceptará.
 */
export function cuerpoParaBackend(fd: FormData): CuerpoBackend {
  const cuerpo = new FormData()
  for (const [campo, valor] of Object.entries(valoresDeFormulario(fd))) {
    cuerpo.set(campo, valor)
  }

  for (const foto of archivosDe(fd, 'fotos')) {
    cuerpo.append('archivo', foto, foto.name)
    cuerpo.append('archivo_tipo', TIPO_FOTOGRAFIA)
  }

  for (let fila = 0; fila < FILAS_DOCUMENTOS; fila++) {
    const archivos = archivosDe(fd, `documentos_${fila}`)
    if (archivos.length === 0) continue
    const tipo = fd.get(`documentos_tipo_${fila}`)
    if (!esTipoArchivo(tipo) || tipo === TIPO_FOTOGRAFIA) {
      return { ok: false, error: 'Elige el tipo de documento de cada grupo de archivos que subes.' }
    }
    for (const archivo of archivos) {
      cuerpo.append('archivo', archivo, archivo.name)
      cuerpo.append('archivo_tipo', tipo)
    }
  }

  return { ok: true, cuerpo }
}

/** Acuses tras redirigir (`?ok=`): el texto vive aquí para no repetirlo por página. */
export const ACUSES = {
  creada: 'Actividad registrada. El portal ya la muestra donde corresponde según su estado.',
  guardada: 'Cambios guardados en el mismo registro de la actividad.',
  eliminada: 'Actividad eliminada junto con sus archivos.',
  archivo: 'Archivo actualizado.',
  archivo_quitado: 'Archivo quitado de la actividad.',
  correo: 'Aviso enviado por correo.',
} as const

export type Acuse = keyof typeof ACUSES

export function acuseDe(valor: string | null): Acuse | undefined {
  return valor && Object.hasOwn(ACUSES, valor) ? (valor as Acuse) : undefined
}
