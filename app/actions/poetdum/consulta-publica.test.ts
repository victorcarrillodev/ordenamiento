import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { olvidarTemaPublico } from '../../backend.ts'
import { TEXTO_CONSULTA_CONCLUIDA } from '../../data/consulta.ts'
import { router } from '../../router.ts'

const ORIGINAL_FETCH = globalThis.fetch
const PDF = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31])

const documento = (id: string, seccion: string, titulo: string) => ({
  id,
  seccion,
  titulo,
  nombre_original: `${titulo}.pdf`,
  size: 3 * 1024 * 1024,
  orden: 1,
  created_at: '2026-10-01T00:00:00.000Z',
})

interface Escenario {
  etapa?: 'pendiente' | 'abierta' | 'concluida'
  proyecto?: { visible: boolean; tecnico: unknown[]; grafico: unknown[] }
  items?: unknown[]
  total?: number
  page?: number
}

function backend(e: Escenario = {}) {
  const {
    etapa = 'abierta',
    proyecto = { visible: true, tecnico: [], grafico: [] },
    items = [],
    total = items.length,
    page = 1,
  } = e
  const urls: string[] = []
  olvidarTemaPublico()
  globalThis.fetch = vi.fn(async (url: string | URL | Request) => {
    const u = String(url)
    urls.push(u)
    if (u.includes('/api/settings/theme'))
      return Response.json({ theme: { programa: { consulta: etapa } } })
    if (u.endsWith('/api/proyecto')) return Response.json(proyecto)
    if (u.includes('/api/participaciones-publicas?')) {
      return Response.json({ items, total, page, limit: 10 })
    }
    if (u.includes('/api/participaciones-publicas/') || u.includes('/api/proyecto/documentos/')) {
      return new Response(PDF, {
        headers: {
          'content-type': 'application/pdf',
          'content-disposition': 'inline; filename="x.pdf"',
        },
      })
    }
    if (u.includes('/api/actividades') || u.includes('/api/indicadores')) {
      return Response.json({ actividades: [], documentos: [], indicadores: [] })
    }
    return new Response('{}', { status: 404 })
  }) as unknown as typeof fetch
  return urls
}

const textoDe = (html: string) => html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ')
async function pagina(e?: Escenario, query = '') {
  const urls = backend(e)
  const res = await router.fetch(new Request(`http://localhost/ordena/poetdum${query}`))
  const html = (await res?.text()) ?? ''
  return { res, html, texto: textoDe(html), urls }
}

describe('Elaboración del POETDUM · Proyecto del Programa y Participaciones y respuestas', () => {
  beforeEach(() => vi.restoreAllMocks())
  afterEach(() => {
    globalThis.fetch = ORIGINAL_FETCH
    olvidarTemaPublico()
  })

  describe('ubicación en la página', () => {
    it('van debajo del mapa y antes de «Próximas actividades», que se conserva', async () => {
      const { html } = await pagina({
        proyecto: {
          visible: true,
          tecnico: [documento('t1', 'tecnico', 'Documento técnico')],
          grafico: [],
        },
      })
      const mapa = html.indexOf('Mapa del territorio')
      const proyecto = html.indexOf('id="proyecto"')
      const participaciones = html.indexOf('id="participaciones"')
      const proximas = html.indexOf('id="proximas"')
      expect(mapa).toBeGreaterThan(-1)
      expect(proyecto).toBeGreaterThan(mapa)
      expect(participaciones).toBeGreaterThan(proyecto)
      expect(proximas).toBeGreaterThan(participaciones)
      expect(html).toContain('Próximas actividades')
    })

    it('los encabezados van en el rojo institucional', async () => {
      const { html } = await pagina()
      for (const id of ['proyecto-titulo', 'participaciones-titulo']) {
        const h2 = html.match(new RegExp(`<h2[^>]*id="${id}"[^>]*class="([^"]+)"`))?.[1] ?? ''
        expect(h2, id).not.toBe('')
      }
      expect(html).toContain('#8c1d3d')
    })
  })

  describe('Proyecto del Programa', () => {
    it('con la consulta abierta muestra el título, el texto y las dos secciones', async () => {
      const { texto } = await pagina({
        proyecto: {
          visible: true,
          tecnico: [documento('t1', 'tecnico', 'Documento técnico del Proyecto')],
          grafico: [
            documento('g1', 'grafico', 'Mapa de zonificación'),
            documento('g2', 'grafico', 'Mapa de riesgos'),
          ],
        },
      })
      expect(texto).toContain('Proyecto del Programa')
      expect(texto).toContain(
        'Consulta el documento técnico y los documentos gráficos del Proyecto del Programa.',
      )
      expect(texto).toContain('Documento técnico')
      expect(texto).toContain('Documentos gráficos')
      expect(texto).toContain('Documento técnico del Proyecto')
      expect(texto).toContain('Mapa de zonificación')
    })

    it('cada documento tiene «Consultar» (en el visor) y «Descargar» (directo)', async () => {
      const { html } = await pagina({
        proyecto: {
          visible: true,
          tecnico: [documento('t1', 'tecnico', 'Documento técnico del Proyecto')],
          grafico: [],
        },
      })
      expect(html).toContain('href="/ordena/poetdum/proyecto/t1/archivo"')
      expect(html).toMatch(/aria-label="Consultar: Documento técnico del Proyecto"/)
      expect(html).toContain('href="/ordena/poetdum/proyecto/t1/archivo?download=1"')
      expect(html).toContain('download="Documento técnico del Proyecto.pdf"')
      expect(html).toMatch(/aria-label="Descargar: Documento técnico del Proyecto"/)
    })

    it('una sección sin documentos lo dice', async () => {
      const { texto } = await pagina({ proyecto: { visible: true, tecnico: [], grafico: [] } })
      expect(texto).toContain('Aún no hay documentos en esta sección.')
    })

    it('con la consulta pendiente el apartado no aparece en absoluto', async () => {
      const { html, texto } = await pagina({
        etapa: 'pendiente',
        proyecto: { visible: false, tecnico: [], grafico: [] },
      })
      expect(html).not.toContain('id="proyecto"')
      expect(texto).not.toContain('Consulta el documento técnico y los documentos gráficos')
    })
  })

  describe('Participaciones y respuestas', () => {
    const registro = (folio: string, oficio: unknown = null) => ({
      folio,
      fecha: '2026-09-24',
      oficio,
    })

    it('muestra el título, el texto y un buscador con su indicación y su botón', async () => {
      const { html, texto } = await pagina()
      expect(texto).toContain('Participaciones y respuestas')
      expect(texto).toContain(
        'Consulta las versiones públicas de las participaciones recibidas durante la consulta pública, así como los oficios de respuesta correspondientes.',
      )
      expect(html).toMatch(/<input[^>]*type="search"[^>]*name="folio"/)
      expect(html).toContain('placeholder="Ingresa el folio de participación"')
      expect(texto).toContain('Buscar')
    })

    it('el listado se identifica solo por folio y fecha de recepción', async () => {
      const { texto, html } = await pagina({
        items: [registro('SPAGU-DGTPU-E-0018'), registro('SPAGU-DGTPU-E-0017')],
      })
      expect(texto).toContain('SPAGU-DGTPU-E-0018')
      expect(texto).toContain('Recibida el 24 de septiembre de 2026')
      // Nada de temática ni de datos personales en lo público.
      const seccion = html.slice(
        html.indexOf('id="participaciones"'),
        html.indexOf('id="proximas"'),
      )
      expect(seccion).not.toMatch(/Temática|Correo|Domicilio|Nombre/)
    })

    it('cada registro tiene «Consultar participación» y «Descargar participación»', async () => {
      const { html } = await pagina({ items: [registro('SPAGU-DGTPU-E-0018')] })
      expect(html).toContain(
        'href="/ordena/poetdum/participaciones/SPAGU-DGTPU-E-0018/participacion"',
      )
      expect(html).toContain('Consultar participación')
      expect(html).toContain(
        'href="/ordena/poetdum/participaciones/SPAGU-DGTPU-E-0018/participacion?download=1"',
      )
      expect(html).toContain('Descargar participación')
    })

    it('sin oficio publicado dice «Respuesta pendiente de publicación» y no ofrece botones del oficio', async () => {
      const { texto, html } = await pagina({ items: [registro('SPAGU-DGTPU-E-0018')] })
      expect(texto).toContain('Respuesta pendiente de publicación')
      expect(html).not.toContain('/participaciones/SPAGU-DGTPU-E-0018/oficio')
    })

    it('con el oficio publicado muestra su número y fecha, y «Consultar oficio de respuesta» y «Descargar oficio»', async () => {
      const { texto, html } = await pagina({
        items: [registro('SPAGU-DGTPU-E-0018', { numero: 'DGTPU/0123/2026', fecha: '2026-10-05' })],
      })
      expect(texto).toContain('Oficio de respuesta DGTPU/0123/2026')
      expect(texto).toContain('Fecha del oficio: 5 de octubre de 2026')
      expect(texto).toContain('Consultar oficio de respuesta')
      expect(texto).toContain('Descargar oficio')
      expect(html).toContain('href="/ordena/poetdum/participaciones/SPAGU-DGTPU-E-0018/oficio"')
      expect(html).toContain(
        'href="/ordena/poetdum/participaciones/SPAGU-DGTPU-E-0018/oficio?download=1"',
      )
      expect(texto).not.toContain('Respuesta pendiente de publicación')
    })

    it('el buscador manda el folio al backend y lo conserva en el campo', async () => {
      const { urls, html } = await pagina(
        { items: [registro('SPAGU-DGTPU-E-0018')] },
        '?folio=0018',
      )
      expect(
        urls.some((u) => u.includes('/api/participaciones-publicas?') && u.includes('folio=0018')),
      ).toBe(true)
      expect(html).toMatch(/<input[^>]*name="folio"[^>]*value="0018"/)
      expect(html).toContain('Limpiar búsqueda')
    })

    it('un folio buscado muy largo se acota antes de llegar al backend', async () => {
      const { urls } = await pagina({}, `?folio=${'9'.repeat(200)}`)
      const url = urls.find((u) => u.includes('/api/participaciones-publicas?')) ?? ''
      expect(decodeURIComponent(url.split('folio=')[1] ?? '').length).toBeLessThanOrEqual(40)
    })

    it('sin coincidencias, lo explica con el folio buscado (escapado)', async () => {
      const { texto, html } = await pagina(
        { items: [] },
        `?folio=${encodeURIComponent('<b>x</b>')}`,
      )
      expect(texto).toContain('No se encontró ninguna participación publicada con el folio')
      expect(html).not.toContain('<b>x</b>')
      expect(html).toContain('&lt;b&gt;x&lt;/b&gt;')
    })

    it('sin nada publicado, lo dice', async () => {
      expect((await pagina()).texto).toContain('Todavía no hay participaciones publicadas.')
    })

    it('pagina y conserva la búsqueda en los enlaces', async () => {
      const { html } = await pagina(
        { items: [registro('SPAGU-DGTPU-E-0018')], total: 35, page: 2 },
        '?folio=SPAGU&pagina=2',
      )
      expect(html).toContain('href="/ordena/poetdum?folio=SPAGU#participaciones"') // página 1
      expect(html).toContain('href="/ordena/poetdum?folio=SPAGU&amp;pagina=3#participaciones"')
      expect(html).toContain('aria-current="page"')
    })
  })

  describe('Consulta pública concluida', () => {
    it('muestra el mensaje acordado, y conserva el Proyecto y las participaciones', async () => {
      const { texto } = await pagina({
        etapa: 'concluida',
        proyecto: {
          visible: true,
          tecnico: [documento('t1', 'tecnico', 'Documento técnico')],
          grafico: [],
        },
        items: [{ folio: 'SPAGU-DGTPU-E-0018', fecha: '2026-09-24', oficio: null }],
      })
      expect(texto).toContain('Consulta pública concluida')
      expect(texto).toContain(TEXTO_CONSULTA_CONCLUIDA)
      expect(texto).toContain('Documento técnico')
      expect(texto).toContain('SPAGU-DGTPU-E-0018')
    })

    it('con la consulta abierta o pendiente no se muestra', async () => {
      for (const etapa of ['abierta', 'pendiente'] as const) {
        expect((await pagina({ etapa })).texto, etapa).not.toContain('Consulta pública concluida')
      }
    })
  })

  describe('descargas', () => {
    it('el PDF del Proyecto se reenvía y respeta ?download=1', async () => {
      const urls = backend()
      const ver = await router.fetch(
        new Request('http://localhost/ordena/poetdum/proyecto/t1/archivo'),
      )
      expect(ver?.status).toBe(200)
      expect(ver?.headers.get('content-type')).toBe('application/pdf')
      const bajar = await router.fetch(
        new Request('http://localhost/ordena/poetdum/proyecto/t1/archivo?download=1'),
      )
      expect(bajar?.headers.get('content-disposition')).toMatch(/^attachment/)
      expect(urls.some((u) => u.endsWith('/api/proyecto/documentos/t1/archivo?download=1'))).toBe(
        true,
      )
    })

    it('la versión pública y el oficio se reenvían; cualquier otro documento da 404 sin llegar al backend', async () => {
      const urls = backend()
      for (const documento of ['participacion', 'oficio']) {
        const res = await router.fetch(
          new Request(
            `http://localhost/ordena/poetdum/participaciones/SPAGU-DGTPU-E-0018/${documento}`,
          ),
        )
        expect(res?.status, documento).toBe(200)
      }
      const antes = urls.length
      for (const raro of ['formato_escaneado', 'oficio_integro', 'x']) {
        const res = await router.fetch(
          new Request(`http://localhost/ordena/poetdum/participaciones/SPAGU-DGTPU-E-0018/${raro}`),
        )
        expect(res?.status, raro).toBe(404)
      }
      expect(urls.length).toBe(antes)
    })

    it('si el backend dice 404 (sin publicar), el portal también', async () => {
      globalThis.fetch = vi.fn(async () =>
        Response.json({ error: 'No encontrado' }, { status: 404 }),
      ) as unknown as typeof fetch
      const res = await router.fetch(
        new Request(
          'http://localhost/ordena/poetdum/participaciones/SPAGU-DGTPU-E-0018/participacion',
        ),
      )
      expect(res?.status).toBe(404)
    })
  })

  it('si el backend no responde, la página sigue en pie sin estos apartados rotos', async () => {
    olvidarTemaPublico()
    globalThis.fetch = vi.fn(async () => {
      throw new Error('ECONNREFUSED')
    }) as unknown as typeof fetch
    const res = await router.fetch(new Request('http://localhost/ordena/poetdum'))
    expect(res?.status).toBe(200)
    const texto = textoDe((await res?.text()) ?? '')
    expect(texto).toContain('Participaciones y respuestas')
    expect(texto).toContain('Todavía no hay participaciones publicadas.')
  })
})
