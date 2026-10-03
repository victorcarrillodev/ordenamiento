import { describe, expect, it } from 'bun:test'
import pdfParse from 'pdf-parse'

import { acortarNombre as acortarNombreDeArchivos, MAX_NOMBRE_ARCHIVO } from '../files/nombres.ts'
import {
  ESCALAS,
  fechaDelAcuse,
  filasDelAcuse,
  generarAcuse,
  nombreArchivoAcuse,
  SIN_ADJUNTOS,
  type DatosAcuse,
} from './acuse.ts'
import { LIMITES, MAX_SALTOS_OBSERVACION } from './participacion-campos.ts'

const MAX_ARCHIVOS = Number(process.env.MAX_UPLOAD_FILES ?? 5)

/** Texto que se repite hasta tener exactamente `n` caracteres. */
const relleno = (n: number, base: string) => base.repeat(Math.ceil(n / base.length)).slice(0, n)

const modelo = (): DatosAcuse => ({
  folio: 'SPAGU-DGTPU-E-0018',
  origen: 'digital',
  nombre: 'María del Carmen González Avalos',
  correo: 'carmenga.tlaquepaque@gmail.com',
  fechaRecepcion: new Date('2026-09-24T22:25:05Z'),
  alcance_ubicacion: 'especifico',
  calle: 'Av. Juárez 100',
  colonia: 'Centro',
  institucion: 'Universidad de Guadalajara',
  tematica: 'Movilidad',
  observacion: 'Uso muy alto',
  adjuntos: ['PPDU GEOR (TABLA).zip'],
})

/** El acuse con todos los campos que lo alimentan llenos al máximo y el máximo de archivos. */
const alMaximo = (): DatosAcuse => ({
  folio: 'SPAGU-DGTPU-E-9999',
  origen: 'fisica',
  nombre: relleno(LIMITES.nombre, 'Nombre Apellidopaterno '),
  // Sin espacios ni puntos de corte: el peor caso para el ajuste de línea.
  correo: `${'a'.repeat(LIMITES.correo - '@x.mx'.length)}@x.mx`,
  fechaRecepcion: new Date('2026-09-24T22:25:05Z'),
  alcance_ubicacion: 'especifico',
  calle: relleno(LIMITES.calle, 'Calle larga '),
  colonia: relleno(LIMITES.colonia, 'Colonia '),
  codigo_postal: '45500',
  institucion: relleno(LIMITES.institucion, 'Institución '),
  tematica: 'Otra',
  tematica_otra: relleno(LIMITES.tematica_otra, 'Tema '),
  observacion: relleno(LIMITES.observacion, 'Observación muy detallada del proyecto. '),
  adjuntos: Array.from({ length: MAX_ARCHIVOS }, (_, i) =>
    acortarNombreDeArchivos(`${i}-${relleno(200, 'Archivo_con_nombre_largo_')}.pdf`),
  ),
})

async function leer(pdf: Buffer) {
  const datos = await pdfParse(pdf)
  return { paginas: datos.numpages, texto: datos.text }
}

const sinBlancos = (texto: string) => texto.replace(/\s+/g, '')

describe('acuse en PDF: contenido del modelo aprobado', () => {
  it('es un PDF de una sola hoja tamaño carta', async () => {
    const { pdf } = await generarAcuse(modelo())
    expect(pdf.subarray(0, 5).toString('latin1')).toBe('%PDF-')
    expect(pdf.toString('latin1')).toContain('/MediaBox [0 0 612 792]')
    expect((await leer(pdf)).paginas).toBe(1)
  })

  it('trae la información y la redacción del modelo', async () => {
    const { pdf, completo } = await generarAcuse(modelo())
    expect(completo).toBe(true)
    const { texto } = await leer(pdf)
    const plano = texto.replace(/\s+/g, ' ')
    for (const fragmento of [
      'GOBIERNO MUNICIPAL DE SAN PEDRO TLAQUEPAQUE · POETDUM',
      'Recibimos tu observación',
      'Acuse de recepción de participación ciudadana',
      'Hola, María del Carmen González Avalos:',
      'Gracias por participar en la consulta pública.',
      'TU FOLIO SPAGU-DGTPU-E-0018',
      'Consérvalo para consultar el seguimiento y la respuesta.',
      'todavía no constituye una respuesta sobre su contenido',
      'Información registrada',
      'Fecha y hora de recepción',
      'Jueves 24 de septiembre de 2026, 4:25:05 p. m.',
      'En línea, mediante la Bitácora',
      'Persona participante',
      'carmenga.tlaquepaque@gmail.com',
      'Av. Juárez 100, Centro',
      'Universidad de Guadalajara',
      'Movilidad',
      'Observación registrada',
      'Uso muy alto',
      'se harán públicas en el portal municipal durante el proceso de aprobación',
      'Archivos adjuntos recibidos',
      'PPDU GEOR (TABLA).zip',
      '¿Qué sigue?',
      '01 · Recepción',
      '02 · Análisis',
      '03 · Respuesta',
      'Consulta de la respuesta',
      'calle Juárez 28, colonia Centro, San Pedro Tlaquepaque, Jalisco',
      'Bitácora · Gobierno Municipal de San Pedro Tlaquepaque',
    ]) {
      expect(plano, fragmento).toContain(fragmento)
    }
  })

  it('una participación presencial se identifica como «Presencial»', async () => {
    const { pdf } = await generarAcuse({ ...modelo(), origen: 'fisica' })
    const { texto } = await leer(pdf)
    expect(texto.replace(/\s+/g, ' ')).toContain('Modalidad Presencial')
    expect(texto).not.toContain('En línea, mediante la Bitácora')
  })

  it('sin archivos, la sección lo dice: «Sin archivos adjuntos»', async () => {
    const { pdf } = await generarAcuse({ ...modelo(), adjuntos: [] })
    const { texto } = await leer(pdf)
    expect(texto).toContain('Archivos adjuntos recibidos')
    expect(texto).toContain(SIN_ADJUNTOS)
  })

  it('con archivos, muestra sus nombres y no la leyenda de que no hay', async () => {
    const { pdf } = await generarAcuse({ ...modelo(), adjuntos: ['plano.dwg', 'estudio.pdf'] })
    const { texto } = await leer(pdf)
    expect(texto).toContain('plano.dwg')
    expect(texto).toContain('estudio.pdf')
    expect(texto).not.toContain(SIN_ADJUNTOS)
  })

  it('«Todo el municipio» se lee tal cual en la ubicación', async () => {
    const { pdf } = await generarAcuse({
      ...modelo(),
      alcance_ubicacion: 'municipio',
      calle: '',
      colonia: '',
    })
    const { texto } = await leer(pdf)
    expect(texto.replace(/\s+/g, ' ')).toContain('Ubicación de la propuesta Todo el municipio')
  })

  it('«Otra» temática muestra lo que se especificó', async () => {
    const { pdf } = await generarAcuse({
      ...modelo(),
      tematica: 'Otra',
      tematica_otra: 'Arbolado urbano',
    })
    expect((await leer(pdf)).texto.replace(/\s+/g, ' ')).toContain('Otra: Arbolado urbano')
  })

  it('conserva acentos, eñes y signos de apertura', async () => {
    const { pdf } = await generarAcuse({
      ...modelo(),
      nombre: 'Ñandú Pérez Ibáñez',
      observacion: '¿Podrían revisar la vialidad? ¡Es urgente! Cañada «Los Ángeles».',
    })
    const { texto } = await leer(pdf)
    expect(texto).toContain('Ñandú Pérez Ibáñez')
    expect(texto.replace(/\s+/g, ' ')).toContain(
      '¿Podrían revisar la vialidad? ¡Es urgente! Cañada «Los Ángeles».',
    )
  })

  it('un acuse corto sale con letra grande, como el modelo', async () => {
    const { escala } = await generarAcuse(modelo())
    expect(escala).toBeGreaterThan(1)
  })
})

describe('acuse en PDF: cabe completo con todos los campos al máximo', () => {
  it('una sola hoja, completo y sin bajar del mínimo legible', async () => {
    const { pdf, escala, completo } = await generarAcuse(alMaximo())
    expect(completo).toBe(true)
    expect(escala).toBeGreaterThanOrEqual(ESCALAS[ESCALAS.length - 1])
    expect((await leer(pdf)).paginas).toBe(1)
  })

  it('la observación de 500 caracteres aparece completa', async () => {
    const datos = alMaximo()
    const { pdf } = await generarAcuse(datos)
    expect(sinBlancos((await leer(pdf)).texto)).toContain(sinBlancos(datos.observacion))
  })

  it('los demás campos también aparecen completos, incluido el correo sin cortes', async () => {
    const datos = alMaximo()
    const { texto } = await leer((await generarAcuse(datos)).pdf)
    const plano = sinBlancos(texto)
    for (const valor of [
      datos.nombre,
      datos.correo,
      datos.calle,
      datos.colonia,
      datos.institucion,
      datos.tematica_otra,
    ]) {
      expect(plano, valor).toContain(sinBlancos(valor ?? ''))
    }
  })

  it(`los ${MAX_ARCHIVOS} archivos permitidos aparecen con su nombre`, async () => {
    const datos = alMaximo()
    expect(datos.adjuntos).toHaveLength(MAX_ARCHIVOS)
    const plano = sinBlancos((await leer((await generarAcuse(datos)).pdf)).texto)
    // El nombre largo se muestra acortado con «…», que el extractor de texto lee como «...».
    for (const nombre of datos.adjuntos) {
      expect(plano).toContain(sinBlancos(nombre).replace('…', '...'))
    }
  })

  it(`la observación admite ${MAX_SALTOS_OBSERVACION} saltos de línea con todo lo demás al máximo`, async () => {
    const renglones = MAX_SALTOS_OBSERVACION + 1
    const por = Math.floor((LIMITES.observacion - MAX_SALTOS_OBSERVACION) / renglones)
    const observacion = Array.from({ length: renglones }, () => 'x'.repeat(por)).join('\n')
    const { pdf, completo } = await generarAcuse({ ...alMaximo(), observacion })
    expect(completo).toBe(true)
    expect((await leer(pdf)).paginas).toBe(1)
  })

  it('el nombre de archivo más largo que se guarda también cabe', () => {
    const guardado = acortarNombreDeArchivos(`${'x'.repeat(300)}.pdf`)
    expect(Array.from(guardado).length).toBeLessThanOrEqual(MAX_NOMBRE_ARCHIVO)
    expect(guardado.endsWith('.pdf')).toBe(true)
  })

  it('si aun así no cupiera (datos fuera de los topes), no abre una segunda hoja', async () => {
    const { pdf, completo } = await generarAcuse({
      ...alMaximo(),
      observacion: relleno(6000, 'Texto fuera de todo tope. '),
    })
    expect(completo).toBe(false)
    expect((await leer(pdf)).paginas).toBe(1)
  })
})

describe('acuse: fecha, filas y nombre del archivo', () => {
  it('la fecha va en la hora de la Ciudad de México y con «p. m.» / «a. m.»', () => {
    expect(fechaDelAcuse(new Date('2026-09-24T22:25:05Z'))).toBe(
      'Jueves 24 de septiembre de 2026, 4:25:05 p. m.',
    )
    expect(fechaDelAcuse(new Date('2026-01-05T15:03:09Z'))).toBe(
      'Lunes 5 de enero de 2026, 9:03:09 a. m.',
    )
  })

  it('las ocho filas del modelo, en su orden', () => {
    expect(filasDelAcuse(modelo()).map(([etiqueta]) => etiqueta)).toEqual([
      'Estado',
      'Fecha y hora de recepción',
      'Modalidad',
      'Persona participante',
      'Correo registrado',
      'Ubicación de la propuesta',
      'Empresa, institución u organización',
      'Temática de la propuesta',
    ])
  })

  it('lo que no se capturó se muestra con un guion, sin quitar la fila', () => {
    const filas = Object.fromEntries(filasDelAcuse({ ...modelo(), institucion: '', tematica: '' }))
    expect(filas['Empresa, institución u organización']).toBe('—')
    expect(filas['Temática de la propuesta']).toBe('—')
  })

  it('el archivo se llama «Acuse <folio>.pdf»', () => {
    expect(nombreArchivoAcuse('SPAGU-DGTPU-E-0018')).toBe('Acuse SPAGU-DGTPU-E-0018.pdf')
  })
})
