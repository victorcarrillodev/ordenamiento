/**
 * Lo común de los PDF institucionales (el acuse y el formato para llenar a
 * mano): hoja carta, colores, y la tipografía DejaVu Sans, la del modelo
 * aprobado, que cubre todo el latín extendido (un nombre con caracteres poco
 * comunes no sale con cuadritos). Los archivos de fuente vienen del paquete
 * `dejavu-fonts-ttf`.
 */
import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'

import PDFDocument from 'pdfkit'

export type Doc = InstanceType<typeof PDFDocument>

export const ANCHO = 612
export const ALTO = 792
export const MARGEN_X = 34
export const ANCHO_UTIL = ANCHO - MARGEN_X * 2

export const COLOR = {
  guinda: '#5E142D',
  oro: '#C9A24D',
  cintillo: '#F2D58B',
  texto: '#3F4C5E',
  suave: '#475467',
  caja: '#F7EEF1',
  fondoTabla: '#F4F5F7',
  linea: '#E4E7EC',
  trazo: '#98A2B3',
  enlace: '#1F5C99',
  blanco: '#FFFFFF',
}

const requerir = createRequire(import.meta.url)
const RAIZ_FUENTES = join(dirname(requerir.resolve('dejavu-fonts-ttf/package.json')), 'ttf')
const FUENTE = {
  normal: join(RAIZ_FUENTES, 'DejaVuSans.ttf'),
  negrita: join(RAIZ_FUENTES, 'DejaVuSans-Bold.ttf'),
}

/**
 * Un documento carta con las fuentes ya registradas como «Sans» y «Sans-Bold», y
 * la promesa del PDF terminado. PDFKit abre una página nueva en cuanto un texto
 * cruza el margen inferior; con margen cero y uno inferior enorme y negativo
 * nunca lo cruza, así que el documento es de una sola hoja y lo que se salga se
 * recorta.
 */
export function nuevoDocumento(info: { Title: string; Subject: string }): {
  doc: Doc
  listo: Promise<Buffer>
} {
  const doc = new PDFDocument({
    size: 'LETTER',
    margin: 0,
    autoFirstPage: true,
    info: { ...info, Author: 'Gobierno Municipal de San Pedro Tlaquepaque' },
  })
  doc.registerFont('Sans', FUENTE.normal)
  doc.registerFont('Sans-Bold', FUENTE.negrita)
  doc.page.margins.bottom = -1_000_000

  const trozos: Buffer[] = []
  const listo = new Promise<Buffer>((resolver, rechazar) => {
    doc.on('data', (t: Buffer) => trozos.push(t))
    doc.on('end', () => resolver(Buffer.concat(trozos)))
    doc.on('error', rechazar)
  })
  return { doc, listo }
}

/** Banda guinda con el cintillo, el título y el subtítulo, y su filete dorado. */
export function dibujarBanda(
  doc: Doc,
  textos: { cintillo: string; titulo: string; subtitulo: string },
  escala = 1,
): number {
  const px = (n: number) => n * escala
  const alto = px(74)
  doc.rect(0, 0, ANCHO, alto).fill(COLOR.guinda)
  doc.rect(0, alto, ANCHO, px(3)).fill(COLOR.oro)
  doc
    .font('Sans-Bold')
    .fontSize(7.5 * escala)
    .fillColor(COLOR.cintillo)
  doc.text(textos.cintillo, MARGEN_X, px(15), { width: ANCHO_UTIL, lineBreak: false })
  doc
    .font('Sans-Bold')
    .fontSize(21 * escala)
    .fillColor(COLOR.blanco)
  doc.text(textos.titulo, MARGEN_X, px(30), { width: ANCHO_UTIL, lineBreak: false })
  doc
    .font('Sans')
    .fontSize(10 * escala)
    .fillColor(COLOR.blanco)
  doc.text(textos.subtitulo, MARGEN_X, px(56), { width: ANCHO_UTIL, lineBreak: false })
  return alto + px(3)
}

/** Línea con la firma de la Bitácora al pie de la hoja. */
export function dibujarPie(doc: Doc, texto: string, alto: number): void {
  const yPie = ALTO - alto
  doc
    .moveTo(MARGEN_X, yPie)
    .lineTo(ANCHO - MARGEN_X, yPie)
    .lineWidth(0.7)
    .strokeColor(COLOR.linea)
    .stroke()
  doc.font('Sans').fontSize(8).fillColor(COLOR.suave)
  doc.text(texto, MARGEN_X, yPie + 8, { width: ANCHO_UTIL, lineBreak: false })
}
