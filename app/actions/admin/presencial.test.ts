import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { router } from '../../router.ts'
import { formularioBase } from './nueva-fixtures.ts'

const ORIGINAL_FETCH = globalThis.fetch
const BASE = 'http://localhost/ordena/admin/participaciones'
const FORMATO = {
  id: '11111111-2222-4333-8444-555555555555',
  folio: 'SPAGU-DGTPU-E-0021',
  created_at: '2026-10-02T18:00:00.000Z',
  generado_por: 'Admin Root',
  participation_id: null,
  recibido_en: null,
  pendiente: true,
}
const PDF = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31])

interface Pedido {
  url: string
  method: string
  body?: unknown
}

function backend(opciones: { rol?: string | null; etapa?: string; formatos?: unknown[] } = {}) {
  const { rol = 'admin', etapa = 'abierta', formatos = [FORMATO] } = opciones
  const pedidos: Pedido[] = []
  globalThis.fetch = vi.fn(async (url: string | URL | Request, init?: RequestInit) => {
    const u = String(url)
    const method = init?.method ?? 'GET'
    pedidos.push({ url: u, method, body: init?.body })
    if (u.includes('/api/auth/me')) {
      return Response.json({ user: rol ? { id: '1', name: 'Admin', role: rol } : null })
    }
    if (u.endsWith('/api/consulta')) return Response.json({ etapa, inicio: null, cierre: null })
    if (u.includes('/api/formatos') && u.includes('/pdf')) {
      return new Response(PDF, {
        headers: {
          'content-type': 'application/pdf',
          'content-disposition': 'attachment; filename="Formato.pdf"',
        },
      })
    }
    if (u.includes('/api/formatos') && method === 'POST') {
      return etapa === 'abierta'
        ? Response.json(FORMATO, { status: 201 })
        : Response.json({ error: 'La consulta pública concluyó' }, { status: 403 })
    }
    if (u.includes('/api/formatos')) return Response.json({ formatos })
    if (u.includes('/api/participations') && method === 'POST') {
      return Response.json({ id: 'p-1', folio: FORMATO.folio }, { status: 201 })
    }
    return Response.json({})
  }) as unknown as typeof fetch
  return pedidos
}

const textoDe = (html: string) => html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ')
const get = (ruta: string) => router.fetch(new Request(`${BASE}${ruta}`))

describe('Admin · registrar participación presencial', () => {
  beforeEach(() => vi.restoreAllMocks())
  afterEach(() => (globalThis.fetch = ORIGINAL_FETCH))

  describe('el selector', () => {
    it('ofrece las dos opciones: captura asistida y llenado a mano', async () => {
      backend()
      const texto = textoDe((await (await get('/presencial'))?.text()) ?? '')
      expect(texto).toContain('Captura asistida')
      expect(texto).toContain('Llenado a mano')
      expect(texto).toContain('Generar formato con folio')
      expect(texto).toContain('Capturar participación')
    })

    it('sin sesión de panel redirige al login', async () => {
      backend({ rol: null })
      const res = await get('/presencial')
      expect(res?.status).toBe(302)
      expect(res?.headers.get('location')).toBe('/ordena/login')
    })

    it('los formatos pendientes se muestran «Pendiente de recepción», con su folio y sus acciones', async () => {
      backend()
      const html = (await (await get('/presencial'))?.text()) ?? ''
      const texto = textoDe(html)
      expect(texto).toContain('Formatos pendientes de recepción')
      expect(texto).toContain(FORMATO.folio)
      expect(texto).toContain('Pendiente de recepción')
      expect(html).toContain(`/admin/participaciones/formatos/${FORMATO.id}/pdf`)
      expect(html).toContain(`/admin/participaciones/nueva?formato=${FORMATO.id}`)
    })

    it('sin pendientes lo dice', async () => {
      backend({ formatos: [] })
      expect(textoDe((await (await get('/presencial'))?.text()) ?? '')).toContain(
        'No hay formatos pendientes',
      )
    })

    it('con la consulta concluida no se captura ni se generan formatos, pero los pendientes se registran', async () => {
      backend({ etapa: 'concluida' })
      const html = (await (await get('/presencial'))?.text()) ?? ''
      expect(textoDe(html)).toContain('ya no se reciben participaciones nuevas')
      expect(html).toMatch(
        /<button[^>]*disabled[^>]*>\s*(<span[^>]*>)?\s*Generar formato con folio/,
      )
      // El registro de un formato que ya se entregó sigue disponible.
      expect(html).toContain(`nueva?formato=${FORMATO.id}`)
    })
  })

  describe('generar un formato', () => {
    it('reserva el folio en el backend y vuelve ofreciendo la descarga', async () => {
      const pedidos = backend()
      const res = await router.fetch(new Request(`${BASE}/formatos`, { method: 'POST' }))
      expect(res?.status).toBe(302)
      expect(res?.headers.get('location')).toBe(
        `/ordena/admin/participaciones/presencial?generado=${FORMATO.id}`,
      )
      expect(pedidos.some((p) => p.method === 'POST' && p.url.endsWith('/api/formatos'))).toBe(true)
    })

    it('tras generarlo, ofrece descargar el formato con su folio', async () => {
      backend()
      const html = (await (await get(`/presencial?generado=${FORMATO.id}`))?.text()) ?? ''
      expect(textoDe(html)).toContain(`Se generó el formato con el folio ${FORMATO.folio}`)
      expect(html).toContain(`download="Formato de participación ${FORMATO.folio}.pdf"`)
    })

    it('recargar tras generarlo (GET a la misma dirección) regresa al selector, no da 404', async () => {
      backend()
      const res = await get('/formatos')
      expect(res?.status).toBe(302)
      expect(res?.headers.get('location')).toBe('/ordena/admin/participaciones/presencial')
    })

    it('si el backend lo rechaza (consulta concluida) lo explica', async () => {
      backend({ etapa: 'concluida' })
      const res = await router.fetch(new Request(`${BASE}/formatos`, { method: 'POST' }))
      expect(res?.status).toBe(403)
      expect(textoDe((await res?.text()) ?? '')).toContain('La consulta pública concluyó')
    })

    it('sin sesión de panel no genera nada', async () => {
      const pedidos = backend({ rol: null })
      const res = await router.fetch(new Request(`${BASE}/formatos`, { method: 'POST' }))
      expect(res?.status).toBe(302)
      expect(pedidos.some((p) => p.url.endsWith('/api/formatos') && p.method === 'POST')).toBe(
        false,
      )
    })
  })

  describe('descargar el formato en blanco', () => {
    it('siempre como descarga', async () => {
      backend()
      const res = await get(`/formatos/${FORMATO.id}/pdf`)
      expect(res?.status).toBe(200)
      expect(res?.headers.get('content-type')).toBe('application/pdf')
      expect(res?.headers.get('content-disposition')).toMatch(/^attachment/)
      expect(new Uint8Array(await res!.arrayBuffer())).toEqual(PDF)
    })

    it('sin sesión de panel redirige al login', async () => {
      backend({ rol: null })
      expect((await get(`/formatos/${FORMATO.id}/pdf`))?.status).toBe(302)
    })
  })

  describe('registrar lo que regresó llenado a mano', () => {
    it('el formulario conserva el folio del formato y pide el escaneado en PDF', async () => {
      backend()
      const html = (await (await get(`/nueva?formato=${FORMATO.id}`))?.text()) ?? ''
      const texto = textoDe(html)
      expect(texto).toContain(`Registrar el formato ${FORMATO.folio}`)
      expect(html).toContain(`name="formato_id" value="${FORMATO.id}"`)
      expect(html).toMatch(
        /<input[^>]*id="escaneado"[^>]*type="file"[^>]*required|<input[^>]*type="file"[^>]*id="escaneado"[^>]*required/,
      )
      expect(html).toContain(`value="${FORMATO.folio}"`)
    })

    it('la captura asistida no pide escaneado ni muestra un formato', async () => {
      backend()
      const html = (await (await get('/nueva'))?.text()) ?? ''
      expect(html).not.toContain('name="formato_id"')
      expect(html).not.toContain('id="escaneado"')
      expect(html).toContain('value="Se genera automáticamente"')
    })

    it('un formato que no existe o ya se registró da 404', async () => {
      backend({ formatos: [] })
      const res = await get(`/nueva?formato=${FORMATO.id}`)
      expect(res?.status).toBe(404)
      expect(textoDe((await res?.text()) ?? '')).toContain('no existe o ya se registró')
    })

    it('reenvía el formato y el escaneado al backend, con los mismos campos que la captura asistida', async () => {
      const pedidos = backend()
      const fd = formularioBase()
      fd.set('formato_id', FORMATO.id)
      fd.set('escaneado', new File([PDF], 'formato escaneado.pdf', { type: 'application/pdf' }))
      const res = await router.fetch(new Request(`${BASE}/nueva`, { method: 'POST', body: fd }))
      expect(res?.status).toBe(302)
      const envio = pedidos.find(
        (p) => p.method === 'POST' && p.url.endsWith('/api/participations'),
      )
      const cuerpo = envio?.body as FormData
      expect(cuerpo.get('formato_id')).toBe(FORMATO.id)
      expect(cuerpo.get('escaneado')).toBeInstanceOf(File)
      expect(cuerpo.get('origen')).toBe('fisica')
      expect(cuerpo.get('nombre')).toBe('Ciudadano Físico')
    })

    it('al terminar, lleva el folio y el id para descargar el acuse', async () => {
      backend()
      const fd = formularioBase()
      const res = await router.fetch(new Request(`${BASE}/nueva`, { method: 'POST', body: fd }))
      expect(res?.headers.get('location')).toBe(
        `/ordena/admin/participaciones/nueva?registrado=${FORMATO.folio}&id=p-1`,
      )
    })

    it('la confirmación ofrece el acuse para imprimirlo y entregarlo', async () => {
      backend()
      const html = (await (await get(`/nueva?registrado=${FORMATO.folio}&id=p-1`))?.text()) ?? ''
      expect(html).toContain('/admin/participaciones/p-1/acuse')
      expect(html).toContain(`download="Acuse ${FORMATO.folio}.pdf"`)
      expect(textoDe(html)).toContain('Descargar acuse PDF para imprimir')
    })

    it('un error del backend repinta lo capturado y conserva el formato', async () => {
      backend()
      const original = globalThis.fetch
      globalThis.fetch = vi.fn(async (url: string | URL | Request, init?: RequestInit) => {
        if (String(url).includes('/api/participations') && init?.method === 'POST') {
          return Response.json({ error: 'Carga el formato escaneado en PDF' }, { status: 422 })
        }
        return original(url, init)
      }) as unknown as typeof fetch
      const fd = formularioBase()
      fd.set('formato_id', FORMATO.id)
      const res = await router.fetch(new Request(`${BASE}/nueva`, { method: 'POST', body: fd }))
      expect(res?.status).toBe(422)
      const html = (await res?.text()) ?? ''
      expect(textoDe(html)).toContain('Carga el formato escaneado en PDF')
      expect(html).toContain('Ciudadano Físico')
      expect(html).toContain(`name="formato_id" value="${FORMATO.id}"`)
    })
  })

  describe('con la consulta fuera de periodo', () => {
    it('la captura asistida muestra el aviso en lugar del formulario', async () => {
      backend({ etapa: 'pendiente' })
      const html = (await (await get('/nueva'))?.text()) ?? ''
      expect(textoDe(html)).toContain('La consulta pública aún no inicia')
      expect(html).not.toContain('name="nombre"')
    })
  })
})
