/**
 * Formulario de participación: opciones, límites y validación. Lo comparten el
 * formulario ciudadano y las capturas presenciales del panel, de modo que las
 * dos vías piden lo mismo y rechazan lo mismo.
 *
 * Las listas y los límites repiten los de `backend/src/services/
 * participacion-campos.ts`: el frontend no puede importar del backend (el
 * Dockerfile de la web no lo copia). `participacion-contrato.test.ts` vigila que
 * no se separen. Los límites existen porque lo que se captura tiene que caber en
 * el acuse en PDF, que es de una sola hoja carta.
 */

export const MUNICIPIO = 'San Pedro Tlaquepaque'
export const OTRA = 'Otra'

export const ALCANCES = ['municipio', 'especifico'] as const
export type Alcance = (typeof ALCANCES)[number]

export const ETIQUETA_ALCANCE: Record<Alcance, string> = {
  municipio: 'Todo el municipio',
  especifico: 'Lugar o predio específico',
}

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
  email: 100,
  calle: 100,
  colonia: 60,
  cp: 5,
  institucion: 100,
  observacion: 500,
  tematica_otra: 60,
  fuente_otra: 60,
  domicilio: 200,
  municipio_participante: 100,
  ocupacion: 100,
} as const

/**
 * Saltos de línea que admite la propuesta, además de los 500 caracteres: cada
 * salto ocupa un renglón en el acuse, que es de una sola hoja.
 */
export const MAX_SALTOS_OBSERVACION = 8

/** Lo mínimo que debe tener una propuesta para que valga la pena revisarla. */
export const OBSERVACION_MINIMA = 10

export type CampoParticipacion =
  | 'nombre'
  | 'email'
  | 'alcance_ubicacion'
  | 'calle'
  | 'colonia'
  | 'cp'
  | 'direccion_origen'
  | 'institucion'
  | 'observacion'
  | 'tematica'
  | 'tematica_otra'
  | 'fuente'
  | 'fuente_otra'
  | 'genero'
  | 'domicilio'
  | 'municipio_participante'
  | 'ocupacion'

const CAMPOS: readonly CampoParticipacion[] = [
  'nombre',
  'email',
  'alcance_ubicacion',
  'calle',
  'colonia',
  'cp',
  'direccion_origen',
  'institucion',
  'observacion',
  'tematica',
  'tematica_otra',
  'fuente',
  'fuente_otra',
  'genero',
  'domicilio',
  'municipio_participante',
  'ocupacion',
]

/** Lo que la persona escribió, para repintarlo si el envío no prospera. */
export type ValoresParticipacion = Partial<Record<CampoParticipacion, string>> & {
  consentimiento?: boolean
}

/** Un mensaje por campo; `archivos` lo llenan quienes revisan los adjuntos. */
export type ErroresParticipacion = Partial<
  Record<CampoParticipacion | 'consentimiento' | 'archivos', string>
>

const CORREO_RE = /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/

/** Caracteres como los ve quien escribe: un emoji cuenta uno, no dos. */
export const largoEnCaracteres = (texto: string) => Array.from(texto).length

/** Texto de un campo del formulario, sin los saltos de línea CRLF que mete el navegador. */
function leer(form: FormData, campo: string): string {
  const valor = form.get(campo)
  return typeof valor === 'string' ? valor.replace(/\r\n?/g, '\n').trim() : ''
}

/** Rescata del envío lo que se pueda volver a pintar en el formulario. */
export function valoresDeFormulario(form: FormData): ValoresParticipacion {
  const valores: ValoresParticipacion = {}
  for (const campo of CAMPOS) {
    const valor = leer(form, campo)
    if (valor !== '') valores[campo] = valor
  }
  valores.consentimiento = form.get('consentimiento') === '1'
  return valores
}

const etiquetaOpcion = (campo: 'tematica' | 'fuente' | 'genero') =>
  campo === 'tematica'
    ? 'Temática de la propuesta'
    : campo === 'fuente'
      ? 'Tipo de participante'
      : 'Género'

function limitar(
  errores: ErroresParticipacion,
  valores: ValoresParticipacion,
  campo: keyof typeof LIMITES,
  nombre: string,
) {
  const valor = valores[campo as CampoParticipacion] ?? ''
  if (largoEnCaracteres(valor) > LIMITES[campo]) {
    errores[campo as CampoParticipacion] = `${nombre} admite hasta ${LIMITES[campo]} caracteres`
  }
}

/**
 * Valida el formulario de participación. Devuelve los valores y un mensaje por
 * cada campo que no cumple; sin errores, el envío puede seguir.
 *
 * La ubicación depende del alcance: con «Todo el municipio» sus datos son
 * opcionales; con «Lugar o predio específico» el domicilio o referencia y la
 * colonia o zona son obligatorios. Es lo mismo que el navegador marca con
 * asterisco según la opción elegida.
 */
export function validarParticipacion(
  form: FormData,
  opciones: { exigirConsentimiento?: boolean } = {},
): { valores: ValoresParticipacion; errores: ErroresParticipacion } {
  const valores = valoresDeFormulario(form)
  const errores: ErroresParticipacion = {}
  const v = (campo: CampoParticipacion) => valores[campo] ?? ''

  if (largoEnCaracteres(v('nombre')) < 2) {
    errores.nombre = 'El nombre debe tener al menos 2 caracteres'
  } else {
    limitar(errores, valores, 'nombre', 'El nombre')
  }

  if (!CORREO_RE.test(v('email'))) {
    errores.email = 'Ingresa un correo electrónico válido'
  } else {
    limitar(errores, valores, 'email', 'El correo')
  }

  const alcance = v('alcance_ubicacion')
  if (!(ALCANCES as readonly string[]).includes(alcance)) {
    errores.alcance_ubicacion =
      'Indica si la propuesta abarca todo el municipio o un lugar o predio específico'
  } else if (alcance === 'especifico') {
    if (!v('calle')) {
      errores.calle =
        'Indica el domicilio o una referencia que permita identificar el lugar o predio'
    }
    if (!v('colonia')) errores.colonia = 'Indica la colonia o zona'
  }
  if (!errores.calle) limitar(errores, valores, 'calle', 'El domicilio o referencia')
  if (!errores.colonia) limitar(errores, valores, 'colonia', 'La colonia o zona')
  if (v('cp') && !/^\d{5}$/.test(v('cp'))) errores.cp = 'El código postal debe tener 5 dígitos'

  limitar(errores, valores, 'institucion', 'Este campo')

  if (largoEnCaracteres(v('observacion')) < OBSERVACION_MINIMA) {
    errores.observacion = `La observación debe tener al menos ${OBSERVACION_MINIMA} caracteres`
  } else if (largoEnCaracteres(v('observacion')) > LIMITES.observacion) {
    errores.observacion = `La observación admite hasta ${LIMITES.observacion} caracteres, con todo y espacios`
  } else if (v('observacion').split('\n').length - 1 > MAX_SALTOS_OBSERVACION) {
    errores.observacion = `La observación admite hasta ${MAX_SALTOS_OBSERVACION} saltos de línea`
  }

  for (const [campo, catalogo, otro] of [
    ['tematica', TEMATICAS, 'tematica_otra'],
    ['fuente', TIPOS_PARTICIPANTE, 'fuente_otra'],
    ['genero', GENEROS, undefined],
  ] as const) {
    if (v(campo) && !(catalogo as readonly string[]).includes(v(campo))) {
      errores[campo] = `Elige una opción válida en «${etiquetaOpcion(campo)}»`
    }
    if (otro) {
      // La especificación solo vale con «Otra»; con otra opción sobra y se descarta.
      if (v(campo) !== OTRA) delete valores[otro]
      else limitar(errores, valores, otro, 'La especificación')
    }
  }

  limitar(errores, valores, 'domicilio', 'El domicilio')
  limitar(errores, valores, 'municipio_participante', 'El municipio')
  limitar(errores, valores, 'ocupacion', 'La ocupación o puesto')

  if (opciones.exigirConsentimiento && !valores.consentimiento) {
    errores.consentimiento = 'Debes aceptar el aviso de privacidad para enviar tu participación'
  }

  return { valores, errores }
}

/** Primer mensaje de error, en el orden en que se ve el formulario. */
export function primerError(errores: ErroresParticipacion): string | undefined {
  return Object.values(errores)[0]
}

/**
 * Arma lo que se manda al backend a partir de los valores ya validados. El
 * correo viaja como `correo` y el código postal como `codigo_postal`, que son
 * los nombres del backend.
 */
export function cuerpoParaBackend(valores: ValoresParticipacion): FormData {
  const cuerpo = new FormData()
  const pone = (campo: string, valor: string | undefined) => cuerpo.set(campo, valor ?? '')
  pone('nombre', valores.nombre)
  pone('correo', valores.email)
  pone('alcance_ubicacion', valores.alcance_ubicacion)
  pone('calle', valores.calle)
  pone('colonia', valores.colonia)
  pone('municipio', MUNICIPIO)
  pone('codigo_postal', valores.cp)
  pone('direccion_origen', valores.direccion_origen ?? 'manual')
  pone('institucion', valores.institucion)
  pone('observacion', valores.observacion)
  for (const campo of [
    'tematica',
    'tematica_otra',
    'fuente',
    'fuente_otra',
    'genero',
    'domicilio',
    'municipio_participante',
    'ocupacion',
  ] as const) {
    pone(campo, valores[campo])
  }
  return cuerpo
}

/**
 * Cómo se lee la ubicación de la propuesta: «Todo el municipio» o el domicilio y
 * la colonia. Es la misma redacción que el acuse (backend: `textoDeUbicacion`).
 */
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
