/**
 * Acuse de recepción de una participación, en PDF.
 *
 * Es el documento que se entrega a quien participa (se descarga al registrar la
 * participación y se adjunta al correo de confirmación) y que el personal
 * imprime para el expediente. Conserva la información y la redacción del modelo
 * aprobado, en UNA sola hoja tamaño carta, con el texto justificado.
 *
 * Cabe porque cada campo que lo alimenta tiene un tope (ver
 * `participacion-campos.ts`) y porque, si con todo lleno la hoja no alcanza al
 * tamaño base, el acuse reduce tipografía y espacios por pasos hasta que cabe,
 * sin bajar de un mínimo legible. Se comprueba con todos los campos al máximo y
 * el máximo de archivos en `acuse.test.ts`.
 *
 * La tipografía es DejaVu Sans, la del modelo aprobado: cubre todo el latín
 * extendido, así que un nombre con caracteres poco comunes no sale con
 * cuadritos. Los archivos de fuente vienen del paquete `dejavu-fonts-ttf`.
 */
import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'

import PDFDocument from 'pdfkit'

import { acortarNombre } from '../files/nombres.ts'
import { textoDeOpcion, textoDeUbicacion } from './participacion-campos.ts'

export interface DatosAcuse {
  folio: string
  origen: 'digital' | 'fisica' | string
  nombre: string
  correo: string
  fechaRecepcion: Date
  alcance_ubicacion?: string
  calle?: string
  colonia?: string
  codigo_postal?: string
  institucion?: string
  tematica?: string
  tematica_otra?: string
  observacion: string
  /** Nombres de los archivos recibidos; vacío si no hubo. */
  adjuntos: string[]
}

export const MODALIDAD_DIGITAL = 'En línea, mediante la Bitácora'
export const MODALIDAD_PRESENCIAL = 'Presencial'
export const SIN_ADJUNTOS = 'Sin archivos adjuntos'

export const etiquetaModalidad = (origen: string) =>
  origen === 'fisica' ? MODALIDAD_PRESENCIAL : MODALIDAD_DIGITAL

// ── Página ──────────────────────────────────────────────────────────────────

const ANCHO = 612
const ALTO = 792
const MARGEN_X = 34
const ANCHO_UTIL = ANCHO - MARGEN_X * 2
/** Espacio libre al pie de la hoja, donde va la firma de la Bitácora. */
const PIE_ALTO = 26

/**
 * Escalas que se prueban, de la mayor a la mínima legible. Un acuse con poco
 * texto sale con letra grande, como el modelo; uno con todos los campos al
 * máximo baja hasta 0.85 (la letra más chica queda en 7.5 pt, la del cuerpo en 8).
 */
export const ESCALAS = [1.14, 1.1, 1.06, 1.03, 1, 0.97, 0.94, 0.91, 0.88, 0.85] as const

const COLOR = {
  guinda: '#5E142D',
  oro: '#C9A24D',
  cintillo: '#F2D58B',
  texto: '#3F4C5E',
  suave: '#475467',
  caja: '#F7EEF1',
  fondoTabla: '#F4F5F7',
  linea: '#E4E7EC',
  enlace: '#1F5C99',
  blanco: '#FFFFFF',
}

// ── Tipografía ──────────────────────────────────────────────────────────────

const requerir = createRequire(import.meta.url)
const RAIZ_FUENTES = join(dirname(requerir.resolve('dejavu-fonts-ttf/package.json')), 'ttf')
const FUENTE = {
  normal: join(RAIZ_FUENTES, 'DejaVuSans.ttf'),
  negrita: join(RAIZ_FUENTES, 'DejaVuSans-Bold.ttf'),
}

type Doc = InstanceType<typeof PDFDocument>

// ── Textos fijos del modelo aprobado ────────────────────────────────────────

export const TEXTOS_ACUSE = {
  cintillo: 'GOBIERNO MUNICIPAL DE SAN PEDRO TLAQUEPAQUE · POETDUM',
  titulo: 'Recibimos tu observación',
  subtitulo: 'Acuse de recepción de participación ciudadana',
  intro:
    'Recibimos tu observación sobre el Proyecto del Programa. Gracias por participar en la consulta pública. Tu aportación será revisada como parte de este proceso.',
  folioNota: 'Consérvalo para consultar el seguimiento y la respuesta.',
  aviso:
    'Este acuse confirma la recepción de tu observación; todavía no constituye una respuesta sobre su contenido.',
  informacion: 'Información registrada',
  observacion: 'Observación registrada',
  publicas:
    'Las observaciones sobre el Proyecto se harán públicas en el portal municipal durante el proceso de aprobación.',
  adjuntos: 'Archivos adjuntos recibidos',
  queSigue: '¿Qué sigue?',
  pasos: [
    ['01 · Recepción', 'Tu observación quedó registrada con un folio.'],
    ['02 · Análisis', 'Al cerrar la consulta, se revisarán las observaciones recibidas.'],
    ['03 · Respuesta', 'Se darán a conocer las contestaciones y los ajustes al Proyecto.'],
  ],
  consulta: 'Consulta de la respuesta',
  consulta1:
    'Al concluir la consulta pública, se revisará tu observación y se emitirá la respuesta correspondiente.',
  consulta2:
    'Las respuestas estarán disponibles para consulta en la Bitácora, mediante el folio asignado, y de forma presencial en las oficinas de la Dirección de Gestión Territorial y Planeación Urbana, ubicadas en calle Juárez 28, colonia Centro, San Pedro Tlaquepaque, Jalisco. Asimismo, se enviará una notificación al correo electrónico registrado.',
  pie: 'Bitácora · Gobierno Municipal de San Pedro Tlaquepaque',
} as const

const T = TEXTOS_ACUSE

// ── Formato de la fecha ─────────────────────────────────────────────────────

/** «Jueves 24 de septiembre de 2026, 4:25:05 p. m.», en la hora de la Ciudad de México. */
export function fechaDelAcuse(fecha: Date): string {
  const partes = new Intl.DateTimeFormat('es-MX', {
    timeZone: 'America/Mexico_City',
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  }).formatToParts(fecha)
  const de = (tipo: string) => partes.find((p) => p.type === tipo)?.value ?? ''
  const dia = de('weekday')
  const periodo =
    de('dayPeriod').toLowerCase().replace(/\./g, '').trim() === 'am' ? 'a. m.' : 'p. m.'
  return (
    `${dia.charAt(0).toUpperCase()}${dia.slice(1)} ${de('day')} de ${de('month')} de ${de('year')}, ` +
    `${de('hour')}:${de('minute')}:${de('second')} ${periodo}`
  )
}

// ── Contenido de las filas de la tabla ──────────────────────────────────────

export function filasDelAcuse(d: DatosAcuse): Array<[string, string]> {
  const vacio = '—'
  const ubicacion = textoDeUbicacion({
    alcance_ubicacion: d.alcance_ubicacion,
    calle: d.calle,
    colonia: d.colonia,
    codigo_postal: d.codigo_postal,
  })
  return [
    ['Estado', 'Recibida'],
    ['Fecha y hora de recepción', fechaDelAcuse(d.fechaRecepcion)],
    ['Modalidad', etiquetaModalidad(d.origen)],
    ['Persona participante', d.nombre || vacio],
    ['Correo registrado', d.correo || vacio],
    ['Ubicación de la propuesta', ubicacion],
    ['Empresa, institución u organización', d.institucion || vacio],
    ['Temática de la propuesta', textoDeOpcion(d.tematica ?? '', d.tematica_otra ?? '') || vacio],
  ]
}

// ── Dibujo ──────────────────────────────────────────────────────────────────

interface Resultado {
  /** Hasta dónde llegó el contenido (sin contar el pie). */
  fin: number
}

/** Dibuja el acuse completo a la escala `s` y dice hasta dónde llegó el contenido. */
function componer(doc: Doc, d: DatosAcuse, s: number): Resultado {
  const px = (n: number) => n * s
  let y = 0

  const fuente = (negrita: boolean, tamano: number) =>
    doc.font(negrita ? 'Sans-Bold' : 'Sans').fontSize(tamano * s)

  const altoTexto = (texto: string, ancho: number, negrita: boolean, tamano: number, opts = {}) => {
    fuente(negrita, tamano)
    return doc.heightOfString(texto, { width: ancho, ...opts })
  }

  const escribir = (
    texto: string,
    x: number,
    ancho: number,
    o: {
      negrita?: boolean
      tamano: number
      color?: string
      align?: 'left' | 'center' | 'justify'
      lineGap?: number
    },
  ) => {
    fuente(Boolean(o.negrita), o.tamano)
    doc.fillColor(o.color ?? COLOR.texto)
    const opts = { width: ancho, align: o.align ?? 'left', lineGap: px(o.lineGap ?? 1.6) }
    const alto = doc.heightOfString(texto, opts)
    doc.text(texto, x, y, opts)
    return alto
  }

  // Banda superior guinda con el título.
  const altoBanda = px(74)
  doc.rect(0, 0, ANCHO, altoBanda).fill(COLOR.guinda)
  doc.rect(0, altoBanda, ANCHO, px(3)).fill(COLOR.oro)
  y = px(15)
  escribir(T.cintillo, MARGEN_X, ANCHO_UTIL, { negrita: true, tamano: 7.5, color: COLOR.cintillo })
  y += px(15)
  y += escribir(T.titulo, MARGEN_X, ANCHO_UTIL, { negrita: true, tamano: 21, color: COLOR.blanco })
  y += px(3)
  escribir(T.subtitulo, MARGEN_X, ANCHO_UTIL, { tamano: 10, color: COLOR.blanco })
  y = altoBanda + px(3) + px(14)

  // Saludo y presentación.
  y += escribir(`Hola, ${d.nombre || ''}:`, MARGEN_X, ANCHO_UTIL, {
    negrita: true,
    tamano: 12,
    color: COLOR.texto,
  })
  y += px(4)
  y += escribir(T.intro, MARGEN_X, ANCHO_UTIL, { tamano: 9.6, align: 'justify' })
  y += px(8)

  // Folio.
  const altoFolio = px(40)
  doc.rect(MARGEN_X, y, ANCHO_UTIL, altoFolio).fill(COLOR.caja)
  const yFolio = y
  y = yFolio + px(8)
  escribir(`TU FOLIO ${d.folio}`, MARGEN_X + px(10), ANCHO_UTIL - px(20), {
    negrita: true,
    tamano: 14,
    color: COLOR.guinda,
  })
  y = yFolio + px(25)
  escribir(T.folioNota, MARGEN_X + px(10), ANCHO_UTIL - px(20), { tamano: 8.8, color: COLOR.suave })
  y = yFolio + altoFolio + px(6)

  y += escribir(T.aviso, MARGEN_X, ANCHO_UTIL, {
    tamano: 8.8,
    color: COLOR.suave,
    align: 'justify',
  })
  y += px(8)

  const titulo = (texto: string) => {
    y += escribir(texto, MARGEN_X, ANCHO_UTIL, { negrita: true, tamano: 12, color: COLOR.guinda })
    y += px(5)
  }

  // Información registrada.
  titulo(T.informacion)
  const anchoEtiqueta = px(178)
  const anchoValor = ANCHO_UTIL - anchoEtiqueta
  const relleno = px(3)
  for (const [etiqueta, valor] of filasDelAcuse(d)) {
    const altoE = altoTexto(etiqueta, anchoEtiqueta - px(14), true, 8.8, { lineGap: px(1.2) })
    const altoV = altoTexto(valor, anchoValor - px(14), false, 9, { lineGap: px(1.2) })
    const alto = Math.max(altoE, altoV) + relleno * 2
    doc.rect(MARGEN_X, y, anchoEtiqueta, alto).fill(COLOR.fondoTabla)
    doc
      .moveTo(MARGEN_X, y + alto)
      .lineTo(MARGEN_X + ANCHO_UTIL, y + alto)
      .lineWidth(0.7)
      .strokeColor(COLOR.linea)
      .stroke()
    const yFila = y
    y = yFila + relleno
    escribir(etiqueta, MARGEN_X + px(7), anchoEtiqueta - px(14), {
      negrita: true,
      tamano: 8.8,
      color: COLOR.texto,
      lineGap: 1.2,
    })
    y = yFila + relleno
    escribir(valor, MARGEN_X + anchoEtiqueta + px(7), anchoValor - px(14), {
      tamano: 9,
      color: COLOR.texto,
      lineGap: 1.2,
    })
    y = yFila + alto
  }
  y += px(9)

  // Observación registrada, completa.
  titulo(T.observacion)
  const anchoObs = ANCHO_UTIL - px(26)
  const altoObs = altoTexto(d.observacion, anchoObs, false, 9.6, {
    align: 'justify',
    lineGap: px(1.8),
  })
  const cajaObs = altoObs + px(14)
  doc.rect(MARGEN_X, y, ANCHO_UTIL, cajaObs).fill(COLOR.fondoTabla)
  doc.rect(MARGEN_X, y, px(3), cajaObs).fill(COLOR.guinda)
  const yObs = y
  y = yObs + px(7)
  escribir(d.observacion, MARGEN_X + px(14), anchoObs, {
    tamano: 9.6,
    align: 'justify',
    lineGap: 1.8,
  })
  y = yObs + cajaObs + px(5)
  y += escribir(T.publicas, MARGEN_X, ANCHO_UTIL, {
    tamano: 8.6,
    color: COLOR.suave,
    align: 'justify',
  })
  y += px(8)

  // Archivos adjuntos: los nombres recibidos o «Sin archivos adjuntos».
  titulo(T.adjuntos)
  if (d.adjuntos.length === 0) {
    y += escribir(SIN_ADJUNTOS, MARGEN_X + px(6), ANCHO_UTIL - px(6), {
      tamano: 9,
      color: COLOR.suave,
    })
  } else {
    for (const nombre of d.adjuntos) {
      y += escribir(acortarNombre(nombre), MARGEN_X + px(6), ANCHO_UTIL - px(6), {
        tamano: 9,
        color: COLOR.enlace,
        lineGap: 1.2,
      })
      y += px(1.5)
    }
  }
  y += px(8)

  // ¿Qué sigue?: tres recuadros con el texto justificado.
  titulo(T.queSigue)
  const separacion = px(8)
  const anchoPaso = (ANCHO_UTIL - separacion * 2) / 3
  const interior = anchoPaso - px(20)
  const altoPasos = Math.max(
    ...T.pasos.map(
      ([cabeza, cuerpo]) =>
        altoTexto(cabeza, interior, true, 9, { lineGap: px(1) }) +
        px(4) +
        altoTexto(cuerpo, interior, false, 8.8, { align: 'justify', lineGap: px(1.4) }),
    ),
  )
  const cajaPasos = altoPasos + px(16)
  const yPasos = y
  T.pasos.forEach(([cabeza, cuerpo], i) => {
    const x = MARGEN_X + i * (anchoPaso + separacion)
    doc.rect(x, yPasos, anchoPaso, cajaPasos).fill(COLOR.caja)
    y = yPasos + px(8)
    y += escribir(cabeza, x + px(10), interior, {
      negrita: true,
      tamano: 9,
      color: COLOR.guinda,
      lineGap: 1,
    })
    y += px(4)
    escribir(cuerpo, x + px(10), interior, { tamano: 8.8, align: 'justify', lineGap: 1.4 })
  })
  y = yPasos + cajaPasos + px(8)

  // Consulta de la respuesta.
  titulo(T.consulta)
  y += escribir(T.consulta1, MARGEN_X, ANCHO_UTIL, { tamano: 9, align: 'justify' })
  y += px(4)
  y += escribir(T.consulta2, MARGEN_X, ANCHO_UTIL, { tamano: 9, align: 'justify' })

  return { fin: y }
}

/** El acuse a una escala dada: el PDF en un Buffer y hasta dónde llegó el contenido. */
function generarEnEscala(d: DatosAcuse, s: number): Promise<{ pdf: Buffer; fin: number }> {
  const doc = new PDFDocument({
    size: 'LETTER',
    margin: 0,
    autoFirstPage: true,
    info: {
      Title: `Acuse de recepción ${d.folio}`,
      Author: 'Gobierno Municipal de San Pedro Tlaquepaque',
      Subject: 'Acuse de recepción de participación ciudadana',
    },
  })
  doc.registerFont('Sans', FUENTE.normal)
  doc.registerFont('Sans-Bold', FUENTE.negrita)

  const trozos: Buffer[] = []
  const listo = new Promise<Buffer>((resolver, rechazar) => {
    doc.on('data', (t: Buffer) => trozos.push(t))
    doc.on('end', () => resolver(Buffer.concat(trozos)))
    doc.on('error', rechazar)
  })

  // Todo se recorta a la hoja: si algún día un texto pasa del límite no abre una
  // segunda página, solo se corta (la prueba de capacidad existe para que no pase).
  // PDFKit abre página nueva en cuanto un texto cruza el margen inferior; con un
  // margen inferior enorme y negativo nunca lo cruza.
  doc.page.margins.bottom = -1_000_000
  doc.save()
  doc.rect(0, 0, ANCHO, ALTO).clip()
  const { fin } = componer(doc, d, s)
  doc.restore()

  // Pie con la firma de la Bitácora.
  const yPie = ALTO - PIE_ALTO
  doc
    .moveTo(MARGEN_X, yPie)
    .lineTo(ANCHO - MARGEN_X, yPie)
    .lineWidth(0.7)
    .strokeColor(COLOR.linea)
    .stroke()
  doc.font('Sans').fontSize(8).fillColor(COLOR.suave)
  doc.text(T.pie, MARGEN_X, yPie + 8, { width: ANCHO_UTIL, lineBreak: false })

  doc.end()
  return listo.then((pdf) => ({ pdf, fin }))
}

/** Hasta dónde puede llegar el contenido: justo antes del pie. */
const LIMITE_VERTICAL = ALTO - PIE_ALTO - 6

export interface AcuseGenerado {
  pdf: Buffer
  /** Escala con la que cupo: 1 es el tamaño base. */
  escala: number
  /** ¿Cupo completo en la hoja? Si no, se recortó (no debería pasar con los topes del formulario). */
  completo: boolean
}

/**
 * Genera el acuse en una hoja carta. Prueba el tamaño base y, si con los datos
 * dados no cabe, reduce por pasos hasta el mínimo legible.
 */
export async function generarAcuse(datos: DatosAcuse): Promise<AcuseGenerado> {
  let ultimo: { pdf: Buffer; fin: number; escala: number } | null = null
  for (const escala of ESCALAS) {
    const { pdf, fin } = await generarEnEscala(datos, escala)
    ultimo = { pdf, fin, escala }
    if (fin <= LIMITE_VERTICAL) return { pdf, escala, completo: true }
  }
  return { pdf: ultimo!.pdf, escala: ultimo!.escala, completo: false }
}

/** Nombre del archivo del acuse: lleva el folio, que es lo que identifica el expediente. */
export const nombreArchivoAcuse = (folio: string) => `Acuse ${folio}.pdf`
