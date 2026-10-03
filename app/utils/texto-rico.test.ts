import { describe, expect, it } from 'vitest'

import {
  canonizarTextoRico,
  parsearTextoRico,
  serializarTextoRico,
  textoDelPortal,
  textoPlanoDe,
} from './texto-rico.ts'

describe('texto con formato: leer lo guardado', () => {
  it('un texto sin etiquetas es un párrafo sin formato', () => {
    expect(parsearTextoRico('Hola mundo')).toEqual([
      { alineacion: '', partes: [{ texto: 'Hola mundo', negrita: false }] },
    ])
  })

  it('en un texto sin etiquetas, la línea en blanco separa párrafos y el salto simple queda dentro', () => {
    const parrafos = parsearTextoRico('Uno\nDos\n\nTres')
    expect(parrafos).toHaveLength(2)
    expect(parrafos[0].partes).toEqual([
      { texto: 'Uno', negrita: false },
      { salto: true },
      { texto: 'Dos', negrita: false },
    ])
    expect(parrafos[1].partes).toEqual([{ texto: 'Tres', negrita: false }])
  })

  it('lee negritas y alineación del HTML canónico', () => {
    expect(
      parsearTextoRico('<p style="text-align:justify">Un <strong>texto</strong> claro</p>'),
    ).toEqual([
      {
        alineacion: 'justificado',
        partes: [
          { texto: 'Un ', negrita: false },
          { texto: 'texto', negrita: true },
          { texto: ' claro', negrita: false },
        ],
      },
    ])
  })

  it('entiende cada alineación, también escrita como atributo o como la deja el navegador', () => {
    const alineacionDe = (html: string) => parsearTextoRico(html)[0].alineacion
    expect(alineacionDe('<p style="text-align:left">a</p>')).toBe('izquierda')
    expect(alineacionDe('<p style="text-align: center;">a</p>')).toBe('centro')
    expect(alineacionDe('<div style="text-align: right;">a</div>')).toBe('derecha')
    expect(alineacionDe('<div align="justify">a</div>')).toBe('justificado')
    expect(alineacionDe('<p style="text-align:end">a</p>')).toBe('derecha')
    expect(alineacionDe('<p style="text-align:inherit">a</p>')).toBe('')
    expect(alineacionDe('<p>a</p>')).toBe('')
  })

  it('un bloque dentro de otro hereda la alineación del de afuera', () => {
    const parrafos = parsearTextoRico(
      '<div style="text-align:center"><div>uno</div><p>dos</p></div>',
    )
    expect(parrafos.map((p) => p.alineacion)).toEqual(['centro', 'centro'])
  })

  it('lee la estructura que arma un editor del navegador (div, b, br, nbsp)', () => {
    const parrafos = parsearTextoRico(
      'Primera línea<div><b>Negrita</b>&nbsp;y normal<br>otra línea</div><div><br></div>',
    )
    expect(parrafos).toHaveLength(2)
    expect(textoPlanoDe('Primera línea<div><b>Negrita</b>&nbsp;y normal<br>otra línea</div>')).toBe(
      'Primera línea\nNegrita y normal\notra línea',
    )
    expect(parrafos[1].partes[0]).toEqual({ texto: 'Negrita', negrita: true })
  })

  it('el grosor declarado manda sobre la etiqueta (Google Docs envuelve todo en <b font-weight:normal>)', () => {
    const [p] = parsearTextoRico(
      '<b style="font-weight:normal"><span style="font-weight:700">fuerte</span> y suave</b>',
    )
    expect(p.partes).toEqual([
      { texto: 'fuerte', negrita: true },
      { texto: ' y suave', negrita: false },
    ])
  })

  it('el cierre de una etiqueta termina su negrita aunque estén mal anidadas', () => {
    const [p] = parsearTextoRico('<p>a <b>b <i>c</b> d</i> e</p>')
    expect(textoPlanoDe('<p>a <b>b <i>c</b> d</i> e</p>')).toBe('a b c d e')
    expect(
      p.partes.filter((x) => 'texto' in x && x.negrita).map((x) => 'texto' in x && x.texto),
    ).toEqual(['b c'])
  })

  it('colapsa los espacios y saltos de la fuente como lo hace el navegador', () => {
    expect(textoPlanoDe('<p>  uno \n\n  dos   </p><p> tres </p>')).toBe('uno dos\ntres')
  })

  it('no deja saltos ni espacios sueltos al principio ni al final del párrafo', () => {
    const [p] = parsearTextoRico('<p><br> hola <br></p>')
    expect(p.partes).toEqual([{ texto: 'hola', negrita: false }])
  })

  it('conserva un salto doble dentro del párrafo como línea en blanco', () => {
    const [p] = parsearTextoRico('<p>a<br><br>b</p>')
    expect(p.partes.filter((x) => 'salto' in x)).toHaveLength(2)
  })

  it('descarta los párrafos vacíos', () => {
    expect(parsearTextoRico('<p></p><p><br></p><p>  </p>')).toEqual([])
    expect(parsearTextoRico('')).toEqual([])
    expect(parsearTextoRico(undefined)).toEqual([])
    expect(parsearTextoRico(null)).toEqual([])
  })
})

describe('texto con formato: lo que NO se interpreta', () => {
  it('ignora el contenido de script, style y template', () => {
    expect(
      textoPlanoDe('<p>a</p><script>alert(1)</script><style>p{color:red}</style><p>b</p>'),
    ).toBe('a\nb')
  })

  it('las etiquetas desconocidas y sus atributos desaparecen, el texto se queda', () => {
    expect(
      textoPlanoDe(
        '<p onclick="x()">uno <a href="javascript:alert(1)" title="a>b">dos</a> <img src=x onerror=alert(1)></p>',
      ),
    ).toBe('uno dos')
  })

  it('un «<» suelto es texto', () => {
    expect(textoPlanoDe('<p>5 < 6 y 7 > 3</p>')).toBe('5 < 6 y 7 > 3')
    expect(canonizarTextoRico('<p>5 < 6</p>')).toBe('<p>5 &lt; 6</p>')
  })

  it('los atributos de estilo no dejan pasar nada más que la alineación', () => {
    const html = canonizarTextoRico(
      '<p style="text-align:center;background:url(javascript:alert(1));position:fixed">x</p>',
    )
    expect(html).toBe('<p style="text-align:center">x</p>')
  })

  it('quita controles, el NUL y los invisibles que reordenan el texto', () => {
    expect(textoPlanoDe('<p>a\u0000b‮c​d</p>')).toBe('abcd')
    expect(textoPlanoDe('<p>a&#0;b&#x202e;c</p>')).toBe('abc')
    expect(textoPlanoDe('<p>a&#55357;b</p>')).toBe('ab')
  })

  it('no se atora con etiquetas sin cerrar ni con comillas abiertas', () => {
    expect(() => parsearTextoRico('<p ' + '<a "'.repeat(2_000))).not.toThrow()
    expect(textoPlanoDe('<p>abierto <strong>sin cerrar')).toBe('abierto sin cerrar')
  })
})

describe('texto con formato: lo que se guarda', () => {
  it('escribe el HTML canónico', () => {
    expect(
      canonizarTextoRico(
        '<div style="text-align: center;">Hola <b>mundo</b></div><div>Adiós<br>amigos</div>',
      ),
    ).toBe('<p style="text-align:center">Hola <strong>mundo</strong></p><p>Adiós<br>amigos</p>')
  })

  it('escapa &, < y > del texto', () => {
    expect(canonizarTextoRico('<p>Tom &amp; Jerry &lt;3</p>')).toBe('<p>Tom &amp; Jerry &lt;3</p>')
    expect(canonizarTextoRico('<p>Tom & Jerry <3</p>')).toBe('<p>Tom &amp; Jerry &lt;3</p>')
  })

  it('un texto sin etiquetas es literal: lo que se escribió es lo que se ve', () => {
    expect(textoPlanoDe('Tom &amp; Jerry')).toBe('Tom &amp; Jerry')
    expect(canonizarTextoRico('Tom & Jerry')).toBe('<p>Tom &amp; Jerry</p>')
  })

  it('un valor vacío o sin contenido se guarda vacío', () => {
    expect(canonizarTextoRico('')).toBe('')
    expect(canonizarTextoRico('<p><br></p>')).toBe('')
  })

  it('es idempotente: canonizar lo canónico no cambia nada', () => {
    const entradas = [
      'Un texto plano\ncon salto\n\ny otro párrafo',
      '<div style="text-align:right">uno <b>dos</b> <i>tres</i></div>texto suelto<div><br></div>',
      '<p style="text-align:justify"><strong>Todo en negrita</strong></p>',
      '<p>a<br><br>b</p><p style="text-align:center">c &amp; d</p>',
      '<b style="font-weight:normal">x</b>',
    ]
    for (const entrada of entradas) {
      const una = canonizarTextoRico(entrada)
      expect(canonizarTextoRico(una), entrada).toBe(una)
      expect(serializarTextoRico(parsearTextoRico(una))).toBe(una)
    }
  })

  it('junta la negrita contigua en una sola etiqueta', () => {
    expect(canonizarTextoRico('<b>a</b><strong>b</strong> c')).toBe('<p><strong>ab</strong> c</p>')
  })
})

describe('textoDelPortal', () => {
  it('devuelve lo guardado si tiene texto', () => {
    expect(textoDelPortal('<p>Hola</p>', 'Por defecto')).toBe('<p>Hola</p>')
    expect(textoDelPortal('Hola', 'Por defecto')).toBe('Hola')
  })

  it('devuelve el de por defecto si no hay nada que mostrar', () => {
    expect(textoDelPortal('', 'Por defecto')).toBe('Por defecto')
    expect(textoDelPortal('  \n ', 'Por defecto')).toBe('Por defecto')
    expect(textoDelPortal('<p></p>', 'Por defecto')).toBe('Por defecto')
    expect(textoDelPortal(undefined, 'Por defecto')).toBe('Por defecto')
  })
})
