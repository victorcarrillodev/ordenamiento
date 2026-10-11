/**
 * Listado de participaciones físicas y digitales: búsqueda, filtros con cifras,
 * la celda de Seguimiento (icono, título y pista en dos renglones), acciones con
 * nombre, estado vacío y paginación que no pierde los filtros.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { router } from '../../router.ts'
import { formatearFecha } from '../../ui/admin/formato.ts'

const ORIGINAL_FETCH = globalThis.fetch

interface Fila {
  id: string
  folio: string
  origen: string
  nombre: string
  estado: string
  fecha: string
  notificado_en?: string | null
  adjuntos: Array<{ id: string; nombre_original: string; mime: string; size: number }>
}

const RESUMEN = {
  total: 7,
  etapas: { 'En proceso': 2, Dictaminada: 3, Notificada: 2 },
  estados: { Procedente: 4, 'En proceso': 2, 'No procedente': 1 },
}

interface Escenario {
  items?: Fila[]
  total?: number
  page?: number
  limit?: number
  /** Qué responde `/api/participations/resumen`. */
  resumen?: { status: number; cuerpo: unknown }
}

/** URLs que pidió la pantalla al backend, en orden, sin las de sesión. */
let pedidas: string[] = []

function backend(e: Escenario = {}) {
  pedidas = []
  const json = (cuerpo: unknown, status = 200) =>
    Promise.resolve(
      new Response(JSON.stringify(cuerpo), {
        status,
        headers: { 'content-type': 'application/json' },
      }),
    )
  globalThis.fetch = vi.fn().mockImplementation((entrada: string | URL | Request) => {
    const url =
      typeof entrada === 'string'
        ? entrada
        : entrada instanceof Request
          ? entrada.url
          : `${entrada}`
    if (url.includes('/api/auth/me')) {
      return json({ user: { id: 1, name: 'Admin', role: 'admin' } })
    }
    if (url.includes('/api/participations')) {
      pedidas.push(url)
      if (url.includes('/api/participations/resumen')) {
        const r = e.resumen ?? { status: 200, cuerpo: RESUMEN }
        return json(r.cuerpo, r.status)
      }
      const items = e.items ?? []
      return json({
        items,
        total: e.total ?? items.length,
        page: e.page ?? 1,
        limit: e.limit ?? 10,
      })
    }
    return json({ ok: true })
  }) as unknown as typeof fetch
}

/** La petición de LISTADO al backend (no la del resumen). */
function peticionDeLista(): URL {
  const url = pedidas.find((u) => !u.includes('/resumen'))
  expect(url, 'la pantalla debe pedir el listado').toBeDefined()
  return new URL(url!, 'http://backend.test')
}

async function abrir(ruta: string): Promise<string> {
  const res = await router.fetch(
    new Request(`http://localhost/ordena/admin/participaciones${ruta}`),
  )
  expect(res?.status).toBe(200)
  return (await res?.text()) ?? ''
}

/**
 * Lo que hay dentro de la celda con ese rótulo (`data-label`). Se busca por el rótulo
 * y no por el orden de los atributos: el renderizador escribe `class` al final.
 */
function celdaDe(html: string, rotulo: string): string {
  const celda = html.match(new RegExp(`<td[^>]*data-label="${rotulo}"[^>]*>([\\s\\S]*?)</td>`))
  expect(celda, `debe haber una celda «${rotulo}»`).not.toBeNull()
  return celda![1]
}

function fila(extra: Partial<Fila> = {}): Fila {
  return {
    id: 'p-1',
    folio: 'SPAGU-DGTPU-E-0001',
    origen: 'digital',
    nombre: 'Lucía Herrera',
    estado: 'En proceso',
    fecha: '2026-09-02T18:24:00.000Z',
    notificado_en: null,
    adjuntos: [],
    ...extra,
  }
}

beforeEach(() => vi.restoreAllMocks())
afterEach(() => {
  globalThis.fetch = ORIGINAL_FETCH
})

describe('Participaciones · búsqueda y filtros', () => {
  it('manda al backend la búsqueda recortada, el dictamen y la etapa, y los conserva en pantalla', async () => {
    backend({ items: [fila()] })
    const html = await abrir(
      '?origen=fisica&etapa=Dictaminada&estado=Procedente&q=%20Luc%C3%ADa%20',
    )

    const lista = peticionDeLista()
    expect(lista.searchParams.get('origen')).toBe('fisica')
    expect(lista.searchParams.get('etapa')).toBe('Dictaminada')
    expect(lista.searchParams.get('estado')).toBe('Procedente')
    expect(lista.searchParams.get('q')).toBe('Lucía')

    expect(html).toContain('value="Lucía"')
    // La etapa activa viaja como campo oculto: buscar no debe soltarla.
    expect(html).toMatch(/<input[^>]*name="etapa"[^>]*value="Dictaminada"/)
    expect(html).toMatch(/<option[^>]*value="Procedente"[^>]*selected/)
  })

  it('ignora una etapa o un dictamen inventados y una búsqueda de una sola letra', async () => {
    backend()
    await abrir('?etapa=Nada&estado=Otro&q=a')

    const lista = peticionDeLista()
    expect(lista.searchParams.has('etapa')).toBe(false)
    expect(lista.searchParams.has('estado')).toBe(false)
    // El backend la ignoraría; aquí tampoco se manda, para no aparentar un filtro.
    expect(lista.searchParams.has('q')).toBe(false)
  })

  it('escapa el texto buscado al devolverlo en el campo', async () => {
    backend()
    const html = await abrir(`?q=${encodeURIComponent('"><script>alert(1)</script>')}`)
    expect(html).not.toContain('<script>alert(1)</script>')
    expect(html).toContain('&lt;script&gt;')
  })

  it('pide las cifras del mismo origen y las pone en cada filtro', async () => {
    backend({ items: [fila()] })
    const html = await abrir('?origen=fisica')

    const resumen = pedidas.find((u) => u.includes('/resumen'))
    expect(resumen).toBeDefined()
    expect(new URL(resumen!, 'http://backend.test').searchParams.get('origen')).toBe('fisica')

    // Todas = total, y una cifra por etapa, en el orden del trámite.
    const cifras = [...html.matchAll(/etapa-filtro__n">(\d+)</g)].map((m) => Number(m[1]))
    expect(cifras).toEqual([7, 2, 3, 2])
    expect(html).toContain('Procedente (4)')
    expect(html).toContain('No procedente (1)')
  })

  it.each([
    ['con otra forma', { status: 200, cuerpo: { ok: true } }],
    [
      'con cifras que no son números',
      { status: 200, cuerpo: { total: 'x', etapas: {}, estados: {} } },
    ],
    ['con un error del servidor', { status: 500, cuerpo: { error: 'boom' } }],
  ])(
    'si el resumen llega %s, el listado se ve igual y los filtros salen sin cifra',
    async (_caso, resumen) => {
      backend({ items: [fila()], resumen })
      const html = await abrir('')

      expect(html).toContain('Lucía Herrera')
      expect(html).not.toContain('etapa-filtro__n')
      expect(html).not.toMatch(/Procedente \(\d+\)/)
      expect(html).not.toContain('NaN')
    },
  )
})

describe('Participaciones · celda de Seguimiento', () => {
  it('pone el icono, luego el título y luego la pista, en dos renglones y no en tres', async () => {
    backend({ items: [fila()] })
    const celda = celdaDe(await abrir(''), 'Seguimiento')

    const icono = celda.indexOf('etapa-badge__icono')
    const titulo = celda.indexOf('<strong>En proceso</strong>')
    const pista = celda.indexOf('<small>Falta dictaminar</small>')
    // Orden: icono → título → pista.
    expect(icono).toBeGreaterThanOrEqual(0)
    expect(titulo).toBeGreaterThan(icono)
    expect(pista).toBeGreaterThan(titulo)
    // El título y la pista comparten un solo bloque de texto, al lado del icono.
    expect(celda).toMatch(
      /<span class="etapa-badge__texto"><strong>[^<]*<\/strong><small>[^<]*<\/small><\/span>/,
    )
    // Sin saltos de línea forzados ni un tercer bloque de texto.
    expect(celda).not.toContain('<br')
    expect(celda.match(/<small>/g)).toHaveLength(1)
  })

  it('el icono es un dibujo en línea, no un emoji', async () => {
    backend({ items: [fila()] })
    const html = await abrir('')
    for (const emoji of ['⏳', '◐', '✓']) expect(html).not.toContain(emoji)
    expect(celdaDe(html, 'Seguimiento')).toMatch(
      /class="etapa-badge__icono"><svg [^>]*class="icono"/,
    )
  })

  it('si ya se avisó al ciudadano, la pista dice cuándo', async () => {
    backend({
      items: [fila({ estado: 'Procedente', notificado_en: '2026-09-03T16:00:00.000Z' })],
    })
    const celda = celdaDe(await abrir(''), 'Seguimiento')
    expect(celda).toContain('<strong>Datos enviados</strong>')
    expect(celda).toContain(
      `<small>Enviado el ${formatearFecha('2026-09-03T16:00:00.000Z')}</small>`,
    )
  })

  it('la etapa terminada avisa que falta notificar', async () => {
    backend({ items: [fila({ estado: 'No procedente' })] })
    const celda = celdaDe(await abrir(''), 'Seguimiento')
    expect(celda).toContain('<strong>Terminada</strong>')
    expect(celda).toContain('<small>Falta avisar al ciudadano</small>')
  })
})

describe('Participaciones · filas', () => {
  it('une nombre y folio en una celda y enlaza el nombre al detalle', async () => {
    backend({ items: [fila()] })
    const html = await abrir('')
    expect(html).toMatch(
      /<a[^>]*href="[^"]*\/admin\/participaciones\/p-1"[^>]*class="celda-doble__titulo"[^>]*>Lucía Herrera<\/a>|<a[^>]*class="celda-doble__titulo"[^>]*href="[^"]*\/admin\/participaciones\/p-1"[^>]*>Lucía Herrera<\/a>/,
    )
    expect(html).toContain('celda-doble__sub--folio')
    expect(html).toContain('SPAGU-DGTPU-E-0001')
  })

  it('escribe la fecha y la hora de Tlaquepaque, no las del servidor', async () => {
    backend({ items: [fila({ fecha: '2026-09-02T18:24:00.000Z' })] })
    const html = await abrir('')
    // 18:24 UTC son las 12:24 en America/Mexico_City.
    const celda = celdaDe(html, 'Registro')
    expect(celda).toContain(formatearFecha('2026-09-02T18:24:00.000Z'))
    expect(celda).toContain('12:24 h')
  })

  it('«Ver» lleva el folio en su nombre accesible y el acuse se descarga con nombre', async () => {
    backend({ items: [fila()] })
    const html = await abrir('')
    expect(html).toContain('aria-label="Ver el detalle del folio SPAGU-DGTPU-E-0001"')
    expect(html).toContain('aria-label="Descargar el acuse PDF del folio SPAGU-DGTPU-E-0001"')
    expect(html).toContain('download="Acuse SPAGU-DGTPU-E-0001.pdf"')
    // Cada acción con icono conserva su palabra (se oculta con CSS solo si falta ancho).
    expect(html).toMatch(/<span class="btn__texto">Acuse<\/span>/)
  })

  it('«Datos» (.docx) solo aparece si la participación trae archivos', async () => {
    backend({ items: [fila()] })
    expect(await abrir('')).not.toContain('btn__texto">Datos<')

    backend({
      items: [
        fila({
          adjuntos: [
            { id: 'a1', nombre_original: 'formato.pdf', mime: 'application/pdf', size: 2048 },
          ],
        }),
      ],
    })
    const html = await abrir('')
    expect(html).toMatch(/<span class="btn__texto">Datos<\/span>/)
    expect(html).toContain('aria-label="Descargar los datos del folio SPAGU-DGTPU-E-0001 en Word"')
  })

  it('cuenta los archivos y deja sus nombres en el tooltip, sin ensanchar la tabla', async () => {
    backend({
      items: [
        fila({
          adjuntos: [
            { id: 'a1', nombre_original: 'formato.pdf', mime: 'application/pdf', size: 2048 },
            {
              id: 'a2',
              nombre_original: 'un-nombre-larguisimo-que-antes-ensanchaba-la-columna.pdf',
              mime: 'application/pdf',
              size: 3 * 1024 * 1024,
            },
          ],
        }),
      ],
    })
    const html = await abrir('')
    expect(html).toContain('2 archivos')
    const tooltip = html.match(/<span[^>]*title="([^"]*)"[^>]*class="archivos"/)?.[1] ?? ''
    expect(tooltip).not.toBe('')
    expect(tooltip).toContain('formato.pdf (2 KB)')
    expect(tooltip).toContain('un-nombre-larguisimo-que-antes-ensanchaba-la-columna.pdf (3.0 MB)')
    // El nombre completo ya no se pinta en la celda.
    expect(html.replace(tooltip, '')).not.toContain('un-nombre-larguisimo')
  })

  it('sin archivos, el lector de pantalla oye «Sin archivos» y no un guion suelto', async () => {
    backend({ items: [fila()] })
    const html = await abrir('')
    expect(html).toContain('<span class="solo-lector">Sin archivos</span>')
    expect(html).not.toContain('sin PDF')
  })

  it('cada celda lleva su rótulo para la vista de tarjetas', async () => {
    backend({ items: [fila()] })
    const html = await abrir('')
    for (const rotulo of [
      'Participación',
      'Dictamen',
      'Seguimiento',
      'Registro',
      'Archivos',
      'Acciones',
    ]) {
      expect(html).toContain(`data-label="${rotulo}"`)
      expect(html).toMatch(new RegExp(`<th[^>]*scope="col"[^>]*>\\s*${rotulo}\\s*</th>`))
    }
  })
})

describe('Participaciones · estado vacío', () => {
  it('sin filtros en digitales explica que todavía no llega nada, sin tabla', async () => {
    backend()
    const html = await abrir('?origen=digital')
    expect(html).toContain('No hay registros')
    expect(html).toContain('Todavía no ha llegado ninguna participación desde el portal')
    expect(html).not.toContain('<table')
    expect(html).not.toContain('Quitar filtros')
  })

  it('con filtros ofrece quitarlos, y el enlace conserva solo el origen', async () => {
    backend()
    const html = await abrir('?origen=digital&estado=Procedente&q=zzzz')
    expect(html).toContain('Ninguna participación coincide')
    expect(html).toMatch(
      /href="[^"]*\/admin\/participaciones\?origen=digital"[^>]*>[\s\S]*?Quitar filtros/,
    )
  })

  it('en físicas sin registros invita a capturar la primera', async () => {
    backend()
    const html = await abrir('?origen=fisica')
    expect(html).toContain('Todavía no se ha capturado ninguna participación en ventanilla')
    expect(html).toMatch(
      /href="[^"]*\/admin\/participaciones\/presencial"[^>]*>[\s\S]*?Registrar participación/,
    )
  })
})

describe('Participaciones · paginación con filtros', () => {
  const filas = Array.from({ length: 10 }, (_, i) =>
    fila({ id: `p-${i}`, folio: `F-${i}`, nombre: `N${i}` }),
  )

  it('las páginas conservan etapa, dictamen y búsqueda', async () => {
    backend({ items: filas, total: 25, page: 2, limit: 10 })
    const html = await abrir('?origen=fisica&etapa=Notificada&estado=Procedente&q=ana&page=2')

    const siguiente = html.match(/href="([^"]*)"[^>]*>\s*Siguiente/)?.[1] ?? ''
    const url = new URL(siguiente.replaceAll('&amp;', '&'), 'http://localhost')
    expect(url.searchParams.get('origen')).toBe('fisica')
    expect(url.searchParams.get('etapa')).toBe('Notificada')
    expect(url.searchParams.get('estado')).toBe('Procedente')
    expect(url.searchParams.get('q')).toBe('ana')
    expect(url.searchParams.get('page')).toBe('3')
    expect(url.searchParams.get('limit')).toBe('10')
  })

  it('ofrece cambiar el tamaño de página sin perder los filtros y vuelve a la primera', async () => {
    backend({ items: filas, total: 25, page: 2, limit: 10 })
    const html = await abrir('?origen=digital&etapa=Dictaminada&page=2')

    const grupo = html.match(/class="paginacion__tamano"[\s\S]*?<\/div>/)?.[0] ?? ''
    expect(grupo).toContain('Por página')
    const enlace = grupo.match(/href="([^"]*limit=50[^"]*)"/)?.[1] ?? ''
    const url = new URL(enlace.replaceAll('&amp;', '&'), 'http://localhost')
    expect(url.searchParams.get('limit')).toBe('50')
    expect(url.searchParams.get('page')).toBe('1')
    expect(url.searchParams.get('etapa')).toBe('Dictaminada')
    // El tamaño en uso se marca como actual.
    expect(grupo).toMatch(
      /<a[^>]*aria-current="true"[^>]*class="paginacion__link paginacion__link--activo">\s*10\s*</,
    )
  })

  it('con 10 registros o menos no ofrece tamaños de página (no habría diferencia)', async () => {
    backend({ items: filas, total: 10, page: 1, limit: 10 })
    expect(await abrir('')).not.toContain('paginacion__tamano')
  })

  it('con un solo registro habla en singular', async () => {
    backend({ items: [fila()], total: 1, page: 1, limit: 10 })
    const html = await abrir('')
    expect(html).toContain('Mostrando 1–1 de 1 registro<')
    expect(html).not.toContain('1 registros')
  })

  it('al cambiar de filtro vuelve a la primera página y conserva el tamaño elegido', async () => {
    backend({ items: filas, total: 25, page: 3, limit: 25 })
    const html = await abrir('?origen=digital&limit=25&page=3')

    const enlace = html.match(/href="([^"]*etapa=Notificada[^"]*)"/)?.[1] ?? ''
    const url = new URL(enlace.replaceAll('&amp;', '&'), 'http://localhost')
    expect(url.searchParams.get('etapa')).toBe('Notificada')
    expect(url.searchParams.get('limit')).toBe('25')
    expect(url.searchParams.has('page')).toBe(false)
  })
})
