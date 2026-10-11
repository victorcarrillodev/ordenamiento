/**
 * Personalización y marca, de punta a punta en el servidor: lo que dibuja cada pestaña con el
 * tema guardado y lo que el controlador manda al backend al guardar. El backend se simula.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { router } from '../../router.ts'
import { capaDePortada } from '../../utils/color.ts'
import { PALETAS_PORTAL } from './personalizacion-datos.ts'

const ORIGINAL_FETCH = globalThis.fetch

const TEMA = {
  usuario: {
    colores: {
      primario: '#8c1d3d',
      acento: '#e0b84a',
      secundario: '#2d6a4f',
      navbarFondo: '#ffffff',
      navbarTexto: '#1a1d26',
      footerFondo: '#0f1117',
      footerTexto: '#ffffff',
      heroGradienteInicio: 'rgba(15,17,23,0.41)',
      heroGradienteCentro: 'rgba(140,29,61,0.35)',
      heroGradienteFin: 'rgba(15,17,23,0.375)',
    },
    imagenes: {
      logoNavbar: '/ordena/assets/img/logo/logo-200x60.webp',
      logoFooter: '/ordena/assets/img/logo/logo-200x60.webp',
      imagenEcologia: '/ordena/assets/img/vector/vector_1.webp',
      imagenPrograma: '/ordena/assets/img/vector/vector_2.webp',
      heroImagenes: ['/ordena/uno.jpg', '/ordena/dos.jpg'],
    },
    iconos: { cardPrograma: '🌳', cardProceso: '📊', cardCalendario: '📅', cardDocumentos: '📈' },
    textos: { heroTitulo: 'Título de prueba del portal' },
  },
  panel: {
    sidebarFondo: '#ffffff',
    sidebarTexto: '#475066',
    topbarFondo: '#2e3440',
    topbarTexto: '#ffffff',
    colorAcento: '#2563eb',
    adminBg: '#f4f6fb',
    adminLogo: '/ordena/assets/img/logo/logo-200x60.webp',
    adminTitulo: 'PANEL\nDE PRUEBA',
  },
}

const LOGS = [
  {
    id: '5d6e3346-ac38-4e7c-8163-ba7aa4b5bba0',
    user_name: 'Ana López',
    user_email: 'ana@x.test',
    motivo: 'Cambio de colores',
    section: 'usuario',
    created_at: '2026-10-09T18:00:00Z',
  },
  {
    id: '7a1b2c3d-0000-4000-8000-000000000001',
    user_name: 'Luis Pérez',
    user_email: 'luis@x.test',
    motivo: 'Logotipo nuevo',
    section: 'panel',
    created_at: '2026-10-01T18:00:00Z',
  },
]

interface Llamada {
  url: string
  method: string
  body: unknown
}

interface Escenario {
  tema?: unknown
  logs?: unknown[]
  /** Respuesta de `/api/settings/upload`, por nombre de archivo. */
  subidas?: Record<string, { status: number; body: unknown }>
  guardar?: { status: number; body: unknown }
}

let llamadas: Llamada[] = []

function backend(e: Escenario = {}) {
  llamadas = []
  const json = (cuerpo: unknown, status = 200) =>
    Promise.resolve(
      new Response(JSON.stringify(cuerpo), {
        status,
        headers: { 'content-type': 'application/json' },
      }),
    )
  globalThis.fetch = vi
    .fn()
    .mockImplementation(async (entrada: string | URL | Request, init?: RequestInit) => {
      const url =
        typeof entrada === 'string'
          ? entrada
          : entrada instanceof Request
            ? entrada.url
            : `${entrada}`
      const method = init?.method ?? 'GET'
      let body: unknown = init?.body
      if (typeof body === 'string') {
        try {
          body = JSON.parse(body)
        } catch {
          /* texto */
        }
      }
      if (body instanceof FormData) {
        const archivo = body.get('file')
        body = { archivo: archivo instanceof File ? archivo.name : null }
      }
      if (!url.includes('/api/auth/me')) llamadas.push({ url, method, body })

      if (url.includes('/api/auth/me')) {
        return json({ user: { id: 'u1', name: 'Admin Prueba', role: 'admin' } })
      }
      if (url.includes('/api/settings/upload')) {
        const nombre = (body as { archivo: string }).archivo
        const r = e.subidas?.[nombre] ?? {
          status: 201,
          body: { ok: true, url: `/ordena/marca/subida-${nombre}` },
        }
        return json(r.body, r.status)
      }
      if (url.includes('/api/settings/theme') && method === 'POST') {
        const r = e.guardar ?? { status: 200, body: { ok: true } }
        return json(r.body, r.status)
      }
      if (url.includes('/api/settings/theme')) return json({ theme: e.tema ?? TEMA })
      if (url.includes('/api/settings/audit')) return json({ logs: e.logs ?? LOGS })
      if (url.includes('/api/settings/restore/')) return json({ ok: true })
      return json({ ok: true })
    }) as unknown as typeof fetch
}

async function abrir(consulta = ''): Promise<string> {
  const res = await router.fetch(
    new Request(`http://localhost/ordena/admin/personalizacion${consulta}`),
  )
  expect(res?.status).toBe(200)
  return (await res?.text()) ?? ''
}

async function enviar(
  campos: Record<string, string | string[] | File | File[]>,
): Promise<Response> {
  const fd = new FormData()
  for (const [nombre, valor] of Object.entries(campos)) {
    for (const v of Array.isArray(valor) ? valor : [valor]) fd.append(nombre, v as string | File)
  }
  const res = await router.fetch(
    new Request('http://localhost/ordena/admin/personalizacion', { method: 'POST', body: fd }),
  )
  return res as Response
}

function destino(res: Response): URL {
  expect(res.status).toBe(302)
  return new URL(res.headers.get('location')!, 'http://localhost')
}

const guardados = () =>
  llamadas.filter((l) => l.url.includes('/api/settings/theme') && l.method === 'POST')

const imagen = (nombre: string) => new File(['x'], nombre, { type: 'image/png' })

beforeEach(() => vi.restoreAllMocks())
afterEach(() => {
  globalThis.fetch = ORIGINAL_FETCH
})

describe('pestaña «Portal ciudadano»', () => {
  it('dibuja el estudio con sus secciones, las pestañas y los recursos del estudio', async () => {
    backend()
    const html = await abrir()
    for (const id of ['paletas', 'colores', 'fotos', 'imagenes', 'iconos', 'textos', 'guardar']) {
      expect(html, id).toContain(`id="pz-${id}"`)
    }
    expect(html).toMatch(/<form[^>]*data-pz="portal"/)
    expect(html).toMatch(/personalizacion\.css\?v=[a-f0-9]+/)
    expect(html).toMatch(/personalizacion\.js\?v=[a-f0-9]+/)
    expect(html).toMatch(/<a[^>]*aria-selected="true"[^>]*>[\s\S]*?Portal ciudadano/)
  })

  it('cada color sale con el valor guardado y su ayuda', async () => {
    backend()
    const html = await abrir()
    const colores = {
      color_primario: '#8c1d3d',
      color_acento: '#e0b84a',
      color_secundario: '#2d6a4f',
      color_navbar_fondo: '#ffffff',
      color_navbar_texto: '#1a1d26',
      color_footer_fondo: '#0f1117',
      color_footer_texto: '#ffffff',
    }
    for (const [nombre, valor] of Object.entries(colores)) {
      expect(html, nombre).toMatch(new RegExp(`<input[^>]*name="${nombre}"[^>]*value="${valor}"`))
    }
    expect(html).toContain('Color primario')
    expect(html).toContain('Fondo del pie')
  })

  it('la intensidad de la capa se lee de lo guardado', async () => {
    backend()
    const html = await abrir()
    // 0.41 / 0.82 = 50 %.
    expect(html).toMatch(/<input[^>]*name="hero_capa"[^>]*value="50"/)
    expect(html).toContain('50 %')
  })

  it('las fotos de la portada salen en su orden, una fila por foto', async () => {
    backend()
    const html = await abrir()
    // La plantilla de «agregar foto» lleva una fila vacía dentro de <template>: es inerte
    // (no viaja con el formulario) y no es una de las fotos.
    const sinPlantilla = html.replace(/<template[\s\S]*?<\/template>/g, '')
    const filas = [
      ...sinPlantilla.matchAll(/<input[^>]*name="hero_imagenes\[\]"[^>]*value="([^"]*)"/g),
    ].map((m) => m[1])
    expect(filas).toEqual(['/ordena/uno.jpg', '/ordena/dos.jpg'])
    expect(html).toContain('2 fotos: la portada pasa a la siguiente cada 5 segundos.')
  })

  it('con una sola foto dice que se muestra fija', async () => {
    const tema = structuredClone(TEMA)
    tema.usuario.imagenes.heroImagenes = ['/ordena/uno.jpg']
    backend({ tema })
    expect(await abrir()).toContain('1 foto: la portada se muestra fija.')
  })

  it('los íconos y las imágenes salen con lo guardado', async () => {
    backend()
    const html = await abrir()
    expect(html).toMatch(/<input[^>]*name="ico_card1"[^>]*value="🌳"/)
    expect(html).toMatch(
      /<input[^>]*name="logo_navbar"[^>]*value="\/ordena\/assets\/img\/logo\/logo-200x60.webp"/,
    )
    expect(html).toMatch(
      /<input[^>]*name="imagen_programa"[^>]*value="\/ordena\/assets\/img\/vector\/vector_2.webp"/,
    )
  })

  it('la maqueta nace con los colores, la capa y los textos guardados', async () => {
    backend()
    const html = await abrir()
    const vista = html.match(/<div[^>]*data-pz-vista="portal"[^>]*>/)![0]
    expect(vista).toContain('--v-primario:#8c1d3d')
    expect(vista).toContain('--v-menu-fondo:#ffffff')
    expect(vista).toContain('--v-capa-inicio:rgba(15,17,23,0.41)')
    expect(vista).toContain('--v-capa-centro:rgba(140,29,61,0.35)')
    expect(vista).toContain('url(&quot;/ordena/uno.jpg&quot;)')
    expect(html).toContain('Título de prueba del portal')
  })

  it('el tinte de la maqueta sigue al primario guardado, no al guinda de fábrica', async () => {
    const tema = structuredClone(TEMA)
    tema.usuario.colores.primario = '#1b4332'
    backend({ tema })
    const html = await abrir()
    expect(html).toContain(`--v-capa-centro:${capaDePortada('#1b4332', 50).centro}`)
  })

  it('marca como «en uso» la paleta que coincide con los colores', async () => {
    const tema = structuredClone(TEMA)
    Object.assign(tema.usuario.colores, PALETAS_PORTAL[1].colores)
    backend({ tema })
    const html = await abrir()
    const botones = [...html.matchAll(/<button[^>]*data-pz-paleta[^>]*>/g)].map((m) => m[0])
    expect(botones).toHaveLength(PALETAS_PORTAL.length)
    expect(botones.map((b) => /aria-pressed="true"/.test(b))).toEqual([
      false,
      true,
      false,
      false,
      false,
      false,
    ])
  })

  it('un valor del tema con comillas o etiquetas no rompe el HTML', async () => {
    const tema = structuredClone(TEMA)
    tema.usuario.imagenes.heroImagenes = ['/a.jpg"><script>alert(1)</script>']
    tema.usuario.textos.heroTitulo = '<img src=x onerror=alert(1)>'
    backend({ tema })
    const html = await abrir()
    expect(html).not.toContain('<script>alert(1)</script>')
    expect(html).not.toContain('<img src=x onerror=alert(1)>')
  })

  it('sin tema guardado usa los colores de fábrica y las imágenes del proyecto', async () => {
    backend({ tema: {} })
    const html = await abrir()
    expect(html).toMatch(/<input[^>]*name="color_primario"[^>]*value="#8c1d3d"/)
    expect(html).toMatch(/<input[^>]*name="hero_imagenes\[\]"[^>]*value="[^"]*hero\.webp"/)
    expect(html).toMatch(/<input[^>]*name="hero_capa"[^>]*value="100"/)
  })

  it('un color guardado que no es sólido no deja un selector en negro: usa el de fábrica', async () => {
    const tema = structuredClone(TEMA)
    tema.usuario.colores.acento = 'rgba(1,2,3,0.5)'
    backend({ tema })
    expect(await abrir()).toMatch(/<input[^>]*name="color_acento"[^>]*value="#e0b84a"/)
  })

  it('el formulario trae el motivo obligatorio, la prueba de correo y el aviso de que nada se publica sin guardar', async () => {
    backend()
    const html = await abrir()
    expect(html).toMatch(/<input[^>]*id="motivo"[^>]*required/)
    expect(html).toContain('nada se publica')
    expect(html).toContain('Prueba de correo')
    expect(html).toMatch(/<input[^>]*name="_action"[^>]*value="testMail"/)
  })

  it('la sección de textos resume cuántos hay y lleva a su página', async () => {
    backend()
    const html = await abrir()
    expect(html).toMatch(/href="[^"]*\/admin\/personalizacion\/textos"/)
    expect(html).toMatch(/<strong>\d+ textos<\/strong> en \d+ secciones/)
  })
})

describe('pestaña «Panel administrativo»', () => {
  it('trae los seis colores, el logotipo y el título con lo guardado', async () => {
    backend()
    const html = await abrir('?tab=panel')
    expect(html).toMatch(/<form[^>]*data-pz="panel"/)
    for (const [nombre, valor] of Object.entries({
      panel_topbar_fondo: '#2e3440',
      panel_topbar_texto: '#ffffff',
      panel_sidebar_fondo: '#ffffff',
      panel_sidebar_texto: '#475066',
      panel_color_acento: '#2563eb',
      panel_admin_bg: '#f4f6fb',
    })) {
      expect(html, nombre).toMatch(new RegExp(`<input[^>]*name="${nombre}"[^>]*value="${valor}"`))
    }
    expect(html).toMatch(/<input[^>]*name="panel_admin_logo"/)
    expect(html).toMatch(/<textarea[^>]*name="panel_admin_titulo"[^>]*>/)
    expect(html).toContain('PANEL\nDE PRUEBA')
    expect(html).toMatch(/<input[^>]*name="section"[^>]*value="panel"/)
  })

  it('la maqueta del panel nace con los colores guardados', async () => {
    backend()
    const html = await abrir('?tab=panel')
    const vista = html.match(/<div[^>]*data-pz-vista="panel"[^>]*>/)![0]
    expect(vista).toContain('--v-barra-fondo:#2e3440')
    expect(vista).toContain('--v-lateral-fondo:#ffffff')
    expect(vista).toContain('--v-acento:#2563eb')
    expect(html).toContain('Admin Prueba')
  })
})

describe('pestaña «Historial de cambios»', () => {
  it('lista las versiones: la más reciente como actual y las demás con «Restaurar»', async () => {
    backend()
    const html = await abrir('?tab=historial')
    expect(html).toContain('Ana López')
    expect(html).toContain('«Cambio de colores»')
    expect(html).toContain('Actual')
    expect(html.match(/Es la que está publicada/g)).toHaveLength(1)
    // Solo la anterior se puede restaurar, con el identificador completo en el formulario.
    expect(html.match(/<input[^>]*name="_action"[^>]*value="restore"/g)).toHaveLength(1)
    expect(html).toMatch(
      /<input[^>]*name="log_id"[^>]*value="7a1b2c3d-0000-4000-8000-000000000001"/,
    )
    expect(html).toMatch(/data-confirmar="¿Restaurar la versión #7a1b2c3d/)
  })

  it('muestra la versión con sus primeros ocho caracteres y el completo en el tooltip', async () => {
    backend()
    const html = await abrir('?tab=historial')
    expect(html).toContain('#5d6e3346</strong>')
    expect(html).toContain('title="Versión 5d6e3346-ac38-4e7c-8163-ba7aa4b5bba0"')
  })

  it('sin versiones lo explica y no dibuja una tabla', async () => {
    backend({ logs: [] })
    const html = await abrir('?tab=historial')
    expect(html).toContain('Aún no hay cambios registrados')
    expect(html).not.toContain('<table')
  })

  it('el número de versiones va en la pestaña', async () => {
    backend()
    const html = await abrir('?tab=historial')
    expect(html).toMatch(/Historial de cambios<span class="tabs__count">2<\/span>/)
  })
})

describe('pestañas y avisos', () => {
  it('una pestaña desconocida cae en el portal', async () => {
    backend()
    const html = await abrir('?tab=otra')
    expect(html).toMatch(/<form[^>]*data-pz="portal"/)
  })

  it('el mensaje y el error de la dirección se muestran escapados', async () => {
    backend()
    const html = await abrir(
      `?msg=${encodeURIComponent('Listo <b>bien</b>')}&err=${encodeURIComponent('<script>x()</script>')}`,
    )
    expect(html).not.toContain('<b>bien</b>')
    expect(html).not.toContain('<script>x()</script>')
    expect(html).toContain('Listo &lt;b&gt;bien&lt;/b&gt;')
  })

  it('la prueba de correo recuerda en qué pestaña estabas', async () => {
    backend()
    const html = await abrir('?tab=panel')
    expect(html).toMatch(
      /<input[^>]*name="tab"[^>]*value="panel"[^>]*>\s*<div class="form-field pz-herramientas__campo"/,
    )
  })
})

describe('guardar el portal', () => {
  const COLORES = {
    section: 'usuario',
    tab: 'usuario',
    motivo: 'Prueba de guardado',
    color_primario: '#1b4332',
    color_acento: '#52b788',
    hero_capa: '60',
    logo_navbar: '/ordena/a.png',
    'hero_imagenes[]': ['/ordena/uno.jpg', '/ordena/dos.jpg'],
    ico_card1: '🚀',
  }

  it('manda la configuración armada, el motivo y la sección, y vuelve con el aviso', async () => {
    backend()
    const res = await enviar(COLORES)
    const u = destino(res)
    expect(u.searchParams.get('tab')).toBe('usuario')
    expect(u.searchParams.get('msg')).toBe('Cambios guardados exitosamente')

    const [g] = guardados()
    const cuerpo = g.body as {
      config: {
        usuario: {
          colores: Record<string, string>
          imagenes: Record<string, unknown>
          iconos: Record<string, string>
        }
      }
      motivo: string
      section: string
    }
    expect(cuerpo.motivo).toBe('Prueba de guardado')
    expect(cuerpo.section).toBe('usuario')
    expect(cuerpo.config.usuario.colores.primario).toBe('#1b4332')
    // La capa sigue al primario nuevo y a la intensidad elegida.
    expect(cuerpo.config.usuario.colores.heroGradienteCentro).toBe(
      capaDePortada('#1b4332', 60).centro,
    )
    expect(cuerpo.config.usuario.imagenes.logoNavbar).toBe('/ordena/a.png')
    expect(cuerpo.config.usuario.imagenes.heroImagenes).toEqual([
      '/ordena/uno.jpg',
      '/ordena/dos.jpg',
    ])
    expect(cuerpo.config.usuario.iconos.cardPrograma).toBe('🚀')
  })

  it('sin motivo no guarda nada y lo explica', async () => {
    backend()
    const res = await enviar({ ...COLORES, motivo: '   ' })
    const u = destino(res)
    expect(u.searchParams.get('err')).toContain('El motivo del cambio es obligatorio')
    expect(guardados()).toHaveLength(0)
  })

  it('las fotos y los logotipos se suben antes de guardar y la dirección subida manda', async () => {
    backend()
    const res = await enviar({
      ...COLORES,
      archivo_hero: [imagen('a.png'), imagen('b.png')],
      archivo_logo_navbar: imagen('logo.png'),
    })
    destino(res)
    const subidas = llamadas.filter((l) => l.url.includes('/api/settings/upload'))
    expect(subidas.map((s) => (s.body as { archivo: string }).archivo).sort()).toEqual([
      'a.png',
      'b.png',
      'logo.png',
    ])
    const imagenes = (
      guardados()[0].body as { config: { usuario: { imagenes: Record<string, unknown> } } }
    ).config.usuario.imagenes
    expect(imagenes.logoNavbar).toBe('/ordena/marca/subida-logo.png')
    // Las direcciones que ya había, y detrás las fotos nuevas en el orden en que se eligieron.
    expect(imagenes.heroImagenes).toEqual([
      '/ordena/uno.jpg',
      '/ordena/dos.jpg',
      '/ordena/marca/subida-a.png',
      '/ordena/marca/subida-b.png',
    ])
  })

  it('si una subida falla no se guarda nada a medias y se dice cuál falló y por qué', async () => {
    backend({
      subidas: {
        'pesada.png': { status: 413, body: { error: 'La imagen excede el límite de 20 MB' } },
      },
    })
    const res = await enviar({
      ...COLORES,
      archivo_hero: [imagen('buena.png'), imagen('pesada.png')],
    })
    const u = destino(res)
    const error = u.searchParams.get('err')!
    expect(error).toContain('No se guardó nada')
    expect(error).toContain('pesada.png')
    expect(error).toContain('excede el límite de 20 MB')
    expect(error).not.toContain('buena.png')
    expect(guardados()).toHaveLength(0)
  })

  it('un archivo vacío (el campo sin elegir nada) no cuenta como subida', async () => {
    backend()
    const res = await enviar({
      ...COLORES,
      archivo_hero: new File([], '', { type: 'application/octet-stream' }),
    })
    destino(res)
    expect(llamadas.filter((l) => l.url.includes('/api/settings/upload'))).toHaveLength(0)
    expect(guardados()).toHaveLength(1)
  })

  it('si el backend rechaza el guardado (color inválido), se muestra su mensaje', async () => {
    backend({ guardar: { status: 400, body: { error: 'Color inválido en acento: rojo' } } })
    const res = await enviar({ ...COLORES, color_acento: 'rojo' })
    const u = destino(res)
    expect(u.searchParams.get('tab')).toBe('usuario')
    expect(u.searchParams.get('err')).toBe('Color inválido en acento: rojo')
  })

  it('un formulario incompleto no devuelve a fábrica lo que no menciona', async () => {
    backend()
    await enviar({
      section: 'usuario',
      tab: 'usuario',
      motivo: 'Solo el primario',
      color_primario: '#123456',
    })
    const config = (
      guardados()[0].body as { config: { usuario: Record<string, Record<string, unknown>> } }
    ).config.usuario
    expect(Object.keys(config.colores)).toEqual(['primario'])
    expect(config.imagenes).toEqual({})
    expect(config.iconos).toEqual({})
  })
})

describe('guardar el panel', () => {
  it('manda la configuración del panel, con el color del texto de la barra superior', async () => {
    backend()
    const res = await enviar({
      section: 'panel',
      tab: 'panel',
      motivo: 'Colores del panel',
      panel_topbar_fondo: '#8c1d3d',
      panel_topbar_texto: '#ffffff',
      panel_admin_titulo: 'PANEL\r\nNUEVO',
      panel_admin_logo: '/ordena/logo.png',
    })
    const u = destino(res)
    expect(u.searchParams.get('tab')).toBe('panel')
    expect(u.searchParams.get('msg')).toContain('Cambios del panel guardados')
    const cuerpo = guardados()[0].body as {
      section: string
      config: { panel: Record<string, string> }
    }
    expect(cuerpo.section).toBe('panel')
    expect(cuerpo.config.panel).toEqual({
      topbarFondo: '#8c1d3d',
      topbarTexto: '#ffffff',
      adminLogo: '/ordena/logo.png',
      adminTitulo: 'PANEL\nNUEVO',
    })
  })

  it('el logotipo subido manda y, si la subida falla, no se guarda nada', async () => {
    backend()
    await enviar({
      section: 'panel',
      tab: 'panel',
      motivo: 'Logo',
      archivo_admin_logo: imagen('escudo.png'),
    })
    expect(
      (guardados()[0].body as { config: { panel: Record<string, string> } }).config.panel.adminLogo,
    ).toBe('/ordena/marca/subida-escudo.png')

    backend({
      subidas: {
        'escudo.png': { status: 400, body: { error: 'Imagen rechazada: no es una imagen' } },
      },
    })
    const res = await enviar({
      section: 'panel',
      tab: 'panel',
      motivo: 'Logo',
      archivo_admin_logo: imagen('escudo.png'),
    })
    expect(destino(res).searchParams.get('err')).toContain('Imagen rechazada')
    expect(guardados()).toHaveLength(0)
  })
})

describe('restaurar una versión', () => {
  it('pide al backend restaurar ese registro y vuelve al historial', async () => {
    backend()
    const res = await enviar({
      _action: 'restore',
      log_id: '7a1b2c3d-0000-4000-8000-000000000001',
      tab: 'historial',
    })
    const u = destino(res)
    expect(u.searchParams.get('tab')).toBe('historial')
    expect(u.searchParams.get('msg')).toBe('Versión restaurada correctamente')
    expect(
      llamadas.some((l) =>
        l.url.endsWith('/api/settings/restore/7a1b2c3d-0000-4000-8000-000000000001'),
      ),
    ).toBe(true)
  })

  it('sin identificador no llama al backend', async () => {
    backend()
    const res = await enviar({ _action: 'restore', log_id: ' ', tab: 'historial' })
    expect(destino(res).searchParams.get('err')).toBe('ID inválido')
    expect(llamadas.some((l) => l.url.includes('/api/settings/restore/'))).toBe(false)
  })
})
