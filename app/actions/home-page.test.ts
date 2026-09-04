import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { router } from '../router.ts'

/**
 * La portada pública refleja los textos configurados en theme.usuario.textos.
 * La caché TTL 30s del theme es global entre tests: todos los `it` comparten
 * el tema del primero; los casos de reuniones solo varían el mock de
 * `/api/reuniones/activas` (fetchJsonOr no cachea).
 */

const ORIGINAL_FETCH = globalThis.fetch

function mockHomeFetch(reunionesRespuesta: { status: number; body: unknown }) {
  globalThis.fetch = vi
    .fn()
    .mockImplementation((url: string | URL | Request) => {
      const u =
        typeof url === 'string' ? url : url instanceof Request ? url.url : url.toString()
      if (u.includes('/api/settings/theme')) {
        return Promise.resolve(
          new Response(
            JSON.stringify({
              theme: { usuario: { textos: { heroTitulo: 'TÍTULO PERSONALIZADO' } } },
            }),
            { status: 200, headers: { 'content-type': 'application/json' } },
          ),
        )
      }
      if (u.includes('/api/reuniones/activas')) {
        return Promise.resolve(
          new Response(JSON.stringify(reunionesRespuesta.body), {
            status: reunionesRespuesta.status,
            headers: { 'content-type': 'application/json' },
          }),
        )
      }
      return Promise.resolve(
        new Response(JSON.stringify({}), { status: 200, headers: { 'content-type': 'application/json' } }),
      )
    }) as unknown as typeof fetch
}

describe('Home pública · textos configurables', () => {
  beforeEach(() => vi.restoreAllMocks())
  afterEach(() => (globalThis.fetch = ORIGINAL_FETCH))

  it('muestra el heroTitulo configurado en el tema', async () => {
    mockHomeFetch({ status: 200, body: { reuniones: [] } })

    const res = await router.fetch(new Request('http://localhost/ordena/'))
    expect(res?.status).toBe(200)
    expect(await res?.text()).toContain('TÍTULO PERSONALIZADO')
  })

  it('con reuniones activas muestra el calendario con el detalle', async () => {
    mockHomeFetch({
      status: 200,
      body: {
        reuniones: [
          {
            id: '1',
            titulo: 'REUNIÓN DE PRUEBA',
            fecha: '2026-09-20',
            hora_inicio: '10:00',
            hora_fin: '',
          },
        ],
      },
    })

    const res = await router.fetch(new Request('http://localhost/ordena/'))
    expect(res?.status).toBe(200)
    const html = await res?.text()
    expect(html).toContain('Reuniones del Comité Técnico')
    expect(html).toContain('REUNIÓN DE PRUEBA')
  })

  it('sin reuniones activas no renderiza el calendario', async () => {
    mockHomeFetch({ status: 200, body: { reuniones: [] } })

    const res = await router.fetch(new Request('http://localhost/ordena/'))
    expect(res?.status).toBe(200)
    const html = await res?.text()
    expect(html).not.toContain('Reuniones del Comité Técnico')
    expect(html).not.toContain('REUNIÓN')
  })

  it('si el endpoint de reuniones falla, el resto del home sigue intacto', async () => {
    mockHomeFetch({ status: 500, body: { error: 'caído' } })

    const res = await router.fetch(new Request('http://localhost/ordena/'))
    expect(res?.status).toBe(200)
    const html = await res?.text()
    expect(html).not.toContain('Reuniones del Comité Técnico')
    expect(html).toContain('TÍTULO PERSONALIZADO')
  })
})
