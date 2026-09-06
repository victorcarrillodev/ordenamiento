/**
 * Menú de la barra pública en pantallas estrechas.
 *
 * Antes de este menú, por debajo de 768px los enlaces simplemente se ocultaban
 * y no había nada que los sustituyera: desde un teléfono no se podía llegar al
 * POETDUM ni al formulario de participación más que por la URL. Estas
 * afirmaciones son sobre el texto del módulo, al estilo de
 * `app/actions/admin/detalle-ui.test.ts`, porque lo que se protege son reglas
 * CSS y relaciones de hermanos que no se ven en typecheck.
 */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

import { NAVBAR_ALTURA, NAVBAR_ALTURA_MOVIL, NAVBAR_CORTE_MOVIL } from './nav-bar.tsx'

const fuente = readFileSync(join(process.cwd(), 'app/ui/nav-bar.tsx'), 'utf8').replace(
  /\r\n/g,
  '\n',
)

describe('Alto de la barra', () => {
  it('lo exporta para que cada página reserve el hueco correcto', () => {
    // Cuatro páginas dejan sitio bajo la barra fija; cuando repetían «85px»
    // cada una, encogerla en móvil dejó una franja vacía en todas.
    expect(NAVBAR_ALTURA).toBe('85px')
    expect(NAVBAR_ALTURA_MOVIL).toBe('64px')
    expect(NAVBAR_CORTE_MOVIL).toBe('900px')
  })

  it('ninguna página vuelve a escribir el alto a mano', () => {
    const paginas = [
      'app/actions/home-page.tsx',
      'app/actions/error-page.tsx',
      'app/actions/participation/page.tsx',
      'app/actions/poetdum/show-page.tsx',
    ]
    for (const pagina of paginas) {
      const texto = readFileSync(join(process.cwd(), pagina), 'utf8')
      expect(texto, `${pagina} repite el alto de la barra en vez de importarlo`).not.toMatch(
        /['"`]85px['"`]/,
      )
    }
  })
})

describe('Menú desplegable', () => {
  it('el estado vive en un checkbox, así que abre sin JavaScript', () => {
    expect(fuente).toContain('type="checkbox" id="nav-toggle"')
    expect(fuente).toContain('for="nav-toggle"')
    expect(fuente).toMatch(/#nav-toggle:checked ~ #nav-panel \{ display: block; \}/)
  })

  it('el checkbox queda oculto a la vista pero enfocable con el tabulador', () => {
    expect(fuente).toMatch(/#nav-toggle \{[^}]*position: absolute;[^}]*opacity: 0;[^}]*\}/)
    expect(fuente).not.toMatch(/#nav-toggle \{[^}]*display: none/)
    // El lector de pantalla anuncia el checkbox, no la etiqueta visual.
    expect(fuente).toContain('aria-label="Abrir o cerrar el menú"')
    expect(fuente).toMatch(/id="nav-burger"[^>]*aria-hidden="true"/)
  })

  it('el panel se apaga por encima del corte, donde los enlaces caben en la barra', () => {
    expect(fuente).toMatch(
      /@media \(min-width: \$\{NAVBAR_CORTE_MOVIL\}\)[\s\S]*?#nav-panel \{ display: none !important; \}/,
    )
  })

  it('los enlaces y el botón se declaran una sola vez para barra y panel', () => {
    // Duplicarlos era la forma fácil de que el menú móvil se quedara con una
    // lista vieja cada vez que alguien tocara la de escritorio.
    expect(fuente).toMatch(/const enlaces = \[/)
    expect((fuente.match(/navEnlacePoetdum/g) ?? []).length).toBe(1)
    expect((fuente.match(/navCtaRegistrar/g) ?? []).length).toBe(1)
  })
})
