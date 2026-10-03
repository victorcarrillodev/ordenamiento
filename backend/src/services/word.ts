import {
  AlignmentType,
  BorderStyle,
  Document,
  HeadingLevel,
  Packer,
  Paragraph,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
} from 'docx'

import { etiquetaModalidad, fechaDelAcuse } from './acuse.ts'
import { MUNICIPIO, textoDeOpcion, textoDeUbicacion } from './participacion-campos.ts'

export interface Row {
  id: string
  folio: string
  origen: string
  nombre: string
  correo: string
  calle: string
  numero: string
  colonia: string
  municipio: string
  codigo_postal: string
  alcance_ubicacion: string
  domicilio: string
  municipio_participante: string
  institucion: string
  ocupacion: string
  latitud: string
  longitud: string
  observacion: string
  estado: string
  fuente: string
  fuente_otra: string
  genero: string
  tematica: string
  tematica_otra: string
  created_at: Date
}

const AZUL = '1F4D6E'
const GRIS = 'F2F5F9'

function celda(texto: string, opts: { header?: boolean; ancho?: number } = {}) {
  return new TableCell({
    width: opts.ancho ? { size: opts.ancho, type: WidthType.PERCENTAGE } : undefined,
    shading: opts.header ? { fill: AZUL } : undefined,
    margins: { top: 80, bottom: 80, left: 120, right: 120 },
    children: [
      new Paragraph({
        children: [
          new TextRun({
            text: texto || '—',
            bold: opts.header,
            color: opts.header ? 'FFFFFF' : '2B3445',
            size: 20,
            font: 'Calibri',
          }),
        ],
      }),
    ],
  })
}

function fila(label: string, valor: string, alterna: boolean) {
  return new TableRow({
    children: [
      new TableCell({
        width: { size: 30, type: WidthType.PERCENTAGE },
        shading: { fill: alterna ? GRIS : 'FFFFFF' },
        margins: { top: 80, bottom: 80, left: 120, right: 120 },
        children: [
          new Paragraph({
            children: [
              new TextRun({ text: label, bold: true, size: 20, font: 'Calibri', color: AZUL }),
            ],
          }),
        ],
      }),
      new TableCell({
        width: { size: 70, type: WidthType.PERCENTAGE },
        shading: { fill: alterna ? GRIS : 'FFFFFF' },
        margins: { top: 80, bottom: 80, left: 120, right: 120 },
        children: [
          new Paragraph({
            children: [new TextRun({ text: valor || '—', size: 20, font: 'Calibri' })],
          }),
        ],
      }),
    ],
  })
}

/**
 * Los datos de la participación como se nombran en el formulario y en el acuse:
 * la modalidad con su nombre (no el valor interno `fisica`/`digital`), «Otra»
 * con lo que se especificó y la ubicación como la lee el acuse. Los datos que ya
 * no se capturan (número, coordenadas, un municipio distinto del Programa) salen
 * solo en las participaciones que los tienen.
 */
export function filasDeLaParticipacion(p: Row): Array<[string, string]> {
  const registro = p.created_at instanceof Date ? fechaDelAcuse(p.created_at) : String(p.created_at)
  const datosDelFormulario: Array<[string, string]> = [
    ['Nombre', p.nombre],
    ['Correo electrónico', p.correo],
    ['Modalidad', etiquetaModalidad(p.origen)],
    ['Estado', p.estado],
    ['Empresa, institución u organización', p.institucion],
    ['Tipo de participante', textoDeOpcion(p.fuente, p.fuente_otra)],
    ['Género', p.genero],
    ['Temática', textoDeOpcion(p.tematica, p.tematica_otra)],
    [
      'Ubicación de la propuesta',
      textoDeUbicacion({
        alcance_ubicacion: p.alcance_ubicacion,
        calle: p.calle,
        colonia: p.colonia,
        codigo_postal: p.codigo_postal,
      }),
    ],
  ]

  const datosQueYaNoSeCapturan: Array<[string, string]> = []
  if (p.municipio && p.municipio !== MUNICIPIO)
    datosQueYaNoSeCapturan.push(['Municipio', p.municipio])
  if (p.numero) datosQueYaNoSeCapturan.push(['Número', p.numero])
  if (p.latitud || p.longitud) {
    datosQueYaNoSeCapturan.push(['Coordenadas', [p.latitud, p.longitud].filter(Boolean).join(', ')])
  }

  return [
    ...datosDelFormulario,
    ...datosQueYaNoSeCapturan,
    ['Domicilio de quien participa', p.domicilio],
    ['Municipio de residencia', p.municipio_participante],
    ['Ocupación o puesto', p.ocupacion],
    ['Registro', registro],
  ]
}

/**
 * Genera el documento Word (.docx) de una participación con sus datos.
 */
export async function participationDocx(p: Row): Promise<Buffer> {
  const doc = new Document({
    sections: [
      {
        children: [
          new Paragraph({
            alignment: AlignmentType.CENTER,
            heading: HeadingLevel.HEADING_1,
            children: [
              new TextRun({
                text: 'Bitácora · Participación',
                bold: true,
                color: AZUL,
                size: 32,
                font: 'Calibri',
              }),
            ],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 300 },
            children: [
              new TextRun({ text: `Folio ${p.folio}`, size: 24, color: '7A8699', font: 'Calibri' }),
            ],
          }),
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            borders: {
              top: { style: BorderStyle.SINGLE, size: 1, color: 'D5DCE5' },
              bottom: { style: BorderStyle.SINGLE, size: 1, color: 'D5DCE5' },
              left: { style: BorderStyle.SINGLE, size: 1, color: 'D5DCE5' },
              right: { style: BorderStyle.SINGLE, size: 1, color: 'D5DCE5' },
              insideHorizontal: { style: BorderStyle.SINGLE, size: 1, color: 'D5DCE5' },
              insideVertical: { style: BorderStyle.SINGLE, size: 1, color: 'D5DCE5' },
            },
            rows: [
              new TableRow({
                children: [
                  celda('Campo', { header: true, ancho: 30 }),
                  celda('Dato', { header: true, ancho: 70 }),
                ],
              }),
              ...filasDeLaParticipacion(p).map(([campo, valor], i) =>
                fila(campo, valor, i % 2 === 0),
              ),
            ],
          }),
          new Paragraph({
            spacing: { before: 300 },
            heading: HeadingLevel.HEADING_2,
            children: [
              new TextRun({
                text: 'Observación',
                bold: true,
                color: AZUL,
                size: 26,
                font: 'Calibri',
              }),
            ],
          }),
          // Cada salto de línea de la observación es un renglón: en un solo TextRun Word lo ignoraría.
          ...(p.observacion || '(sin observación)').split('\n').map(
            (linea) =>
              new Paragraph({
                children: [new TextRun({ text: linea, size: 22, font: 'Calibri' })],
              }),
          ),
        ],
      },
    ],
  })

  return Packer.toBuffer(doc)
}
