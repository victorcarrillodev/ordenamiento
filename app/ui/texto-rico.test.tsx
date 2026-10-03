import { describe, expect, it } from 'vitest'
import { renderToString } from 'remix/ui/server'

import { ParrafosRicos, TextoRico } from './texto-rico.tsx'

const dentroDeUnP = (valor: string | null | undefined) =>
  renderToString(
    <p>
      <TextoRico valor={valor} />
    </p>,
  )

describe('TextoRico', () => {
  it('un texto plano se dibuja directo en el elemento, como siempre', async () => {
    expect(await dentroDeUnP('Hola mundo')).toBe('<p>Hola mundo</p>')
  })

  it('escapa el texto: no se inserta nada como HTML', async () => {
    const html = await dentroDeUnP('<p>Tom & <img src=x onerror=alert(1)> Jerry</p>')
    expect(html).toBe('<p>Tom &amp; Jerry</p>')
    const crudo = await dentroDeUnP('5 < 6 & 7 > 3')
    expect(crudo).toBe('<p>5 &lt; 6 &amp; 7 &gt; 3</p>')
  })

  it('dibuja las negritas con <strong> y los saltos con <br />', async () => {
    expect(await dentroDeUnP('<p>Un <b>texto</b> claro<br />y otra línea</p>')).toBe(
      '<p>Un <strong>texto</strong> claro<br />y otra línea</p>',
    )
  })

  it('los saltos de línea de un texto plano siguen viéndose (la dirección del pie de página)', async () => {
    expect(await dentroDeUnP('Dirección\nH. Ayuntamiento\nJalisco')).toBe(
      '<p>Dirección<br />H. Ayuntamiento<br />Jalisco</p>',
    )
  })

  it('una alineación se aplica al párrafo como bloque', async () => {
    const html = await dentroDeUnP('<p style="text-align:justify">Justificado</p>')
    expect(html).toContain('display:block;text-align:justify')
    expect(html).toContain('Justificado')
    for (const [css, alineacion] of [
      ['left', 'left'],
      ['center', 'center'],
      ['right', 'right'],
      ['justify', 'justify'],
    ]) {
      const dibujado = await dentroDeUnP(`<p style="text-align:${css}">x</p>`)
      expect(dibujado).toContain(`text-align:${alineacion}`)
    }
  })

  it('cada párrafo es un bloque y los que siguen llevan margen arriba', async () => {
    const html = await dentroDeUnP('<p>Uno</p><p style="text-align:right">Dos</p>')
    const bloques = [...html.matchAll(/<span style="([^"]*)">/g)].map((m) => m[1])
    expect(bloques).toHaveLength(2)
    expect(bloques[0]).not.toContain('margin-top')
    expect(bloques[1]).toContain('margin-top:0.75em')
    expect(bloques[1]).toContain('text-align:right')
  })

  it('un párrafo sin alineación entre otros hereda la alineación del elemento de la página', async () => {
    const html = await dentroDeUnP('<p>Uno</p><p>Dos</p>')
    expect(html).not.toContain('text-align')
  })

  it('un valor vacío no dibuja nada', async () => {
    expect(await dentroDeUnP('')).toBe('<p></p>')
    expect(await dentroDeUnP(undefined)).toBe('<p></p>')
    expect(await dentroDeUnP('<p><br /></p>')).toBe('<p></p>')
  })

  it('no deja pasar atributos ni estilos ajenos', async () => {
    const html = await dentroDeUnP(
      '<p style="text-align:center;background:red;position:fixed" onclick="x()" class="a">Hola</p>',
    )
    expect(html).not.toContain('onclick')
    expect(html).not.toContain('background')
    expect(html).not.toContain('position')
    expect(html).not.toContain('class')
  })
})

describe('ParrafosRicos (editor)', () => {
  it('dibuja un <p> por párrafo con su alineación', async () => {
    const html = await renderToString(
      <ParrafosRicos
        valor={'<p style="text-align:center">Uno <strong>dos</strong></p><p>Tres</p>'}
      />,
    )
    expect(html).toBe('<p style="text-align:center">Uno <strong>dos</strong></p><p>Tres</p>')
  })

  it('un texto vacío deja un párrafo en blanco donde escribir', async () => {
    expect(await renderToString(<ParrafosRicos valor="" />)).toBe('<p><br /></p>')
  })

  it('un texto plano antiguo se muestra como párrafos', async () => {
    expect(await renderToString(<ParrafosRicos valor={'Uno\nDos\n\nTres'} />)).toBe(
      '<p>Uno<br />Dos</p><p>Tres</p>',
    )
  })
})
