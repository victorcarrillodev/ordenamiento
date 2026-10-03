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
