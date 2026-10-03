import { describe, expect, it } from 'bun:test'

import { acuseFirmaValida, firmarAcuse, VIGENCIA_ACUSE_MS } from './acuse-token.ts'

const FOLIO = 'SPAGU-DGTPU-E-0018'
const AHORA = 1_790_000_000_000

describe('firma del enlace del acuse', () => {
  it('una firma recién emitida vale para su folio', () => {
    expect(acuseFirmaValida(FOLIO, firmarAcuse(FOLIO, AHORA), AHORA)).toBe(true)
  })

  it('no vale para otro folio: el consecutivo no permite pedir el acuse de otra persona', () => {
    const token = firmarAcuse(FOLIO, AHORA)
    expect(acuseFirmaValida('SPAGU-DGTPU-E-0019', token, AHORA)).toBe(false)
    expect(acuseFirmaValida('SPAGU-DGTPU-E-0017', token, AHORA)).toBe(false)
  })

  it('vence a las 48 horas, ni un milisegundo antes', () => {
    const token = firmarAcuse(FOLIO, AHORA)
    expect(acuseFirmaValida(FOLIO, token, AHORA + VIGENCIA_ACUSE_MS)).toBe(true)
    expect(acuseFirmaValida(FOLIO, token, AHORA + VIGENCIA_ACUSE_MS + 1)).toBe(false)
  })

  it('no se puede alargar la vigencia cambiando la fecha: la firma la cubre', () => {
    const [, firma] = firmarAcuse(FOLIO, AHORA).split('.')
    const alargado = `${AHORA + 365 * 24 * 3_600_000}.${firma}`
    expect(acuseFirmaValida(FOLIO, alargado, AHORA)).toBe(false)
  })

  it('rechaza lo que no tiene la forma de una firma', () => {
    for (const malo of ['', '.', 'abc', '123', '123.', '.abc', 'x.y', `${AHORA + 1000}.corto`]) {
      expect(acuseFirmaValida(FOLIO, malo, AHORA), JSON.stringify(malo)).toBe(false)
    }
  })

  it('una firma alterada en un solo carácter no vale', () => {
    const token = firmarAcuse(FOLIO, AHORA)
    const ultimo = token.slice(-1)
    const alterado = token.slice(0, -1) + (ultimo === 'A' ? 'B' : 'A')
    expect(acuseFirmaValida(FOLIO, alterado, AHORA)).toBe(false)
  })

  it('el mismo folio y momento dan siempre la misma firma (es determinista, sin estado)', () => {
    expect(firmarAcuse(FOLIO, AHORA)).toBe(firmarAcuse(FOLIO, AHORA))
  })
})
