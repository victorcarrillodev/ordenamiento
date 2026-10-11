/**
 * «Textos del portal» como estudio: secciones por grupo, un campo por texto con su etiqueta,
 * maqueta con los textos guardados, y los avisos que la acompañan.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { getPublicTheme, olvidarTemaPublico } from '../../backend.ts'
import { router } from '../../router.ts'
import { GRUPOS_TEXTOS } from './personalizacion-textos-defs.ts'
import { INFO_DE_GRUPO } from './personalizacion-textos-page.tsx'

const ORIGINAL_FETCH = globalThis.fetch

function backend(textos: Record<string, string> = {}) {
  const json = (cuerpo: unknown) =>
    Promise.resolve(
      new Response(JSON.stringify(cuerpo), {
        status: 200,
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
      return json({ user: { id: 'u1', name: 'Admin Prueba', role: 'admin' } })
    }
    if (url.includes('/api/settings/theme')) return json({ theme: { usuario: { textos } } })
    return json({ ok: true })
  }) as unknown as typeof fetch
}

async function abrir(textos: Record<string, string> = {}, consulta = ''): Promise<string> {
  backend(textos)
  const res = await router.fetch(
    new Request(`http://localhost/ordena/admin/personalizacion/textos${consulta}`),
  )
  expect(res?.status).toBe(200)
  return (await res?.text()) ?? ''
}

beforeEach(() => vi.restoreAllMocks())
afterEach(() => {
  globalThis.fetch = ORIGINAL_FETCH
})

const CAMPOS = GRUPOS_TEXTOS.flatMap((g) => g.campos)

describe('catálogo de grupos', () => {
  it('cada grupo dice en qué parte del portal sale y con qué icono se reconoce', () => {
    for (const grupo of GRUPOS_TEXTOS) {
      const info = INFO_DE_GRUPO[grupo.id]
      expect(info, `falta la descripción del grupo «${grupo.id}»`).toBeDefined()
      expect(info.donde.length).toBeGreaterThan(15)
      expect(info.icono).toMatch(/^mdi:[a-z0-9-]+$/)
    }
  })

  it('no sobran descripciones de grupos que ya no existen', () => {
    const ids = new Set(GRUPOS_TEXTOS.map((g) => g.id))
    for (const id of Object.keys(INFO_DE_GRUPO)) expect(ids.has(id), id).toBe(true)
  })
})

describe('pantalla', () => {
  it('un índice y una sección plegable por grupo; las dos primeras abiertas', async () => {
    const html = await abrir()
    for (const g of GRUPOS_TEXTOS) {
      expect(html, g.id).toContain(`id="pz-g-${g.id}"`)
      expect(html, g.titulo).toContain(`href="#pz-g-${g.id}"`)
    }
    const secciones = [...html.matchAll(/<details[^>]*data-pz-seccion="g-[^"]*"[^>]*>/g)].map(
      (m) => m[0],
    )
    expect(secciones).toHaveLength(GRUPOS_TEXTOS.length)
    expect(secciones.map((d) => /\sopen[\s>=]/.test(d))).toEqual(GRUPOS_TEXTOS.map((_, i) => i < 2))
  })

  it('cada grupo cuenta sus textos en la descripción', async () => {
    const html = await abrir()
    for (const g of GRUPOS_TEXTOS) {
      const n = g.campos.length
      expect(html).toContain(`${INFO_DE_GRUPO[g.id].donde} ${n} ${n === 1 ? 'texto' : 'textos'}.`)
    }
  })

  it('cada texto tiene su bloque con clave y etiqueta, y no se pierde ninguno', async () => {
    const html = await abrir()
    const bloques = [...html.matchAll(/<div[^>]*data-pz-texto="([^"]+)"[^>]*>/g)].map((m) => m[1])
    expect(bloques.sort()).toEqual(CAMPOS.map((c) => c.key).sort())
    for (const campo of CAMPOS) {
      expect(html).toMatch(
        new RegExp(`<div[^>]*data-pz-texto="${campo.key}"[^>]*data-etiqueta="[^"]+"`),
      )
    }
  })

  it('los textos planos llevan su contador y el tope que admite el backend; los de formato, su editor', async () => {
    const html = await abrir({ heroBtn1: 'Hola' })
    const contadores = html.match(/data-pz-contador-texto/g) ?? []
    const planos = CAMPOS.filter((c) => !c.rico)
    expect(contadores).toHaveLength(planos.length)
    expect(html).toMatch(/<textarea[^>]*name="txt_hero_btn1"[^>]*maxlength="500"/)
    expect(html).toMatch(/data-pz-contador-texto>4<\/span> \/ 500/)
    expect(html.match(/data-editor-texto/g)).toHaveLength(CAMPOS.filter((c) => c.rico).length)
  })

  it('«Volver al texto guardado» solo se ofrece en los textos planos y empieza escondido', async () => {
    const html = await abrir()
    const botones = html.match(/<button[^>]*data-pz-deshacer-texto[^>]*>/g) ?? []
    expect(botones).toHaveLength(CAMPOS.filter((c) => !c.rico).length)
    for (const b of botones) expect(b).toMatch(/\shidden[\s>]/)
  })

  it('trae la guía, el formato del texto, el motivo con sus sugerencias y la barra de cambios', async () => {
    const html = await abrir()
    expect(html).toContain('¿Cómo funciona?')
    expect(html).toContain('Formato del texto')
    expect(html).toMatch(/<input[^>]*id="motivo"[^>]*required/)
    for (const sugerencia of [
      'Actualización de textos del portal',
      'Corrección de redacción',
      'Alineación con el Programa publicado',
    ]) {
      expect(html).toMatch(new RegExp(`data-pz-motivo-sugerido="${sugerencia}"`))
    }
    expect(html).toContain('data-pz-barra')
    expect(html).toMatch(/<form[^>]*data-pz="textos"/)
  })

  it('el mensaje y el error se muestran escapados', async () => {
    const html = await abrir(
      {},
      `?msg=${encodeURIComponent('<b>Listo</b>')}&err=${encodeURIComponent('<i>x</i>')}`,
    )
    expect(html).not.toContain('<b>Listo</b>')
    expect(html).not.toContain('<i>x</i>')
  })
})

describe('maqueta', () => {
  it('lleva los textos guardados y la clave de cada uno, con su texto de respaldo', async () => {
    const html = await abrir({ heroBtn1: 'Descubre el Programa', footerEmail: 'a@b.test' })
    expect(html).toMatch(
      /<span[^>]*data-pz-v-texto="heroBtn1"[^>]*data-defecto="Conoce la Bitácora"[^>]*>Descubre el Programa<\/span>/,
    )
    expect(html).toMatch(/data-pz-v-texto="footerEmail"[^>]*>a@b\.test<\/span>/)
    for (const clave of [
      'navEnlaceInicio',
      'navEnlacePoetdum',
      'navCtaRegistrar',
      'heroCintillo',
      'heroSubtitulo',
      'heroBtn1',
      'heroBtn2',
      'fasesTitulo',
      'avancesTitulo',
      'calendarioTitulo',
      'seguimientoTitulo',
      'queEsTitulo',
      'programaTitulo',
      'ctaTitulo',
      'ctaBoton',
      'footerEntidad',
      'footerEmail',
    ]) {
      expect(html, clave).toContain(`data-pz-v-texto="${clave}"`)
      // Cada texto de la maqueta se puede editar en esta pantalla.
      expect(
        CAMPOS.map((c) => c.key),
        clave,
      ).toContain(clave)
    }
  })

  it('un campo vacío en el tema muestra el texto por defecto, como el portal', async () => {
    const html = await abrir({ heroBtn1: '', heroBtn2: '   ' })
    expect(html).toMatch(/data-pz-v-texto="heroBtn1"[^>]*>Conoce la Bitácora<\/span>/)
    expect(html).toMatch(/data-pz-v-texto="heroBtn2"[^>]*>Registra tu participación<\/span>/)
  })

  it('el título sale partido como en el portal, sin repetir la frase destacada', async () => {
    const html = await abrir()
    const titulo = html.match(/<strong[^>]*data-pz-v-titulo[\s\S]*?<\/strong>/)![0]
    expect(titulo).toContain('<span data-pz-v-titulo-antes>Bitácora de </span>')
    expect(titulo).toMatch(/data-pz-v-resaltado[^>]*>Ordenamiento Territorial<\/span>/)
    expect(titulo).toContain('<span data-pz-v-titulo-despues></span>')
    // La frase aparece una sola vez en el título (antes se pintaba entera y otra vez destacada).
    const visible = titulo.replace(/<[^>]+>/g, '')
    expect(visible).toBe('Bitácora de Ordenamiento Territorial')
    expect(visible.match(/Ordenamiento Territorial/g)).toHaveLength(1)
  })

  it('si la frase destacada no está en el título, el título va entero y nada se destaca', async () => {
    const html = await abrir({ heroTitulo: 'Otro título', heroTituloResaltado: 'No está' })
    const titulo = html.match(/<strong[^>]*data-pz-v-titulo[\s\S]*?<\/strong>/)![0]
    expect(titulo).toContain('<span data-pz-v-titulo-antes>Otro título</span>')
    expect(titulo).toMatch(/data-pz-v-resaltado[^>]*><\/span>/)
  })

  it('un texto con etiquetas se escapa también en la maqueta', async () => {
    const html = await abrir({
      heroBtn1: '<img src=x onerror=alert(1)>',
      heroSubtitulo: '<script>x()</script>',
    })
    expect(html).not.toContain('<img src=x onerror=alert(1)>')
    expect(html).not.toContain('<script>x()</script>')
  })
})

describe('guardar los textos', () => {
  beforeEach(() => olvidarTemaPublico())
  afterEach(() => olvidarTemaPublico())

  it('el portal olvida su caché del tema y enseña los textos nuevos de inmediato', async () => {
    let titulo = 'VIEJO'
    globalThis.fetch = vi
      .fn()
      .mockImplementation((entrada: string | URL | Request, init?: RequestInit) => {
        const url =
          typeof entrada === 'string'
            ? entrada
            : entrada instanceof Request
              ? entrada.url
              : `${entrada}`
        const json = (cuerpo: unknown) =>
          Promise.resolve(
            new Response(JSON.stringify(cuerpo), {
              status: 200,
              headers: { 'content-type': 'application/json' },
            }),
          )
        if (url.includes('/api/auth/me')) {
          return json({ user: { id: 'u1', name: 'Admin Prueba', role: 'admin' } })
        }
        if (url.includes('/api/settings/theme') && init?.method !== 'POST') {
          return json({ theme: { usuario: { textos: { heroTitulo: titulo } } } })
        }
        return json({ ok: true })
      }) as unknown as typeof fetch

    const leer = async () =>
      (await getPublicTheme(new Request('http://localhost/ordena/')))?.usuario?.textos?.heroTitulo
    expect(await leer()).toBe('VIEJO')
    titulo = 'NUEVO'
    expect(await leer()).toBe('VIEJO')

    const fd = new FormData()
    fd.set('motivo', 'Prueba')
    fd.set('txt_hero_titulo', 'NUEVO')
    const res = await router.fetch(
      new Request('http://localhost/ordena/admin/personalizacion/textos', {
        method: 'POST',
        body: fd,
      }),
    )
    expect(res?.status).toBe(302)
    expect(await leer()).toBe('NUEVO')
  })
})
