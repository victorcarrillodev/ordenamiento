import { describe, expect, it } from 'vitest'
import { renderToString } from 'remix/ui/server'

import {
  anchoDeBarra,
  Barras,
  BarrasMensuales,
  COLOR_ESTADO,
  Donut,
  sumaSerie,
  type Serie,
} from './charts.tsx'

/**
 * Las gráficas del panel se dibujan en el servidor, sin JavaScript de cliente: lo
 * que se comprueba aquí es lo que ve la persona —cifras, porcentajes, colores y
 * mensajes— y que ningún caso extremo (vacío, un solo dato, ceros) las rompa.
 */

const RESULTADO: Serie = [
  ['Procedente', 3],
  ['En proceso', 2],
  ['No procedente', 2],
]

const texto = (html: string) => html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ')

describe('sumaSerie', () => {
  it('suma los totales y tolera lo que no hay', () => {
    expect(sumaSerie(RESULTADO)).toBe(7)
    expect(sumaSerie([])).toBe(0)
    expect(sumaSerie(undefined)).toBe(0)
    expect(sumaSerie(null)).toBe(0)
  })
})

describe('Donut', () => {
  const dona = (datos?: Serie, etiqueta?: string) =>
    renderToString(<Donut datos={datos} etiqueta={etiqueta} />)

  it('el número del centro es el total de TODAS las porciones y la etiqueta lo nombra', async () => {
    const html = await dona(RESULTADO, 'Participaciones')
    // 3 + 2 + 2 = 7: incluye las que están en proceso, así que no se llama «Dictaminadas».
    expect(html).toMatch(/<text[^>]*>7<\/text>/)
    expect(html).toMatch(/<text[^>]*>Participaciones<\/text>/)
    expect(html).toContain('aria-label="Participaciones: 7"')
    expect(html).not.toContain('Dictaminadas')
  })

  it('la leyenda lista cada categoría con su número y su porcentaje', async () => {
    const t = texto(await dona(RESULTADO))
    expect(t).toContain('Procedente 3 43%')
    expect(t).toContain('En proceso 2 29%')
    expect(t).toContain('No procedente 2 29%')
  })

  it('cada porción mide lo que le toca: los arcos suman la circunferencia entera', async () => {
    const html = await dona(RESULTADO)
    const arcos = [...html.matchAll(/stroke-dasharray="([\d.]+) ([\d.]+)"/g)].map((m) => [
      Number(m[1]),
      Number(m[2]),
    ])
    expect(arcos).toHaveLength(3)
    const circunferencia = arcos[0][0] + arcos[0][1]
    const suma = arcos.reduce((acc, [largo]) => acc + largo, 0)
    expect(suma).toBeCloseTo(circunferencia, 5)
    // 3 de 7 es el 42,9 % del anillo.
    expect(arcos[0][0] / circunferencia).toBeCloseTo(3 / 7, 5)
  })

  it('los estados llevan siempre el mismo color, en cualquier orden', async () => {
    const html = await dona([
      ['No procedente', 2],
      ['Procedente', 3],
    ])
    expect(html).toContain(`stroke="${COLOR_ESTADO['No procedente']}"`)
    expect(html).toContain(`stroke="${COLOR_ESTADO['Procedente']}"`)
    expect(COLOR_ESTADO['Procedente']).not.toBe(COLOR_ESTADO['No procedente'])
  })

  it('con una sola categoría el anillo se llena entero (100 %)', async () => {
    const html = await dona([['Procedente', 5]])
    const [, largo, resto] = html.match(/stroke-dasharray="([\d.]+) ([\d.]+)"/) as string[]
    expect(Number(resto)).toBeCloseTo(0, 5)
    expect(Number(largo)).toBeGreaterThan(0)
    expect(texto(html)).toContain('Procedente 5 100%')
  })

  it('una categoría con 0 aparece en la leyenda pero no dibuja arco visible', async () => {
    const html = await dona([
      ['Procedente', 4],
      ['En proceso', 0],
    ])
    expect(texto(html)).toContain('En proceso 0 0%')
    const largos = [...html.matchAll(/stroke-dasharray="([\d.]+) /g)].map((m) => Number(m[1]))
    expect(largos[1]).toBe(0)
  })

  it('sin datos (o todo en 0) dice que no hay, en vez de dibujar un anillo vacío', async () => {
    for (const vacio of [undefined, [], [['Procedente', 0]] as Serie]) {
      const html = await dona(vacio)
      expect(html).toContain('Sin datos todavía')
      expect(html).not.toContain('<svg')
    }
  })

  it('escapa los nombres de las categorías', async () => {
    const html = await dona([['<img src=x onerror=alert(1)>', 1]])
    expect(html).not.toContain('<img src=x')
    expect(html).toContain('&lt;img')
  })

  it('con más categorías que colores reutiliza la paleta sin fallar', async () => {
    const muchas: Serie = Array.from({ length: 14 }, (_, i) => [`Cat ${i}`, 1])
    const html = await dona(muchas)
    expect(html.match(/<circle/g)).toHaveLength(14)
    expect(html).not.toContain('undefined')
  })
})

describe('anchoDeBarra', () => {
  it('es proporcional al máximo', () => {
    expect(anchoDeBarra(10, 10)).toBe(100)
    expect(anchoDeBarra(5, 10)).toBe(50)
  })

  it('una categoría muy pequeña conserva un mínimo visible', () => {
    expect(anchoDeBarra(1, 1000)).toBe(2)
  })

  it('cero no lleva barra: un resto de color diría que hay algo', () => {
    expect(anchoDeBarra(0, 10)).toBe(0)
    expect(anchoDeBarra(-3, 10)).toBe(0)
    expect(anchoDeBarra(Number.NaN, 10)).toBe(0)
  })
})

describe('Barras', () => {
  const barras = (datos?: Serie) => renderToString(<Barras datos={datos} titulo="Por eje" />)

  it('una fila por categoría, con su número y su porcentaje del total', async () => {
    const t = texto(
      await barras([
        ['Equipamiento', 3],
        ['Movilidad', 1],
      ]),
    )
    expect(t).toContain('Equipamiento 3 75%')
    expect(t).toContain('Movilidad 1 25%')
  })

  it('la barra más larga ocupa todo el ancho y las demás, su proporción', async () => {
    const html = await barras([
      ['A', 8],
      ['B', 4],
      ['C', 0],
    ])
    const anchos = [...html.matchAll(/width: ([\d.]+)%/g)].map((m) => Number(m[1]))
    expect(anchos).toEqual([100, 50, 0])
  })

  it('el nombre completo queda en el title aunque la etiqueta se corte', async () => {
    const largo = 'Organización de la sociedad civil y sector académico'
    const html = await barras([[largo, 2]])
    expect(html).toContain(`title="${largo}"`)
  })

  it('lleva el nombre accesible de la gráfica', async () => {
    expect(await barras([['A', 1]])).toContain('aria-label="Por eje"')
  })

  it('sin datos dice que no hay', async () => {
    for (const vacio of [undefined, []]) {
      expect(await barras(vacio)).toContain('Sin datos todavía')
    }
  })

  it('escapa los nombres de las categorías', async () => {
    const html = await barras([['"><script>alert(1)</script>', 1]])
    expect(html).not.toContain('<script>alert(1)')
  })
})

describe('BarrasMensuales', () => {
  const columnas = (datos?: Array<{ mes: string; total: number }>) =>
    renderToString(<BarrasMensuales datos={datos} />)

  it('rotula cada mes con su nombre corto y el año', async () => {
    const t = texto(
      await columnas([
        { mes: '2026-01', total: 2 },
        { mes: '2026-12', total: 5 },
      ]),
    )
    expect(t).toContain('ene 26')
    expect(t).toContain('dic 26')
  })

  it('la altura de cada columna es proporcional al mes más alto', async () => {
    const html = await columnas([
      { mes: '2026-01', total: 12 },
      { mes: '2026-02', total: 6 },
    ])
    const alturas = [...html.matchAll(/height: ([\d.]+)%/g)].map((m) => Number(m[1]))
    expect(alturas).toEqual([100, 50])
  })

  it('un mes sin participaciones se ve vacío (0 %), con su 0 arriba', async () => {
    const html = await columnas([
      { mes: '2026-01', total: 4 },
      { mes: '2026-02', total: 0 },
      { mes: '2026-03', total: 1 },
    ])
    const alturas = [...html.matchAll(/height: ([\d.]+)%/g)].map((m) => Number(m[1]))
    expect(alturas[1]).toBe(0)
    expect(html.match(/class="columnas__numero"[^>]*>0</g)).toHaveLength(1)
    // Los meses con datos, aunque sean pocos, conservan un mínimo visible.
    expect(alturas[2]).toBeGreaterThanOrEqual(3)
  })

  it('todos los meses en 0 no dividen entre cero ni dibujan columnas llenas', async () => {
    const html = await columnas([
      { mes: '2026-01', total: 0 },
      { mes: '2026-02', total: 0 },
    ])
    const alturas = [...html.matchAll(/height: ([\d.]+)%/g)].map((m) => Number(m[1]))
    expect(alturas).toEqual([0, 0])
    expect(html).not.toContain('NaN')
  })

  it('una clave que no es un mes se muestra tal cual, sin romper', async () => {
    const t = texto(
      await columnas([
        { mes: 'sin-fecha', total: 1 },
        { mes: '2026-13', total: 1 },
      ]),
    )
    expect(t).toContain('sin-fecha')
    expect(t).toContain('2026-13')
  })

  it('el title de cada columna dice mes y total', async () => {
    expect(await columnas([{ mes: '2026-04', total: 8 }])).toContain('title="abr 26: 8"')
  })

  it('sin datos dice que no hay', async () => {
    for (const vacio of [undefined, []]) {
      expect(await columnas(vacio)).toContain('Sin datos todavía')
    }
  })
})
