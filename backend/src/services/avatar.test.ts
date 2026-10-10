import { describe, expect, it } from 'bun:test'

import { validarAvatar } from './avatar.ts'

/** Un PNG de 1×1 válido: la revisión mira el contenido, no solo la extensión. */
const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
  'base64',
)

const archivo = (contenido: BlobPart, nombre: string, tipo = 'image/png') =>
  new File([contenido], nombre, { type: tipo })

describe('validarAvatar', () => {
  it('acepta una imagen y devuelve su nombre saneado y el tipo que verificó', async () => {
    const r = await validarAvatar(archivo(PNG, 'mi foto (1).png'))
    expect(r.ok).toBe(true)
    if (r.ok) {
      expect(r.avatar.mime).toBe('image/png')
      expect(r.avatar.nombreOriginal).toContain('mi foto')
      expect(r.avatar.buffer.length).toBe(PNG.length)
    }
  })

  it('rechaza lo que no es un archivo o viene vacío con 400', async () => {
    for (const vacio of [null, undefined, 'texto', 42, archivo(new Uint8Array(0), 'a.png')]) {
      const r = await validarAvatar(vacio)
      expect(r.ok).toBe(false)
      if (!r.ok) expect(r.status).toBe(400)
    }
  })

  it('rechaza una imagen de más de 5 MB con 413', async () => {
    const r = await validarAvatar(archivo(new Uint8Array(5 * 1024 * 1024 + 1), 'grande.png'))
    expect(r.ok).toBe(false)
    if (!r.ok) {
      expect(r.status).toBe(413)
      expect(r.error).toContain('5 MB')
    }
  })

  it('rechaza ejecutables y archivos sin extensión con 415', async () => {
    for (const nombre of ['virus.exe', 'script.js', 'sin-extension']) {
      const r = await validarAvatar(archivo(new Uint8Array([1, 2, 3]), nombre, 'image/png'))
      expect(r.ok, nombre).toBe(false)
      if (!r.ok) expect(r.status).toBe(415)
    }
  })

  it('rechaza un documento que no es imagen con 415 y lo explica', async () => {
    const r = await validarAvatar(
      archivo(Buffer.from('%PDF-1.4\n'), 'oficio.pdf', 'application/pdf'),
    )
    expect(r.ok).toBe(false)
    if (!r.ok) {
      expect(r.status).toBe(415)
      expect(r.error).toContain('imagen')
    }
  })

  it('no se fía del tipo que declara el navegador: un .png que no es una imagen se rechaza', async () => {
    const r = await validarAvatar(archivo(Buffer.from('<script>alert(1)</script>'), 'falso.png'))
    expect(r.ok).toBe(false)
  })
})
