import { describe, expect, it } from 'bun:test'
import { contentDisposition, nombreEnDisco, sanitizarNombre } from './nombres.ts'

describe('files/nombres', () => {
  it('sanitizarNombre elimina path traversal y caracteres peligrosos', () => {
    expect(sanitizarNombre('../../etc/passwd.pdf')).toBe('passwd.pdf')
    expect(sanitizarNombre('archivo\r\nheader: injection.pdf')).toBe('archivoheader_ injection.pdf')
    expect(sanitizarNombre('..//..//secreto.shp')).toBe('secreto.shp')
  })

  it('sanitizarNombre trunca respetando bytes y extensión', () => {
    const largo = 'a'.repeat(250) + '.pdf'
    const saneado = sanitizarNombre(largo, 50)
    expect(saneado.endsWith('.pdf')).toBe(true)
    expect(new TextEncoder().encode(saneado).length).toBeLessThanOrEqual(50)
  })

  it('nombreEnDisco incluye timestamp y hash', () => {
    const ahora = 1700000000000
    const enDisco = nombreEnDisco('plano_ambiental.dwg', ahora)
    expect(enDisco.startsWith('1700000000000-')).toBe(true)
    expect(enDisco.endsWith('-plano_ambiental.dwg')).toBe(true)
  })

  it('contentDisposition genera encabezado RFC 5987 válido escapando comillas', () => {
    const header = contentDisposition('plano "final" 2026.pdf', 'attachment')
    expect(header.startsWith('attachment; filename="plano _final_ 2026.pdf"')).toBe(true)
    expect(header).toContain("filename*=UTF-8''")
  })
})
