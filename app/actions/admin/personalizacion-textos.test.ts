import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { router } from '../../router.ts'

/**
 * Mini-página de textos del portal (personalizacion-textos-controller).
 * Cubre: protección auth, render con valores del tema, motivo obligatorio,
 * y guardado con las 77 claves + section==='usuario'.
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
                ? {
                    user: {
                      id: 1,
                      name: 'Admin',
                      role: 'admin',
                      email: 'admin@tlaquepaque.gob.mx',
                    },
                  }
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
              opts.captureThemePost.body = JSON.parse(String(init?.body)) as Record<string, unknown>
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
    const res = await router.fetch(
      new Request('http://localhost/ordena/admin/personalizacion/textos'),
    )
    expect(res?.status).toBe(302)
    expect(res?.headers.get('location')).toContain('/login')
  })

  it('GET admin muestra el valor del tema y el campo de navegación', async () => {
    mockFetch({})
    const res = await router.fetch(
      new Request('http://localhost/ordena/admin/personalizacion/textos'),
    )
    expect(res?.status).toBe(200)
    const html = await res?.text()
    expect(html).toContain('TÍTULO CUSTOM')
    expect(html).toContain('txt_nav_enlace_inicio')
  })

  describe('formato del texto', () => {
    const pagina = async (textos: Record<string, string>) => {
      mockFetch({ theme: { theme: { usuario: { textos } } } })
      const res = await router.fetch(
        new Request('http://localhost/ordena/admin/personalizacion/textos'),
      )
      expect(res?.status).toBe(200)
      return (await res?.text()) ?? ''
    }

    it('los textos de párrafo llevan el editor y los títulos, etiquetas y botones, texto plano', async () => {
      const html = await pagina({})
      expect(html).toContain('Formato del texto')
      expect(html.match(/data-editor-texto/g)).toHaveLength(21)
      // Un texto de párrafo: el campo del editor conserva el nombre que espera el formulario.
      expect(html).toMatch(/<textarea[^>]*id="editor-txt_cta_parrafo"[^>]*name="txt_cta_parrafo"/)
      expect(html).toContain('aria-label="Formato de «Párrafo»"')
      // Un título y un botón: la caja de siempre, sin barra de formato.
      expect(html).toMatch(/<textarea[^>]*name="txt_hero_titulo"/)
      expect(html).not.toContain('id="editor-txt_hero_titulo"')
      expect(html).not.toContain('id="editor-txt_cta_boton"')
      // 77 textos, cada uno con su campo.
      expect(html.match(/<textarea/g)).toHaveLength(77)
    })

    it('muestra el formato guardado: negritas y alineación por párrafo', async () => {
      const html = await pagina({
        ctaParrafo: '<p style="text-align:justify">Tu <strong>voz</strong> cuenta</p><p>Otro</p>',
      })
      expect(html).toContain(
        '<p style="text-align:justify">Tu <strong>voz</strong> cuenta</p><p>Otro</p>',
      )
    })

    it('un texto guardado antes del editor (sin etiquetas) se muestra como párrafos y se conserva', async () => {
      const html = await pagina({ footerContacto: 'Calle 1\nColonia Centro' })
      expect(html).toContain('<p>Calle 1<br />Colonia Centro</p>')
    })

    it('lo guardado no se inserta como HTML en el panel', async () => {
      const html = await pagina({
        ctaParrafo:
          '<p onclick="robar()">Hola</p></textarea><script>alert(1)</script><img src=x onerror=alert(2)>',
        heroTitulo: '</textarea><script>alert(3)</script>',
      })
      for (const peligro of ['robar()', 'alert(1)', 'alert(2)', 'onerror']) {
        expect(html, peligro).not.toContain(peligro)
      }
      // En un campo plano el texto va escapado, no ejecutable.
      expect(html).not.toContain('<script>alert(3)')
    })

    it('al guardar, lo que manda el editor viaja tal cual: el backend lo deja canónico', async () => {
      const capture = { called: false, body: null as Record<string, unknown> | null }
      mockFetch({ captureThemePost: capture })
      const fd = new FormData()
      fd.set('motivo', 'Formato')
      fd.set('txt_cta_parrafo', '<div style="text-align: center;">Hola <b>mundo</b></div>')
      const res = await router.fetch(
        new Request('http://localhost/ordena/admin/personalizacion/textos', {
          method: 'POST',
          body: fd,
        }),
      )
      expect(res?.status).toBe(302)
      const textos = (capture.body as { config: { usuario: { textos: Record<string, string> } } })
        .config.usuario.textos
      expect(textos.ctaParrafo).toBe('<div style="text-align: center;">Hola <b>mundo</b></div>')
    })
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

  it('POST con motivo guarda las 77 claves con section usuario', async () => {
    const capture = { called: false, body: null as Record<string, unknown> | null }
    mockFetch({ captureThemePost: capture })
    const fd = new FormData()
    fd.set('motivo', 'Actualización de textos del portal')
    fd.set('txt_hero_titulo', 'X')
    fd.set('txt_footer_firma', 'Y')
    fd.set('txt_programa_parrafo3', 'Párrafo independiente')
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
    expect(body.config.usuario.textos.fasesTitulo).toBe('')
    expect(body.config.usuario.textos.proximasVacio).toBe('')
    expect(body.config.usuario.textos).not.toHaveProperty('card1Titulo')
    expect(body.config.usuario.textos.programaParrafo3).toBe('Párrafo independiente')
    expect(Object.keys(body.config.usuario.textos)).toHaveLength(77)
    expect(body.section).toBe('usuario')
  })
})
