import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { router } from '../../router.ts'

const ORIGINAL_FETCH = globalThis.fetch
const URL_CONSULTA = 'http://localhost/ordena/admin/consulta'

function backend(rol: string | null, etapa = 'pendiente') {
  const pedidos: Array<{ url: string; method: string; body?: string }> = []
  globalThis.fetch = vi.fn(async (url: string | URL | Request, init?: RequestInit) => {
    const u = String(url)
    pedidos.push({ url: u, method: init?.method ?? 'GET', body: init?.body as string | undefined })
    if (u.includes('/api/auth/me')) {
      return Response.json({ user: rol ? { id: '1', name: 'Admin', role: rol } : null })
    }
    if (u.endsWith('/api/consulta') && init?.method === 'PUT') {
      const { etapa: nueva } = JSON.parse(String(init.body)) as { etapa: string }
      return nueva === 'concluida' && etapa === 'pendiente'
        ? Response.json(
            { error: 'No se puede pasar de «pendiente» a «concluida»' },
            { status: 409 },
          )
        : Response.json({ etapa: nueva, inicio: null, cierre: null })
    }
    if (u.endsWith('/api/consulta')) return Response.json({ etapa, inicio: null, cierre: null })
    return Response.json({})
  }) as unknown as typeof fetch
  return pedidos
}

const textoDe = (html: string) => html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ')

describe('Admin · consulta pública', () => {
  it('revisa fechas y duración antes de guardar y muestra la confirmación', async () => {
    const pedidos = backend('admin')
    const fd = new FormData()
    fd.set('accion', 'revisar')
    fd.set('inicio', '2026-11-01T09:00')
    fd.set('cierre', '2026-11-03T10:30')
    const res = await router.fetch(new Request(URL_CONSULTA, { method: 'POST', body: fd }))
    const html = await res!.text()
    expect(html).toContain('2 días, 1 hora y 30 minutos')
    expect(html).toContain('Confirmar programación')
    expect(pedidos.some((p) => p.method === 'PUT')).toBe(false)
    fd.set('accion', 'programar')
    const confirmacion = await router.fetch(new Request(URL_CONSULTA, { method: 'POST', body: fd }))
    expect(confirmacion!.headers.get('location')).toContain('programada=1')
    expect(JSON.parse(pedidos.find((p) => p.method === 'PUT')!.body!)).toEqual({
      accion: 'programar',
      inicio: '2026-11-01T15:00:00.000Z',
      cierre: '2026-11-03T16:30:00.000Z',
    })
  })

  it('un periodo invertido no se envía al backend', async () => {
    const pedidos = backend('admin')
    const fd = new FormData()
    fd.set('accion', 'programar')
    fd.set('inicio', '2026-11-03T09:00')
    fd.set('cierre', '2026-11-01T09:00')
    expect(
      (await router.fetch(new Request(URL_CONSULTA, { method: 'POST', body: fd })))!.status,
    ).toBe(400)
    expect(pedidos.some((p) => p.method === 'PUT')).toBe(false)
  })
  beforeEach(() => vi.restoreAllMocks())
  afterEach(() => (globalThis.fetch = ORIGINAL_FETCH))

  it('sin sesión de panel redirige al login', async () => {
    backend(null)
    const res = await router.fetch(new Request(URL_CONSULTA))
    expect(res?.status).toBe(302)
    expect(res?.headers.get('location')).toBe('/ordena/login')
  })

  it('pendiente: ofrece iniciar la consulta, con confirmación', async () => {
    backend('admin', 'pendiente')
    const html = (await (await router.fetch(new Request(URL_CONSULTA)))?.text()) ?? ''
    expect(textoDe(html)).toContain('Etapa actual: Pendiente de iniciar')
    expect(html).toContain('name="etapa" value="abierta"')
    expect(html).toContain('Iniciar consulta pública')
    expect(html).toMatch(/data-confirmar="¿Iniciar la consulta pública\?/)
    expect(html).not.toContain('Concluir consulta pública')
  })

  it('abierta: ofrece concluir y deshacer el inicio', async () => {
    backend('admin', 'abierta')
    const html = (await (await router.fetch(new Request(URL_CONSULTA)))?.text()) ?? ''
    expect(textoDe(html)).toContain('Etapa actual: Abierta')
    expect(html).toContain('name="etapa" value="concluida"')
    expect(html).toContain('name="etapa" value="pendiente"')
  })

  it('concluida: ofrece reabrir', async () => {
    backend('admin', 'concluida')
    const html = (await (await router.fetch(new Request(URL_CONSULTA)))?.text()) ?? ''
    expect(html).toContain('Reabrir la consulta')
  })

  it('explica qué cambia en cada etapa', async () => {
    backend('admin', 'pendiente')
    const texto = textoDe((await (await router.fetch(new Request(URL_CONSULTA)))?.text()) ?? '')
    expect(texto).toContain('Antes de iniciar')
    expect(texto).toContain('Con la consulta abierta')
    expect(texto).toContain('Al concluir el periodo')
  })

  it('iniciar pide el cambio al backend y vuelve confirmando', async () => {
    const pedidos = backend('admin', 'pendiente')
    const fd = new FormData()
    fd.set('etapa', 'abierta')
    const res = await router.fetch(new Request(URL_CONSULTA, { method: 'POST', body: fd }))
    expect(res?.status).toBe(302)
    expect(res?.headers.get('location')).toBe('/ordena/admin/consulta?cambio=abierta')
    const put = pedidos.find((p) => p.method === 'PUT')
    expect(put?.url).toContain('/api/consulta')
    expect(JSON.parse(put!.body!)).toEqual({ etapa: 'abierta' })
  })

  it('un cambio que el backend rechaza se muestra como error y no se confirma', async () => {
    backend('admin', 'pendiente')
    const fd = new FormData()
    fd.set('etapa', 'concluida')
    const res = await router.fetch(new Request(URL_CONSULTA, { method: 'POST', body: fd }))
    expect(res?.status).toBe(409)
    expect(textoDe((await res?.text()) ?? '')).toContain('No se puede pasar de')
  })

  it('una etapa inventada ni siquiera llega al backend', async () => {
    const pedidos = backend('admin', 'pendiente')
    const fd = new FormData()
    fd.set('etapa', 'cerrada')
    const res = await router.fetch(new Request(URL_CONSULTA, { method: 'POST', body: fd }))
    expect(res?.status).toBe(400)
    expect(pedidos.some((p) => p.method === 'PUT')).toBe(false)
  })
})
