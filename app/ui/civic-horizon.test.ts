import { describe, expect, it } from 'vitest'

import { isSafeCssColor, isSafeImageUrl } from './civic-horizon.ts'

describe('isSafeCssColor', () => {
  it('accepts hex colors of valid lengths', () => {
    expect(isSafeCssColor('#fff')).toBe(true)
    expect(isSafeCssColor('#ffffff')).toBe(true)
    expect(isSafeCssColor('#ffffff80')).toBe(true)
    expect(isSafeCssColor('#8C1D3D')).toBe(true)
  })

  it('accepts rgb()/rgba() colors', () => {
    expect(isSafeCssColor('rgb(140, 29, 61)')).toBe(true)
    expect(isSafeCssColor('rgba(140, 29, 61, 0.7)')).toBe(true)
    expect(isSafeCssColor('rgba(0,0,0,0.12)')).toBe(true)
  })

  it('trims surrounding whitespace before validating', () => {
    expect(isSafeCssColor('  #ffffff  ')).toBe(true)
  })

  it('rejects non-string values', () => {
    expect(isSafeCssColor(undefined)).toBe(false)
    expect(isSafeCssColor(null)).toBe(false)
    expect(isSafeCssColor(123)).toBe(false)
    expect(isSafeCssColor({})).toBe(false)
  })

  it('rejects CSS/HTML/script injection attempts', () => {
    // Values an admin (or a compromised/malicious admin session) could try to
    // save through the Personalización form's color fields. These must never
    // reach the raw <style>/<script> text they get interpolated into.
    expect(isSafeCssColor('red; } </style><script>alert(1)</script>')).toBe(false)
    expect(isSafeCssColor("'; alert(document.cookie); var x='")).toBe(false)
    expect(isSafeCssColor('javascript:alert(1)')).toBe(false)
    expect(isSafeCssColor('expression(alert(1))')).toBe(false)
    expect(isSafeCssColor('red</style>')).toBe(false)
  })

  it('rejects plain CSS color keywords (not in the allow-listed formats)', () => {
    // Keeping the pattern strict to hex/rgb is deliberate: a named keyword
    // like "red" is safe on its own, but widening the pattern is a place
    // future edits could accidentally reintroduce an injection vector.
    expect(isSafeCssColor('red')).toBe(false)
  })
})

describe('isSafeImageUrl', () => {
  it('acepta rutas del propio sitio y URLs http(s)', () => {
    expect(isSafeImageUrl('/ordena/uploads/hero.jpg')).toBe(true)
    expect(isSafeImageUrl('https://cdn.ejemplo.mx/hero.webp')).toBe(true)
    expect(isSafeImageUrl('  /ordena/hero.jpg  ')).toBe(true)
  })

  it('rechaza valores que no son cadenas o están vacíos', () => {
    expect(isSafeImageUrl(undefined)).toBe(false)
    expect(isSafeImageUrl(null)).toBe(false)
    expect(isSafeImageUrl(42)).toBe(false)
    expect(isSafeImageUrl('')).toBe(false)
    expect(isSafeImageUrl('   ')).toBe(false)
  })

  it('rechaza URLs que romperían el url(...) para inyectar CSS', () => {
    // El valor se interpola dentro de `background-image: url(${src})`.
    expect(isSafeImageUrl('/a.jpg); background: red; x:url(/b.jpg')).toBe(false)
    expect(isSafeImageUrl('/a.jpg"); } body { display:none } .x{')).toBe(false)
    expect(isSafeImageUrl("/a.jpg'")).toBe(false)
    expect(isSafeImageUrl('/mi foto.jpg')).toBe(false)
    expect(isSafeImageUrl('/a\\.jpg')).toBe(false)
  })

  it('rechaza esquemas que no son http(s) ni rutas del sitio', () => {
    expect(isSafeImageUrl('javascript:alert(1)')).toBe(false)
    expect(isSafeImageUrl('data:image/svg+xml;base64,PHN2Zz48L3N2Zz4=')).toBe(false)
    expect(isSafeImageUrl('hero.jpg')).toBe(false)
  })

  it('permite dominios externos: lo que acota es la inyección, no el origen', () => {
    // La imagen del hero por defecto ya es externa, y el panel admite pegar la
    // URL de un CDN. Restringir el origen sería otra decisión, de producto.
    expect(isSafeImageUrl('https://cdn.tercero.com/foto.jpg')).toBe(true)
    expect(isSafeImageUrl('//cdn.tercero.com/foto.jpg')).toBe(true)
  })

  it('descarta http explícito, que el navegador bloquearía por contenido mixto', () => {
    expect(isSafeImageUrl('http://ejemplo.mx/foto.png')).toBe(false)
    // La ruta relativa y `//host` heredan el esquema de la página.
    expect(isSafeImageUrl('/ordena/uploads/foto.png')).toBe(true)
  })
})
