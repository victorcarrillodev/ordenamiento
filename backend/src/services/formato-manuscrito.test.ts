import { describe, expect, it } from 'bun:test'
import pdfParse from 'pdf-parse'

import {
  ETIQUETA_ALCANCE,
  GENEROS,
  LIMITES,
  TEMATICAS,
  TIPOS_PARTICIPANTE,
} from './participacion-campos.ts'
import { generarFormatoManuscrito, NOMBRE_ARCHIVO_FORMATO } from './formato-manuscrito.ts'

const FOLIO = 'SPAGU-DGTPU-E-0021'

async function leer() {
  const pdf = await generarFormatoManuscrito(FOLIO)
  const datos = await pdfParse(pdf)
  return { pdf, paginas: datos.numpages, texto: datos.text.replace(/\s+/g, ' ') }
}

describe('formato de participación para llenar a mano', () => {
  it('es una sola hoja tamaño carta', async () => {
    const { pdf, paginas } = await leer()
    expect(pdf.subarray(0, 5).toString('latin1')).toBe('%PDF-')
    expect(pdf.toString('latin1')).toContain('/MediaBox [0 0 612 792]')
    expect(paginas).toBe(1)
  })

  it('lleva el folio', async () => {
    expect((await leer()).texto).toContain(`FOLIO ${FOLIO}`)
  })

  it('pide los mismos campos que el formulario en línea', async () => {
    const { texto } = await leer()
    for (const campo of [
      'Nombre completo *',
      'Correo electrónico *',
      'Ubicación de la propuesta *',
      'Domicilio o referencia del lugar o predio',
      'Colonia o zona',
      'C.P.',
      'Empresa, institución u organización',
      'Observación o propuesta *',
      'Temática de la propuesta (opcional)',
      'Tipo de participante (opcional)',
      'Género (opcional)',
      'Datos complementarios (opcionales)',
      'Domicilio de quien participa, para notificaciones',
      'Municipio de residencia',
      'Ocupación o puesto',
      'Firma de quien participa',
    ]) {
      expect(texto, campo).toContain(campo)
    }
    expect(texto).toContain(ETIQUETA_ALCANCE.municipio)
    expect(texto).toContain(ETIQUETA_ALCANCE.especifico)
  })

  it('ofrece todas las opciones de los tres catálogos, las del formulario', async () => {
    const { texto } = await leer()
    for (const opcion of [...TEMATICAS, ...TIPOS_PARTICIPANTE, ...GENEROS]) {
      expect(texto, opcion).toContain(opcion)
    }
  })

  it('anuncia los mismos topes que valida el formulario', async () => {
    const { texto } = await leer()
    expect(texto).toContain(`máx. ${LIMITES.observacion} caracteres`)
    expect(texto).toContain(`máx. ${LIMITES.institucion} caracteres`)
    expect(texto).toContain(`máx. ${LIMITES.nombre} caracteres`)
  })

  it('el archivo se llama «Formato de participación <folio>.pdf»', () => {
    expect(NOMBRE_ARCHIVO_FORMATO(FOLIO)).toBe(`Formato de participación ${FOLIO}.pdf`)
  })

  it('no confunde folios: cada hoja lleva el suyo', async () => {
    const otro = await pdfParse(await generarFormatoManuscrito('SPAGU-DGTPU-E-0999'))
    expect(otro.text).toContain('SPAGU-DGTPU-E-0999')
    expect(otro.text).not.toContain(FOLIO)
  })
})
