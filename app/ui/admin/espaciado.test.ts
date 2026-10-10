/**
 * Medidas comunes del panel.
 *
 * El margen exterior de la página y la separación entre tarjetas, paneles y bloques
 * eran números sueltos (14, 16, 18, 26 px…) repartidos por la hoja de estilos: entre
 * dos tarjetas había una distancia en horizontal y otra distinta en vertical, y cada
 * pantalla tenía la suya. Ahora salen de tres variables (`--a-pad`, `--a-gap`,
 * `--a-pad-panel`). Estas pruebas se afirman sobre el texto de `public/admin.css`,
 * como las de `admin-responsive.test.ts`: es lo que impide que un número suelto
 * vuelva a descuadrar una pantalla sin que nada lo avise.
 */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const css = readFileSync(join(process.cwd(), 'public/admin.css'), 'utf8').replace(/\r\n/g, '\n')

/** El cuerpo de la primera regla cuyo selector es exactamente `selector`. */
function regla(selector: string): string {
  const escapado = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const m = css.match(new RegExp(`(?:^|\\n)${escapado}\\s*\\{([^}]*)\\}`))
  if (!m) throw new Error(`No hay una regla «${selector}» en admin.css`)
  return m[1]
}

describe('variables de medida', () => {
  it('se declaran en :root, con el mismo margen y separación en todas las pantallas', () => {
    const raiz = regla(':root')
    expect(raiz).toMatch(/--a-pad:\s*20px/)
    expect(raiz).toMatch(/--a-gap:\s*16px/)
    expect(raiz).toMatch(/--a-pad-panel:\s*18px/)
    expect(raiz).toMatch(/--a-topbar:\s*52px/)
  })

  it('en teléfonos se estrechan las tres a la vez, para que sigan guardando proporción', () => {
    expect(css).toMatch(
      /@media \(max-width: 640px\) \{\s*:root \{[^}]*--a-pad:\s*14px;[^}]*--a-gap:\s*12px;[^}]*--a-pad-panel:\s*14px/,
    )
  })
})

describe('el margen exterior es igual por los cuatro lados', () => {
  it('.content usa --a-pad sin distinguir horizontal de vertical', () => {
    expect(regla('.content')).toMatch(/padding:\s*var\(--a-pad\);/)
  })

  it('el último bloque no suma un margen propio al de la página', () => {
    expect(css).toMatch(/\.content > :last-child \{\s*margin-bottom: 0;/)
  })
})

describe('la separación entre bloques es la misma en horizontal y en vertical', () => {
  const CONTENEDORES = [
    '.cards',
    '.grid-2',
    '.export-grid',
    '.charts-row',
    '.detalle-split',
    '.dash',
    '.act-resumen',
  ]

  it.each(CONTENEDORES)('%s separa sus hijos con --a-gap', (selector) => {
    expect(regla(selector)).toMatch(/gap:\s*var\(--a-gap\)/)
  })

  it('los bloques apilados dejan --a-gap debajo (cabecera, tarjetas, paneles, avisos, pestañas)', () => {
    for (const selector of ['.content__head', '.cards', '.panel', '.admin-alert', '.tabs']) {
      expect(regla(selector), selector).toMatch(/margin-bottom:\s*var\(--a-gap\)/)
    }
  })

  it('el panel se rellena con --a-pad-panel y su cabecera sangra exactamente eso', () => {
    expect(regla('.panel')).toMatch(/padding:\s*var\(--a-pad-panel\)/)
    expect(regla('.panel__head')).toMatch(/margin:\s*calc\(var\(--a-pad-panel\) \* -1\)/)
  })

  it('en una rejilla el margen inferior del panel se anula: lo pone el gap', () => {
    // Sin esto cada panel sumaba su margen y entre filas había el doble que entre columnas.
    expect(css).toMatch(/\.grid-2 > \.panel,[\s\S]*?\{\s*margin-bottom: 0;/)
  })

  it('no quedan separaciones de 14, 16 o 18 px sueltas entre bloques', () => {
    const sueltas: string[] = []
    // Solo los selectores de bloque de arriba: los huecos internos de un componente
    // (un formulario, una fila de botones) son suyos y pueden ser otros.
    for (const selector of [...CONTENEDORES, '.content__head', '.panel', '.admin-alert', '.tabs']) {
      const cuerpo = regla(selector)
      for (const m of cuerpo.matchAll(/(?:margin-bottom|gap):\s*(14|16|18)px/g)) {
        sueltas.push(`${selector} { ${m[0]} }`)
      }
    }
    expect(sueltas).toEqual([])
  })
})

describe('vista que se acomoda al alto de la ventana', () => {
  it('ocupa como mínimo el alto que deja la barra superior (con respaldo para 100vh)', () => {
    const cuerpo = regla('.content--ajustada')
    expect(cuerpo).toMatch(/min-height:\s*calc\(100vh - var\(--a-topbar\)\)/)
    expect(cuerpo).toMatch(/min-height:\s*calc\(100dvh - var\(--a-topbar\)\)/)
    expect(cuerpo).toMatch(/display:\s*flex/)
    expect(cuerpo).toMatch(/flex-direction:\s*column/)
  })

  it('la rejilla de la vista general crece hasta llenarlo, pero nunca por debajo de su contenido', () => {
    const cuerpo = regla('.content--ajustada > .dash')
    // `1 0 auto`: crece, no se encoge. Con `0` de crecimiento nunca llenaría la ventana.
    expect(cuerpo).toMatch(/flex:\s*1 0 auto/)
  })

  it('cada columna reparte lo que sobra sin inflar su altura mínima', () => {
    // Filas `fr` con mínimo `auto` agrandaban TODAS las filas para no romper la
    // proporción y la vista dejaba de caber en una ventana donde sí cabía.
    expect(regla('.dash__main')).toMatch(/display:\s*flex/)
    expect(regla('.dash__main')).not.toMatch(/grid-template-rows/)
    expect(regla('.dash__main > .panel')).toMatch(/flex:\s*4 1 auto/)
    expect(regla('.dash__fila')).toMatch(/flex:\s*5 1 auto/)
    expect(regla('.dash__side > .panel')).toMatch(/flex:\s*1 1 auto/)
  })

  it('en una ventana estrecha las columnas se apilan y la página se desplaza como siempre', () => {
    expect(css).toMatch(
      /@media \(max-width: 1100px\) \{\s*\.dash \{\s*grid-template-columns: minmax\(0, 1fr\);[\s\S]*?\.content--ajustada > \.dash \{\s*grid-template-rows: none;/,
    )
  })

  it('los seis mosaicos del contenido del portal son siempre 3 × 2', () => {
    expect(regla('.atajos')).toMatch(/grid-template-columns:\s*repeat\(3, minmax\(0, 1fr\)\)/)
  })
})
