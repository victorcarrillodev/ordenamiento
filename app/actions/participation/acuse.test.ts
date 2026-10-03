import { afterEach, describe, expect, it, vi } from 'vitest'

import { router } from '../../router.ts'
import { routes } from '../../routes.ts'

const ORIGINAL_FETCH = globalThis.fetch
afterEach(() => (globalThis.fetch = ORIGINAL_FETCH))

const PDF = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31]) // %PDF-1

function formularioValido() {
  const fd = new FormData()
  fd.set('nombre', 'Ciudadana Ejemplo')
  fd.set('email', 'ejemplo@example.com')
  fd.set('alcance_ubicacion', 'municipio')
  fd.set('observacion', 'Una propuesta ciudadana con detalle suficiente')
  fd.set('consentimiento', '1')
  return fd
}

describe('confirmación: folio, mensaje y descarga del acuse', () => {
  it('al registrar, redirige a la confirmación con el folio y el enlace firmado del acuse', async () => {
    globalThis.fetch = vi.fn(
      async () =>
        new Response(JSON.stringify({ folio: 'SPAGU-DGTPU-E-0018', acuse_token: '123.firma' }), {
          status: 201,
        }),
    )
    const res = await router.fetch(
      new Request(`http://localhost${routes.participation.action.href()}`, {
        method: 'POST',
        body: formularioValido(),
      }),
    )
    expect(res?.status).toBe(302)
    const destino = new URL(res!.headers.get('location')!, 'http://localhost')
    expect(destino.searchParams.get('success')).toBe('1')
    expect(destino.searchParams.get('folio')).toBe('SPAGU-DGTPU-E-0018')
    expect(destino.searchParams.get('acuse')).toBe('123.firma')
  })

  it('la confirmación muestra el folio, el mensaje acordado y el botón de descarga', async () => {
    globalThis.fetch = vi.fn(async () => Response.json({}))
    const res = await router.fetch(
      new Request(
        `http://localhost${routes.participation.index.href()}?success=1&folio=SPAGU-DGTPU-E-0018&acuse=123.firma`,
      ),
    )
    const html = (await res?.text()) ?? ''
    const texto = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ')
    expect(texto).toContain('SPAGU-DGTPU-E-0018')
    expect(texto).toContain(
      'Tu participación quedó registrada. Puedes descargar tu acuse en PDF; también lo recibirás en el correo electrónico que registraste.',
    )
    expect(html).toMatch(
      /<a[^>]*href="\/ordena\/participation\/acuse\/SPAGU-DGTPU-E-0018\?t=123\.firma"[^>]*download="Acuse SPAGU-DGTPU-E-0018\.pdf"/,
    )
    expect(texto).toContain('Descargar acuse PDF')
  })

  it('sin enlace firmado no se ofrece una descarga que fallaría', async () => {
    globalThis.fetch = vi.fn(async () => Response.json({}))
    const res = await router.fetch(
      new Request(`http://localhost${routes.participation.index.href()}?success=1&folio=X-1`),
    )
    expect(await res?.text()).not.toContain('Descargar acuse PDF')
  })
})

describe('GET /participation/acuse/:folio', () => {
  it('reenvía el PDF con la firma y lo entrega como descarga', async () => {
    let pedido = ''
    globalThis.fetch = vi.fn(async (url: string | URL | Request) => {
      pedido = String(url)
      return new Response(PDF, {
        headers: {
          'content-type': 'application/pdf',
          'content-disposition': 'attachment; filename="Acuse X-1.pdf"',
        },
      })
    })
    const res = await router.fetch(
      new Request('http://localhost/ordena/participation/acuse/X-1?t=999.firma'),
    )
    expect(res?.status).toBe(200)
    expect(pedido).toContain('/api/acuse/X-1?t=999.firma')
    expect(res?.headers.get('content-type')).toBe('application/pdf')
    expect(res?.headers.get('content-disposition')).toMatch(/^attachment/)
    expect(new Uint8Array(await res!.arrayBuffer())).toEqual(PDF)
  })

  it('no manda cookies del navegador al backend: el acuse se pide con la firma', async () => {
    let init: RequestInit | undefined
    globalThis.fetch = vi.fn(async (_url: unknown, opciones?: RequestInit) => {
      init = opciones
      return new Response(PDF, { headers: { 'content-type': 'application/pdf' } })
    })
    await router.fetch(
      new Request('http://localhost/ordena/participation/acuse/X-1?t=1.f', {
        headers: { cookie: 'ordenamiento_session=secreta' },
      }),
    )
    expect(JSON.stringify(init ?? {})).not.toContain('secreta')
  })

  it('un enlace inválido o vencido explica qué hacer, sin filtrar el motivo', async () => {
    globalThis.fetch = vi.fn(async () => Response.json({ error: 'firma mala' }, { status: 404 }))
    const res = await router.fetch(
      new Request('http://localhost/ordena/participation/acuse/X-1?t=mala'),
    )
    expect(res?.status).toBe(404)
    const texto = (await res?.text()) ?? ''
    expect(texto).toContain('no es válido o ya venció')
    expect(texto).toContain('correo electrónico que registraste')
    expect(texto).not.toContain('firma mala')
  })

  it('si el backend no responde, un 503 claro', async () => {
    globalThis.fetch = vi.fn(async () => {
      throw new Error('ECONNREFUSED')
    })
    const res = await router.fetch(
      new Request('http://localhost/ordena/participation/acuse/X-1?t=1.f'),
    )
    expect(res?.status).toBe(503)
  })

  it('la página 404 institucional no tapa el mensaje del enlace: es texto plano con su estado', async () => {
    globalThis.fetch = vi.fn(async () => Response.json({}, { status: 404 }))
    const res = await router.fetch(new Request('http://localhost/ordena/participation/acuse/X-1'))
    expect(res?.headers.get('cache-control')).toBe('no-store')
  })
})
