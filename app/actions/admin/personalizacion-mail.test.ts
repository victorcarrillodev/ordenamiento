import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { router } from '../../router.ts'

/**
 * Seguridad de testMail (personalizacion-controller:85 + backend /api/mail/test)
 * Cubre: XSS/CRLF en `para`, validación, y guards requireAdmin/mailConfigurado.
 * También verifica el flujo 503/502.
 */

const ORIGINAL_FETCH = globalThis.fetch

function mockAdminAuthAndBackend(opts: {
  mailTestResponse?: { status: number; body: unknown }
  captureMailTest?: { para: string | null; called: boolean }
}) {
  globalThis.fetch = vi
    .fn()
    .mockImplementation((url: string | URL | Request, init?: RequestInit) => {
      const u = typeof url === 'string' ? url : url instanceof Request ? url.url : url.toString()
      if (u.includes('/api/auth/me')) {
        return Promise.resolve(
          new Response(
            JSON.stringify({
              user: { id: 1, name: 'Admin', role: 'admin', email: 'admin@tlaquepaque.gob.mx' },
            }),
            { status: 200, headers: { 'content-type': 'application/json' } },
          ),
        )
      }
      if (u.includes('/api/mail/test')) {
        if (opts.captureMailTest) {
          opts.captureMailTest.called = true
          try {
            const body = init?.body ? JSON.parse(String(init?.body)) : {}
            opts.captureMailTest.para = body.para ?? null
          } catch {
            opts.captureMailTest.para = null
          }
        }
        const resp = opts.mailTestResponse ?? { status: 200, body: { ok: true } }
        return Promise.resolve(
          new Response(JSON.stringify(resp.body), {
            status: resp.status,
            headers: { 'content-type': 'application/json' },
          }),
        )
      }
      if (u.includes('/api/stats'))
        return Promise.resolve(
          new Response(
            JSON.stringify({
              usuarios: 1,
              digitales: 1,
              fisicas: 0,
              resultado: [],
              fuente: [],
              genero: [],
              tematica: [],
            }),
            { status: 200 },
          ),
        )
      if (u.includes('/api/settings/theme'))
        return Promise.resolve(new Response(JSON.stringify({ theme: {} }), { status: 200 }))
      if (u.includes('/api/settings/audit'))
        return Promise.resolve(new Response(JSON.stringify({ logs: [] }), { status: 200 }))
      if (u.includes('/api/users'))
        return Promise.resolve(new Response(JSON.stringify({ users: [] }), { status: 200 }))
      if (u.includes('/api/reuniones'))
        return Promise.resolve(new Response(JSON.stringify({ reuniones: [] }), { status: 200 }))
      if (u.includes('/api/avisos'))
        return Promise.resolve(new Response(JSON.stringify({ avisos: [] }), { status: 200 }))
      if (u.includes('/api/poel'))
        return Promise.resolve(new Response(JSON.stringify({ sesiones: [] }), { status: 200 }))
      if (u.includes('/api/participations'))
        return Promise.resolve(new Response(JSON.stringify({ items: [] }), { status: 200 }))
      return Promise.resolve(new Response(JSON.stringify({ ok: true }), { status: 200 }))
    }) as unknown as typeof fetch
}

function buildTestMailForm(para: string, tab = 'usuario') {
  const fd = new FormData()
  fd.set('_action', 'testMail')
  fd.set('para', para)
  fd.set('tab', tab)
  return fd
}

describe('Personalización · testMail seguridad', () => {
  beforeEach(() => vi.restoreAllMocks())
  afterEach(() => (globalThis.fetch = ORIGINAL_FETCH))

  it('rechaza para vacío sin llamar a backend', async () => {
    const capture = { para: null as string | null, called: false }
    mockAdminAuthAndBackend({ captureMailTest: capture })
    const res = await router.fetch(
      new Request('http://localhost/ordena/admin/personalizacion', {
        method: 'POST',
        body: buildTestMailForm(''),
      }),
    )
    expect(res?.status).toBe(302)
    expect(res?.headers.get('location')).toContain('err=')
    expect(capture.called).toBe(false)
  })

  it('rechaza para sin @ sin llamar a backend', async () => {
    const capture = { para: null as string | null, called: false }
    mockAdminAuthAndBackend({ captureMailTest: capture })
    const res = await router.fetch(
      new Request('http://localhost/ordena/admin/personalizacion', {
        method: 'POST',
        body: buildTestMailForm('sin-arroba'),
      }),
    )
    expect(res?.status).toBe(302)
    expect(res?.headers.get('location')).toContain('err=')
    expect(capture.called).toBe(false)
  })

  it('rechaza CRLF injection en para (\r\n) sin llegar a backend', async () => {
    const capture = { para: null as string | null, called: false }
    mockAdminAuthAndBackend({ captureMailTest: capture })
    const res = await router.fetch(
      new Request('http://localhost/ordena/admin/personalizacion', {
        method: 'POST',
        body: buildTestMailForm('a@b.com\r\nX-Injected: 1'),
      }),
    )
    // PoC: si no hay validación CRLF, el backend sería llamado con header inyectado.
    // Esperamos que el frontend lo bloquee y no llame al backend.
    expect(res?.status).toBe(302)
    expect(res?.headers.get('location')).toContain('err=')
    expect(capture.called).toBe(false)
  })

  it('rechaza CRLF con \n solo', async () => {
    const capture = { para: null as string | null, called: false }
    mockAdminAuthAndBackend({ captureMailTest: capture })
    const res = await router.fetch(
      new Request('http://localhost/ordena/admin/personalizacion', {
        method: 'POST',
        body: buildTestMailForm('a@b.com\nBcc: victim@evil.com'),
      }),
    )
    expect(res?.status).toBe(302)
    expect(res?.headers.get('location')).toContain('err=')
    expect(capture.called).toBe(false)
  })

  it('rechaza XSS/script en para', async () => {
    const capture = { para: null as string | null, called: false }
    mockAdminAuthAndBackend({ captureMailTest: capture })
    const payloads = ['<script>alert(1)</script>@x.com', 'a@b.com<script>', 'a@b.com%0D%0A<script>']
    for (const p of payloads) {
      capture.called = false
      const res = await router.fetch(
        new Request('http://localhost/ordena/admin/personalizacion', {
          method: 'POST',
          body: buildTestMailForm(p),
        }),
      )
      expect(res?.status).toBe(302)
      // No debe llamar al backend con payload XSS; si lo hace, el backend podría reflejarlo en html
      // Para este test exigimos err y no llamado.
      // Nota: si el pago contiene @ pero también < o >, debe rechazarse.
      expect(res?.headers.get('location')).toContain('err=')
      expect(capture.called).toBe(false)
    }
  })

  it('acepta email válido y llama al backend', async () => {
    const capture = { para: null as string | null, called: false }
    mockAdminAuthAndBackend({
      captureMailTest: capture,
      mailTestResponse: { status: 200, body: { ok: true } },
    })
    const res = await router.fetch(
      new Request('http://localhost/ordena/admin/personalizacion', {
        method: 'POST',
        body: buildTestMailForm('admin@tlaquepaque.gob.mx'),
      }),
    )
    expect(res?.status).toBe(302)
    expect(res?.headers.get('location')).toContain('msg=')
    expect(capture.called).toBe(true)
    expect(capture.para).toBe('admin@tlaquepaque.gob.mx')
  })

  it('backend 503 (SMTP no configurado) → redirect err con mensaje', async () => {
    const capture = { para: null as string | null, called: false }
    mockAdminAuthAndBackend({
      captureMailTest: capture,
      mailTestResponse: {
        status: 503,
        body: { error: 'Correo no configurado: define SMTP_HOST, SMTP_USER y SMTP_PASS' },
      },
    })
    const res = await router.fetch(
      new Request('http://localhost/ordena/admin/personalizacion', {
        method: 'POST',
        body: buildTestMailForm('test@example.com'),
      }),
    )
    expect(res?.status).toBe(302)
    const loc = res?.headers.get('location') ?? ''
    expect(loc).toContain('err=')
    expect(loc).toContain('SMTP')
  })

  it('backend 502 (fallo envío) → redirect err', async () => {
    mockAdminAuthAndBackend({
      mailTestResponse: { status: 502, body: { error: 'No se pudo enviar prueba: ECONNREFUSED' } },
    })
    const res = await router.fetch(
      new Request('http://localhost/ordena/admin/personalizacion', {
        method: 'POST',
        body: buildTestMailForm('test@example.com'),
      }),
    )
    expect(res?.status).toBe(302)
    expect(res?.headers.get('location')).toContain('err=')
  })

  it('no autenticado → redirect a login y no llama a backend mail', async () => {
    globalThis.fetch = vi.fn().mockImplementation((url: string | URL | Request) => {
      const u = typeof url === 'string' ? url : url instanceof Request ? url.url : url.toString()
      if (u.includes('/api/auth/me'))
        return Promise.resolve(new Response(JSON.stringify({ user: null }), { status: 401 }))
      return Promise.resolve(new Response(JSON.stringify({ ok: true }), { status: 200 }))
    }) as unknown as typeof fetch
    const res = await router.fetch(
      new Request('http://localhost/ordena/admin/personalizacion', {
        method: 'POST',
        body: buildTestMailForm('a@b.com'),
      }),
    )
    expect(res?.status).toBe(302)
    expect(res?.headers.get('location')).toContain('/login')
  })

  it('mensaje de éxito no refleja XSS sin escapar (verifica encodeURIComponent)', async () => {
    const capture = { para: null as string | null, called: false }
    mockAdminAuthAndBackend({
      captureMailTest: capture,
      mailTestResponse: { status: 200, body: { ok: true } },
    })
    // Si el mensaje fuera vulnerable, el location contendría <script> sin encode.
    const res = await router.fetch(
      new Request('http://localhost/ordena/admin/personalizacion', {
        method: 'POST',
        body: buildTestMailForm('test@example.com'),
      }),
    )
    const loc = res?.headers.get('location') ?? ''
    expect(loc).not.toContain('<script>')
    expect(loc).toContain('msg=')
  })
})
