import { describe, expect, it } from 'bun:test'

import {
  canonizarTextoRico,
  LIMITE_TEXTO_RICO,
  parsearTextoRico,
  textoPlanoDe,
  truncarTextoRico,
} from './texto-rico.ts'

/** Caracteres visibles como los cuenta el límite: los de cada tramo, un salto y un cambio de párrafo. */
const visibles = (valor: string) => Array.from(textoPlanoDe(valor)).length

describe('texto con formato (backend)', () => {
  it('deja canónico el HTML que arma el navegador', () => {
    expect(
      canonizarTextoRico(
        '<div style="text-align: center;">Hola <b>mundo</b></div><div>Adiós<br>amigos</div>',
      ),
    ).toBe('<p style="text-align:center">Hola <strong>mundo</strong></p><p>Adiós<br>amigos</p>')
  })

  it('el texto plano de antes del editor pasa a párrafos', () => {
    expect(canonizarTextoRico('Uno\nDos\n\nTres')).toBe('<p>Uno<br>Dos</p><p>Tres</p>')
  })

  it('no conserva etiquetas, atributos ni estilos que no sean negrita o alineación', () => {
    expect(
      canonizarTextoRico(
        '<p style="text-align:right;position:fixed" onclick="x()">a <a href="javascript:alert(1)">b</a><script>alert(1)</script><img src=x onerror=alert(1)></p>',
      ),
    ).toBe('<p style="text-align:right">a b</p>')
  })

  it('el NUL y los invisibles no llegan a la base de datos', () => {
    expect(canonizarTextoRico('<p>a\u0000b‮c</p>')).toBe('<p>abc</p>')
  })

  it('es idempotente', () => {
    const una = canonizarTextoRico('<div style="text-align:justify"><b>x</b> y<br><br>z</div>')
    expect(canonizarTextoRico(una)).toBe(una)
  })

  it('un valor sin contenido se guarda vacío, para que el portal use su texto por defecto', () => {
    expect(canonizarTextoRico('')).toBe('')
    expect(canonizarTextoRico('<p><br></p>')).toBe('')
    expect(canonizarTextoRico(undefined)).toBe('')
  })
})

describe('texto con formato: tope de caracteres visibles', () => {
  it('el tope es de seguridad: muy por encima del párrafo más largo del portal (unos 460)', () => {
    expect(LIMITE_TEXTO_RICO).toBeGreaterThanOrEqual(2000)
  })

  it('recorta a los caracteres visibles, no al tamaño del HTML', () => {
    const largo = canonizarTextoRico(`<p style="text-align:justify">${'x'.repeat(600)}</p>`, 500)
    expect(visibles(largo)).toBe(500)
    // 500 visibles caben aunque con el formato el HTML mida más de 500.
    expect(largo.length).toBeGreaterThan(500)
    const justo = `<p><strong>${'y'.repeat(500)}</strong></p>`
    expect(canonizarTextoRico(justo, 500)).toBe(justo)
  })

  it('conserva el formato de lo que queda', () => {
    expect(
      canonizarTextoRico('<p style="text-align:center"><strong>aaaa</strong> bbbb</p>', 6),
    ).toBe('<p style="text-align:center"><strong>aaaa</strong> b</p>')
  })

  it('cuenta el cambio de párrafo y el salto de línea como un carácter', () => {
    const recortado = canonizarTextoRico('<p>aaa</p><p>bbb<br>ccc</p>', 5)
    expect(recortado).toBe('<p>aaa</p><p>b</p>')
    expect(visibles(recortado)).toBe(5)
    expect(canonizarTextoRico('<p>aaa<br>bbb</p>', 4)).toBe('<p>aaa</p>')
  })

  it('no parte un emoji por la mitad', () => {
    expect(canonizarTextoRico(`<p>${'😀'.repeat(10)}</p>`, 5)).toBe(`<p>${'😀'.repeat(5)}</p>`)
  })

  it('sin tope no recorta', () => {
    const texto = 'z'.repeat(700)
    expect(visibles(canonizarTextoRico(texto))).toBe(700)
  })

  it('truncar nunca deja más del tope, sea cual sea el contenido', () => {
    const entradas = [
      '<p>a</p>'.repeat(40),
      '<p>a<br></p>'.repeat(40),
      `<p><strong>${'ab '.repeat(300)}</strong></p>`,
      'línea\n'.repeat(80),
    ]
    for (const entrada of entradas) {
      for (const tope of [1, 7, 50, 500]) {
        expect(visibles(canonizarTextoRico(entrada, tope))).toBeLessThanOrEqual(tope)
      }
    }
    expect(truncarTextoRico(parsearTextoRico('<p>a</p>'), 0)).toEqual([])
  })
})
