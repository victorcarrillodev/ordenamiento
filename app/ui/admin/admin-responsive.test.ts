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

describe('Listados del panel (participaciones, actividades…)', () => {
  it('el seguimiento va en una fila: el icono al lado del título y la pista, no en cascada', () => {
    // Con `flex-direction: column` el icono, el título y la pista se apilaban en tres
    // renglones y cada fila de la tabla crecía sin necesidad.
    expect(css).toMatch(/\.etapa-badge \{[^}]*display: inline-flex;[^}]*align-items: center;/)
    expect(css).not.toMatch(/\.etapa-badge \{[^}]*flex-direction: column/)
    // El bloque de texto sí se apila (título arriba, pista abajo) pero no se parte.
    expect(css).toMatch(/\.etapa-badge__texto \{[^}]*flex-direction: column/)
    expect(css).toMatch(/\.etapa-badge__texto strong \{[^}]*white-space: nowrap/)
    expect(css).toMatch(/\.etapa-badge__texto small \{[^}]*white-space: nowrap/)
  })

  it('pasa a tarjetas por el ancho real de la tabla, no por el de la pantalla', () => {
    // Con el menú abierto una pantalla de 1100px deja ~760px a la tabla: un corte
    // por `max-width` de ventana no lo vería y la tabla se desplazaría de lado.
    expect(css).toMatch(/\.table-wrap--lista \{[^}]*container: lista \/ inline-size/)
    const tarjetas =
      css.match(/@container lista \(max-width: 960px\) \{([\s\S]*?)\n\}\n/)?.[1] ?? ''
    expect(tarjetas).toContain('content: attr(data-label)')
    expect(tarjetas).toMatch(/\.tabla-lista tbody \{[^}]*display: grid/)
    // El encabezado se oculta a la vista pero sigue en el árbol de accesibilidad.
    expect(tarjetas).toMatch(/\.tabla-lista thead \{[^}]*position: absolute/)
    expect(tarjetas).not.toMatch(/\.tabla-lista thead \{[^}]*display: none/)
  })

  it('sin ancho, las acciones pierden la palabra pero no su nombre accesible', () => {
    const compacto =
      css.match(/@container lista \(max-width: 1080px\) \{([\s\S]*?)\n\}\n/)?.[1] ?? ''
    expect(compacto).toMatch(/\.btn--icono \.btn__texto \{[^}]*position: absolute/)
    // `display: none` la sacaría del árbol de accesibilidad.
    expect(compacto).not.toMatch(/\.btn__texto \{[^}]*display: none/)
  })

  it('las etiquetas de la barra no se parten a media palabra dentro del panel', () => {
    // El `.panel` hereda `overflow-wrap: anywhere`: «Dictamen» salía como «Dicta/men».
    expect(css).toMatch(
      /\.lista-select > span \{[^}]*overflow-wrap: normal;[^}]*white-space: nowrap/,
    )
  })

  it('el filtro en uso se rellena y el contador de «Todas» no se pierde sobre su fondo', () => {
    expect(css).toMatch(
      /\.etapa-filtro--activo \{[^}]*background: var\(--etapa-fg, var\(--a-dark\)\)/,
    )
    // La regla del contador de «Todas» va ANTES de la del filtro activo: con la misma
    // especificidad, la última gana y el número queda blanco sobre el fondo oscuro.
    const todas = css.indexOf('.etapa-filtro--todas .etapa-filtro__n')
    const activo = css.indexOf('.etapa-filtro--activo .etapa-filtro__n')
    expect(todas).toBeGreaterThan(-1)
    expect(activo).toBeGreaterThan(todas)
  })

  it('la acción que no se deshace es de contorno rojo, no un bloque sólido', () => {
    expect(css).toMatch(
      /\.btn--peligro \{[^}]*background: #fff;[^}]*color: #b91c1c;[^}]*border-color: #f0b4b4/,
    )
    expect(css).toMatch(/\.btn--peligro:hover \{[^}]*background: #fef2f2/)
  })

  it('las columnas «justas» miden lo que su contenido, salvo en tarjetas', () => {
    expect(css).toMatch(/\.tabla-lista \.col-justa \{[^}]*width: 1%;[^}]*white-space: nowrap/)
    const tarjetas =
      css.match(/@container lista \(max-width: 960px\) \{([\s\S]*?)\n\}\n/)?.[1] ?? ''
    // En tarjeta la celda es un renglón de la tarjeta: un 1% la dejaría diminuta.
    expect(tarjetas).toMatch(/\.tabla-lista \.col-justa \{[^}]*width: auto/)
  })

  it('en tarjeta el título va primero y las acciones se reparten el ancho por igual', () => {
    const tarjetas =
      css.match(/@container lista \(max-width: 960px\) \{([\s\S]*?)\n\}\n/)?.[1] ?? ''
    expect(tarjetas).toMatch(/td\.tabla-lista__principal \{[^}]*order: -1/)
    expect(tarjetas).toMatch(/\.acciones-fila \{[^}]*grid-auto-flow: column/)
    expect(tarjetas).toMatch(/\.acciones-fila \.form-en-linea \.btn \{[^}]*flex: 1/)
  })

  it('en actividades la acción secundaria pierde su palabra antes que en participaciones', () => {
    const compacto =
      css.match(/@container lista \(max-width: 1300px\) \{([\s\S]*?)\n\}\n/)?.[1] ?? ''
    expect(compacto).toMatch(/\.act-tabla \.btn--icono \.btn__texto \{[^}]*position: absolute/)
  })

  it('existe la clase para texto solo de lectores de pantalla', () => {
    expect(css).toMatch(/\.solo-lector \{[^}]*position: absolute;[^}]*clip: rect\(0, 0, 0, 0\)/)
  })
})

describe('Indicadores', () => {
  it('el formulario es una rejilla de 12 columnas que se acomoda al ancho de su bloque', () => {
    expect(css).toMatch(/\.indic \{[^}]*container: indic \/ inline-size/)
    expect(css).toMatch(/\.indic-form \{[^}]*grid-template-columns: repeat\(12, minmax\(0, 1fr\)\)/)
    // Una columna por omisión: lo más estrecho es el caso base, no una excepción.
    expect(css).toMatch(/\.indic-form > \* \{[^}]*grid-column: span 12/)
    expect(css).toMatch(/@container indic \(min-width: 560px\)/)
    expect(css).toMatch(/@container indic \(min-width: 900px\)/)
  })

  it('en ancho el botón de guardar sube a la fila de las mediciones', () => {
    const ancho = css.match(/@container indic \(min-width: 900px\) \{([\s\S]*?)\n\}\n/)?.[1] ?? ''
    expect(ancho).toMatch(/\.indic-form__mediciones \{[^}]*grid-column: span 6/)
    expect(ancho).toMatch(/\.indic-form__pie \{[^}]*grid-column: span 2/)
  })

  it('en dos columnas los campos cortos se agrupan arriba y los de texto largo abajo', () => {
    const medio =
      css.match(
        /@container indic \(min-width: 560px\) and \(max-width: 899px\) \{([\s\S]*?)\n\}\n/,
      )?.[1] ?? ''
    expect(medio).toMatch(/\.indic-form__fecha \{[^}]*order: 1/)
    expect(medio).toMatch(/\.indic-form__descripcion,\s*\.indic-form__resultado \{[^}]*order: 2/)
  })

  it('los campos llenan su celda en lugar de conservar el ancho mínimo de otros formularios', () => {
    expect(css).toMatch(
      /\.indic-form \.form-field input,[\s\S]*?\.indic-form \.form-field textarea \{[^}]*width: 100%;[^}]*max-width: none/,
    )
  })
})
