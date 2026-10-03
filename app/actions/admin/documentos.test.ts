import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { router } from '../../router.ts'

const ORIGINAL_FETCH = globalThis.fetch
const ID = '550e8400-e29b-41d4-a716-446655440001'
const BASE = `http://localhost/ordena/admin/participaciones/${ID}`
const PDF = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31])

const PARTICIPACION = {
  id: ID,
  folio: 'SPAGU-DGTPU-E-0018',
  origen: 'digital',
  captura: '',
  nombre: 'Ana Pérez',
  correo: 'ana@example.com',
  alcance_ubicacion: 'municipio',
  calle: '',
  colonia: '',
  codigo_postal: '',
  domicilio: '',
  municipio_participante: '',
  institucion: '',
  ocupacion: '',
  observacion: 'Una propuesta',
  estado: 'En proceso',
  fuente: '',
  fuente_otra: '',
  genero: '',
  tematica: '',
  tematica_otra: '',
  created_at: '2026-10-01T16:00:00.000Z',
  attachments: [],
}

const documento = (tipo: string, extra: Record<string, unknown> = {}) => ({
  id: `doc-${tipo}`,
  participation_id: ID,
  tipo,
  nombre_original: `${tipo}.pdf`,
  size: 2048,
  numero_oficio: '',
  fecha_oficio: null,
  publicado: false,
  publicado_en: null,
  created_at: '2026-10-05T16:00:00.000Z',
  ...extra,
})

interface Pedido {
  url: string
  method: string
  body?: unknown
}

interface Escenario {
  rol?: string | null
  documentos?: unknown[]
  envios?: unknown[]
  /** Respuesta del backend a la acción sobre un documento. */
  accion?: { status: number; cuerpo: unknown }
  origen?: string
  captura?: string
}

function backend(e: Escenario = {}) {
  const { rol = 'admin', documentos = [], envios = [], accion, origen, captura } = e
  const pedidos: Pedido[] = []
  globalThis.fetch = vi.fn(async (url: string | URL | Request, init?: RequestInit) => {
    const u = String(url)
    const method = init?.method ?? 'GET'
    pedidos.push({ url: u, method, body: init?.body })
    if (u.includes('/api/auth/me')) {
      return Response.json({ user: rol ? { id: '1', name: 'Admin', role: rol } : null })
    }
    if (
      u.includes(`/api/participations/${ID}/documentos`) &&
      method === 'GET' &&
      u.endsWith('/documentos')
    ) {
      return Response.json({ documentos, envios })
    }
    if (u.includes(`/api/participations/${ID}/documentos/`) && method === 'GET') {
      return new Response(PDF, {
        headers: {
          'content-type': 'application/pdf',
          'content-disposition': 'inline; filename="x.pdf"',
        },
      })
    }
    if (u.includes('/documentos') || u.includes('/respuesta/enviar')) {
      return Response.json(accion?.cuerpo ?? { ok: true }, { status: accion?.status ?? 200 })
    }
    if (u.endsWith(`/api/participations/${ID}`)) {
      return Response.json({
        ...PARTICIPACION,
        ...(origen ? { origen } : {}),
        ...(captura ? { captura } : {}),
      })
    }
    return Response.json({})
  }) as unknown as typeof fetch
  return pedidos
}

const textoDe = (html: string) => html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ')
const detalle = async (e?: Escenario, query = '') => {
  backend(e)
  const res = await router.fetch(new Request(`${BASE}${query}`))
  return { res, html: (await res?.text()) ?? '' }
}

function enviar(intencion: string, campos: Record<string, string | File> = {}) {
  const fd = new FormData()
  fd.set('intencion', intencion)
  for (const [k, v] of Object.entries(campos)) fd.set(k, v)
  return router.fetch(new Request(`${BASE}/documentos`, { method: 'POST', body: fd }))
}

describe('Admin · respuesta y documentos de una participación', () => {
  beforeEach(() => vi.restoreAllMocks())
  afterEach(() => (globalThis.fetch = ORIGINAL_FETCH))

  describe('el panel de respuesta', () => {
    it('sin oficio, pide cargarlo y no ofrece enviar', async () => {
      const { html } = await detalle()
      const texto = textoDe(html)
      expect(texto).toContain('Respuesta a la participación')
      expect(texto).toContain('Cargar el oficio de respuesta (PDF firmado)')
      expect(html).not.toContain('Enviar respuesta')
      expect(html).not.toContain('Vista previa de la respuesta')
    })

    it('con oficio cargado, habilita la vista previa, sustituir y «Enviar respuesta»; cargar no envía', async () => {
      const { html } = await detalle({ documentos: [documento('oficio')] })
      const texto = textoDe(html)
      expect(texto).toContain('Vista previa de la respuesta')
      expect(texto).toContain('Enviar respuesta')
      expect(texto).toContain('Sustituir archivo')
      expect(html).toContain(`/admin/participaciones/${ID}/documentos/oficio/archivo`)
      // El envío exige confirmar, con el correo a donde irá.
      expect(html).toMatch(/data-confirmar="¿Enviar el oficio de respuesta a ana@example.com\?/)
    })

    it('muestra la constancia del envío: fecha, hora y resultado correcto', async () => {
      const { html } = await detalle({
        documentos: [documento('oficio')],
        envios: [
          {
            id: 'e1',
            tipo: 'respuesta',
            para: 'ana@example.com',
            asunto: 'x',
            resultado: 'enviado',
            detalle: '',
            enviado_por: 'Admin',
            created_at: '2026-10-05T21:30:15.000Z',
          },
        ],
      })
      const texto = textoDe(html)
      expect(texto).toContain('Última respuesta enviada correctamente el')
      expect(texto).toContain('5 de octubre de 2026, 3:30:15 p. m.')
      expect(texto).toContain('✔ Enviado correctamente')
    })

    it('si el envío falló, lo dice con el motivo', async () => {
      const { html } = await detalle({
        documentos: [documento('oficio')],
        envios: [
          {
            id: 'e1',
            tipo: 'respuesta',
            para: 'ana@example.com',
            asunto: 'x',
            resultado: 'error',
            detalle: '550 buzón inexistente',
            enviado_por: 'Admin',
            created_at: '2026-10-05T21:30:15.000Z',
          },
        ],
      })
      const texto = textoDe(html)
      expect(texto).toContain('El último envío falló')
      expect(texto).toContain('550 buzón inexistente')
      expect(texto).toContain('✖ Error')
    })

    it('el historial incluye también el acuse que se envió al registrar', async () => {
      const { html } = await detalle({
        envios: [
          {
            id: 'e0',
            tipo: 'acuse',
            para: 'ana@example.com',
            asunto: 'x',
            resultado: 'enviado',
            detalle: '',
            enviado_por: '',
            created_at: '2026-10-01T16:00:00.000Z',
          },
        ],
      })
      expect(textoDe(html)).toContain('Acuse de recepción')
    })
  })

  describe('el panel de publicación', () => {
    it('ofrece cargar las dos versiones públicas y explica qué se muestra', async () => {
      const texto = textoDe((await detalle()).html)
      expect(texto).toContain('Publicación en el portal')
      expect(texto).toContain('Versión pública de la participación')
      expect(texto).toContain('Versión pública del oficio de respuesta')
      expect(texto).toContain('Respuesta pendiente de publicación')
      expect(texto).toContain('sin incluir los anexos')
    })

    it('una versión cargada se puede publicar, con confirmación sobre los datos testados', async () => {
      const { html } = await detalle({ documentos: [documento('version_publica')] })
      expect(html).toContain('Publicar en el portal')
      expect(html).toMatch(/data-confirmar="¿Publicar este documento en el portal\?[^"]*testados/)
      expect(textoDe(html)).toContain('Cargado · sin publicar')
    })

    it('una versión publicada se puede retirar', async () => {
      const { html } = await detalle({
        documentos: [
          documento('version_publica', {
            publicado: true,
            publicado_en: '2026-10-06T16:00:00.000Z',
          }),
        ],
      })
      const texto = textoDe(html)
      expect(texto).toContain('Retirar del portal')
      expect(texto).toContain('Publicado')
    })

    it('el oficio público pide su número y su fecha', async () => {
      const { html } = await detalle({
        documentos: [
          documento('oficio_publico', { numero_oficio: 'DGTPU/1', fecha_oficio: '2026-10-05' }),
        ],
      })
      expect(html).toContain('name="numero_oficio"')
      expect(html).toContain('type="date"')
      expect(html).toContain('value="DGTPU/1"')
      expect(textoDe(html)).toContain('Guardar número y fecha')
    })
  })

  describe('documentos internos', () => {
    it('un llenado a mano muestra su formato escaneado, ligado al folio', async () => {
      const { html } = await detalle({
        origen: 'fisica',
        captura: 'manuscrita',
        documentos: [documento('formato_escaneado')],
      })
      const texto = textoDe(html)
      expect(texto).toContain('Formato escaneado')
      expect(texto).toContain('no se publica')
      expect(texto).toContain('Presencial · llenado a mano')
      expect(html).toContain(`/documentos/formato_escaneado/archivo`)
    })

    it('una participación en línea no muestra ese panel', async () => {
      expect(textoDe((await detalle()).html)).not.toContain('Documentos internos')
    })
  })

  describe('acciones', () => {
    it('cargar un PDF lo reenvía al backend y vuelve confirmando, sin enviar nada', async () => {
      const pedidos = backend()
      const res = await enviar('subir', {
        tipo: 'oficio',
        archivo: new File([PDF], 'oficio firmado.pdf', { type: 'application/pdf' }),
      })
      expect(res?.status).toBe(302)
      expect(res?.headers.get('location')).toBe(
        `/ordena/admin/participaciones/${ID}?doc=subido#respuesta`,
      )
      const put = pedidos.find((p) => p.method === 'PUT')
      expect(put?.url).toContain(`/api/participations/${ID}/documentos/oficio`)
      expect((put?.body as FormData).get('archivo')).toBeInstanceOf(File)
      expect(pedidos.some((p) => p.url.includes('/respuesta/enviar'))).toBe(false)
    })

    it('el oficio público viaja con su número y su fecha', async () => {
      const pedidos = backend()
      await enviar('subir', {
        tipo: 'oficio_publico',
        archivo: new File([PDF], 'publico.pdf'),
        numero_oficio: 'DGTPU/0123/2026',
        fecha_oficio: '2026-10-05',
      })
      const cuerpo = pedidos.find((p) => p.method === 'PUT')?.body as FormData
      expect(cuerpo.get('numero_oficio')).toBe('DGTPU/0123/2026')
      expect(cuerpo.get('fecha_oficio')).toBe('2026-10-05')
    })

    it('«Enviar respuesta» pide el envío y confirma', async () => {
      const pedidos = backend()
      const res = await enviar('enviar', { tipo: 'oficio' })
      expect(res?.headers.get('location')).toContain('?doc=enviado#respuesta')
      expect(
        pedidos.some(
          (p) =>
            p.method === 'POST' && p.url.endsWith(`/api/participations/${ID}/respuesta/enviar`),
        ),
      ).toBe(true)
    })

    it('publicar y retirar piden el cambio al backend', async () => {
      const pedidos = backend()
      await enviar('publicar', { tipo: 'version_publica' })
      await enviar('retirar', { tipo: 'version_publica' })
      const cuerpos = pedidos
        .filter((p) => p.url.endsWith('/version_publica/publicacion'))
        .map((p) => JSON.parse(String(p.body)))
      expect(cuerpos).toEqual([{ publicado: true }, { publicado: false }])
    })

    it('quitar un documento y corregir el número y la fecha', async () => {
      const pedidos = backend()
      await enviar('eliminar', { tipo: 'oficio_publico' })
      await enviar('datos', {
        tipo: 'oficio_publico',
        numero_oficio: 'DGTPU/9',
        fecha_oficio: '2026-10-06',
      })
      expect(
        pedidos.some((p) => p.method === 'DELETE' && p.url.endsWith('/documentos/oficio_publico')),
      ).toBe(true)
      const patch = pedidos.find((p) => p.method === 'PATCH')
      expect(JSON.parse(String(patch?.body))).toEqual({
        numero_oficio: 'DGTPU/9',
        fecha_oficio: '2026-10-06',
      })
    })

    it('un rechazo del backend se muestra en el detalle, sin perder lo cargado', async () => {
      backend({
        documentos: [documento('oficio')],
        accion: { status: 415, cuerpo: { error: 'El archivo no es un PDF válido' } },
      })
      const res = await enviar('subir', { tipo: 'oficio', archivo: new File(['x'], 'malo.pdf') })
      expect(res?.status).toBe(415)
      const texto = textoDe((await res?.text()) ?? '')
      expect(texto).toContain('El archivo no es un PDF válido')
      expect(texto).toContain('Vista previa de la respuesta') // el oficio anterior sigue ahí
    })

    it('un error al enviar muestra el motivo', async () => {
      backend({
        documentos: [documento('oficio')],
        accion: {
          status: 502,
          cuerpo: { error: 'No se pudo enviar el correo: buzón inexistente' },
        },
      })
      const res = await enviar('enviar', { tipo: 'oficio' })
      expect(res?.status).toBe(502)
      expect(textoDe((await res?.text()) ?? '')).toContain('buzón inexistente')
    })

    it('una acción o un tipo inventados no llegan al backend', async () => {
      const pedidos = backend()
      expect((await enviar('borrar_todo', { tipo: 'oficio' }))?.status).toBe(400)
      expect((await enviar('subir', { tipo: 'secreto' }))?.status).toBe(400)
      expect(
        pedidos.some((p) => p.url.includes('/documentos/') || p.url.includes('/respuesta')),
      ).toBe(false)
    })

    it('sin sesión de panel redirige al login y no toca nada', async () => {
      const pedidos = backend({ rol: null })
      const res = await enviar('enviar', { tipo: 'oficio' })
      expect(res?.status).toBe(302)
      expect(res?.headers.get('location')).toBe('/ordena/login')
      expect(pedidos.some((p) => p.url.includes('/respuesta'))).toBe(false)
    })

    it('un archivo que excede el límite se rechaza con 413 y un mensaje claro', async () => {
      const { MAX_FILE_BYTES } = await import('../../utils/uploads.ts')
      backend()
      const res = await enviar('subir', {
        tipo: 'oficio',
        archivo: new File([new Uint8Array(MAX_FILE_BYTES + 1)], 'enorme.pdf'),
      })
      expect(res?.status).toBe(413)
      expect(textoDe((await res?.text()) ?? '')).toContain('puede pesar hasta')
    })

    it('el GET a la acción regresa al detalle', async () => {
      backend()
      const res = await router.fetch(new Request(`${BASE}/documentos`))
      expect(res?.status).toBe(302)
      expect(res?.headers.get('location')).toBe(`/ordena/admin/participaciones/${ID}`)
    })
  })

  describe('ver y descargar un documento', () => {
    it('se ve en el visor y, con ?download=1, se descarga', async () => {
      const pedidos = backend()
      const ver = await router.fetch(new Request(`${BASE}/documentos/oficio/archivo`))
      expect(ver?.status).toBe(200)
      expect(ver?.headers.get('content-type')).toBe('application/pdf')
      expect(ver?.headers.get('content-disposition')).toMatch(/^inline/)
      const bajar = await router.fetch(new Request(`${BASE}/documentos/oficio/archivo?download=1`))
      expect(bajar?.headers.get('content-disposition')).toMatch(/^attachment/)
      expect(pedidos.some((p) => p.url.includes('/documentos/oficio?download=1'))).toBe(true)
    })

    it('sin sesión de panel no se sirve', async () => {
      backend({ rol: null })
      const res = await router.fetch(new Request(`${BASE}/documentos/oficio/archivo`))
      expect(res?.status).toBe(302)
    })
  })
})
