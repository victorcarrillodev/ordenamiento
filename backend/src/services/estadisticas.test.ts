/* eslint-disable @typescript-eslint/no-explicit-any */
import { afterEach, describe, expect, it, spyOn } from 'bun:test'

import * as pool from '../db/pool.ts'
import {
  completarMeses,
  estadisticasDeParticipaciones,
  mesActual,
  ordenarCategorias,
  ordenarEstados,
} from './estadisticas.ts'

describe('ordenarCategorias', () => {
  it('mayor total primero', () => {
    expect(
      ordenarCategorias([
        ['a', 1],
        ['b', 5],
        ['c', 3],
      ]),
    ).toEqual([
      ['b', 5],
      ['c', 3],
      ['a', 1],
    ])
  })

  it('los empates salen por nombre, siempre en el mismo orden', () => {
    const empates: Array<[string, number]> = [
      ['Gestión del Agua', 2],
      ['Equipamiento', 2],
      ['Gestión de Riesgo', 2],
      ['Servicios Ambientales', 5],
    ]
    const esperado: Array<[string, number]> = [
      ['Servicios Ambientales', 5],
      ['Equipamiento', 2],
      ['Gestión de Riesgo', 2],
      ['Gestión del Agua', 2],
    ]
    expect(ordenarCategorias(empates)).toEqual(esperado)
    // Da igual cómo lleguen: el resultado es el mismo.
    expect(ordenarCategorias([...empates].reverse())).toEqual(esperado)
  })

  it('al desempatar no distingue mayúsculas ni acentos: «Álamos» va con las A', () => {
    expect(
      ordenarCategorias([
        ['Zona', 1],
        ['álamos', 1],
        ['Bosque', 1],
      ]).map(([n]) => n),
    ).toEqual(['álamos', 'Bosque', 'Zona'])
  })

  it('no modifica lo que recibe', () => {
    const entrada: Array<[string, number]> = [
      ['b', 1],
      ['a', 2],
    ]
    ordenarCategorias(entrada)
    expect(entrada[0][0]).toBe('b')
  })
})

describe('ordenarEstados', () => {
  it('siempre Procedente, En proceso, No procedente', () => {
    const filas = [
      { estado: 'No procedente', total: 2 },
      { estado: 'Procedente', total: 3 },
      { estado: 'En proceso', total: 1 },
    ]
    expect(ordenarEstados(filas).map((f) => f.estado)).toEqual([
      'Procedente',
      'En proceso',
      'No procedente',
    ])
    expect(ordenarEstados([...filas].reverse()).map((f) => f.estado)).toEqual([
      'Procedente',
      'En proceso',
      'No procedente',
    ])
  })

  it('un estado que falte no deja huecos y uno desconocido va al final', () => {
    expect(
      ordenarEstados([
        { estado: 'Archivada', total: 1 },
        { estado: 'No procedente', total: 4 },
      ]).map((f) => f.estado),
    ).toEqual(['No procedente', 'Archivada'])
  })
})

describe('mesActual', () => {
  it('es el mes en la hora de Tlaquepaque, no en UTC', () => {
    // 1 de noviembre 02:00 UTC = 31 de octubre 20:00 en Tlaquepaque (UTC-6 en 2026).
    expect(mesActual(new Date('2026-11-01T02:00:00Z'))).toBe('2026-10')
    expect(mesActual(new Date('2026-11-01T06:30:00Z'))).toBe('2026-11')
  })

  it('formatea con ceros: 2026-03', () => {
    expect(mesActual(new Date('2026-03-15T18:00:00Z'))).toBe('2026-03')
  })
})

describe('completarMeses', () => {
  const p = (mes: string, total: number) => ({ mes, total })

  it('rellena con 0 los meses sin participaciones entre el primero y el mes en curso', () => {
    const serie = completarMeses([p('2025-11', 3), p('2026-01', 5), p('2026-04', 8)], '2026-05')
    expect(serie.map((x) => `${x.mes}:${x.total}`)).toEqual([
      '2025-11:3',
      '2025-12:0',
      '2026-01:5',
      '2026-02:0',
      '2026-03:0',
      '2026-04:8',
      '2026-05:0',
    ])
  })

  it('cruza el cambio de año sin saltarse ni repetir meses', () => {
    const serie = completarMeses([p('2025-11', 1), p('2026-02', 1)], '2026-02')
    expect(serie.map((x) => x.mes)).toEqual(['2025-11', '2025-12', '2026-01', '2026-02'])
  })

  it('con un solo mes con datos y ese es el mes en curso, es un solo punto', () => {
    expect(completarMeses([p('2026-10', 7)], '2026-10')).toEqual([p('2026-10', 7)])
  })

  it('el mes en curso sin participaciones aparece con 0 (se ve que no hubo)', () => {
    expect(completarMeses([p('2026-10', 7)], '2026-11')).toEqual([p('2026-10', 7), p('2026-11', 0)])
  })

  it('un mes posterior al «en curso» (reloj desfasado) no se recorta', () => {
    const serie = completarMeses([p('2026-10', 1), p('2026-12', 2)], '2026-11')
    expect(serie.map((x) => x.mes)).toEqual(['2026-10', '2026-11', '2026-12'])
  })

  it('sin participaciones no hay serie', () => {
    expect(completarMeses([], '2026-10')).toEqual([])
  })

  it('con más de 24 meses conserva los más recientes', () => {
    const serie = completarMeses([p('2023-01', 9), p('2026-10', 1)], '2026-10')
    expect(serie).toHaveLength(24)
    expect(serie[0].mes).toBe('2024-11')
    expect(serie[23]).toEqual(p('2026-10', 1))
    // Y el tope se puede cambiar.
    expect(
      completarMeses([p('2026-01', 1), p('2026-10', 1)], '2026-10', 3).map((x) => x.mes),
    ).toEqual(['2026-08', '2026-09', '2026-10'])
  })

  it('suma los puntos de un mismo mes y descarta claves que no son meses', () => {
    const serie = completarMeses(
      [p('2026-03', 2), p('2026-03', 3), p('basura', 9), p('2026-13', 9), p('2026-5', 9)],
      '2026-03',
    )
    expect(serie).toEqual([p('2026-03', 5)])
  })

  it('no importa el orden en que lleguen', () => {
    const a = completarMeses([p('2026-04', 1), p('2026-01', 2)], '2026-04')
    const b = completarMeses([p('2026-01', 2), p('2026-04', 1)], '2026-04')
    expect(a).toEqual(b)
    expect(a.map((x) => x.mes)).toEqual(['2026-01', '2026-02', '2026-03', '2026-04'])
  })
})

/**
 * `sql` falso: reconoce cada consulta por su texto y devuelve las filas pedidas.
 * Anota los valores con los que se llamó, para comprobar que el filtro de origen
 * llega a donde debe.
 */
function sqlFalso(filas: {
  conteo: Array<{ origen: string; n: string }>
  estados: Array<{ estado: string; n: string }>
  fuente: Array<{ k: string; n: string }>
  genero: Array<{ k: string; n: string }>
  tematica: Array<{ k: string; n: string }>
  meses: Array<{ mes: string; n: string }>
}) {
  const consultas: Array<{ texto: string; valores: unknown[]; columna?: string }> = []
  const falso = (primero: any, ...valores: any[]): any => {
    // sql('columna'): identificador.
    if (typeof primero === 'string') return { identificador: primero }
    const texto = (primero as string[]).join('?').replace(/\s+/g, ' ').trim()
    // Fragmento (WHERE ...): se compone dentro de la consulta que lo usa.
    if (texto.startsWith('WHERE') || texto === '') return { fragmento: texto, valores }
    const columna = valores.find(
      (v) => v && typeof v === 'object' && 'identificador' in v,
    )?.identificador
    consultas.push({
      texto,
      valores: valores.flatMap((v) =>
        v && typeof v === 'object' && 'fragmento' in v ? v.valores : [v],
      ),
      columna,
    })
    if (texto.includes('GROUP BY origen')) return Promise.resolve(filas.conteo)
    if (texto.includes('SELECT estado')) return Promise.resolve(filas.estados)
    if (texto.includes('date_trunc')) return Promise.resolve(filas.meses)
    if (columna === 'fuente') return Promise.resolve(filas.fuente)
    if (columna === 'genero') return Promise.resolve(filas.genero)
    if (columna === 'tematica') return Promise.resolve(filas.tematica)
    throw new Error(`consulta inesperada: ${texto}`)
  }
  return { falso, consultas }
}

const DATOS = {
  conteo: [
    { origen: 'fisica', n: '2' },
    { origen: 'digital', n: '5' },
  ],
  estados: [
    { estado: 'No procedente', n: '2' },
    { estado: 'En proceso', n: '2' },
    { estado: 'Procedente', n: '3' },
  ],
  fuente: [
    { k: 'Empresa', n: '2' },
    { k: '', n: '4' },
    { k: 'Dependencia', n: '2' },
    { k: 'Organización', n: '1' },
  ],
  genero: [
    { k: 'Mujer', n: '3' },
    { k: 'Hombre', n: '3' },
  ],
  tematica: [{ k: 'Servicios Ambientales', n: '7' }],
  meses: [
    { mes: '2026-01', n: '2' },
    { mes: '2026-04', n: '5' },
  ],
}

describe('estadisticasDeParticipaciones', () => {
  let espia: any
  afterEach(() => espia?.mockRestore())

  const consultar = (origen: 'digital' | 'fisica' | null) => {
    const { falso, consultas } = sqlFalso(DATOS)
    espia = spyOn(pool as any, 'sql').mockImplementation(falso)
    const ahora = new Date('2026-05-10T18:00:00Z')
    return estadisticasDeParticipaciones(origen, ahora).then((r) => ({ r, consultas }))
  }

  it('devuelve cada gráfica con su orden estable y los números ya convertidos', async () => {
    const { r } = await consultar(null)

    expect(r.digitales).toBe(5)
    expect(r.fisicas).toBe(2)
    expect(r.resultado).toEqual([
      { estado: 'Procedente', total: 3 },
      { estado: 'En proceso', total: 2 },
      { estado: 'No procedente', total: 2 },
    ])
    // Sin clasificar (texto vacío) no entra; el empate Empresa/Dependencia sale por nombre.
    expect(r.fuente).toEqual([
      ['Dependencia', 2],
      ['Empresa', 2],
      ['Organización', 1],
    ])
    expect(r.genero).toEqual([
      ['Hombre', 3],
      ['Mujer', 3],
    ])
    expect(r.tematica).toEqual([['Servicios Ambientales', 7]])
  })

  it('la serie mensual no se salta meses y llega hasta el mes en curso', async () => {
    const { r } = await consultar(null)
    expect(r.participacionesPorMes).toEqual([
      { mes: '2026-01', total: 2 },
      { mes: '2026-02', total: 0 },
      { mes: '2026-03', total: 0 },
      { mes: '2026-04', total: 5 },
      { mes: '2026-05', total: 0 },
    ])
  })

  it('cuenta los meses en la hora de Tlaquepaque', async () => {
    const { consultas } = await consultar(null)
    const meses = consultas.find((c) => c.texto.includes('date_trunc'))!
    expect(meses.texto).toContain('AT TIME ZONE')
    expect(meses.valores).toContain('America/Mexico_City')
  })

  it('sin filtro, ninguna consulta se limita a un origen', async () => {
    const { consultas } = await consultar(null)
    for (const c of consultas) {
      expect(c.valores, c.texto).not.toContain('digital')
      expect(c.valores, c.texto).not.toContain('fisica')
    }
  })

  it('con un origen, filtra todas las distribuciones y la serie, pero no los totales de las pestañas', async () => {
    const { consultas } = await consultar('digital')

    const conteo = consultas.find((c) => c.texto.includes('GROUP BY origen'))!
    expect(conteo.valores).not.toContain('digital')

    const filtradas = consultas.filter((c) => c !== conteo)
    expect(filtradas).toHaveLength(5) // dictamen, sector, género, eje temático y mes
    for (const c of filtradas) expect(c.valores, c.texto).toContain('digital')
  })

  it('sin participaciones devuelve todo vacío en vez de fallar', async () => {
    const { falso } = sqlFalso({
      conteo: [],
      estados: [],
      fuente: [],
      genero: [],
      tematica: [],
      meses: [],
    })
    espia = spyOn(pool as any, 'sql').mockImplementation(falso)
    const r = await estadisticasDeParticipaciones(null)
    expect(r).toEqual({
      digitales: 0,
      fisicas: 0,
      resultado: [],
      fuente: [],
      genero: [],
      tematica: [],
      participacionesPorMes: [],
    })
  })
})
