/**
 * Campos del formulario de participación (el ciudadano en línea y el personal
 * que captura en ventanilla): qué opciones ofrecen, cuánto admite cada uno y
 * qué es obligatorio según lo que se elija.
 *
 * Los límites no son arbitrarios: los campos que llegan al acuse en PDF (hoja
 * carta, una sola página) tienen que caber ahí con la estructura aprobada, y
 * `acuse.test.ts` lo comprueba con todos los campos llenos al máximo. Subir un
 * límite aquí sin comprobarlo con esa prueba puede desbordar la hoja.
 *
 * Frontend y backend se despliegan por separado y no comparten módulos; el
 * frontend repite estas listas en `app/data/participacion.ts` y una prueba
 * (`participacion-contrato.test.ts`) vigila que no se separen.
 */
import { linea, parrafos } from './texto.ts'

export const MUNICIPIO = 'San Pedro Tlaquepaque'

export const ALCANCES = ['municipio', 'especifico'] as const
export type Alcance = (typeof ALCANCES)[number]

export const ETIQUETA_ALCANCE: Record<Alcance, string> = {
  municipio: 'Todo el municipio',
  especifico: 'Lugar o predio específico',
}

export const OTRA = 'Otra'

export const TEMATICAS = [
  'Servicios ambientales',
  'Gestión del agua',
  'Gestión del riesgo',
  'Desarrollo urbano y gestión del suelo',
  'Vivienda',
  'Movilidad',
  'Equipamiento',
  'Infraestructura',
  'Gestión de residuos',
  'Patrimonio',
  OTRA,
] as const

export const TIPOS_PARTICIPANTE = [
  'Persona a título individual',
  'Empresa',
  'Organismo público',
  'Organización civil',
  'Institución académica',
  OTRA,
] as const

export const GENEROS = [
  'Mujer',
  'Hombre',
  'No binario',
  'Otra identidad de género',
  'Prefiero no responder',
] as const

/** Máximo de caracteres de cada campo de texto. */
export const LIMITES = {
  nombre: 100,
  correo: 100,
  /** Domicilio o referencia del lugar o predio de la propuesta. */
  calle: 100,
  /** Colonia o zona de la propuesta. */
  colonia: 60,
  codigo_postal: 5,
  /** Empresa, institución u organización. */
  institucion: 100,
  /** Observación o propuesta, con todo y espacios. */
  observacion: 500,
  /** Especificación de «Otra» en la temática y en el tipo de participante. */
  tematica_otra: 60,
  fuente_otra: 60,
  // Complementarios: no van en el acuse, solo en el correo de confirmación.
  domicilio: 200,
  municipio_participante: 100,
  ocupacion: 100,
} as const

/** Nombre con que se nombra cada campo cuando se rechaza. */
const ETIQUETAS: Record<string, string> = {
  nombre: 'Nombre',
  correo: 'Correo electrónico',
  calle: 'Domicilio o referencia del lugar',
  colonia: 'Colonia o zona',
  codigo_postal: 'Código postal',
  institucion: 'Empresa, institución u organización',
  observacion: 'Observación o propuesta',
  tematica_otra: 'Especificación de la temática',
  fuente_otra: 'Especificación del tipo de participante',
  domicilio: 'Domicilio de quien participa',
  municipio_participante: 'Municipio de residencia',
  ocupacion: 'Ocupación o puesto',
  latitud: 'Latitud',
  longitud: 'Longitud',
}

/** Cada campo de texto: cómo se sanea y cuánto admite. */
const CAMPOS_TEXTO = {
  nombre: { sanear: linea, largo: LIMITES.nombre },
  correo: { sanear: linea, largo: LIMITES.correo },
  calle: { sanear: linea, largo: LIMITES.calle },
  colonia: { sanear: linea, largo: LIMITES.colonia },
  codigo_postal: { sanear: linea, largo: 20 },
  institucion: { sanear: linea, largo: LIMITES.institucion },
  latitud: { sanear: linea, largo: 50 },
  longitud: { sanear: linea, largo: 50 },
  direccion_origen: { sanear: linea, largo: 400 },
  domicilio: { sanear: linea, largo: LIMITES.domicilio },
  municipio_participante: { sanear: linea, largo: LIMITES.municipio_participante },
  ocupacion: { sanear: linea, largo: LIMITES.ocupacion },
  fuente: { sanear: linea, largo: 200 },
  fuente_otra: { sanear: linea, largo: LIMITES.fuente_otra },
  genero: { sanear: linea, largo: 200 },
  tematica: { sanear: linea, largo: 200 },
  tematica_otra: { sanear: linea, largo: LIMITES.tematica_otra },
  consentimiento_version: { sanear: linea, largo: 100 },
  observacion: { sanear: parrafos, largo: LIMITES.observacion },
  alcance_ubicacion: { sanear: linea, largo: 20 },
} as const

type NombreCampo = keyof typeof CAMPOS_TEXTO

export type ResultadoCampos =
  { ok: true; campos: Record<string, string> } | { ok: false; error: string }

/** Una dirección de correo razonable: algo@dominio.tld, sin espacios ni saltos. */
const CORREO_RE = /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/

const esAlcance = (valor: string): valor is Alcance =>
  (ALCANCES as readonly string[]).includes(valor)

/** Cuenta caracteres (no unidades UTF-16): un emoji es un carácter, como lo ve quien escribe. */
const largoEnCaracteres = (texto: string) => Array.from(texto).length

function etiquetaDe(campo: string): string {
  return ETIQUETAS[campo] ?? campo
}

/** Lee y sanea un campo; null si vino como archivo en vez de texto. */
function leerTexto(form: FormData, campo: NombreCampo): string | null {
  const valor = form.get(campo)
  if (valor !== null && typeof valor !== 'string') return null
  return CAMPOS_TEXTO[campo].sanear(valor ?? '')
}

/**
 * Valida una opción de lista: debe ser una de las ofrecidas (o ir vacía). Con
 * «Otra» se conserva lo que la persona especificó; con cualquier otra opción
 * esa especificación no tiene sentido y se descarta.
 */
function validarOpcion(
  campos: Record<string, string>,
  campo: 'tematica' | 'fuente' | 'genero',
  opciones: readonly string[],
  otro?: 'tematica_otra' | 'fuente_otra',
): string | null {
  const valor = campos[campo]
  if (valor && !opciones.includes(valor)) {
    return `Elige una opción válida en «${campo === 'fuente' ? 'Tipo de participante' : campo === 'tematica' ? 'Temática de la propuesta' : 'Género'}»`
  }
  if (otro && valor !== OTRA) campos[otro] = ''
  return null
}

/**
 * Lee, sanea y valida el formulario de participación (digital o presencial).
 * Sin el saneo, un carácter de control no cabe en una columna `text` y la
 * participación se perdía con un 500; sin los límites, el acuse en PDF no cabría
 * en una hoja.
 *
 * La ubicación depende de `alcance_ubicacion`: con «Todo el municipio» sus datos
 * son opcionales; con «Lugar o predio específico» el domicilio o referencia y la
 * colonia o zona son obligatorios. El municipio no se pregunta: el alcance del
 * Programa es uno solo.
 */
export function camposDelFormulario(form: FormData): ResultadoCampos {
  const campos: Record<string, string> = {}
  for (const campo of Object.keys(CAMPOS_TEXTO) as NombreCampo[]) {
    const limpio = leerTexto(form, campo)
    if (limpio === null) {
      return { ok: false, error: `El campo ${etiquetaDe(campo)} debe ser texto` }
    }
    if (largoEnCaracteres(limpio) > CAMPOS_TEXTO[campo].largo) {
      return {
        ok: false,
        error: `${etiquetaDe(campo)} admite hasta ${CAMPOS_TEXTO[campo].largo} caracteres`,
      }
    }
    campos[campo] = limpio
  }

  // Los formularios ya lo exigen, pero eso solo corre en el navegador: un
  // nombre hecho de caracteres invisibles se quedaba en blanco al sanearlo.
  for (const campo of ['nombre', 'correo', 'observacion'] as const) {
    if (!campos[campo]) return { ok: false, error: `${etiquetaDe(campo)} es obligatorio` }
  }
  if (!CORREO_RE.test(campos.correo)) {
    return { ok: false, error: 'Ingresa un correo electrónico válido' }
  }

  if (!esAlcance(campos.alcance_ubicacion)) {
    return {
      ok: false,
      error: 'Indica si la propuesta abarca todo el municipio o un lugar o predio específico',
    }
  }
  if (campos.alcance_ubicacion === 'especifico') {
    if (!campos.calle) {
      return {
        ok: false,
        error: 'Indica el domicilio o una referencia que permita identificar el lugar o predio',
      }
    }
    if (!campos.colonia) return { ok: false, error: 'Indica la colonia o zona del lugar o predio' }
  }
  if (campos.codigo_postal && !/^\d{5}$/.test(campos.codigo_postal)) {
    return { ok: false, error: 'El código postal debe tener 5 dígitos' }
  }
  campos.municipio = MUNICIPIO

  const errorOpcion =
    validarOpcion(campos, 'tematica', TEMATICAS, 'tematica_otra') ??
    validarOpcion(campos, 'fuente', TIPOS_PARTICIPANTE, 'fuente_otra') ??
    validarOpcion(campos, 'genero', GENEROS)
  if (errorOpcion) return { ok: false, error: errorOpcion }

  return { ok: true, campos }
}

/** Cómo se lee la ubicación de la propuesta: «Todo el municipio» o el domicilio y la colonia. */
export function textoDeUbicacion(p: {
  alcance_ubicacion?: string
  calle?: string
  colonia?: string
  codigo_postal?: string
}): string {
  const partes = [p.calle, p.colonia, p.codigo_postal ? `C.P. ${p.codigo_postal}` : ''].filter(
    (parte): parte is string => Boolean(parte),
  )
  if (p.alcance_ubicacion === 'municipio') {
    return partes.length > 0
      ? `${ETIQUETA_ALCANCE.municipio} · ${partes.join(', ')}`
      : ETIQUETA_ALCANCE.municipio
  }
  return partes.join(', ') || '—'
}

/** «Otra: lo que se especificó», o solo la opción elegida. */
export function textoDeOpcion(opcion: string, otra: string): string {
  if (!opcion) return ''
  return opcion === OTRA && otra ? `${OTRA}: ${otra}` : opcion
}
