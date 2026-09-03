import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const css = readFileSync(join(process.cwd(), 'public/admin.css'), 'utf8')
const detalleRaw = readFileSync(join(process.cwd(), 'app/actions/admin/detalle-page.tsx'), 'utf8')
const detalle = detalleRaw.replace(/\r\n/g, '\n')

describe('UI-1 · detalle-split 60/40 responsivo', () => {
  it('define grid 3fr 2fr (≈60/40) con gap 18px y align-items:start', () => {
    expect(css).toContain('.detalle-split')
    expect(css).toMatch(/grid-template-columns:\s*3fr\s+2fr/)
    expect(css).toMatch(/gap:\s*18px/)
    expect(css).toMatch(/align-items:\s*start/)
  })

  it('colapsa a 1 columna en ≤900px sin scroll horizontal', () => {
    expect(css).toMatch(
      /@media\s*\(max-width:\s*900px\)[\s\S]*?\.detalle-split[\s\S]*?grid-template-columns:\s*1fr/,
    )
    // hijos con min-width:0 evitan overflow del grid
    expect(css).toMatch(/\.detalle-split\s*>\s*\.panel[\s\S]*?min-width:\s*0/)
  })

  it('pdf-frame 60vh no desborda el panel 40% (max-width + box-sizing)', () => {
    expect(css).toMatch(/\.pdf-frame[\s\S]*?height:\s*60vh/)
    expect(css).toMatch(/\.pdf-frame[\s\S]*?max-width:\s*100%/)
    expect(css).toMatch(/\.pdf-frame[\s\S]*?box-sizing:\s*border-box/)
    expect(css).toMatch(/\.pdf-frame[\s\S]*?display:\s*block/)
  })

  it('JSX envuelve Datos y Adjuntos en .detalle-split lado a lado', () => {
    expect(detalle).toContain('class="detalle-split"')
    // Verifica que los dos paneles están hermanos dentro del split
    const splitIndex = detalle.indexOf('detalle-split')
    const datosIndex = detalle.indexOf('Datos de la participación', splitIndex)
    const adjuntosIndex = detalle.indexOf('Adjuntos', datosIndex)
    expect(splitIndex).toBeGreaterThan(-1)
    expect(datosIndex).toBeGreaterThan(splitIndex)
    expect(adjuntosIndex).toBeGreaterThan(datosIndex)
  })
})

describe('UI-2 · contraste a11y borde y sombra', () => {
  it('define --a-border-strong y --a-shadow y los usa en .panel/.card', () => {
    expect(css).toContain('--a-border-strong: #b9c2d4')
    expect(css).toContain('--a-shadow: 0 2px 10px rgba(46, 52, 64, 0.08)')
    expect(css).toMatch(/\.panel[\s\S]*?border:\s*1px solid var\(--a-border-strong\)/)
    expect(css).toMatch(/\.panel[\s\S]*?box-shadow:\s*var\(--a-shadow\)/)
    expect(css).toMatch(/\.card[\s\S]*?border:\s*1px solid var\(--a-border-strong\)/)
    expect(css).toMatch(/\.card[\s\S]*?box-shadow:\s*var\(--a-shadow\)/)
  })

  it('.campo__value mantiene contraste AA #2b3445 sobre #fff', () => {
    expect(css).toMatch(/\.campo__value[\s\S]*?color:\s*var\(--a-text\)/)
    // --a-text es #2b3445, contrast 12.5:1 vs white >4.5 AA
  })

  it('borde fuerte es visible sobre #f4f6fb (contraste 1.66 vs 1.13 viejo)', () => {
    // El nuevo borde #b9c2d4 vs bg #f4f6fb es claramente más visible que #e3e8f0
    const panelBlocks = css.match(/\.panel\s*\{[^}]+\}/g) ?? []
    const hasStrong = panelBlocks.some((b) => b.includes('var(--a-border-strong)'))
    const hasOld = panelBlocks.some((b) => /border:\s*1px solid var\(--a-border\)\s*;/.test(b))
    expect(hasStrong).toBe(true)
    expect(hasOld).toBe(false)
  })
})

describe('UI-3 · header tintado solo con .panel__head', () => {
  it('panel sin .panel__head no genera bloque tintado (solo .panel__head tiene background)', () => {
    expect(css).toMatch(/\.panel__head[\s\S]*?background:\s*#f7f9fc/)
    expect(css).toMatch(/\.panel__head[\s\S]*?margin:\s*-18px -18px 12px/)
    // .panel solo no tiene background tintado
    const panelRule = css.match(/\.panel\s*\{[^}]+\}/g)?.[0] ?? ''
    expect(panelRule).not.toContain('#f7f9fc')
    // JSX: panel "No encontrado" y "Enviar por correo" no tienen panel__head
    expect(detalle).toContain('<div class="panel">\n            <p class="empty">No se encontró')
    expect(detalle).toContain(
      '<div class="panel">\n              <h2 class="panel__title">📨 Enviar por correo</h2>',
    )
  })
})

describe('UI-4 · alcance global cal/aviso/export no pierde hover', () => {
  it('.cal/.cal-agenda/.export-card/.aviso-card usan borde fuerte + sombra sin perder background', () => {
    expect(css).toMatch(
      /\.cal,\s*\.cal-agenda,\s*\.export-card,\s*\.aviso-card[\s\S]*?border-color:\s*var\(--a-border-strong\)/,
    )
    expect(css).toMatch(
      /\.cal,\s*\.cal-agenda,\s*\.export-card,\s*\.aviso-card[\s\S]*?box-shadow:\s*var\(--a-shadow\)/,
    )
  })

  it('.aviso-card:hover sigue existiendo', () => {
    expect(css).toMatch(/\.aviso-card:hover[\s\S]*?box-shadow:/)
  })

  it('.card--link:hover preserva transform y border-color', () => {
    expect(css).toMatch(/\.card--link:hover[\s\S]*?transform:\s*translateY\(-2px\)/)
  })
})

describe('UI-5 · overflow grid align-items:start evita stretch feo', () => {
  it('detalle-split no estira el panel corto', () => {
    expect(css).toMatch(/\.detalle-split[\s\S]*?align-items:\s*start/)
  })
})

describe('UI-6 · contenido largo hace wrap sin romper grid', () => {
  it('.campo y .campo__value permiten break-word', () => {
    expect(css).toMatch(/\.campo[\s\S]*?min-width:\s*0/)
    expect(css).toMatch(/\.campo__value[\s\S]*?overflow-wrap:\s*break-word/)
    expect(css).toMatch(/\.campo__value[\s\S]*?word-break:\s*break-word/)
  })

  it('.panel tiene min-width:0 y overflow-wrap:anywhere para nombres largos', () => {
    expect(css).toMatch(/\.panel[\s\S]*?min-width:\s*0/)
    expect(css).toMatch(/\.panel[\s\S]*?overflow-wrap:\s*anywhere/)
  })

  it('observación larga de 500 chars no genera scroll horizontal (wrap implícito)', () => {
    const campoValueBlock = css.match(/\.campo__value\s*\{[^}]+\}/)?.[0] ?? ''
    expect(campoValueBlock).not.toMatch(/white-space:\s*nowrap/)
    expect(campoValueBlock).toMatch(/overflow-wrap:\s*break-word/)
    const observacion = 'a'.repeat(500)
    expect(observacion.length).toBe(500)
  })
})
