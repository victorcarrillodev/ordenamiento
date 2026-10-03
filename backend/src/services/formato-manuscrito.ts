/**
 * Formato de participación para llenar a mano: una hoja carta que se imprime con
 * su folio, la persona completa de su puño y letra y el personal registra
 * después en la Bitácora con ese mismo folio.
 *
 * Pide lo mismo que el formulario en línea —mismos campos, mismos topes y mismas
 * opciones—, así que sale de las mismas listas (`participacion-campos.ts`) y no
 * de una copia a mano: una opción nueva en el formulario aparece aquí sola.
 */
import {
  ETIQUETA_ALCANCE,
  GENEROS,
  LIMITES,
  MAX_SALTOS_OBSERVACION,
  TEMATICAS,
  TIPOS_PARTICIPANTE,
} from './participacion-campos.ts'
import {
  ALTO,
  ANCHO,
  ANCHO_UTIL,
  COLOR,
  dibujarBanda,
  dibujarPie,
  MARGEN_X,
  nuevoDocumento,
  type Doc,
} from './pdf-base.ts'
import { MAX_UPLOAD_FILES } from '../files/limits.ts'

export const NOMBRE_ARCHIVO_FORMATO = (folio: string) => `Formato de participación ${folio}.pdf`

const PIE_ALTO = 24

/** Textos del formato (los de campos salen de las listas compartidas). */
export const TEXTOS_FORMATO = {
  cintillo: 'GOBIERNO MUNICIPAL DE SAN PEDRO TLAQUEPAQUE · POETDUM',
  titulo: 'Formato de participación',
  subtitulo: 'Observaciones o propuestas sobre el Proyecto del Programa',
  indicacion:
    'Escribe con letra clara. Los campos marcados con * son obligatorios. Entrega este formato al personal de la Dirección de Gestión Territorial y Planeación Urbana.',
  privacidad:
    'La información proporcionada será tratada conforme a la Ley General de Protección de Datos Personales en Posesión de Sujetos Obligados y solo se usará en el marco de este programa.',
  consentimiento:
    'Doy mi consentimiento para el uso de esta información en el proceso de ordenamiento territorial.',
  pie: 'Bitácora · Gobierno Municipal de San Pedro Tlaquepaque',
} as const

interface Cursor {
  y: number
}

/** Un casillero cuadrado para marcar con una cruz. */
function casillero(doc: Doc, x: number, y: number) {
  doc
    .rect(x, y + 0.5, 8, 8)
    .lineWidth(0.8)
    .strokeColor(COLOR.trazo)
    .stroke()
}

/** Etiqueta chica sobre una línea para escribir; devuelve el alto que ocupó. */
function campoDeLinea(
  doc: Doc,
  etiqueta: string,
  x: number,
  y: number,
  ancho: number,
  nota?: string,
): number {
  doc.font('Sans-Bold').fontSize(8.2).fillColor(COLOR.texto)
  doc.text(etiqueta, x, y, { width: ancho, lineBreak: false, continued: Boolean(nota) })
  if (nota) {
    doc.font('Sans').fontSize(7.2).fillColor(COLOR.suave)
    doc.text(`  ${nota}`, { width: ancho, lineBreak: false })
  }
  doc
    .moveTo(x, y + 25)
    .lineTo(x + ancho, y + 25)
    .lineWidth(0.7)
    .strokeColor(COLOR.trazo)
    .stroke()
  return 30
}

function titulo(doc: Doc, c: Cursor, texto: string) {
  doc.font('Sans-Bold').fontSize(10).fillColor(COLOR.guinda)
  doc.text(texto, MARGEN_X, c.y, { width: ANCHO_UTIL, lineBreak: false })
  c.y += 15
}

/** Opciones con casillero en columnas; la última «Otra» lleva su línea para especificar. */
function opcionesConCasillero(
  doc: Doc,
  c: Cursor,
  opciones: readonly string[],
  columnas: number,
  especificar?: { opcion: string; maximo: number },
) {
  const ancho = ANCHO_UTIL / columnas
  const filas = Math.ceil(opciones.length / columnas)
  doc.font('Sans').fontSize(8).fillColor(COLOR.texto)
  opciones.forEach((opcion, i) => {
    const fila = i % filas
    const columna = Math.floor(i / filas)
    const x = MARGEN_X + columna * ancho
    const y = c.y + fila * 13.5
    casillero(doc, x, y)
    doc.fillColor(COLOR.texto).font('Sans').fontSize(8)
    if (especificar && opcion === especificar.opcion) {
      doc.text(`${opcion}:`, x + 13, y + 0.5, { width: 40, lineBreak: false })
      doc
        .moveTo(x + 13 + 36, y + 9)
        .lineTo(x + ancho - 8, y + 9)
        .lineWidth(0.6)
        .strokeColor(COLOR.trazo)
        .stroke()
    } else {
      doc.text(opcion, x + 13, y + 0.5, { width: ancho - 16, lineBreak: false })
    }
  })
  c.y += filas * 13.5 + 4
}

/**
 * Genera el formato en blanco con su folio. Una sola hoja; las listas de opciones
 * son las del formulario.
 */
export async function generarFormatoManuscrito(folio: string): Promise<Buffer> {
  const { doc, listo } = nuevoDocumento({
    Title: `Formato de participación ${folio}`,
    Subject: 'Formato de participación ciudadana para llenar a mano',
  })
  doc.save()
  doc.rect(0, 0, ANCHO, ALTO).clip()

  const c: Cursor = {
    y:
      dibujarBanda(doc, {
        cintillo: TEXTOS_FORMATO.cintillo,
        titulo: TEXTOS_FORMATO.titulo,
        subtitulo: TEXTOS_FORMATO.subtitulo,
      }) + 10,
  }

  // Folio y fecha de recepción.
  doc.rect(MARGEN_X, c.y, ANCHO_UTIL, 34).fill(COLOR.caja)
  doc.font('Sans-Bold').fontSize(13).fillColor(COLOR.guinda)
  doc.text(`FOLIO ${folio}`, MARGEN_X + 10, c.y + 6, { width: 300, lineBreak: false })
  doc.font('Sans').fontSize(7.6).fillColor(COLOR.suave)
  doc.text(
    'Este folio identifica tu participación; el personal te entregará tu acuse.',
    MARGEN_X + 10,
    c.y + 22,
    {
      width: 320,
      lineBreak: false,
    },
  )
  doc.font('Sans-Bold').fontSize(8).fillColor(COLOR.texto)
  doc.text('Fecha de recepción:', MARGEN_X + 350, c.y + 8, { width: 110, lineBreak: false })
  doc.font('Sans').fontSize(8).fillColor(COLOR.suave)
  doc.text('____ / ____ / ________', MARGEN_X + 350, c.y + 20, { width: 150, lineBreak: false })
  c.y += 34 + 6

  doc.font('Sans').fontSize(7.8).fillColor(COLOR.suave)
  doc.text(TEXTOS_FORMATO.indicacion, MARGEN_X, c.y, { width: ANCHO_UTIL, align: 'justify' })
  c.y += 24

  // Nombre y correo.
  const mitad = (ANCHO_UTIL - 14) / 2
  campoDeLinea(
    doc,
    'Nombre completo *',
    MARGEN_X,
    c.y,
    mitad,
    `(máx. ${LIMITES.nombre} caracteres)`,
  )
  campoDeLinea(
    doc,
    'Correo electrónico *',
    MARGEN_X + mitad + 14,
    c.y,
    mitad,
    `(máx. ${LIMITES.correo} caracteres)`,
  )
  c.y += 32

  // Ubicación de la propuesta.
  titulo(doc, c, 'Ubicación de la propuesta *')
  casillero(doc, MARGEN_X, c.y)
  doc.font('Sans').fontSize(8).fillColor(COLOR.texto)
  doc.text(ETIQUETA_ALCANCE.municipio, MARGEN_X + 13, c.y + 0.5, { lineBreak: false })
  casillero(doc, MARGEN_X + 150, c.y)
  doc.text(ETIQUETA_ALCANCE.especifico, MARGEN_X + 163, c.y + 0.5, { lineBreak: false })
  doc.font('Sans').fontSize(7.2).fillColor(COLOR.suave)
  doc.text('Con «Todo el municipio», los datos de abajo son opcionales.', MARGEN_X + 320, c.y + 1, {
    width: ANCHO_UTIL - 320,
    lineBreak: false,
  })
  c.y += 17
  const tercio = ANCHO_UTIL * 0.54
  campoDeLinea(
    doc,
    'Domicilio o referencia del lugar o predio',
    MARGEN_X,
    c.y,
    tercio,
    `(*) máx. ${LIMITES.calle}`,
  )
  campoDeLinea(
    doc,
    'Colonia o zona',
    MARGEN_X + tercio + 10,
    c.y,
    ANCHO_UTIL * 0.28,
    `(*) máx. ${LIMITES.colonia}`,
  )
  campoDeLinea(doc, 'C.P.', MARGEN_X + tercio + ANCHO_UTIL * 0.28 + 20, c.y, ANCHO_UTIL * 0.18 - 30)
  c.y += 32

  // Empresa, institución u organización.
  campoDeLinea(
    doc,
    'Empresa, institución u organización',
    MARGEN_X,
    c.y,
    ANCHO_UTIL,
    `(opcional, máx. ${LIMITES.institucion} caracteres)`,
  )
  c.y += 32

  // Observación o propuesta: recuadro con renglones.
  doc.font('Sans-Bold').fontSize(8.2).fillColor(COLOR.texto)
  doc.text('Observación o propuesta *', MARGEN_X, c.y, { width: 130, lineBreak: false })
  doc.font('Sans').fontSize(7.2).fillColor(COLOR.suave)
  doc.text(
    `(máx. ${LIMITES.observacion} caracteres, con espacios, y ${MAX_SALTOS_OBSERVACION} saltos de línea)`,
    MARGEN_X + 128,
    c.y + 1,
    { width: ANCHO_UTIL - 128, lineBreak: false },
  )
  c.y += 13
  const renglones = 8
  const altoCaja = renglones * 15 + 6
  doc.rect(MARGEN_X, c.y, ANCHO_UTIL, altoCaja).lineWidth(0.8).strokeColor(COLOR.trazo).stroke()
  for (let i = 1; i <= renglones; i++) {
    doc
      .moveTo(MARGEN_X + 6, c.y + 3 + i * 15)
      .lineTo(MARGEN_X + ANCHO_UTIL - 6, c.y + 3 + i * 15)
      .lineWidth(0.4)
      .strokeColor(COLOR.linea)
      .stroke()
  }
  c.y += altoCaja + 9

  // Temática.
  titulo(doc, c, 'Temática de la propuesta (opcional)')
  opcionesConCasillero(doc, c, TEMATICAS, 3, { opcion: 'Otra', maximo: LIMITES.tematica_otra })

  // Tipo de participante y género, lado a lado.
  const yDosColumnas = c.y
  titulo(doc, c, 'Tipo de participante (opcional)')
  const mitadAncho = ANCHO_UTIL / 2
  const sub: Cursor = { y: c.y }
  doc.font('Sans').fontSize(8)
  TIPOS_PARTICIPANTE.forEach((opcion, i) => {
    const y = sub.y + i * 13.5
    casillero(doc, MARGEN_X, y)
    doc.fillColor(COLOR.texto).font('Sans').fontSize(8)
    if (opcion === 'Otra') {
      doc.text('Otra:', MARGEN_X + 13, y + 0.5, { width: 30, lineBreak: false })
      doc
        .moveTo(MARGEN_X + 44, y + 9)
        .lineTo(MARGEN_X + mitadAncho - 24, y + 9)
        .lineWidth(0.6)
        .strokeColor(COLOR.trazo)
        .stroke()
    } else {
      doc.text(opcion, MARGEN_X + 13, y + 0.5, { width: mitadAncho - 30, lineBreak: false })
    }
  })
  const yGenero = yDosColumnas
  doc.font('Sans-Bold').fontSize(10).fillColor(COLOR.guinda)
  doc.text('Género (opcional)', MARGEN_X + mitadAncho, yGenero, {
    width: mitadAncho,
    lineBreak: false,
  })
  GENEROS.forEach((opcion, i) => {
    const y = yGenero + 15 + i * 13.5
    casillero(doc, MARGEN_X + mitadAncho, y)
    doc.fillColor(COLOR.texto).font('Sans').fontSize(8)
    doc.text(opcion, MARGEN_X + mitadAncho + 13, y + 0.5, {
      width: mitadAncho - 20,
      lineBreak: false,
    })
  })
  c.y = yDosColumnas + 15 + TIPOS_PARTICIPANTE.length * 13.5 + 6

  // Datos complementarios.
  titulo(doc, c, 'Datos complementarios (opcionales)')
  doc.font('Sans').fontSize(7.2).fillColor(COLOR.suave)
  doc.text(
    'Estos datos corresponden a quien participa y pueden ser distintos de la ubicación de la propuesta.',
    MARGEN_X,
    c.y - 3,
    { width: ANCHO_UTIL, lineBreak: false },
  )
  c.y += 9
  const dosTercios = ANCHO_UTIL * 0.5
  campoDeLinea(doc, 'Domicilio de quien participa, para notificaciones', MARGEN_X, c.y, dosTercios)
  campoDeLinea(
    doc,
    'Municipio de residencia',
    MARGEN_X + dosTercios + 10,
    c.y,
    ANCHO_UTIL * 0.25 - 4,
  )
  campoDeLinea(
    doc,
    'Ocupación o puesto',
    MARGEN_X + dosTercios + ANCHO_UTIL * 0.25 + 10,
    c.y,
    ANCHO_UTIL * 0.25 - 10,
  )
  c.y += 32

  // Archivos, privacidad y firma.
  doc.font('Sans').fontSize(7.8).fillColor(COLOR.texto)
  casillero(doc, MARGEN_X, c.y)
  doc.text(
    `Entrego documentos anexos (hasta ${MAX_UPLOAD_FILES} archivos; el personal los escanea y los registra con este folio).`,
    MARGEN_X + 13,
    c.y + 0.5,
    { width: ANCHO_UTIL - 13, lineBreak: false },
  )
  c.y += 15
  doc.font('Sans').fontSize(7).fillColor(COLOR.suave)
  doc.text(`Aviso de privacidad: ${TEXTOS_FORMATO.privacidad}`, MARGEN_X, c.y, {
    width: ANCHO_UTIL,
    align: 'justify',
  })
  c.y += 20
  casillero(doc, MARGEN_X, c.y)
  doc.font('Sans').fontSize(7.8).fillColor(COLOR.texto)
  doc.text(`${TEXTOS_FORMATO.consentimiento} *`, MARGEN_X + 13, c.y + 0.5, {
    width: 330,
    lineBreak: false,
  })
  doc
    .moveTo(MARGEN_X + 360, c.y + 9)
    .lineTo(MARGEN_X + ANCHO_UTIL, c.y + 9)
    .lineWidth(0.7)
    .strokeColor(COLOR.trazo)
    .stroke()
  doc.font('Sans').fontSize(7).fillColor(COLOR.suave)
  doc.text('Firma de quien participa', MARGEN_X + 360, c.y + 12, { width: 150, lineBreak: false })

  doc.restore()
  dibujarPie(doc, TEXTOS_FORMATO.pie, PIE_ALTO)
  doc.end()
  return listo
}
