/**
 * Reglas del panel que sostienen la vista en teléfono y tableta.
 *
 * Se afirman sobre el texto de `public/admin.css` y del layout, igual que
 * `app/actions/admin/detalle-ui.test.ts`: son reglas que no tienen forma de
 * fallar en typecheck ni en una prueba de render, pero cuya desaparición
 * devuelve el panel a la barra de scroll horizontal y a los controles de
 * 29px que este cambio vino a quitar.
 */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const css = readFileSync(join(process.cwd(), 'public/admin.css'), 'utf8').replace(/\r\n/g, '\n')
const layout = readFileSync(join(process.cwd(), 'app/ui/admin/admin-layout.tsx'), 'utf8').replace(
  /\r\n/g,
  '\n',
)

describe('Menú lateral en móvil', () => {
  it('se despliega con el checkbox y se cierra tocando fuera', () => {
    expect(css).toMatch(/@media \(max-width: 900px\)[\s\S]*?\.sidebar-toggle:checked ~ \.sidebar\b/)
    expect(css).toMatch(/\.sidebar-toggle:checked ~ \.sidebar-backdrop/)
    expect(layout).toContain('class="sidebar-backdrop"')
    expect(layout).toContain('for="sidebar-toggle"')
  })

  it('el checkbox se oculta a la vista pero sigue siendo enfocable', () => {
    // `display: none` o el atributo `hidden` lo sacarían del tabulador y el
    // menú dejaría de abrirse sin ratón.
    expect(css).toMatch(/\.sidebar-toggle \{[^}]*position: absolute;[^}]*opacity: 0;[^}]*\}/)
    expect(css).not.toMatch(/\.sidebar-toggle \{[^}]*display: none/)
    expect(layout).not.toMatch(/id="sidebar-toggle"[^>]*\shidden/)
  })

  it('la hamburguesa no depende del CDN de iconos', () => {
    expect(layout).toMatch(/class="topbar__burger"[\s\S]{0,80}☰/)
  })

  it('bloquea el scroll de la página mientras el menú está abierto', () => {
    expect(css).toMatch(/body:has\(\.sidebar-toggle:checked\)[\s\S]*?overflow: hidden/)
  })
})

describe('Sin desborde horizontal', () => {
  it('ninguna rejilla auto-fit exige más ancho del que hay', () => {
    // `minmax(320px, 1fr)` en una pantalla de 320px pide más de lo disponible
    // y saca la página a lo ancho; `min(320px, 100%)` cede cuando no cabe.
    const rigidas = css.match(/repeat\((?:auto-fit|auto-fill), minmax\(\d+px,/g)
    expect(rigidas).toBeNull()
  })

  it('los campos de formulario pueden encogerse dentro de su contenedor', () => {
    expect(css).toMatch(/\.form-field \{[^}]*min-width: 0/)
    expect(css).toMatch(
      /\.form-field input,\s*\.form-field select \{[^}]*min-width: min\(150px, 100%\)/,
    )
  })

  it('latitud y longitud se apilan cuando no caben en dos columnas', () => {
    expect(css).toMatch(
      /\.ubicacion-coords__campos \{[^}]*repeat\(auto-fit, minmax\(min\(140px, 100%\), 1fr\)\)/,
    )
  })
})

describe('Tablas', () => {
  it('se desplazan en su contenedor en vez de comprimirse a una letra por renglón', () => {
    expect(css).toMatch(/\.table-wrap table \{[^}]*min-width: min\(640px, max-content\)/)
    // El `.panel` usa `overflow-wrap: anywhere`; heredarlo en las celdas es
    // justamente lo que dejaba partir cada palabra.
    expect(css).toMatch(/\.table-wrap td,\s*\.table-wrap th \{[^}]*overflow-wrap: normal/)
  })
})

describe('Objetivos táctiles', () => {
  it('los controles crecen en cualquier pantalla que se toque, no solo en las estrechas', () => {
    // `pointer: coarse` y no `max-width`: una tableta táctil es ancha y aun
    // así se usa con el dedo.
    expect(css).toMatch(/@media \(pointer: coarse\)[\s\S]*?min-height: 40px/)
    expect(css).toMatch(/@media \(pointer: coarse\)[\s\S]*?\.sidebar__item/)
  })
})

describe('Desplegable de gestión de una cuenta', () => {
  it('en móvil se muestra como hoja inferior y no anclado a la celda', () => {
    // Anclado a la celda (~100px de ancho) los campos salían recortados.
    expect(css).toMatch(
      /@media \(max-width: 700px\)[\s\S]*?\.acciones__panel \{[\s\S]*?position: fixed;[\s\S]*?bottom: 0;/,
    )
  })
})
