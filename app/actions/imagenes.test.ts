import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { router } from '../router.ts'

/**
 * Contrato de las imágenes que se renderizan en el sitio.
 *
 * Dos reglas, y las dos se rompieron en producción:
 *  · toda `<img>` declara `alt` (aunque sea vacío para las decorativas);
 *  · ninguna apunta a rutas que el navegador no puede resolver.
 */

const originalFetch = globalThis.fetch

const ADMIN = { id: '1', name: 'Ada Root', role: 'admin' }

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  })
}

/** El tema tal como estaba guardado en producción, con las rutas rotas. */
const TEMA_ROTO = {
  usuario: {
    colores: {},
    imagenes: {
      logoNavbar: '/api/settings/assets/brand-1-foto.jpg',
      logoFooter: '/ordena/images/ecology-split.jpg',
      heroImagenes: ['/ordena/images/ecology-split.jpg'],
      imagenEcologia: '/ordena/images/ecology-split.jpg',
      imagenPrograma: '/ordena/images/ecology-split.jpg',
    },
    iconos: {},
    textos: {},
  },
  panel: { adminLogo: '/api/settings/assets/brand-1-foto.jpg' },
}

function backend(tema: unknown = TEMA_ROTO) {
  globalThis.fetch = vi.fn().mockImplementation((input: RequestInfo | URL) => {
    const url = String(input)
    if (url.includes('/api/auth/me')) return Promise.resolve(json({ user: ADMIN }))
    if (url.includes('/api/settings/theme')) return Promise.resolve(json({ theme: tema }))
    return Promise.resolve(json({}))
  })
}

/** Atributos de cada `<img>` del HTML, sin necesitar un DOM completo. */
function imagenes(html: string): Array<{ src: string | null; alt: string | null }> {
  return [...html.matchAll(/<img\b[^>]*>/g)].map((m) => {
    const tag = m[0]
    const src = tag.match(/\ssrc="([^"]*)"/)
    const alt = tag.match(/\salt="([^"]*)"/)
    return { src: src ? src[1] : null, alt: alt ? alt[1] : null }
  })
}

async function html(path: string): Promise<string> {
  const res = await router.fetch(new Request(`http://localhost${path}`))
  expect(res?.status, path).toBe(200)
  return (await res?.text()) ?? ''
}

const RUTAS = ['/ordena/', '/ordena/login', '/ordena/admin', '/ordena/admin/cuenta']

beforeEach(() => {
  vi.restoreAllMocks()
})

afterEach(() => {
  globalThis.fetch = originalFetch
})

describe('Texto alternativo', () => {
  it('toda imagen declara alt', async () => {
    for (const ruta of RUTAS) {
      backend()
      for (const img of imagenes(await html(ruta))) {
        expect(img.alt, `${ruta} → ${img.src}`).not.toBeNull()
      }
    }
  })

  it('ninguna se describe solo como «Logo» o «Imagen»', async () => {
    // Un alt genérico no dice nada que el usuario de lector de pantalla no
    // pudiera deducir; o describe la imagen, o va vacío por decorativa.
    for (const ruta of RUTAS) {
      backend()
      for (const img of imagenes(await html(ruta))) {
        expect(['Logo', 'logo', 'Imagen', 'imagen', 'Foto'], `${ruta} → ${img.src}`).not.toContain(
          img.alt,
        )
      }
    }
  })
})

describe('Rutas de imagen', () => {
  it('la portada no emite rutas del backend ni de la versión anterior', async () => {
    backend()
    const portada = await html('/ordena/')

    for (const img of imagenes(portada)) {
      expect(img.src, 'ruta interna del backend').not.toMatch(/^\/api\//)
      expect(img.src, 'carpeta /images/ retirada').not.toMatch(/\/images\//)
      expect(img.src, 'ilustración retirada').not.toMatch(/ecology-split/)
    }
    // También en los fondos CSS del hero.
    expect(portada).not.toContain('url(/ordena/images/')
    expect(portada).not.toContain('url(/api/')
  })

  it('traduce la imagen subida al proxy público', async () => {
    backend()
    expect(await html('/ordena/')).toContain('/ordena/marca/brand-1-foto.jpg')
  })

  it('Personalización enseña la ruta corregida, no la que está guardada', async () => {
    // Las vistas previas deben mostrar lo que el portal va a enseñar de
    // verdad; y como el formulario parte de estos valores, al guardar se
    // corrige la fila de la base sin que nadie busque cuál era la ruta buena.
    backend()
    const personalizacion = await html('/ordena/admin/personalizacion')

    for (const img of imagenes(personalizacion)) {
      expect(img.src, 'ruta interna del backend').not.toMatch(/^\/api\//)
      expect(img.src, 'carpeta retirada').not.toMatch(/\/images\/|ecology-split/)
    }
    expect(personalizacion).toContain('/ordena/marca/brand-1-foto.jpg')
  })

  it('el panel tampoco emite el logotipo por la ruta interna', async () => {
    backend()
    const panel = await html('/ordena/admin')
    for (const img of imagenes(panel)) {
      expect(img.src).not.toMatch(/^\/api\//)
    }
  })

  it('sin tema guardado usa las imágenes que trae el proyecto', async () => {
    backend(null)
    const portada = await html('/ordena/')
    expect(portada).toContain('/ordena/assets/img/')
  })
})
