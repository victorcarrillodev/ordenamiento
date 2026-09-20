import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { olvidarTemaPublico } from '../../backend.ts'
import { router } from '../../router.ts'
import { hoyEnMexico } from '../../utils/calendario.ts'

/**
 * Páginas públicas del Programa: avances, calendario, ficha, seguimiento,
 * archivos y los enlaces de la versión anterior.
 */

const ORIGINAL_FETCH = globalThis.fetch
const ID = '550e8400-e29b-41d4-a716-446655440001'
const AID = '550e8400-e29b-41d4-a716-446655440077'

const REALIZADA = {
  id: ID,
  titulo: 'Firma del convenio con SEMADET',
  fase: 'Formulación',
  tipo: 'Firma de convenio',
  estado: 'realizada',
  fecha: '2026-05-20',
  hora_inicio: '11:00',
  hora_fin: '',
  lugar: 'Palacio Municipal',
  direccion: '',
  latitud: '20.640900',
  longitud: '-103.312600',
  descripcion: 'Firma del convenio de coordinación.',
  resultados: 'Convenio firmado.',
  acuerdos: 'Integrar el Comité en 60 días.',
  aviso: null,
  archivos: [
    {
      id: AID,
      actividad_id: ID,
      tipo: 'Documento aprobado',
      titulo: 'Convenio firmado',
      nombre_original: 'convenio.pdf',
      mime: 'application/pdf',
      size: 4096,
      created_at: '',
    },
    {
      id: 'foto-1',
      actividad_id: ID,
      tipo: 'Fotografía',
      titulo: '',
      nombre_original: 'firma.jpg',
      mime: 'image/jpeg',
      size: 1024,
      created_at: '',
    },
  ],
}

interface Escenario {
  aprobado?: boolean
  ficha?: unknown
  avances?: unknown[]
  calendario?: unknown[]
  indicadores?: unknown[]
}

function mockBackend(escenario: Escenario = {}) {
  const urls: string[] = []
  globalThis.fetch = vi.fn().mockImplementation((url: string | URL | Request) => {
    const u = typeof url === 'string' ? url : url instanceof Request ? url.url : url.toString()
    urls.push(u)
    const json = (body: unknown, status = 200) =>
      Promise.resolve(
        new Response(JSON.stringify(body), {
          status,
          headers: { 'content-type': 'application/json' },
        }),
      )
    if (u.includes('/api/settings/theme')) {
      return json({ theme: { programa: { aprobado: escenario.aprobado === true } } })
    }
    if (u.includes('vista=avances')) return json({ actividades: escenario.avances ?? [] })
    if (u.includes('vista=calendario')) return json({ actividades: escenario.calendario ?? [] })
    if (u.includes('vista=proximas')) return json({ actividades: [] })
    if (u.includes('/api/indicadores')) return json({ indicadores: escenario.indicadores ?? [] })
    if (u.includes('/api/actividades/documentos')) return json({ documentos: [] })
    if (u.includes(`/api/actividades/archivos/${AID}`)) {
      return Promise.resolve(
        new Response('%PDF-1.4', {
          headers: {
            'content-type': 'application/pdf',
            'content-disposition': 'inline; filename="convenio.pdf"',
            'cache-control': 'public, max-age=300',
            'set-cookie': 'no=debe-pasar',
          },
        }),
      )
    }
    if (u.includes(`/api/actividades/${ID}`)) {
      return escenario.ficha ? json({ actividad: escenario.ficha }) : json({ error: 'No' }, 404)
    }
    return json({ error: 'No encontrado' }, 404)
  }) as unknown as typeof fetch
  return urls
}

async function html(ruta: string, esperado = 200): Promise<string> {
  const res = await router.fetch(new Request(`http://localhost${ruta}`))
  expect(res?.status, ruta).toBe(esperado)
  return (await res?.text()) ?? ''
}

describe('Programa · páginas públicas', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    olvidarTemaPublico()
  })
  afterEach(() => (globalThis.fetch = ORIGINAL_FETCH))

  it('avances: cada avance con fecha, fase y tipo, resultado, acuerdos, fotos y documentos', async () => {
    mockBackend({ avances: [REALIZADA] })
    const pagina = await html('/ordena/poetdum/avances')
    expect(pagina).toContain('Avances del Programa')
    expect(pagina).toContain('20 de mayo de 2026')
    expect(pagina).toContain('Firma de convenio')
    expect(pagina).toContain('Convenio firmado.')
    expect(pagina).toContain('Integrar el Comité en 60 días.')
    expect(pagina).toContain(`/ordena/poetdum/archivos/foto-1`)
    expect(pagina).toContain('Ver documento')
    expect(pagina).toContain(`/ordena/poetdum/archivos/${AID}?download=1`)
    expect(pagina).toContain(`/ordena/poetdum/actividades/${ID}`)
  })

  it('avances: el filtro por fase viaja al backend y uno inventado se ignora', async () => {
    const urls = mockBackend()
    await html('/ordena/poetdum/avances?fase=Evaluaci%C3%B3n')
    expect(urls.some((u) => u.includes('vista=avances&fase=Evaluaci%C3%B3n'))).toBe(true)
    await html('/ordena/poetdum/avances?fase=<script>')
    expect(urls.some((u) => u.includes('script'))).toBe(false)
  })

  it('calendario: por omisión el mes actual; un ?mes= inválido no rompe', async () => {
    const urls = mockBackend()
    const mesActual = hoyEnMexico().slice(0, 7)
    await html('/ordena/poetdum/calendario')
    expect(urls.some((u) => u.includes(`vista=calendario&mes=${mesActual}`))).toBe(true)
    await html('/ordena/poetdum/calendario?mes=2026-99')
    expect(urls.filter((u) => u.includes(`mes=${mesActual}`))).toHaveLength(2)
  })

  it('calendario: cada actividad enlaza a su ficha y aparece en la agenda del mes', async () => {
    mockBackend({ calendario: [REALIZADA] })
    const pagina = await html('/ordena/poetdum/calendario?mes=2026-05')
    expect(pagina).toContain('Mayo 2026')
    expect(pagina).toContain('Actividades de mayo de 2026')
    expect(pagina).toContain(`href="/ordena/poetdum/actividades/${ID}"`)
    expect(pagina).toContain('id="dia-2026-05-20"')
    expect(pagina).toContain('href="/ordena/poetdum/calendario?mes=2026-04"')
    expect(pagina).toContain('href="/ordena/poetdum/calendario?mes=2026-06"')
  })

  it('calendario: en años de 3 cifras conserva el mes; en los extremos no ofrece botón', async () => {
    const urls = mockBackend()
    const enero100 = await html('/ordena/poetdum/calendario?mes=0100-01')
    expect(urls.some((u) => u.includes('vista=calendario&mes=0100-01'))).toBe(true)
    expect(enero100).toContain('Enero 100')
    expect(enero100).toContain('href="/ordena/poetdum/calendario?mes=0100-02"')
    expect(enero100).not.toContain('aria-label="Mes anterior"')

    const diciembre9999 = await html('/ordena/poetdum/calendario?mes=9999-12')
    expect(diciembre9999).toContain('href="/ordena/poetdum/calendario?mes=9999-11"')
    expect(diciembre9999).not.toContain('aria-label="Mes siguiente"')
  })

  it('ficha: datos completos, cómo llegar, documentos y fotografías', async () => {
    mockBackend({ ficha: REALIZADA })
    const pagina = await html(`/ordena/poetdum/actividades/${ID}`)
    expect(pagina).toContain('Firma del convenio con SEMADET')
    expect(pagina).toContain('Miércoles 20 de mayo de 2026')
    expect(pagina).toContain('Palacio Municipal')
    expect(pagina).toContain('Cómo llegar')
    expect(pagina).toContain(
      'https://www.google.com/maps/search/?api=1&amp;query=20.6409,-103.3126',
    )
    expect(pagina).toContain('Resultado')
    expect(pagina).toContain('Principales acuerdos')
    expect(pagina).toContain('Convenio firmado')
    expect(pagina).toContain('Fotografías')
  })

  it('ficha: una actividad sin publicar o inexistente es un 404', async () => {
    mockBackend({ ficha: null })
    await html(`/ordena/poetdum/actividades/${ID}`, 404)
  })

  it('seguimiento: mientras no esté aprobado muestra el aviso y no consulta indicadores', async () => {
    const urls = mockBackend({ aprobado: false })
    const pagina = await html('/ordena/poetdum/seguimiento')
    expect(pagina).toContain(
      'Esta sección estará disponible una vez aprobado el Programa. Aquí se publicarán los indicadores y resultados de su aplicación y evaluación.',
    )
    expect(urls.some((u) => u.includes('/api/indicadores'))).toBe(false)
  })

  it('seguimiento: aprobado, muestra indicadores, metas, mediciones y respaldo', async () => {
    mockBackend({
      aprobado: true,
      indicadores: [
        {
          id: 'i1',
          nombre: 'Hectáreas bajo manejo sustentable',
          descripcion: '',
          unidad: 'ha',
          meta: '5000',
          fecha_evaluacion: '2026-12-31',
          resultado_texto: 'En línea con la meta.',
          updated_at: '2026-09-01T12:00:00Z',
          documento_respaldo: { id: AID, titulo: 'Informe', tipo: 'Otro', actividad_id: ID },
          mediciones: [{ id: 'm1', periodo: '2026-T1', valor: '2500' }],
        },
      ],
    })
    const pagina = await html('/ordena/poetdum/seguimiento')
    expect(pagina).toContain('Hectáreas bajo manejo sustentable')
    expect(pagina).toContain('Meta: 5000 ha')
    expect(pagina).toContain('50% de la meta')
    expect(pagina).toContain('En línea con la meta.')
    expect(pagina).toContain('Actualizado:')
    expect(pagina).toContain(`/ordena/poetdum/archivos/${AID}`)
    expect(pagina).not.toContain('Esta sección estará disponible')
  })

  it('archivos: se reenvían tipo, disposición y caché, sin cookies del backend', async () => {
    mockBackend()
    const res = await router.fetch(new Request(`http://localhost/ordena/poetdum/archivos/${AID}`))
    expect(res?.status).toBe(200)
    expect(res?.headers.get('content-type')).toBe('application/pdf')
    expect(res?.headers.get('content-disposition')).toContain('inline')
    expect(res?.headers.get('cache-control')).toBe('public, max-age=300')
    expect(res?.headers.get('content-security-policy')).toBe(
      "default-src 'none'; frame-ancestors 'self'",
    )
    expect(res?.headers.get('set-cookie')).toBeNull()
  })

  it('archivos: uno inexistente o de un borrador es un 404', async () => {
    mockBackend()
    const res = await router.fetch(new Request('http://localhost/ordena/poetdum/archivos/otro'))
    expect(res?.status).toBe(404)
  })

  describe('enlaces de la versión anterior', () => {
    const redirige = async (desde: string, hacia: string) => {
      mockBackend()
      const res = await router.fetch(new Request(`http://localhost${desde}`))
      expect(res?.status, desde).toBe(301)
      expect(res?.headers.get('location'), desde).toBe(hacia)
    }

    it('indicadores → seguimiento', () =>
      redirige('/ordena/poetdum/indicadores', '/ordena/poetdum/seguimiento'))
    it('actividades realizadas → avances', () =>
      redirige('/ordena/poetdum/actividades?estado=realizadas', '/ordena/poetdum/avances'))
    it('descarga de un documento del repositorio → su archivo', () =>
      redirige(
        `/ordena/poetdum/documentos/${AID}/archivo?download=1`,
        `/ordena/poetdum/archivos/${AID}?download=1`,
      ))
    it('foto de una actividad → su archivo', () =>
      redirige(`/ordena/poetdum/actividades/${ID}/fotos/${AID}`, `/ordena/poetdum/archivos/${AID}`))
  })
})
