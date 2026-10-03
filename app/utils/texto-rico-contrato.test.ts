import { describe, expect, it } from 'vitest'

import * as backend from '../../backend/src/services/texto-rico.ts'
import * as front from './texto-rico.ts'

/**
 * La web no puede importar del backend (el Dockerfile no lo copia), así que el
 * lector del texto con formato vive en los dos lados: el backend lo deja
 * canónico al guardar y la web lo lee para dibujarlo. Si uno se separara del
 * otro, lo que se guarda se vería distinto en el portal. Estas pruebas corren
 * los mismos textos por los dos y exigen el mismo resultado.
 */
const TEXTOS = [
  '',
  'Texto plano',
  'Uno\nDos\n\nTres\r\nCuatro',
  '<p>Un párrafo</p>',
  '<p style="text-align:justify">Justificado con <strong>negrita</strong> y más</p>',
  '<div style="text-align: center;">Centrado</div><div style="text-align:right">Derecha</div>',
  'Suelto<div><b>Negrita</b>&nbsp;y normal<br>otra línea</div><div><br></div>',
  '<div style="text-align:center"><div>anidado</div><p>hereda</p></div>',
  '<b style="font-weight:normal"><span style="font-weight:700">fuerte</span> suave</b>',
  '<p>a <b>b <i>c</b> d</i> e</p>',
  '<p>5 < 6 y 7 > 3 &amp; &lt;etiqueta&gt; &#233; &#xe9;</p>',
  '<p onclick="x()">a <a href="javascript:alert(1)" title="a>b">b</a><script>alert(1)</script></p>',
  '<p>a\u0000b‮c​d&#0;e&#x202e;f</p>',
  '<p>a<br><br>b<br></p><p><br></p><p>  </p>',
  '<!-- comentario --><p>después</p><style>p{}</style>',
  '<ul><li>uno</li><li style="text-align:right">dos</li></ul>',
  '<p>sin cerrar <strong>negrita',
  '<p ' + '<a "'.repeat(50),
]

describe('texto con formato: la web y el backend entienden lo mismo', () => {
  it('leen los mismos párrafos', () => {
    for (const texto of TEXTOS) {
      expect(front.parsearTextoRico(texto), JSON.stringify(texto)).toEqual(
        backend.parsearTextoRico(texto),
      )
    }
  })

  it('escriben el mismo HTML canónico', () => {
    for (const texto of TEXTOS) {
      expect(front.canonizarTextoRico(texto), JSON.stringify(texto)).toBe(
        backend.canonizarTextoRico(texto),
      )
    }
  })

  it('sacan el mismo texto sin formato', () => {
    for (const texto of TEXTOS) {
      expect(front.textoPlanoDe(texto), JSON.stringify(texto)).toBe(backend.textoPlanoDe(texto))
    }
  })

  it('lo que guarda el backend se lee igual en la web', () => {
    for (const texto of TEXTOS) {
      const guardado = backend.canonizarTextoRico(texto, backend.LIMITE_TEXTO_RICO)
      expect(front.canonizarTextoRico(guardado), JSON.stringify(texto)).toBe(guardado)
    }
  })

  it('comparten alineaciones, valores CSS y tope de caracteres', () => {
    expect([...front.ALINEACIONES]).toEqual([...backend.ALINEACIONES])
    expect(front.CSS_ALINEACION).toEqual(backend.CSS_ALINEACION)
    expect(front.LIMITE_TEXTO_RICO).toBe(backend.LIMITE_TEXTO_RICO)
  })
})
