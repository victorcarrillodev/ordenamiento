import { describe, expect, it } from 'bun:test'

import {
  esSeccionProyecto,
  ETIQUETA_SECCION,
  limpiarTitulo,
  MAX_TITULO_PROYECTO,
  tituloDeArchivo,
} from './proyecto.ts'

describe('secciones del Proyecto', () => {
  it('son dos: documento técnico y documentos gráficos', () => {
    expect(esSeccionProyecto('tecnico')).toBe(true)
    expect(esSeccionProyecto('grafico')).toBe(true)
    for (const raro of ['', 'otra', null, undefined, 1]) expect(esSeccionProyecto(raro)).toBe(false)
    expect(ETIQUETA_SECCION).toEqual({
      tecnico: 'Documento técnico',
      grafico: 'Documentos gráficos',
    })
  })
})

describe('el nombre con que se presenta un documento', () => {
  it('es de una línea, sin controles ni espacios de sobra', () => {
    expect(limpiarTitulo('  Mapa\n de   zonificación\t ')).toBe('Mapa de zonificación')
    expect(limpiarTitulo(`Con${String.fromCharCode(0)}nulo`)).toBe('Con nulo')
  })

  it('no pasa de 150 caracteres', () => {
    expect(Array.from(limpiarTitulo('x'.repeat(500)))).toHaveLength(MAX_TITULO_PROYECTO)
    expect(Array.from(limpiarTitulo('😀'.repeat(200)))).toHaveLength(MAX_TITULO_PROYECTO)
  })

  it('a falta de título sale del nombre del archivo, sin extensión y sin guiones bajos', () => {
    expect(tituloDeArchivo('Programa_final_v2.pdf')).toBe('Programa final v2')
    expect(tituloDeArchivo('MAPA.PDF')).toBe('MAPA')
    expect(tituloDeArchivo('.pdf')).toBe('Documento')
  })
})
