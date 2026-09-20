import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { olvidarTemaPublico } from '../backend.ts'
import { router } from '../router.ts'

/**
 * Portada: textos configurables del tema y las secciones que salen de
 * «Actividades y avances del Programa» (franja de aviso, próximas
 * actividades y los cuatro accesos de «Sobre el Programa»).
 */

const ORIGINAL_FETCH = globalThis.fetch

const ACTIVIDAD = {
  id: '550e8400-e29b-41d4-a716-446655440001',
  titulo: 'Foro de consulta pública',
  fase: 'Formulación',
  tipo: 'Consulta pública',
  estado: 'programada',
  fecha: '2026-10-05',
  hora_inicio: '17:00',
  hora_fin: '19:00',
  lugar: 'Centro Cultural El Refugio',
  direccion: '',
  latitud: '',
  longitud: '',
  descripcion: '',
  resultados: '',
  acuerdos: '',
  aviso: null,
}

const AVISO = {
  actividad_id: ACTIVIDAD.id,
  titulo: 'Apertura de la consulta pública',
  descripcion: 'Presenta tus observaciones hasta el 5 de octubre.',
  inicio: '2026-09-01',
  fin: '2026-10-05',
}

interface Escenario {
  aviso?: unknown
  proximas?: unknown[]
  aprobado?: boolean
  backendCaido?: boolean
}

function mockHome(escenario: Escenario = {}) {
  const json = (body: unknown, status = 200) =>
    Promise.resolve(
      new Response(JSON.stringify(body), {
        status,
        headers: { 'content-type': 'application/json' },
      }),
    )
  globalThis.fetch = vi.fn().mockImplementation((url: string | URL | Request) => {
    const u = typeof url === 'string' ? url : url instanceof Request ? url.url : url.toString()
    if (u.includes('/api/settings/theme')) {
      return json({
        theme: {
          usuario: { textos: { heroTitulo: 'TÍTULO PERSONALIZADO' } },
          programa: { aprobado: escenario.aprobado === true },
        },
      })
    }
    if (escenario.backendCaido) return json({ error: 'caído' }, 500)
    if (u.includes('/api/actividades/aviso')) return json({ aviso: escenario.aviso ?? null })
    if (u.includes('/api/actividades?vista=proximas')) {
      return json({ actividades: escenario.proximas ?? [] })
    }
    return json({})
  }) as unknown as typeof fetch
}

async function portada(): Promise<string> {
  const res = await router.fetch(new Request('http://localhost/ordena/'))
  expect(res?.status).toBe(200)
  return (await res?.text()) ?? ''
}

describe('Portada', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    // El tema se cachea 30 s entre peticiones; cada caso trae el suyo.
    olvidarTemaPublico()
  })
  afterEach(() => (globalThis.fetch = ORIGINAL_FETCH))

  it('muestra el heroTitulo configurado en el tema', async () => {
    mockHome()
    expect(await portada()).toContain('TÍTULO PERSONALIZADO')
  })

  it('pide las tres actividades más próximas', async () => {
    mockHome()
    await portada()
    const urls = vi.mocked(globalThis.fetch).mock.calls.map(([u]) => String(u))
    expect(urls.some((u) => u.includes('/api/actividades?vista=proximas&limite=3'))).toBe(true)
  })

  describe('franja de avisos', () => {
    it('con un aviso vigente se muestra antes de la portada y lleva a la ficha', async () => {
      mockHome({ aviso: AVISO })
      const html = await portada()
      expect(html).toContain('Aviso importante')
      expect(html).toContain('Apertura de la consulta pública')
      expect(html).toContain('Presenta tus observaciones hasta el 5 de octubre.')
      expect(html).toContain(`href="/ordena/poetdum/actividades/${ACTIVIDAD.id}"`)
      expect(html).toContain('Ver aviso')
      // Debajo del menú y antes de la imagen principal.
      expect(html.indexOf('Aviso importante')).toBeLessThan(html.indexOf('id="inicio"'))
    })

    it('sin aviso vigente no deja un espacio vacío', async () => {
      mockHome({ aviso: null })
      const html = await portada()
      expect(html).not.toContain('Aviso importante')
      expect(html).not.toContain('Ver aviso')
    })
  })

  describe('próximas actividades', () => {
    it('va justo después de la portada, con día, mes, sede, horario y «Ver detalles»', async () => {
      mockHome({ proximas: [ACTIVIDAD] })
      const html = await portada()
      expect(html).toContain('Próximas actividades')
      expect(html).toContain('Foro de consulta pública')
      expect(html).toContain('Centro Cultural El Refugio · 17:00 – 19:00')
      expect(html).toMatch(/>5<\/span>[\s\S]{0,400}>oct<\/span>/)
      expect(html).toContain('Ver detalles')
      expect(html).toContain('Ver todas las actividades')
      expect(html).toContain('href="/ordena/poetdum/actividades"')
      const hero = html.indexOf('id="inicio"')
      const proximas = html.indexOf('id="proximas-actividades"')
      expect(hero).toBeGreaterThan(-1)
      expect(proximas).toBeGreaterThan(hero)
      expect(proximas).toBeLessThan(html.indexOf('id="que-es"'))
    })

    it('sin actividades programadas muestra el mensaje del historial', async () => {
      mockHome({ proximas: [] })
      const html = await portada()
      expect(html).toContain(
        'Por el momento no hay actividades programadas. Consulta el historial para conocer las actividades realizadas.',
      )
      expect(html).toContain('href="/ordena/poetdum/avances"')
    })

    it('si el backend falla, el resto de la portada sigue en pie', async () => {
      mockHome({ backendCaido: true })
      const html = await portada()
      expect(html).toContain('TÍTULO PERSONALIZADO')
      expect(html).toContain('Por el momento no hay actividades programadas.')
      expect(html).not.toContain('Aviso importante')
    })
  })

  describe('Sobre el Programa', () => {
    it('ofrece los cuatro accesos con su destino', async () => {
      mockHome()
      const html = await portada()
      expect(html).toContain('Información y avances del Programa')
      expect(html).toMatch(/id="acceso-fases" href="#proceso"/)
      expect(html).toMatch(/id="acceso-avances" href="\/ordena\/poetdum\/avances"/)
      expect(html).toMatch(/id="acceso-calendario" href="\/ordena\/poetdum\/calendario"/)
      expect(html).toMatch(/id="acceso-seguimiento" href="\/ordena\/poetdum\/seguimiento"/)
      for (const texto of ['Conoce las fases', 'Ver fases', 'Ver avances', 'Ver calendario']) {
        expect(html).toContain(texto)
      }
      // Ya no existen las tarjetas de la versión anterior.
      expect(html).not.toContain('Documentos del Proceso')
    })

    it('mientras el Programa no está aprobado, Seguimiento avisa que estará disponible', async () => {
      mockHome({ aprobado: false })
      const html = await portada()
      expect(html).toContain('Disponible una vez aprobado')
      expect(html).not.toContain('Ver seguimiento')
    })

    it('con el Programa aprobado, Seguimiento se puede consultar', async () => {
      mockHome({ aprobado: true })
      const html = await portada()
      expect(html).toContain('Ver seguimiento')
      expect(html).not.toContain('Disponible una vez aprobado')
    })
  })
})
