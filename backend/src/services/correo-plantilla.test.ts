import { describe, expect, it } from 'bun:test'
import { renderPlantillaBase } from './correo-plantilla.ts'

describe('plantilla institucional de correo', () => {
  it('escapa los textos variables y conserva estilos esenciales sin imágenes externas', () => {
    const html = renderPlantillaBase({
      titulo: '<script>inyección</script>',
      badge: '<img src=x>',
      pieEntidad: 'Área & responsable',
      contenidoHtml: '<div class="folio-box">E-0001</div>',
    })
    expect(html).toContain('&lt;script&gt;inyección&lt;/script&gt;')
    expect(html).toContain('&lt;img src=x&gt;')
    expect(html).toContain('Área &amp; responsable')
    expect(html).toContain('class="folio-box" style="background:')
    expect(html).toContain('role="presentation"')
    expect(html).toContain('max-width:600px')
    expect(html).not.toMatch(/<script|<img|<iframe/i)
  })
})
