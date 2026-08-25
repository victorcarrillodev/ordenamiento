import { describe, expect, it } from 'vitest'

import { isSafeCssColor } from './civic-horizon.ts'

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
