import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { router } from '../../router.ts'

const ORIGINAL_FETCH = globalThis.fetch
const ID = '550e8400-e29b-41d4-a716-446655440001'
const PDF = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31])

function backend(rol: string | null, pdf: Response | null = null) {
  const pedidos: string[] = []
  globalThis.fetch = vi.fn(async (url: string | URL | Request) => {
    const u = String(url)
    pedidos.push(u)
    if (u.includes('/api/auth/me')) {
      return Response.json({ user: rol ? { id: '1', name: 'Admin', role: rol } : null })
    }
    if (u.includes('/acuse')) return pdf ?? new Response('x', { status: 404 })
    return Response.json({ items: [], total: 0, page: 1, limit: 10 })
  }) as unknown as typeof fetch
  return pedidos
}

describe('Admin · acuse de una participación', () => {
  beforeEach(() => vi.restoreAllMocks())
  afterEach(() => (globalThis.fetch = ORIGINAL_FETCH))

  it('un admin lo descarga como PDF, identificado por su folio', async () => {
    const pedidos = backend(
      'admin',
      new Response(PDF, {
        headers: {
          'content-type': 'application/pdf',
          'content-disposition': 'attachment; filename="Acuse SPAGU-DGTPU-E-0018.pdf"',
        },
      }),
    )
    const res = await router.fetch(
      new Request(`http://localhost/ordena/admin/participaciones/${ID}/acuse`),
    )
    expect(res?.status).toBe(200)
    expect(pedidos.some((u) => u.endsWith(`/api/participations/${ID}/acuse`))).toBe(true)
    expect(res?.headers.get('content-type')).toBe('application/pdf')
    expect(res?.headers.get('content-disposition')).toContain('Acuse SPAGU-DGTPU-E-0018.pdf')
    expect(new Uint8Array(await res!.arrayBuffer())).toEqual(PDF)
  })

  it('sin sesión de panel redirige al login y no llama al backend por el PDF', async () => {
    const pedidos = backend(null)
    const res = await router.fetch(
      new Request(`http://localhost/ordena/admin/participaciones/${ID}/acuse`),
    )
    expect(res?.status).toBe(302)
    expect(res?.headers.get('location')).toBe('/ordena/login')
    expect(pedidos.some((u) => u.includes('/acuse'))).toBe(false)
  })

  it('una participación sin acuse es 404', async () => {
    backend('admin')
    const res = await router.fetch(
      new Request(`http://localhost/ordena/admin/participaciones/${ID}/acuse`),
    )
    expect(res?.status).toBe(404)
  })

  it('cada fila del listado tiene su botón de acuse, con el folio', async () => {
    globalThis.fetch = vi.fn(async (url: string | URL | Request) => {
      const u = String(url)
      if (u.includes('/api/auth/me')) {
        return Response.json({ user: { id: '1', name: 'Admin', role: 'admin' } })
      }
      return Response.json({
        items: [
          {
            id: ID,
            folio: 'SPAGU-DGTPU-E-0018',
            origen: 'digital',
            nombre: 'María',
            estado: 'En proceso',
            fecha: '2026-09-24T22:25:05Z',
            notificado_en: null,
            adjuntos: [],
          },
        ],
        total: 1,
        page: 1,
        limit: 10,
      })
    }) as unknown as typeof fetch
    const res = await router.fetch(
      new Request('http://localhost/ordena/admin/participaciones?origen=digital'),
    )
    const html = (await res?.text()) ?? ''
    expect(html).toContain(`/ordena/admin/participaciones/${ID}/acuse`)
    expect(html).toContain('download="Acuse SPAGU-DGTPU-E-0018.pdf"')
    expect(html).toContain('Descargar el acuse PDF del folio SPAGU-DGTPU-E-0018')
  })
})
