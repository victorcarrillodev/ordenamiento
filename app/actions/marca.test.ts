import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { router } from '../router.ts'

/**
 * Proxy de las imágenes que sube el administrador en Personalización.
 *
 * Sin esta ruta, el `<img src>` apuntaba a `/api/settings/assets/...`, una
 * ruta del backend a la que el navegador no llega: toda imagen subida por el
 * panel salía rota en el portal público.
 */

const originalFetch = globalThis.fetch

/** PNG de 1×1: basta para comprobar que el cuerpo se reenvía. */
const PNG = Uint8Array.from([137, 80, 78, 71, 13, 10, 26, 10])

function backendSirve(status = 200) {
  return vi.fn().mockResolvedValue(
    new Response(status === 200 ? PNG : null, {
      status,
      headers: status === 200 ? { 'content-type': 'image/png', 'content-length': '8' } : {},
    }),
  )
}

function get(path: string) {
  return router.fetch(new Request(`http://localhost${path}`))
}

beforeEach(() => {
  vi.restoreAllMocks()
})

afterEach(() => {
  globalThis.fetch = originalFetch
})

describe('GET /ordena/marca/:archivo', () => {
  it('sirve la imagen del backend bajo el prefijo público', async () => {
    const spy = backendSirve()
    globalThis.fetch = spy

    const res = await get('/ordena/marca/brand-123-foto.jpg')

    expect(res?.status).toBe(200)
    expect(res?.headers.get('content-type')).toBe('image/png')
    // Pide al backend la ruta interna correspondiente.
    expect(String(spy.mock.calls[0][0])).toContain('/api/settings/assets/brand-123-foto.jpg')
  })

  it('no deja que el navegador interprete el archivo como otra cosa', async () => {
    globalThis.fetch = backendSirve()

    const res = await get('/ordena/marca/brand-123-foto.jpg')

    expect(res?.headers.get('x-content-type-options')).toBe('nosniff')
    expect(res?.headers.get('content-security-policy')).toContain("default-src 'none'")
  })

  it('es pública: el logotipo se ve antes de iniciar sesión', async () => {
    globalThis.fetch = backendSirve()
    const res = await get('/ordena/marca/brand-123-foto.jpg')
    expect(res?.status).toBe(200)
  })

  it('rechaza nombres con separadores o caracteres raros sin llamar al backend', async () => {
    for (const nombre of ['sub/dir/x.jpg', '..%2Fetc%2Fpasswd', 'x;rm.jpg', 'x y.jpg', '']) {
      const spy = vi.fn()
      globalThis.fetch = spy
      const res = await get(`/ordena/marca/${nombre}`)
      expect(res?.status, nombre).toBe(404)
      expect(spy, nombre).not.toHaveBeenCalled()
    }
  })

  it('propaga el 404 cuando el archivo ya no está en el backend', async () => {
    globalThis.fetch = backendSirve(404)
    const res = await get('/ordena/marca/brand-borrado.jpg')
    expect(res?.status).toBe(404)
  })
})
