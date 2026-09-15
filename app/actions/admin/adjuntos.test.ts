import { afterEach, describe, expect, it, vi } from 'vitest'
import { router } from '../../router.ts'
import { adminRoutes } from '../../routes.ts'
afterEach(() => vi.unstubAllGlobals())

describe('adjuntos del panel', () => {
  const ids = { id: 'p1', aid: 'a1' }
  it('reenvía rangos, cookies y bytes y conserva la respuesta parcial', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string, init?: RequestInit) => {
        if (url.endsWith('/api/auth/me'))
          return Response.json({ user: { id: 'admin', name: 'Admin', role: 'admin' } })
        expect(url).toContain('?download=1')
        expect(new Headers(init?.headers).get('cookie')).toBe('sid=test')
        expect(new Headers(init?.headers).get('range')).toBe('bytes=0-3')
        return new Response('%PDF', {
          status: 206,
          headers: {
            'content-type': 'application/pdf',
            'content-disposition': 'attachment; filename="a.pdf"',
            'content-range': 'bytes 0-3/10',
          },
        })
      }),
    )
    const response = await router.fetch(
      new Request(`http://localhost${adminRoutes.adjunto.href(ids)}?download=1`, {
        headers: { cookie: 'sid=test', range: 'bytes=0-3' },
      }),
    )
    expect(response.status).toBe(206)
    expect(response.headers.get('content-range')).toBe('bytes 0-3/10')
    expect(await response.text()).toBe('%PDF')
  })
  it('escapa el texto del Word y deja disponible el original', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string) =>
        url.endsWith('/api/auth/me')
          ? Response.json({ user: { id: 'admin', name: 'Admin', role: 'admin' } })
          : Response.json({
              nombre: 'archivo.docx',
              texto: '<script>alert(1)</script>',
              origen: 'digital',
            }),
      ),
    )
    const response = await router.fetch(
      new Request(`http://localhost${adminRoutes.adjuntoVista.href(ids)}`),
    )
    const html = await response.text()
    expect(html).toContain('&lt;script&gt;alert(1)&lt;/script&gt;')
    expect(html).not.toContain('<script>alert(1)</script>')
    expect(html).toContain('?download=1')
    expect(response.headers.get('cache-control')).toContain('no-store')
  })
})
