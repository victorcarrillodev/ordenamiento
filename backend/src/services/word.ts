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

interface Row {
  id: string
  folio: string
  origen: string
  nombre: string
  correo: string
  calle: string
  numero: string
  colonia: string
  municipio: string
  domicilio: string
  municipio_participante: string
  institucion: string
  ocupacion: string
  latitud: string
  longitud: string
  observacion: string
  estado: string
  fuente: string
  genero: string
  tematica: string
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
 * Genera el documento Word (.docx) de una participación con sus datos.
 */
export async function participationDocx(p: Row): Promise<Buffer> {
  const registro = p.created_at?.toLocaleString?.('es-MX') ?? String(p.created_at)

  const doc = new Document({
    sections: [
      {
        children: [
          new Paragraph({
            alignment: AlignmentType.CENTER,
            heading: HeadingLevel.HEADING_1,
            children: [
              new TextRun({
                text: 'Bitácora Ambiental · Participación',
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
              fila('Nombre', p.nombre, true),
              fila('Correo', p.correo, false),
              fila('Origen', p.origen, true),
              fila('Estado', p.estado, false),
              fila('Fuente', p.fuente, true),
              fila('Género', p.genero, false),
              fila('Temática', p.tematica, true),
              fila('Municipio', p.municipio, false),
              fila('Colonia', p.colonia, true),
              fila('Domicilio', p.domicilio, false),
              fila('Municipio de participante', p.municipio_participante, true),
              fila('Calle', p.calle, false),
              fila('Número', p.numero, true),
              fila('Latitud', p.latitud, false),
              fila('Longitud', p.longitud, true),
              fila('Institución', p.institucion, false),
              fila('Ocupación', p.ocupacion, true),
              fila('Registro', registro, false),
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
          new Paragraph({
            children: [
              new TextRun({
                text: p.observacion || '(sin observación)',
                size: 22,
                font: 'Calibri',
              }),
            ],
          }),
        ],
      },
    ],
  })

  return Packer.toBuffer(doc)
}
