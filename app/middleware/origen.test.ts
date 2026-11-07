import { expect, it, vi } from 'vitest'
import { origenSeguro } from './origen.ts'

it('rechaza una baja enviada desde otro sitio antes de llamar al backend', async () => {
  const next = vi.fn(async () => new Response('ok'))
  const request = new Request('https://portal.test/ordena/admin/usuarios', {
    method: 'POST',
    headers: { origin: 'https://ajeno.test', cookie: 'ordenamiento_session=ejemplo' },
  })
  expect((await origenSeguro({ request }, next)).status).toBe(403)
  expect(next).not.toHaveBeenCalled()
})

it('admite el portal detrás del proxy y rechaza un origen nulo o metadatos externos', async () => {
  const next = async () => new Response('ok')
  for (const [headers, status] of [
    [{ origin: 'https://portal.test' }, 200],
    [{ origin: 'null' }, 403],
    [{ 'sec-fetch-site': 'cross-site' }, 403],
    [{ 'sec-fetch-site': 'same-site' }, 403],
  ] as const) {
    const request = new Request('http://portal.test/ordena/admin/usuarios', {
      method: 'POST',
      headers,
    })
    expect((await origenSeguro({ request }, next)).status).toBe(status)
  }
})
