import { describe, expect, it } from 'bun:test'
import JSZip from 'jszip'

import { filasDeLaParticipacion, participationDocx, type Row } from './word.ts'

const PARTICIPACION: Row = {
  id: '550e8400-e29b-41d4-a716-446655440042',
  folio: 'BIT-2026-000123',
  origen: 'digital',
  nombre: 'María Fernanda López',
  correo: 'maria@example.com',
  calle: 'Av. Juárez 100',
  numero: '',
  colonia: 'Centro',
  municipio: 'San Pedro Tlaquepaque',
  codigo_postal: '45500',
  alcance_ubicacion: 'especifico',
  domicilio: 'Hidalgo 45, Santa Anita',
  municipio_participante: 'Zapopan',
  institucion: 'Colectivo Vecinal Centro',
  ocupacion: 'Arquitecta',
  latitud: '',
  longitud: '',
  observacion: 'Propongo un corredor verde.\nSegunda línea de la propuesta.',
  estado: 'En proceso',
  fuente: 'Otra',
  fuente_otra: 'Colectivo vecinal',
  genero: 'Mujer',
  tematica: 'Movilidad',
  tematica_otra: '',
  created_at: new Date('2026-09-24T22:25:05Z'),
}

const fila = (p: Row, campo: string) => filasDeLaParticipacion(p).find(([c]) => c === campo)?.[1]

describe('Word de la participación: datos', () => {
  it('nombra los datos como el formulario y el acuse', () => {
    const campos = filasDeLaParticipacion(PARTICIPACION).map(([campo]) => campo)
    for (const esperado of [
      'Empresa, institución u organización',
      'Tipo de participante',
      'Temática',
      'Ubicación de la propuesta',
      'Domicilio de quien participa',
      'Municipio de residencia',
      'Ocupación o puesto',
      'Modalidad',
    ]) {
      expect(campos, esperado).toContain(esperado)
    }
    // Los nombres internos ya no se muestran.
    expect(campos).not.toContain('Origen')
    expect(campos).not.toContain('Fuente')
  })

  it('identifica la modalidad: Presencial, o En línea mediante la Bitácora', () => {
    expect(fila({ ...PARTICIPACION, origen: 'fisica' }, 'Modalidad')).toBe('Presencial')
    expect(fila({ ...PARTICIPACION, origen: 'digital' }, 'Modalidad')).toBe(
      'En línea, mediante la Bitácora',
    )
  })

  it('«Otra» sale con lo que se especificó', () => {
    expect(fila(PARTICIPACION, 'Tipo de participante')).toBe('Otra: Colectivo vecinal')
    expect(
      fila({ ...PARTICIPACION, tematica: 'Otra', tematica_otra: 'Ruido nocturno' }, 'Temática'),
    ).toBe('Otra: Ruido nocturno')
    expect(fila(PARTICIPACION, 'Temática')).toBe('Movilidad')
  })

  it('la ubicación se lee como en el acuse', () => {
    expect(fila(PARTICIPACION, 'Ubicación de la propuesta')).toBe(
      'Av. Juárez 100, Centro, C.P. 45500',
    )
    expect(
      fila(
        {
          ...PARTICIPACION,
          alcance_ubicacion: 'municipio',
          calle: '',
          colonia: '',
          codigo_postal: '',
        },
        'Ubicación de la propuesta',
      ),
    ).toBe('Todo el municipio')
  })

  it('la fecha de registro va en la hora de la Ciudad de México', () => {
    expect(fila(PARTICIPACION, 'Registro')).toBe('Jueves 24 de septiembre de 2026, 4:25:05 p. m.')
  })

  it('lo que ya no se captura solo sale en las participaciones que lo tienen', () => {
    const nueva = filasDeLaParticipacion(PARTICIPACION).map(([campo]) => campo)
    for (const ausente of ['Número', 'Coordenadas', 'Municipio'])
      expect(nueva).not.toContain(ausente)

    const antigua = {
      ...PARTICIPACION,
      numero: '12-B',
      latitud: '20.64',
      longitud: '-103.31',
      municipio: 'Guadalajara',
    }
    expect(fila(antigua, 'Número')).toBe('12-B')
    expect(fila(antigua, 'Coordenadas')).toBe('20.64, -103.31')
    expect(fila(antigua, 'Municipio')).toBe('Guadalajara')
  })
})

describe('Word de la participación: documento', () => {
  /** El texto del .docx, un renglón por párrafo. */
  async function parrafos(p: Row): Promise<string[]> {
    const zip = await JSZip.loadAsync(await participationDocx(p))
    const xml = await zip.file('word/document.xml')!.async('string')
    return [...xml.matchAll(/<w:p[ >][\s\S]*?<\/w:p>/g)].map((m) =>
      [...m[0].matchAll(/<w:t[^>]*>([^<]*)<\/w:t>/g)].map((t) => t[1]).join(''),
    )
  }

  it('lleva el folio y todos los datos de la participación', async () => {
    const texto = (await parrafos(PARTICIPACION)).join('\n')
    for (const esperado of [
      'Folio BIT-2026-000123',
      'María Fernanda López',
      'maria@example.com',
      'En línea, mediante la Bitácora',
      'Colectivo Vecinal Centro',
      'Otra: Colectivo vecinal',
      'Av. Juárez 100, Centro, C.P. 45500',
      'Hidalgo 45, Santa Anita',
      'Zapopan',
      'Arquitecta',
    ]) {
      expect(texto, esperado).toContain(esperado)
    }
  })

  it('cada línea de la observación va en su renglón', async () => {
    const renglones = await parrafos(PARTICIPACION)
    expect(renglones).toContain('Propongo un corredor verde.')
    expect(renglones).toContain('Segunda línea de la propuesta.')
  })

  it('una participación sin observación lo dice', async () => {
    expect(await parrafos({ ...PARTICIPACION, observacion: '' })).toContain('(sin observación)')
  })
})
