import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { router } from '../router.ts'

/**
 * La portada pública refleja los textos configurados en theme.usuario.textos.
 * Un solo `it`: la caché TTL 30s del theme es global entre tests.
 */

const ORIGINAL_FETCH = globalThis.fetch

describe('Home pública · textos configurables', () => {
  beforeEach(() => vi.restoreAllMocks())
  afterEach(() => (globalThis.fetch = ORIGINAL_FETCH))

  it('muestra el heroTitulo configurado en el tema', async () => {
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
        return Promise.resolve(
          new Response(JSON.stringify({}), { status: 200, headers: { 'content-type': 'application/json' } }),
        )
      }) as unknown as typeof fetch

    const res = await router.fetch(new Request('http://localhost/ordena/'))
    expect(res?.status).toBe(200)
    expect(await res?.text()).toContain('TÍTULO PERSONALIZADO')
  })
})
