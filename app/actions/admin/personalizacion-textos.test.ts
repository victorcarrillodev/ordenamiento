import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { router } from '../../router.ts'

/**
 * Mini-página de textos del portal (personalizacion-textos-controller).
 * Cubre: protección auth, render con valores del tema, motivo obligatorio,
   * y guardado con las 70 claves + section==='usuario'.
 */

const ORIGINAL_FETCH = globalThis.fetch

function mockFetch(opts: {
  authed?: boolean
  theme?: unknown
  captureThemePost?: { called: boolean; body: Record<string, unknown> | null }
  themePostStatus?: number
}) {
  const authed = opts.authed ?? true
  globalThis.fetch = vi
    .fn()
    .mockImplementation((url: string | URL | Request, init?: RequestInit) => {
      const u = typeof url === 'string' ? url : url instanceof Request ? url.url : url.toString()
      if (u.includes('/api/auth/me')) {
        return Promise.resolve(
          new Response(
            JSON.stringify(
              authed
                ? { user: { id: 1, name: 'Admin', role: 'admin', email: 'admin@tlaquepaque.gob.mx' } }
                : { user: null },
            ),
            { status: authed ? 200 : 401, headers: { 'content-type': 'application/json' } },
          ),
        )
      }
      if (u.includes('/api/settings/theme')) {
        if (init?.method === 'POST') {
          if (opts.captureThemePost) {
            opts.captureThemePost.called = true
            try {
              opts.captureThemePost.body = JSON.parse(String(init?.body)) as Record<
                string,
                unknown
              >
            } catch {
              opts.captureThemePost.body = null
            }
          }
          const status = opts.themePostStatus ?? 200
          return Promise.resolve(
            new Response(
              JSON.stringify(status === 200 ? { ok: true } : { error: 'Error al guardar' }),
              { status, headers: { 'content-type': 'application/json' } },
            ),
          )
        }
        return Promise.resolve(
          new Response(
            JSON.stringify(
              opts.theme ?? { theme: { usuario: { textos: { heroTitulo: 'TÍTULO CUSTOM' } } } },
            ),
            { status: 200, headers: { 'content-type': 'application/json' } },
          ),
        )
      }
      return Promise.resolve(new Response(JSON.stringify({ ok: true }), { status: 200 }))
    }) as unknown as typeof fetch
}

describe('Personalización · textos del portal', () => {
  beforeEach(() => vi.restoreAllMocks())
  afterEach(() => (globalThis.fetch = ORIGINAL_FETCH))

  it('GET sin sesión → 302 a login', async () => {
    mockFetch({ authed: false })
    const res = await router.fetch(new Request('http://localhost/ordena/admin/personalizacion/textos'))
    expect(res?.status).toBe(302)
    expect(res?.headers.get('location')).toContain('/login')
  })

  it('GET admin muestra el valor del tema y el campo de navegación', async () => {
    mockFetch({})
    const res = await router.fetch(new Request('http://localhost/ordena/admin/personalizacion/textos'))
    expect(res?.status).toBe(200)
    const html = await res?.text()
    expect(html).toContain('TÍTULO CUSTOM')
    expect(html).toContain('txt_nav_enlace_inicio')
  })

  it('POST sin motivo → 302 err y NO llama al backend', async () => {
    const capture = { called: false, body: null as Record<string, unknown> | null }
    mockFetch({ captureThemePost: capture })
    const fd = new FormData()
    fd.set('txt_hero_titulo', 'X')
    const res = await router.fetch(
      new Request('http://localhost/ordena/admin/personalizacion/textos', {
        method: 'POST',
        body: fd,
      }),
    )
    expect(res?.status).toBe(302)
    expect(res?.headers.get('location')).toContain(
      'err=El+motivo+del+cambio+es+obligatorio+por+seguridad',
    )
    expect(capture.called).toBe(false)
  })

  it('POST con motivo guarda las 70 claves con section usuario', async () => {
    const capture = { called: false, body: null as Record<string, unknown> | null }
    mockFetch({ captureThemePost: capture })
    const fd = new FormData()
    fd.set('motivo', 'Actualización de textos del portal')
    fd.set('txt_hero_titulo', 'X')
    fd.set('txt_footer_firma', 'Y')
    const res = await router.fetch(
      new Request('http://localhost/ordena/admin/personalizacion/textos', {
        method: 'POST',
        body: fd,
      }),
    )
    expect(res?.status).toBe(302)
    expect(res?.headers.get('location')).toContain('msg=Textos+del+portal+guardados+correctamente')
    expect(capture.called).toBe(true)
    const body = capture.body as {
      config: { usuario: { textos: Record<string, string> } }
      motivo: string
      section: string
    }
    expect(body.config.usuario.textos.heroTitulo).toBe('X')
    expect(body.config.usuario.textos.footerFirma).toBe('Y')
    expect(body.config.usuario.textos.card1Titulo).toBe('')
    expect(Object.keys(body.config.usuario.textos)).toHaveLength(70)
    expect(body.section).toBe('usuario')
  })
})
