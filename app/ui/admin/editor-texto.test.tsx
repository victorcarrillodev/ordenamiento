import { describe, expect, it } from 'vitest'
import { renderToString } from 'remix/ui/server'

import { EditorTexto } from './editor-texto.tsx'

const editor = (valor?: string) =>
  renderToString(<EditorTexto name="txt_cta_parrafo" label="Párrafo" valor={valor} filas={4} />)

describe('EditorTexto', () => {
  it('trae la barra de formato con negrita y las cuatro alineaciones', async () => {
    const html = await editor('<p>Hola</p>')
    expect(html).toContain('role="toolbar"')
    expect(html).toContain('aria-label="Formato de «Párrafo»"')
    for (const comando of ['negrita', 'izquierda', 'centro', 'derecha', 'justificado']) {
      expect(html, comando).toContain(`data-comando="${comando}"`)
    }
    for (const nombre of [
      'Negrita',
      'Alinear a la izquierda',
      'Centrar',
      'Alinear a la derecha',
      'Justificar',
    ]) {
      expect(html, nombre).toContain(`aria-label="${nombre}"`)
    }
    expect(html).toContain('title="Negrita (Ctrl+B)"')
    expect(html.match(/aria-pressed="false"/g)).toHaveLength(5)
  })

  it('el área editable es un cuadro de texto accesible con el texto guardado como párrafos', async () => {
    const html = await editor(
      '<p style="text-align:justify">Un <strong>texto</strong> claro</p><p>Otro</p>',
    )
    expect(html).toContain('contenteditable="true"')
    expect(html).toContain('role="textbox"')
    expect(html).toContain('aria-multiline="true"')
    expect(html).toContain('aria-labelledby="editor-txt_cta_parrafo-etiqueta"')
    expect(html).toContain(
      '<p style="text-align:justify">Un <strong>texto</strong> claro</p><p>Otro</p>',
    )
  })

  it('sin JavaScript queda visible el campo de texto, con el código del texto y su nombre', async () => {
    const html = await editor('<div style="text-align: center;">Hola <b>mundo</b></div>')
    // La barra y el área nacen ocultas; el campo de texto, no.
    expect(html).toMatch(/data-barra[^>]*hidden/)
    expect(html).toMatch(/data-area[^>]*hidden/)
    expect(html).toMatch(/<textarea[^>]*name="txt_cta_parrafo"/)
    expect(html).not.toMatch(/<textarea[^>]*hidden/)
    // El campo lleva el HTML canónico: guardar sin JavaScript no pierde el formato.
    expect(html).toContain(
      '&lt;p style="text-align:center"&gt;Hola &lt;strong&gt;mundo&lt;/strong&gt;&lt;/p&gt;',
    )
  })

  it('la etiqueta apunta al campo y declara el tope de caracteres', async () => {
    const html = await editor('')
    expect(html).toContain(
      '<label id="editor-txt_cta_parrafo-etiqueta" for="editor-txt_cta_parrafo"',
    )
    expect(html).toContain('id="editor-txt_cta_parrafo"')
    expect(html).toContain('data-max="5000"')
    expect(html).toContain('role="status"')
  })

  it('un texto vacío deja un párrafo en blanco donde escribir y el campo vacío', async () => {
    const html = await editor('')
    expect(html).toContain('<p><br /></p>')
    expect(html).toMatch(/<textarea[^>]*><\/textarea>/)
  })

  it('un texto plano de antes del editor se muestra como párrafos', async () => {
    const html = await editor('Uno\nDos\n\nTres')
    expect(html).toContain('<p>Uno<br />Dos</p><p>Tres</p>')
  })

  it('lo que traiga el valor guardado no se inserta como HTML en el área ni en el campo', async () => {
    const html = await editor(
      '<p onclick="robar()">Hola <img src=x onerror=alert(1)><script>alert(2)</script></p></textarea><script>alert(3)</script>',
    )
    for (const peligro of [
      'robar()',
      'onerror',
      'alert(1)',
      'alert(2)',
      'alert(3)',
      '<script',
      '<img',
    ]) {
      expect(html, peligro).not.toContain(peligro)
    }
    expect(html).toContain('Hola')
  })
})
