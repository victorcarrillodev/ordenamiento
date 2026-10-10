import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { router } from '../../router.ts'

/**
 * /admin/estadisticas y la vista general: cada gráfica con los números que entrega
 * el backend, en las tres vistas (totales, digitales y físicas).
 *
 * El backend se simula con tres conjuntos coherentes entre sí (47 = 32 + 15) para
 * comprobar que cada pestaña dibuja SU conjunto y que las cifras que se derivan
 * (porcentajes, ejes distintos, totales de las pestañas) cuadran con las gráficas.
 */

const originalFetch = globalThis.fetch

const ADMIN = { id: '1', name: 'Ana Admin', role: 'admin', email: 'ana@tlaquepaque.gob.mx' }

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  })
}

const CONTENIDO = {
  actividades: 6,
  proximas: 3,
  realizadas: 2,
  borradores: 1,
  avisosVigentes: 1,
  indicadores: 4,
}

/** Lo que `/api/stats` devuelve sin filtro: todas las participaciones. */
const GLOBAL = {
  usuarios: 4,
  digitales: 32,
  fisicas: 15,
  resultado: [
    { estado: 'Procedente', total: 16 },
    { estado: 'En proceso', total: 16 },
    { estado: 'No procedente', total: 15 },
  ],
  fuente: [
    ['Dependencia', 20],
    ['Empresa', 15],
    ['Organización', 12],
  ],
  genero: [
    ['Hombre', 20],
    ['Mujer', 20],
  ],
  tematica: [
    ['Equipamiento', 30],
    ['Movilidad', 10],
    ['Vivienda', 7],
  ],
  contenido: CONTENIDO,
  participacionesPorMes: [
    { mes: '2026-08', total: 30 },
    { mes: '2026-09', total: 0 },
    { mes: '2026-10', total: 17 },
  ],
  proximaActividad: null,
  avisos: [],
}

const DIGITAL = {
  ...GLOBAL,
  resultado: [
    { estado: 'Procedente', total: 10 },
    { estado: 'En proceso', total: 12 },
    { estado: 'No procedente', total: 10 },
  ],
  fuente: [['Persona ciudadana', 32]],
  genero: [
    ['Mujer', 18],
    ['Hombre', 14],
  ],
  tematica: [
    ['Servicios Ambientales', 22],
    ['Gestión del Agua', 10],
  ],
  participacionesPorMes: [{ mes: '2026-10', total: 32 }],
}

const FISICA = {
  ...GLOBAL,
  resultado: [
    { estado: 'Procedente', total: 6 },
    { estado: 'En proceso', total: 4 },
    { estado: 'No procedente', total: 5 },
  ],
  fuente: [['Dependencia', 15]],
  genero: [['Otro', 15]],
  tematica: [['Infraestructura', 15]],
  participacionesPorMes: [{ mes: '2026-09', total: 15 }],
}

/** Backend que responde según el `?origen=` de /api/stats. Devuelve las URLs pedidas. */
function backend(opciones: { global?: unknown; digital?: unknown; fisica?: unknown } = {}) {
  const pedidas: string[] = []
  globalThis.fetch = vi.fn().mockImplementation((input: RequestInfo | URL) => {
    const url = String(input)
    pedidas.push(url)
    if (url.includes('/api/auth/me')) return Promise.resolve(json({ user: ADMIN }))
    if (url.includes('/api/stats')) {
      if (url.includes('origen=digital')) return Promise.resolve(json(opciones.digital ?? DIGITAL))
      if (url.includes('origen=fisica')) return Promise.resolve(json(opciones.fisica ?? FISICA))
      return Promise.resolve(json(opciones.global ?? GLOBAL))
    }
    return Promise.resolve(json({}))
  })
  return pedidas
}

const get = async (ruta: string) => {
  const res = await router.fetch(new Request(`http://localhost${ruta}`))
  return { status: res?.status, html: (await res?.text()) ?? '' }
}

const texto = (html: string) => html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ')

beforeEach(() => vi.restoreAllMocks())
afterEach(() => {
  globalThis.fetch = originalFetch
})

describe('Estadísticas · las tres vistas', () => {
  it('pide al backend las tres: sin filtro, digitales y físicas', async () => {
    const pedidas = backend()
    await get('/ordena/admin/estadisticas')
    const stats = pedidas.filter((u) => u.includes('/api/stats'))
    expect(stats).toHaveLength(3)
    expect(stats.some((u) => u.endsWith('/api/stats'))).toBe(true)
    expect(stats.some((u) => u.includes('origen=digital'))).toBe(true)
    expect(stats.some((u) => u.includes('origen=fisica'))).toBe(true)
  })

  it('abre en Totales; las pestañas son enlaces y cada una trae el total de su ámbito', async () => {
    backend()
    const { status, html } = await get('/ordena/admin/estadisticas')
    expect(status).toBe(200)

    expect(html).toContain('aria-selected="true" href="/ordena/admin/estadisticas"')
    const t = texto(html)
    expect(t).toMatch(/Totales\s+47/)
    expect(t).toMatch(/Digitales\s+32/)
    expect(t).toMatch(/Físicas\s+15/)
    expect(html).toContain('href="/ordena/admin/estadisticas?vista=digital"')
    expect(html).toContain('href="/ordena/admin/estadisticas?vista=fisica"')
  })

  it('un ?vista= inventado cae en Totales', async () => {
    backend()
    const { html } = await get('/ordena/admin/estadisticas?vista=cualquiera')
    expect(html).toContain('aria-selected="true" href="/ordena/admin/estadisticas"')
  })

  describe('Totales', () => {
    it('las cifras de arriba cuadran con las gráficas', async () => {
      backend()
      const t = texto((await get('/ordena/admin/estadisticas')).html)

      // Total = digitales + físicas; procedentes y su porcentaje del total.
      expect(t).toMatch(/Participaciones \| Total del periodo 47/)
      expect(t).toMatch(/Procedentes \| 34% del total 16/)
      expect(t).toMatch(/En proceso \| Pendientes de dictamen 16/)
      // Ejes temáticos distintos = categorías de la gráfica de ejes.
      expect(t).toMatch(/Ejes temáticos \| Distintos abordados 3/)
    })

    it('compara digitales frente a físicas con sus totales', async () => {
      backend()
      const t = texto((await get('/ordena/admin/estadisticas')).html)
      expect(t).toContain('Digitales frente a físicas')
      expect(t).toContain('Digitales 32 68%')
      expect(t).toContain('Físicas 15 32%')
    })

    it('la dona del dictamen suma todas las participaciones y se llama así', async () => {
      backend()
      const { html } = await get('/ordena/admin/estadisticas')
      expect(html).toMatch(/<text[^>]*>47<\/text>/)
      expect(html).toContain('aria-label="Participaciones: 47"')
      expect(html).not.toContain('Dictaminadas')
      const t = texto(html)
      expect(t).toContain('Procedente 16 34%')
      expect(t).toContain('En proceso 16 34%')
      expect(t).toContain('No procedente 15 32%')
    })

    it('eje temático, sector y género traen sus categorías y cuántas están clasificadas', async () => {
      backend()
      const t = texto((await get('/ordena/admin/estadisticas')).html)
      expect(t).toContain('Eje temático 47 clasificadas')
      expect(t).toContain('Equipamiento 30')
      expect(t).toContain('Sector o actor 47 clasificadas')
      expect(t).toContain('Dependencia 20')
      expect(t).toContain('Género 40 clasificadas')
      expect(t).toContain('Mujer 20')
    })

    it('«clasificadas» no cuenta lo que no se clasificó', async () => {
      backend({ global: { ...GLOBAL, genero: [['Mujer', 5]] } })
      const t = texto((await get('/ordena/admin/estadisticas')).html)
      // Hay 47 participaciones pero solo 5 con género: la gráfica lo dice.
      expect(t).toContain('Género 5 clasificadas')
    })

    it('la serie por mes enseña los meses sin participaciones con 0', async () => {
      backend()
      const t = texto((await get('/ordena/admin/estadisticas')).html)
      expect(t).toMatch(/30 ago 26\s+0 sep 26\s+17 oct 26/)
    })
  })

  describe('Digitales', () => {
    it('dibuja el conjunto digital, con su total, y sin la comparativa', async () => {
      backend()
      const { html } = await get('/ordena/admin/estadisticas?vista=digital')
      const t = texto(html)

      expect(html).toContain('aria-selected="true" href="/ordena/admin/estadisticas?vista=digital"')
      expect(t).toContain('Participaciones enviadas por la ciudadanía desde el portal web.')
      expect(t).toMatch(/Participaciones \| Total del periodo 32/)
      expect(t).toMatch(/Procedentes \| 31% del total 10/)
      expect(t).toMatch(/Ejes temáticos \| Distintos abordados 2/)
      expect(html).toMatch(/<text[^>]*>32<\/text>/)
      expect(t).toContain('Persona ciudadana 32')
      expect(t).toContain('Servicios Ambientales 22')
      expect(t).not.toContain('Digitales frente a físicas')
      // Y nada del conjunto físico.
      expect(t).not.toContain('Infraestructura')
    })

    it('su serie por mes es la digital, no la global', async () => {
      backend()
      const t = texto((await get('/ordena/admin/estadisticas?vista=digital')).html)
      expect(t).toMatch(/Participaciones por mes\s+32 oct 26/)
      expect(t).not.toContain('ago 26')
    })
  })

  describe('Físicas', () => {
    it('dibuja el conjunto físico, con su total, y sin la comparativa', async () => {
      backend()
      const { html } = await get('/ordena/admin/estadisticas?vista=fisica')
      const t = texto(html)

      expect(t).toContain('Participaciones capturadas en ventanilla u oficialía de partes.')
      expect(t).toMatch(/Participaciones \| Total del periodo 15/)
      expect(t).toMatch(/Procedentes \| 40% del total 6/)
      expect(html).toMatch(/<text[^>]*>15<\/text>/)
      expect(t).toContain('Infraestructura 15')
      expect(t).toContain('Otro 15 100%')
      expect(t).not.toContain('Digitales frente a físicas')
      expect(t).not.toContain('Persona ciudadana')
    })
  })

  describe('Casos extremos', () => {
    it('sin participaciones: ceros en las cifras y «Sin datos todavía» en cada gráfica, sin NaN', async () => {
      const vacio = {
        ...GLOBAL,
        digitales: 0,
        fisicas: 0,
        resultado: [],
        fuente: [],
        genero: [],
        tematica: [],
        participacionesPorMes: [],
      }
      backend({ global: vacio, digital: vacio, fisica: vacio })
      const { status, html } = await get('/ordena/admin/estadisticas')

      expect(status).toBe(200)
      expect(html).not.toContain('NaN')
      expect(html).not.toContain('undefined')
      const t = texto(html)
      expect(t).toMatch(/Procedentes \| 0% del total 0/)
      expect(t).toMatch(/Ejes temáticos \| Distintos abordados 0/)
      // Dictamen, eje, sector, género y mes: cinco gráficas vacías.
      expect(t.match(/Sin datos todavía/g)).toHaveLength(5)
    })

    it('si el backend no responde, la pantalla carga con todo en cero en vez de romperse', async () => {
      globalThis.fetch = vi.fn().mockImplementation((input: RequestInfo | URL) => {
        if (String(input).includes('/api/auth/me')) return Promise.resolve(json({ user: ADMIN }))
        return Promise.resolve(json({ error: 'caído' }, 503))
      })
      const { status, html } = await get('/ordena/admin/estadisticas')
      expect(status).toBe(200)
      expect(html).not.toContain('NaN')
      expect(texto(html)).toMatch(/Participaciones \| Total del periodo 0/)
    })

    it('un backend que devuelve una forma incompleta no revienta las gráficas', async () => {
      backend({ global: { digitales: 1, fisicas: 1 }, digital: { digitales: 1 }, fisica: {} })
      const { status, html } = await get('/ordena/admin/estadisticas')
      expect(status).toBe(200)
      expect(html).not.toContain('undefined')
    })

    it('todas las participaciones en un solo eje: una barra al 100 %', async () => {
      backend({ global: { ...GLOBAL, tematica: [['Equipamiento', 47]] } })
      const t = texto((await get('/ordena/admin/estadisticas')).html)
      expect(t).toContain('Equipamiento 47 100%')
    })
  })
})

describe('Vista general · gráficas', () => {
  it('la dona y la serie mensual son las mismas que en Estadísticas', async () => {
    backend()
    const { status, html } = await get('/ordena/admin')
    expect(status).toBe(200)
    const t = texto(html)
    expect(t).toContain('47 en total')
    expect(html).toMatch(/<text[^>]*>47<\/text>/)
    expect(html).not.toContain('Dictaminadas')
    expect(t).toContain('Procedente 16 34%')
    expect(t).toMatch(/30 ago 26\s+0 sep 26\s+17 oct 26/)
  })

  it('sin participaciones no dibuja nada vacío', async () => {
    backend({
      global: { ...GLOBAL, digitales: 0, fisicas: 0, resultado: [], participacionesPorMes: [] },
    })
    const { html } = await get('/ordena/admin')
    expect(html).not.toContain('NaN')
    expect(texto(html).match(/Sin datos todavía/g)?.length).toBeGreaterThanOrEqual(2)
  })
})
