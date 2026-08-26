import { describe, expect, it } from 'bun:test'
import { validarAdjunto } from './limits.ts'

describe('files/limits', () => {
  it('rechaza si el conteo total excede el máximo', () => {
    const res = validarAdjunto({ size: 100, name: 'doc.pdf' }, 6, 50 * 1024 * 1024, 5)
    expect(res.ok).toBe(false)
    expect(res.codigo).toBe(400)
    expect(res.reason).toContain('Máximo 5')
  })

  it('rechaza archivos de tamaño 0', () => {
    const res = validarAdjunto({ size: 0, name: 'vacio.pdf' }, 1, 50 * 1024 * 1024, 5)
    expect(res.ok).toBe(false)
    expect(res.codigo).toBe(400)
  })

  it('rechaza archivos que exceden el tamaño máximo con 413', () => {
    const res = validarAdjunto(
      { size: 55 * 1024 * 1024, name: 'pesado.pdf' },
      1,
      50 * 1024 * 1024,
      5,
    )
    expect(res.ok).toBe(false)
    expect(res.codigo).toBe(413)
    expect(res.reason).toContain('50 MB')
    expect(res.reason).toContain('pesado.pdf')
  })

  it('acepta archivos dentro de los límites', () => {
    const res = validarAdjunto(
      { size: 10 * 1024 * 1024, name: 'valido.pdf' },
      3,
      50 * 1024 * 1024,
      5,
    )
    expect(res.ok).toBe(true)
  })
})
