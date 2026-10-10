import { readdirSync, readFileSync } from 'node:fs'
import { join, relative } from 'node:path'
import { describe, expect, it } from 'vitest'
import { renderToString } from 'remix/ui/server'

import { Icon } from './icon.tsx'
import { ICONOS } from './iconos.ts'

/**
 * Los iconos se dibujan en línea. El componente anterior pedía cada dibujo a un CDN
 * y el script que lo habilitaba se cargaba desde una dirección que no existe
 * (404), así que ningún botón, tarjeta ni opción del menú mostró nunca su icono.
 * Estas pruebas fijan lo contrario: el dibujo viaja con la página, y no se puede
 * usar un icono que falte en el registro.
 */

const RAIZ = join(import.meta.dirname, '..', '..', '..')

function* archivos(carpeta: string): Generator<string> {
  for (const entrada of readdirSync(carpeta, { withFileTypes: true })) {
    const ruta = join(carpeta, entrada.name)
    if (entrada.isDirectory()) {
      if (entrada.name !== 'node_modules') yield* archivos(ruta)
    } else {
      yield ruta
    }
  }
}

/** Código de la aplicación (sin pruebas, historias ni el propio registro). */
function codigo(): string[] {
  const rutas: string[] = []
  for (const carpeta of ['app', 'public']) {
    for (const ruta of archivos(join(RAIZ, carpeta))) {
      const rel = relative(RAIZ, ruta)
      if (!/\.(tsx?|jsx?|mjs|css)$/.test(rel)) continue
      if (/(\.test\.|\.stories\.|app\/ui\/admin\/iconos\.ts$)/.test(rel)) continue
      rutas.push(ruta)
    }
  }
  return rutas
}

describe('Icon', () => {
  it('dibuja un SVG en línea con los trazos del icono', async () => {
    const html = await renderToString(<Icon name="mdi:trash-can-outline" />)
    expect(html).toMatch(/^<svg\b/)
    expect(html).toContain('viewBox="0 0 24 24"')
    expect(html).toContain('fill="currentColor"')
    const [primero] = ICONOS['mdi:trash-can-outline']
    expect(html).toContain(`d="${primero}"`)
  })

  it('un icono con varios trazos los dibuja todos', async () => {
    const [nombre, trazos] = Object.entries(ICONOS).find(([, t]) => t.length > 1) ?? []
    if (!nombre || !trazos) return // la colección usada hoy solo trae iconos de un trazo
    const html = await renderToString(<Icon name={nombre} />)
    expect(html.match(/<path\b/g)).toHaveLength(trazos.length)
  })

  it('es decorativo por omisión: no lo anuncian los lectores de pantalla', async () => {
    const html = await renderToString(<Icon name="mdi:home" />)
    expect(html).toContain('aria-hidden="true"')
    expect(html).not.toContain('role=')
    expect(html).not.toContain('aria-label=')
  })

  it('con `label` es una imagen con nombre accesible', async () => {
    const html = await renderToString(<Icon name="mdi:home" label="Inicio" />)
    expect(html).toContain('role="img"')
    expect(html).toContain('aria-label="Inicio"')
    expect(html).not.toContain('aria-hidden')
  })

  it('mide 16 px por omisión y el tamaño indicado cuando se pide', async () => {
    expect(await renderToString(<Icon name="mdi:home" />)).toMatch(/width="16"[^>]*height="16"/)
    expect(await renderToString(<Icon name="mdi:home" size={40} />)).toMatch(
      /width="40"[^>]*height="40"/,
    )
  })

  it('un nombre desconocido deja el hueco del icono sin romper la página', async () => {
    const html = await renderToString(<Icon name="mdi:no-existe-este-icono" size={20} />)
    expect(html).toMatch(/^<svg\b/)
    expect(html).not.toContain('<path')
  })
})

describe('registro de iconos', () => {
  it('trae, para cada nombre, al menos un trazo no vacío', () => {
    for (const [nombre, trazos] of Object.entries(ICONOS)) {
      expect(trazos.length, nombre).toBeGreaterThan(0)
      for (const d of trazos) expect(d.length, nombre).toBeGreaterThan(10)
    }
  })

  it('todos los iconos que usa el código están en el registro (si falla: npm run iconos)', () => {
    const faltan = new Set<string>()
    for (const ruta of codigo()) {
      const texto = readFileSync(ruta, 'utf8')
      for (const [nombre] of texto.matchAll(/\bmdi:[a-z0-9]+(?:-[a-z0-9]+)*\b/g)) {
        if (!(nombre in ICONOS)) faltan.add(nombre)
      }
    }
    expect([...faltan].sort()).toEqual([])
  })

  it('no sobra ningún icono: el registro es exactamente lo que usa el código', () => {
    const usados = new Set<string>()
    for (const ruta of codigo()) {
      const texto = readFileSync(ruta, 'utf8')
      for (const [nombre] of texto.matchAll(/\bmdi:[a-z0-9]+(?:-[a-z0-9]+)*\b/g)) usados.add(nombre)
    }
    const sobran = Object.keys(ICONOS).filter((n) => !usados.has(n))
    expect(sobran.sort()).toEqual([])
  })
})

describe('sin dependencia de Iconify en ejecución', () => {
  it('ninguna página pide el script ni la API de Iconify, ni usa el web component', () => {
    const culpables: string[] = []
    const revisables = [...codigo(), join(RAIZ, 'server.ts')]
    for (const ruta of revisables) {
      const texto = readFileSync(ruta, 'utf8')
      if (/iconify-icon|code\.iconify\.design|api\.iconify\.design/.test(texto)) {
        culpables.push(relative(RAIZ, ruta))
      }
    }
    expect(culpables).toEqual([])
  })
})
