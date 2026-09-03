import { describe, expect, it } from 'vitest'
import { router } from './router.ts'

describe('Router prefix and redirect resolution', () => {
  it('redirects root "/" to "/ordena/"', async () => {
    const response = await router.fetch(new Request('http://localhost/'))
    expect(response?.status).toBe(302)
    expect(response?.headers.get('location')).toBe('http://localhost/ordena/')
  })

  it('redirects "/login" without basePath prefix to "/ordena/login"', async () => {
    const response = await router.fetch(new Request('http://localhost/login'))
    expect(response?.status).toBe(302)
    expect(response?.headers.get('location')).toBe('http://localhost/ordena/login')
  })

  it('redirects "/admin" without basePath prefix to "/ordena/admin"', async () => {
    const response = await router.fetch(new Request('http://localhost/admin'))
    expect(response?.status).toBe(302)
    expect(response?.headers.get('location')).toBe('http://localhost/ordena/admin')
  })

  it('redirects "/participation/login" without basePath prefix to "/ordena/participation/login"', async () => {
    const response = await router.fetch(new Request('http://localhost/participation/login'))
    expect(response?.status).toBe(302)
    expect(response?.headers.get('location')).toBe('http://localhost/ordena/participation/login')
  })

  it('resolves "/ordena/participation/login" by redirecting to "/ordena/login"', async () => {
    const response = await router.fetch(new Request('http://localhost/ordena/participation/login'))
    expect(response?.status).toBe(302)
    expect(response?.headers.get('location')).toBe('/ordena/login')
  })

  it('una ruta con extensión que no es un archivo estático llega a la aplicación', async () => {
    // El middleware estático respondía 404 por su cuenta ante cualquier URL
    // cuyo último segmento pareciera un archivo, aunque no estuviera en
    // public/. Eso impedía que ninguna ruta sirviera una imagen —justo lo que
    // necesita el proxy de las imágenes de marca.
    const originalFetch = globalThis.fetch
    globalThis.fetch = (async () =>
      new Response(new Uint8Array([137, 80, 78, 71]), {
        status: 200,
        headers: { 'content-type': 'image/png' },
      })) as unknown as typeof fetch
    try {
      const response = await router.fetch(
        new Request('http://localhost/ordena/marca/brand-1-foto.jpg'),
      )
      expect(response?.status).toBe(200)
      expect(response?.headers.get('content-type')).toBe('image/png')
    } finally {
      globalThis.fetch = originalFetch
    }
  })

  it('sigue sirviendo los archivos estáticos de public/', async () => {
    const response = await router.fetch(new Request('http://localhost/ordena/admin.css'))
    expect(response?.status).toBe(200)
    expect(response?.headers.get('content-type')).toContain('text/css')
  })

  it('renders "/ordena/login" page directly with 200 OK HTML', async () => {
    const response = await router.fetch(new Request('http://localhost/ordena/login'))
    expect(response?.status).toBe(200)
    expect(response?.headers.get('content-type')).toContain('text/html')
    const html = await response?.text()
    expect(html).toContain('Iniciar Sesión')
  })
})
