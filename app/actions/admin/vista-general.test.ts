import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { router } from '../../router.ts'

/**
 * Vista general. Lo que se fija aquí es lo que la persona ve: los iconos de las
 * cuatro cifras de arriba, las dos columnas que se reparten el alto de la ventana
 * (sin barra de desplazamiento mientras todo quepa) y que cada bloque tenga su
 * cabecera, para que ninguno se vea distinto de los demás.
 */

const originalFetch = globalThis.fetch

const ADMIN = { id: '1', name: 'Ana Admin', role: 'admin', email: 'ana@tlaquepaque.gob.mx' }
const ROOT = { id: '2', name: 'Dueña Root', role: 'root', email: 'root@tlaquepaque.gob.mx' }

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  })
}

const AVISO = (n: number) => ({
  actividad_id: `550e8400-e29b-41d4-a716-44665544000${n}`,
  titulo: `Aviso número ${n}`,
  inicio: '2026-10-10',
  fin: '2026-10-24',
  estado: 'vigente' as const,
})

const STATS = {
  usuarios: 4,
  digitales: 5,
  fisicas: 2,
  resultado: [
    { estado: 'Procedente', total: 3 },
    { estado: 'En proceso', total: 2 },
    { estado: 'No procedente', total: 2 },
  ],
  contenido: {
    actividades: 6,
    proximas: 3,
    realizadas: 2,
    borradores: 1,
    avisosVigentes: 1,
    indicadores: 4,
  },
  participacionesPorMes: [{ mes: '2026-10', total: 7 }],
  proximaActividad: {
    id: '550e8400-e29b-41d4-a716-446655440099',
    titulo: 'Segunda sesión ordinaria del Comité',
    fecha: '2026-10-17',
    hora_inicio: '10:00',
    hora_fin: '12:00',
    lugar: 'Salón de Cabildo',
  },
  avisos: [AVISO(1)],
}

function backend(quien: typeof ADMIN | typeof ROOT, stats: unknown = STATS) {
  globalThis.fetch = vi.fn().mockImplementation((input: RequestInfo | URL) => {
    const url = String(input)
    if (url.includes('/api/auth/me')) return Promise.resolve(json({ user: quien }))
    if (url.includes('/api/stats')) return Promise.resolve(json(stats))
    return Promise.resolve(json({}))
  })
}

async function vista(quien: typeof ADMIN | typeof ROOT = ADMIN, stats: unknown = STATS) {
  backend(quien, stats)
  const res = await router.fetch(new Request('http://localhost/ordena/admin'))
  expect(res?.status).toBe(200)
  return (await res?.text()) ?? ''
}

const texto = (html: string) => html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ')

beforeEach(() => vi.restoreAllMocks())
afterEach(() => {
  globalThis.fetch = originalFetch
})

describe('Vista general · se acomoda al alto de la ventana', () => {
  it('marca el contenido como ajustado y reparte el alto entre las dos columnas', async () => {
    const html = await vista()
    expect(html).toMatch(/<main class="content content--ajustada"/)
    expect(html).toContain('class="dash"')
    expect(html).toContain('class="dash__main"')
    expect(html).toContain('class="dash__side"')
    expect(html).toContain('class="dash__fila"')
  })

  it('las pantallas con listas largas NO se ajustan al alto: solo la vista general', async () => {
    backend(ADMIN)
    for (const ruta of ['/ordena/admin/usuarios', '/ordena/admin/estadisticas']) {
      const res = await router.fetch(new Request(`http://localhost${ruta}`))
      expect(await res?.text(), ruta).not.toContain('content--ajustada')
    }
  })

  it('todos los bloques reparten su alto y llevan cabecera (se ven como una sola familia)', async () => {
    const html = await vista()
    const paneles =
      html.match(
        /<div class="panel panel--llena">[\s\S]*?(?=<div class="panel panel--llena">|<\/aside>|$)/g,
      ) ?? []
    // Serie, dictamen, contenido del portal, próxima actividad, avisos y accesos.
    expect(paneles).toHaveLength(6)
    for (const panel of paneles) expect(panel).toContain('class="panel__head"')
  })

  it('la columna de agenda trae sus tres tarjetas', async () => {
    const html = await vista()
    const lateral = html.match(/<aside class="dash__side">[\s\S]*?<\/aside>/)![0]
    expect(lateral.match(/panel--llena/g)).toHaveLength(3)
    const t = texto(lateral)
    for (const titulo of ['Próxima actividad', 'Avisos en la portada', 'Accesos rápidos']) {
      expect(t).toContain(titulo)
    }
  })
})

describe('Vista general · cifras de arriba', () => {
  it('las cuatro tarjetas llevan su icono dibujado (hora, digitales, físicas y usuarios)', async () => {
    const html = await vista()
    const tarjetas = html.match(/<div class="card__icon [a-z]+">[\s\S]*?<\/div>/g) ?? []
    expect(tarjetas).toHaveLength(4)
    for (const tarjeta of tarjetas) {
      expect(tarjeta).toMatch(/<svg[^>]*viewBox="0 0 24 24"/)
      expect(tarjeta).toMatch(/<path[^>]*d="M[^"]{20,}"/)
    }
    // Y no dependen de ningún componente externo.
    expect(html).not.toContain('iconify')
  })

  it('cada tarjeta dice su cifra', async () => {
    const t = texto(await vista())
    expect(t).toMatch(/Digitales \| Desde el portal 5/)
    expect(t).toMatch(/Físicas \| En ventanilla 2/)
    expect(t).toMatch(/Usuarios \| Cuentas del portal 4/)
  })

  it('la hora y la fecha corta comparten renglón en la tarjeta del reloj', async () => {
    const html = await vista()
    const reloj = html.match(
      /<div class="card card--clock">[\s\S]*?<\/div>\s*<\/div>\s*<\/div>/,
    )![0]
    expect(reloj).toContain('class="card__linea"')
    expect(reloj).toMatch(/id="live-clock-time"[^>]*>\s*\d{2}:\d{2} (am|pm)/)
    // «10 oct 2026»: la fecha larga ya está en el subtítulo de la página.
    expect(reloj).toMatch(/id="live-clock-date"[^>]*>\s*\d{1,2} [a-zñ]{3} \d{4}\s*</)
  })

  it('el subtítulo conserva la fecha completa', async () => {
    const html = await vista()
    expect(html).toMatch(/class="page-subtitle"[^>]*>[^<]*\d{1,2} de [a-zñ]+ de \d{4}/)
  })
})

describe('Vista general · agenda', () => {
  it('la próxima actividad lleva un bloque de fecha con el mes y el día', async () => {
    const html = await vista()
    const bloque = html.match(/<div[^>]*class="reunion__bloque"[^>]*>[\s\S]*?<\/div>/)![0]
    expect(bloque).toContain('>oct<')
    expect(bloque).toContain('>17<')
    const t = texto(html)
    expect(t).toContain('Segunda sesión ordinaria del Comité')
    expect(t).toContain('10:00 – 12:00')
    expect(t).toContain('Salón de Cabildo')
  })

  it('sin actividad programada lo dice, sin bloque de fecha', async () => {
    const html = await vista(ADMIN, { ...STATS, proximaActividad: null })
    expect(html).toContain('Sin actividades programadas')
    expect(html).not.toContain('reunion__bloque')
  })

  it('con una fecha que no es una fecha no rompe la tarjeta', async () => {
    const html = await vista(ADMIN, {
      ...STATS,
      proximaActividad: { ...STATS.proximaActividad, fecha: 'sin-fecha' },
    })
    expect(html).toContain('Segunda sesión ordinaria del Comité')
    expect(html).not.toContain('reunion__bloque')
    expect(html).not.toContain('NaN')
  })

  it('los avisos son pocos para no estirar la columna: dos y «y N más…»', async () => {
    const html = await vista(ADMIN, { ...STATS, avisos: [AVISO(1), AVISO(2), AVISO(3), AVISO(4)] })
    const lista = html.match(/<ul class="lista-avisos">[\s\S]*?<\/ul>/)![0]
    expect(lista.match(/lista-avisos__titulo/g)).toHaveLength(2)
    expect(lista).toContain('Aviso número 1')
    expect(lista).toContain('Aviso número 2')
    expect(lista).not.toContain('Aviso número 3')
    expect(texto(lista)).toContain('y 2 más…')
  })

  it('con uno o dos avisos no hay resumen de «más»', async () => {
    const html = await vista(ADMIN, { ...STATS, avisos: [AVISO(1), AVISO(2)] })
    expect(html).not.toContain('lista-avisos__mas')
  })

  it('las fechas del aviso van en corto y el estado no se parte', async () => {
    const html = await vista()
    const t = texto(html.match(/<ul class="lista-avisos">[\s\S]*?<\/ul>/)![0])
    expect(t).toContain('10 oct – 24 oct')
    expect(t).toContain('Vigente')
  })

  it('sin avisos lo dice', async () => {
    const html = await vista(ADMIN, { ...STATS, avisos: [] })
    expect(html).toContain('Sin avisos vigentes ni programados')
    expect(html).not.toContain('lista-avisos"')
  })
})

describe('Vista general · accesos rápidos', () => {
  const accesos = (html: string) =>
    [...html.matchAll(/<a href="([^"]+)" class="acceso[^"]*">/g)].map((m) => m[1])

  it('un administrador ve tres accesos; el registro de sesiones es de root', async () => {
    const hrefs = accesos(await vista(ADMIN))
    expect(hrefs).toHaveLength(3)
    expect(hrefs.some((h) => h.endsWith('/admin/sesiones'))).toBe(false)
  })

  it('una cuenta root ve los cuatro', async () => {
    const hrefs = accesos(await vista(ROOT))
    expect(hrefs).toHaveLength(4)
    expect(hrefs.some((h) => h.endsWith('/admin/sesiones'))).toBe(true)
  })

  it('cada acceso lleva su icono y su texto', async () => {
    const html = await vista(ROOT)
    const bloques = html.match(/<a href="[^"]+" class="acceso[^"]*">[\s\S]*?<\/a>/g) ?? []
    expect(bloques).toHaveLength(4)
    for (const bloque of bloques) {
      expect(bloque).toContain('<svg')
      expect(texto(bloque).trim().length).toBeGreaterThan(8)
    }
  })

  it('el de Excel se distingue por su color', async () => {
    const html = await vista(ADMIN)
    expect(html).toMatch(/href="[^"]*tabla=actividades" class="acceso acceso--excel"/)
  })
})

describe('Vista general · sin datos', () => {
  it('con el backend caído la vista carga completa, con todo en cero', async () => {
    globalThis.fetch = vi.fn().mockImplementation((input: RequestInfo | URL) => {
      if (String(input).includes('/api/auth/me')) return Promise.resolve(json({ user: ADMIN }))
      return Promise.resolve(json({ error: 'caído' }, 503))
    })
    const res = await router.fetch(new Request('http://localhost/ordena/admin'))
    expect(res?.status).toBe(200)
    const html = (await res?.text()) ?? ''
    expect(html).toContain('content--ajustada')
    expect(html).not.toContain('NaN')
    expect(html).not.toContain('undefined')
  })
})
