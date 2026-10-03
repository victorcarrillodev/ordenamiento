import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { router } from '../../router.ts'

const ORIGINAL_FETCH = globalThis.fetch
const PDF = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31])
const DOC_ID = '11111111-2222-4333-8444-555555555555'

const documento = (id: string, seccion: string, titulo: string, orden: number) => ({
  id,
  seccion,
  titulo,
  nombre_original: `${titulo}.pdf`,
  size: 2048,
  orden,
  created_at: '2026-10-01T00:00:00.000Z',
})

interface Pedido {
  url: string
  method: string
  body?: unknown
}

function backend(
  opciones: {
    rol?: string | null
    visible?: boolean
    tecnico?: unknown[]
    grafico?: unknown[]
    respuesta?: { status: number; cuerpo: unknown }
  } = {},
) {
  const { rol = 'admin', visible = false, tecnico = [], grafico = [], respuesta } = opciones
  const pedidos: Pedido[] = []
  globalThis.fetch = vi.fn(async (url: string | URL | Request, init?: RequestInit) => {
    const u = String(url)
    const method = init?.method ?? 'GET'
    pedidos.push({ url: u, method, body: init?.body })
    if (u.includes('/api/auth/me')) {
      return Response.json({ user: rol ? { id: '1', name: 'Admin', role: rol } : null })
    }
    if (u.endsWith('/api/consulta')) {
      return Response.json({ etapa: visible ? 'abierta' : 'pendiente', inicio: null, cierre: null })
    }
    if (u.endsWith('/api/proyecto/gestion')) return Response.json({ visible, tecnico, grafico })
    if (u.includes('/api/proyecto/documentos') && method === 'GET') {
      return new Response(PDF, {
        headers: {
          'content-type': 'application/pdf',
          'content-disposition': 'inline; filename="x.pdf"',
        },
      })
    }
    if (u.includes('/api/proyecto/documentos')) {
      return Response.json(respuesta?.cuerpo ?? { ok: true }, { status: respuesta?.status ?? 200 })
    }
    return Response.json({})
  }) as unknown as typeof fetch
  return pedidos
}

const textoDe = (html: string) => html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ')
const BASE = 'http://localhost/ordena/admin/consulta'

function accion(intencion: string, campos: Record<string, string | File | File[]> = {}) {
  const fd = new FormData()
  fd.set('intencion', intencion)
  for (const [k, v] of Object.entries(campos)) {
    if (Array.isArray(v)) v.forEach((f) => fd.append(k, f))
    else fd.set(k, v)
  }
  return router.fetch(new Request(`${BASE}/proyecto`, { method: 'POST', body: fd }))
}

describe('Admin · documentos del Proyecto del Programa', () => {
  beforeEach(() => vi.restoreAllMocks())
  afterEach(() => (globalThis.fetch = ORIGINAL_FETCH))

  describe('el panel', () => {
    it('muestra el texto y las dos secciones con sus formularios de carga múltiple', async () => {
      backend()
      const html = (await (await router.fetch(new Request(BASE)))?.text()) ?? ''
      const texto = textoDe(html)
      expect(texto).toContain('Proyecto del Programa')
      expect(texto).toContain(
        'Consulta el documento técnico y los documentos gráficos del Proyecto del Programa.',
      )
      expect(texto).toContain('Documento técnico')
      expect(texto).toContain('Documentos gráficos')
      // Varios PDF a la vez en cada sección.
      expect(html.match(/<input[^>]*type="file"[^>]*multiple/g)?.length).toBe(2)
      expect(html).toContain('name="seccion" value="tecnico"')
      expect(html).toContain('name="seccion" value="grafico"')
    })

    it('dice si el apartado está oculto (consulta pendiente) o visible', async () => {
      backend({ visible: false })
      expect(textoDe((await (await router.fetch(new Request(BASE)))?.text()) ?? '')).toContain(
        'Oculto hasta iniciar la consulta',
      )
      backend({ visible: true })
      expect(textoDe((await (await router.fetch(new Request(BASE)))?.text()) ?? '')).toContain(
        'Visible en el portal',
      )
    })

    it('lista los documentos en su orden, con nombre editable, ver, descargar, mover y quitar', async () => {
      backend({
        grafico: [
          documento('g1', 'grafico', 'Mapa de zonificación', 1),
          documento('g2', 'grafico', 'Mapa de riesgos', 2),
        ],
      })
      const html = (await (await router.fetch(new Request(BASE)))?.text()) ?? ''
      expect(html.indexOf('Mapa de zonificación')).toBeLessThan(html.indexOf('Mapa de riesgos'))
      expect(html).toContain('value="Mapa de zonificación"')
      expect(html).toContain('name="intencion" value="renombrar"')
      expect(html).toContain('/admin/consulta/proyecto/g1/archivo')
      expect(html).toContain('/admin/consulta/proyecto/g1/archivo?download=1')
      expect(html).toContain('name="direccion" value="arriba"')
      expect(html).toContain('name="direccion" value="abajo"')
      expect(html).toMatch(/data-confirmar="¿Quitar «Mapa de riesgos» del Proyecto del Programa\?"/)
    })

    it('el primero no se puede subir ni el último bajar', async () => {
      backend({ tecnico: [documento('t1', 'tecnico', 'Único', 1)] })
      const html = (await (await router.fetch(new Request(BASE)))?.text()) ?? ''
      const subir = html.match(/<button[^>]*aria-label="Subir «Único»"[^>]*>/)?.[0] ?? ''
      const bajar = html.match(/<button[^>]*aria-label="Bajar «Único»"[^>]*>/)?.[0] ?? ''
      expect(subir).toContain('disabled')
      expect(bajar).toContain('disabled')
    })

    it('sin documentos lo dice', async () => {
      backend()
      expect(textoDe((await (await router.fetch(new Request(BASE)))?.text()) ?? '')).toContain(
        'Todavía no hay documentos en esta sección.',
      )
    })

    it('sin sesión de panel redirige al login', async () => {
      backend({ rol: null })
      expect((await router.fetch(new Request(BASE)))?.status).toBe(302)
      expect((await accion('eliminar', { id: DOC_ID }))?.status).toBe(302)
    })
  })

  describe('acciones', () => {
    it('cargar varios PDF a una sección los reenvía todos al backend', async () => {
      const pedidos = backend()
      const res = await accion('subir', {
        seccion: 'grafico',
        archivo: [
          new File([PDF], 'mapa uno.pdf', { type: 'application/pdf' }),
          new File([PDF], 'mapa dos.pdf', { type: 'application/pdf' }),
        ],
      })
      expect(res?.status).toBe(302)
      expect(res?.headers.get('location')).toBe('/ordena/admin/consulta?proyecto=subir#proyecto')
      const envio = pedidos.find(
        (p) => p.method === 'POST' && p.url.endsWith('/api/proyecto/documentos'),
      )
      const cuerpo = envio?.body as FormData
      expect(cuerpo.get('seccion')).toBe('grafico')
      expect(cuerpo.getAll('archivo')).toHaveLength(2)
    })

    it('renombrar, mover y quitar se piden al backend', async () => {
      const pedidos = backend()
      await accion('renombrar', { id: DOC_ID, titulo: 'Nuevo nombre' })
      await accion('mover', { id: DOC_ID, direccion: 'arriba' })
      await accion('eliminar', { id: DOC_ID })
      const de = (metodo: string, fin: string) =>
        pedidos.find((p) => p.method === metodo && p.url.endsWith(fin))
      expect(JSON.parse(String(de('PATCH', `/documentos/${DOC_ID}`)?.body))).toEqual({
        titulo: 'Nuevo nombre',
      })
      expect(JSON.parse(String(de('POST', `/documentos/${DOC_ID}/mover`)?.body))).toEqual({
        direccion: 'arriba',
      })
      expect(de('DELETE', `/documentos/${DOC_ID}`)).toBeDefined()
    })

    it('un rechazo del backend se muestra y no se confirma', async () => {
      backend({
        respuesta: { status: 415, cuerpo: { error: '«malo.pdf»: El archivo no es un PDF válido' } },
      })
      const res = await accion('subir', {
        seccion: 'tecnico',
        archivo: new File(['x'], 'malo.pdf'),
      })
      expect(res?.status).toBe(415)
      expect(textoDe((await res?.text()) ?? '')).toContain('El archivo no es un PDF válido')
    })

    it('una intención o una sección inventadas no llegan al backend', async () => {
      const pedidos = backend()
      expect((await accion('borrar_todo'))?.status).toBe(400)
      expect(
        (await accion('subir', { seccion: 'otra', archivo: new File([PDF], 'a.pdf') }))?.status,
      ).toBe(400)
      expect(pedidos.some((p) => p.url.includes('/api/proyecto/documentos'))).toBe(false)
    })

    it('más archivos por envío que el tope se rechazan con 413', async () => {
      backend()
      const muchos = Array.from({ length: 11 }, (_, i) => new File([PDF], `d${i}.pdf`))
      const res = await accion('subir', { seccion: 'tecnico', archivo: muchos })
      expect(res?.status).toBe(413)
      expect(textoDe((await res?.text()) ?? '')).toContain('Máximo 10 archivos por envío')
    })

    it('el GET a la acción regresa a «Consulta pública»', async () => {
      backend()
      const res = await router.fetch(new Request(`${BASE}/proyecto`))
      expect(res?.status).toBe(302)
      expect(res?.headers.get('location')).toBe('/ordena/admin/consulta#proyecto')
    })
  })

  describe('revisar un documento desde el panel', () => {
    it('se ve en el visor y se descarga, aunque el portal aún no lo muestre', async () => {
      backend({ visible: false })
      const ver = await router.fetch(new Request(`${BASE}/proyecto/${DOC_ID}/archivo`))
      expect(ver?.status).toBe(200)
      expect(ver?.headers.get('content-type')).toBe('application/pdf')
      const bajar = await router.fetch(new Request(`${BASE}/proyecto/${DOC_ID}/archivo?download=1`))
      expect(bajar?.headers.get('content-disposition')).toMatch(/^attachment/)
    })

    it('sin sesión de panel no se sirve', async () => {
      backend({ rol: null })
      expect((await router.fetch(new Request(`${BASE}/proyecto/${DOC_ID}/archivo`)))?.status).toBe(
        302,
      )
    })
  })
})
