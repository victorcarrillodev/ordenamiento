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

  it('renders "/ordena/login" page directly with 200 OK HTML', async () => {
    const response = await router.fetch(new Request('http://localhost/ordena/login'))
    expect(response?.status).toBe(200)
    expect(response?.headers.get('content-type')).toContain('text/html')
    const html = await response?.text()
    expect(html).toContain('Iniciar Sesión')
  })
})
