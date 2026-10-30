import { describe, expect, it } from 'vitest'

import {
  CAPA_INICIAL,
  CAPA_MAX,
  CAPA_MIN,
  capaDePortada,
  hexARgb,
  intensidadDeCapa,
  luminancia,
  nivelDeContraste,
  normalizarHex,
  razonDeContraste,
  rgba,
} from './color.ts'

describe('normalizarHex', () => {
  it('lleva #rgb y #rrggbb a #rrggbb en minúsculas', () => {
    expect(normalizarHex('#FFF')).toBe('#ffffff')
    expect(normalizarHex('#8C1D3D')).toBe('#8c1d3d')
    expect(normalizarHex('  #abc  ')).toBe('#aabbcc')
  })

  it('acepta el hexadecimal sin la almohadilla', () => {
    expect(normalizarHex('8c1d3d')).toBe('#8c1d3d')
    expect(normalizarHex('f00')).toBe('#ff0000')
  })

  it.each([
    '',
    '#',
    '#12',
    '#1234',
    '#12345',
    '#1234567',
    '#gggggg',
    'rgb(1,2,3)',
    'rojo',
    '#fff; } </style>',
    null,
    undefined,
    42,
  ])('rechaza %j', (valor) => {
    expect(normalizarHex(valor)).toBeNull()
  })
})

describe('hexARgb', () => {
  it('descompone el color en sus tres canales', () => {
    expect(hexARgb('#8c1d3d')).toEqual([140, 29, 61])
    expect(hexARgb('#fff')).toEqual([255, 255, 255])
    expect(hexARgb('#000')).toEqual([0, 0, 0])
  })

  it('devuelve null si no es un color', () => {
    expect(hexARgb('azul')).toBeNull()
  })
})

describe('contraste', () => {
  it('negro sobre blanco es el máximo, 21', () => {
    expect(razonDeContraste('#000000', '#ffffff')).toBeCloseTo(21, 5)
    expect(luminancia([255, 255, 255])).toBeCloseTo(1, 5)
    expect(luminancia([0, 0, 0])).toBe(0)
  })

  it('un color contra sí mismo es 1, y el orden no importa', () => {
    expect(razonDeContraste('#8c1d3d', '#8c1d3d')).toBeCloseTo(1, 5)
    expect(razonDeContraste('#8c1d3d', '#ffffff')).toBeCloseTo(
      razonDeContraste('#ffffff', '#8c1d3d') as number,
      10,
    )
  })

  it('reproduce las razones de referencia del gris límite de WCAG', () => {
    // #767676 sobre blanco es el gris más claro que aún cumple AA (4.54:1).
    expect(razonDeContraste('#767676', '#ffffff')).toBeCloseTo(4.54, 2)
    expect(razonDeContraste('#777777', '#ffffff')).toBeCloseTo(4.48, 2)
  })

  it('devuelve null si alguno de los dos no es un color', () => {
    expect(razonDeContraste('#fff', 'nada')).toBeNull()
    expect(razonDeContraste(undefined, '#fff')).toBeNull()
  })

  it('clasifica en los cuatro niveles, con los cortes exactos de 3, 4.5 y 7', () => {
    expect(nivelDeContraste(21)).toBe('aaa')
    expect(nivelDeContraste(7)).toBe('aaa')
    expect(nivelDeContraste(6.99)).toBe('aa')
    expect(nivelDeContraste(4.5)).toBe('aa')
    expect(nivelDeContraste(4.49)).toBe('grande')
    expect(nivelDeContraste(3)).toBe('grande')
    expect(nivelDeContraste(2.99)).toBe('bajo')
    expect(nivelDeContraste(1)).toBe('bajo')
  })

  it('los colores de fábrica del portal se leen bien: texto del menú, del pie y botón', () => {
    expect(nivelDeContraste(razonDeContraste('#1a1d26', '#ffffff') as number)).toBe('aaa')
    expect(nivelDeContraste(razonDeContraste('#ffffff', '#0f1117') as number)).toBe('aaa')
    expect(nivelDeContraste(razonDeContraste('#ffffff', '#8c1d3d') as number)).toBe('aaa')
  })

  it('un texto casi del color de su fondo sale como insuficiente', () => {
    expect(nivelDeContraste(razonDeContraste('#f5f5f5', '#ffffff') as number)).toBe('bajo')
  })
})

describe('rgba', () => {
  it('arma el color con su opacidad redondeada a tres decimales', () => {
    expect(rgba('#8c1d3d', 0.7)).toBe('rgba(140,29,61,0.7)')
    expect(rgba('#fff', 0.123456)).toBe('rgba(255,255,255,0.123)')
  })

  it('devuelve null si el color no es válido', () => {
    expect(rgba('xx', 0.5)).toBeNull()
  })
})

describe('capa de la portada', () => {
  it('con intensidad 100 son los valores de fábrica', () => {
    expect(capaDePortada('#8c1d3d', 100)).toEqual({
      inicio: 'rgba(15,17,23,0.82)',
      centro: 'rgba(140,29,61,0.7)',
      fin: 'rgba(15,17,23,0.75)',
    })
  })

  it('el tramo central sigue al color primario', () => {
    expect(capaDePortada('#1b4332', 100).centro).toBe('rgba(27,67,50,0.7)')
    expect(capaDePortada('#1e3a8a', 100).centro).toBe('rgba(30,58,138,0.7)')
  })

  it('una intensidad menor deja ver más la foto', () => {
    const suave = capaDePortada('#8c1d3d', 50)
    expect(suave.inicio).toBe('rgba(15,17,23,0.41)')
    expect(suave.centro).toBe('rgba(140,29,61,0.35)')
    expect(suave.fin).toBe('rgba(15,17,23,0.375)')
  })

  it('acota la intensidad: ni una capa invisible ni más opaca que la de fábrica', () => {
    expect(capaDePortada('#8c1d3d', 0)).toEqual(capaDePortada('#8c1d3d', CAPA_MIN))
    expect(capaDePortada('#8c1d3d', 500)).toEqual(capaDePortada('#8c1d3d', CAPA_MAX))
    expect(capaDePortada('#8c1d3d', Number.NaN)).toEqual(capaDePortada('#8c1d3d', CAPA_INICIAL))
  })

  it('un primario inválido deja el tinte guinda de fábrica en lugar de romper el degradado', () => {
    expect(capaDePortada('no-es-color', 100).centro).toBe('rgba(140,29,61,0.7)')
    expect(capaDePortada(undefined, 100).centro).toBe('rgba(140,29,61,0.7)')
  })

  it('el resultado es siempre un color que el backend acepta', () => {
    const permitido = /^rgba\(\s*[0-9.,\s%]+\)$/
    for (const intensidad of [0, 30, 55, 100, 999]) {
      const capa = capaDePortada('#2d6a4f', intensidad)
      for (const tramo of Object.values(capa)) expect(tramo).toMatch(permitido)
    }
  })

  it('intensidadDeCapa lee de vuelta lo que capaDePortada escribió', () => {
    // Todas las posiciones del control: ninguna se mueve al guardar y volver a abrir.
    for (let intensidad = CAPA_MIN; intensidad <= CAPA_MAX; intensidad++) {
      const capa = capaDePortada('#8c1d3d', intensidad)
      expect(intensidadDeCapa(capa.inicio), `intensidad ${intensidad}`).toBe(intensidad)
    }
  })

  it('si no puede leer la capa guardada, vale 100: la de fábrica', () => {
    expect(intensidadDeCapa(undefined)).toBe(100)
    expect(intensidadDeCapa('')).toBe(100)
    expect(intensidadDeCapa('#0f1117')).toBe(100)
    expect(intensidadDeCapa('rgba(15,17,23,0)')).toBe(100)
    expect(intensidadDeCapa('rgba(15,17,23,abc)')).toBe(100)
  })
})
