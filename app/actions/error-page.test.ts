import { describe, expect, it } from 'vitest'
import { router } from '../router.ts'

describe('Error Views (400, 401, 403, 404, 429, 500, 502, 503, 504)', () => {
  const errorCodes = [400, 401, 403, 404, 429, 500, 502, 503, 504]

  for (const code of errorCodes) {
    it(`renders error view for HTTP ${code} with status ${code}`, async () => {
      const response = await router.fetch(
        new Request(`http://localhost:44100/ordena/error/${code}`),
      )
      expect(response?.status).toBe(code)
      expect(response?.headers.get('content-type')).toContain('text/html')
      const html = await response?.text()
      expect(html).toContain(String(code))
      expect(html).toContain('Portal de Ordenamiento Territorial')
    })
  }

  it('renders 404 view for default /ordena/error', async () => {
    const response = await router.fetch(new Request('http://localhost:44100/ordena/error'))
    expect(response?.status).toBe(404)
    const html = await response?.text()
    expect(html).toContain('404')
  })
})
