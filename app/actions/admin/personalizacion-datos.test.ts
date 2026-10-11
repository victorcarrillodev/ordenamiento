import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

import { nivelDeContraste, normalizarHex, razonDeContraste } from '../../utils/color.ts'
import {
  CAMPOS_COLOR_PANEL,
  CAMPOS_COLOR_PORTAL,
  COLORES_PANEL_POR_DEFECTO,
  COLORES_PORTAL_POR_DEFECTO,
  coloresDelPanel,
  coloresDelPortal,
  fotosDeLaPortada,
  ICONOS_PORTAL,
  iconosDelPortal,
  MOTIVOS_SUGERIDOS,
  PALETAS_PANEL,
  PALETAS_PORTAL,
  PARES_CONTRASTE_PANEL,
  PARES_CONTRASTE_PORTAL,
  RANURAS_IMAGEN_PORTAL,
  type ColoresPanel,
  type ColoresPortal,
} from './personalizacion-datos.ts'

/** El tema de fábrica del backend, leído como texto (importarlo abriría la base de datos). */
const backend = readFileSync(
  new URL('../../../backend/src/services/customizations.ts', import.meta.url),
  'utf8',
)
const porDefecto = backend.slice(backend.indexOf('export const DEFAULT_THEME_CONFIG'))

function deFabrica(clave: string): string {
  const m = new RegExp(`^\\s+${clave}: '([^']*)'`, 'm').exec(porDefecto)
  expect(m, `${clave} no está en el tema de fábrica del backend`).not.toBeNull()
  return m![1]
}

const CLAVES_PORTAL = Object.keys(COLORES_PORTAL_POR_DEFECTO) as Array<keyof ColoresPortal>
const CLAVES_PANEL = Object.keys(COLORES_PANEL_POR_DEFECTO) as Array<keyof ColoresPanel>

describe('colores de fábrica', () => {
  it.each(CLAVES_PORTAL)('el portal: %s coincide con el del backend', (clave) => {
    expect(COLORES_PORTAL_POR_DEFECTO[clave]).toBe(deFabrica(clave))
  })

  it.each(CLAVES_PANEL)('el panel: %s coincide con el del backend', (clave) => {
    expect(COLORES_PANEL_POR_DEFECTO[clave]).toBe(deFabrica(clave))
  })

  it('los íconos de los accesos coinciden con los del backend', () => {
    for (const icono of ICONOS_PORTAL) {
      expect(icono.porDefecto, icono.clave).toBe(deFabrica(icono.clave))
    }
  })
})

describe('campos de color', () => {
  it('cada color del portal tiene exactamente un campo, con nombre único', () => {
    expect(CAMPOS_COLOR_PORTAL.map((c) => c.clave).sort()).toEqual([...CLAVES_PORTAL].sort())
    const nombres = CAMPOS_COLOR_PORTAL.map((c) => c.name)
    expect(new Set(nombres).size).toBe(nombres.length)
  })

  it('cada color del panel tiene exactamente un campo, con nombre único', () => {
    expect(CAMPOS_COLOR_PANEL.map((c) => c.clave).sort()).toEqual([...CLAVES_PANEL].sort())
    const nombres = CAMPOS_COLOR_PANEL.map((c) => c.name)
    expect(new Set(nombres).size).toBe(nombres.length)
  })

  it('el panel y el portal no comparten nombres de campo', () => {
    const portal = new Set(CAMPOS_COLOR_PORTAL.map((c) => c.name))
    for (const campo of CAMPOS_COLOR_PANEL) expect(portal.has(campo.name)).toBe(false)
  })

  it('cada campo explica qué pinta', () => {
    for (const campo of [...CAMPOS_COLOR_PORTAL, ...CAMPOS_COLOR_PANEL]) {
      expect(campo.etiqueta.length, campo.name).toBeGreaterThan(3)
      expect(campo.ayuda.length, campo.name).toBeGreaterThan(10)
    }
  })

  it('los pares de contraste se refieren a colores que existen', () => {
    for (const par of PARES_CONTRASTE_PORTAL) {
      expect(CLAVES_PORTAL).toContain(par.fondo)
      if (par.texto !== '#ffffff') expect(CLAVES_PORTAL).toContain(par.texto)
    }
    for (const par of PARES_CONTRASTE_PANEL) {
      expect(CLAVES_PANEL).toContain(par.fondo)
      expect(CLAVES_PANEL).toContain(par.texto)
    }
  })
})

describe('paletas del portal', () => {
  it('tienen identificador único y traen los siete colores en hexadecimal válido', () => {
    const ids = PALETAS_PORTAL.map((p) => p.id)
    expect(new Set(ids).size).toBe(ids.length)
    for (const paleta of PALETAS_PORTAL) {
      expect(Object.keys(paleta.colores).sort(), paleta.id).toEqual([...CLAVES_PORTAL].sort())
      for (const [clave, valor] of Object.entries(paleta.colores)) {
        expect(normalizarHex(valor), `${paleta.id}.${clave}`).toBe(valor)
      }
    }
  })

  it('la primera es la de fábrica', () => {
    expect(PALETAS_PORTAL[0].colores).toEqual(COLORES_PORTAL_POR_DEFECTO)
  })

  it('ninguna se repite', () => {
    const firmas = PALETAS_PORTAL.map((p) => JSON.stringify(p.colores))
    expect(new Set(firmas).size).toBe(firmas.length)
  })

  it.each(PALETAS_PORTAL.map((p) => [p.id, p] as const))(
    '«%s» se lee bien en el menú, en el pie y en el botón (4.5:1 o más)',
    (_id, paleta) => {
      for (const par of PARES_CONTRASTE_PORTAL) {
        const texto = par.texto === '#ffffff' ? '#ffffff' : paleta.colores[par.texto]
        const razon = razonDeContraste(texto, paleta.colores[par.fondo]) as number
        expect(razon, `${paleta.id}: ${par.etiqueta}`).toBeGreaterThanOrEqual(4.5)
        expect(['aa', 'aaa']).toContain(nivelDeContraste(razon))
      }
    },
  )
})

describe('paletas del panel', () => {
  it('tienen identificador único y traen los seis colores en hexadecimal válido', () => {
    const ids = PALETAS_PANEL.map((p) => p.id)
    expect(new Set(ids).size).toBe(ids.length)
    for (const paleta of PALETAS_PANEL) {
      expect(Object.keys(paleta.colores).sort(), paleta.id).toEqual([...CLAVES_PANEL].sort())
      for (const [clave, valor] of Object.entries(paleta.colores)) {
        expect(normalizarHex(valor), `${paleta.id}.${clave}`).toBe(valor)
      }
    }
  })

  it('la primera es la de fábrica', () => {
    expect(PALETAS_PANEL[0].colores).toEqual(COLORES_PANEL_POR_DEFECTO)
  })

  it.each(PALETAS_PANEL.map((p) => [p.id, p] as const))(
    '«%s»: el texto se lee en la barra y en el menú, y el acento se distingue sobre ambos fondos',
    (_id, paleta) => {
      const c = paleta.colores
      expect(razonDeContraste(c.topbarTexto, c.topbarFondo) as number).toBeGreaterThanOrEqual(4.5)
      expect(razonDeContraste(c.sidebarTexto, c.sidebarFondo) as number).toBeGreaterThanOrEqual(4.5)
      // El acento pinta enlaces y la opción activa: se ve sobre el fondo de las pantallas y
      // sobre el del menú (3:1 es el mínimo para elementos de interfaz).
      expect(razonDeContraste(c.colorAcento, c.adminBg) as number).toBeGreaterThanOrEqual(3)
      expect(razonDeContraste(c.colorAcento, c.sidebarFondo) as number).toBeGreaterThanOrEqual(3)
    },
  )
})

describe('íconos de los accesos', () => {
  it('traen nombre de campo único y el predeterminado entre las sugerencias', () => {
    const nombres = ICONOS_PORTAL.map((i) => i.name)
    expect(new Set(nombres).size).toBe(nombres.length)
    expect(nombres).toEqual(['ico_card1', 'ico_card2', 'ico_card3', 'ico_card4'])
    for (const icono of ICONOS_PORTAL) {
      expect(icono.sugeridos, icono.clave).toContain(icono.porDefecto)
      expect(new Set(icono.sugeridos).size, icono.clave).toBe(icono.sugeridos.length)
    }
  })
})

describe('ranuras de imagen', () => {
  it('tienen campos únicos y cada una dice dónde sale y qué se recomienda', () => {
    const campos = RANURAS_IMAGEN_PORTAL.flatMap((r) => [r.urlName, r.archivoName])
    expect(new Set(campos).size).toBe(campos.length)
    for (const ranura of RANURAS_IMAGEN_PORTAL) {
      expect(ranura.dondeSale.length).toBeGreaterThan(10)
      expect(ranura.recomendado.length).toBeGreaterThan(10)
    }
  })
})

describe('motivos sugeridos', () => {
  it('son frases completas, no etiquetas sueltas', () => {
    for (const motivo of Object.values(MOTIVOS_SUGERIDOS)) {
      expect(motivo.split(' ').length).toBeGreaterThanOrEqual(3)
    }
  })
})

describe('lectura del tema guardado', () => {
  it('sin tema devuelve los colores de fábrica', () => {
    expect(coloresDelPortal(null)).toEqual(COLORES_PORTAL_POR_DEFECTO)
    expect(coloresDelPortal(undefined)).toEqual(COLORES_PORTAL_POR_DEFECTO)
    expect(coloresDelPortal({})).toEqual(COLORES_PORTAL_POR_DEFECTO)
    expect(coloresDelPanel(null)).toEqual(COLORES_PANEL_POR_DEFECTO)
  })

  it('lo guardado manda sobre la fábrica, y se lleva a #rrggbb', () => {
    const tema = { usuario: { colores: { primario: '#ABC', acento: '#112233' } } }
    const colores = coloresDelPortal(tema)
    expect(colores.primario).toBe('#aabbcc')
    expect(colores.acento).toBe('#112233')
    expect(colores.secundario).toBe(COLORES_PORTAL_POR_DEFECTO.secundario)
  })

  it('un color que no es sólido (rgba, texto raro) se sustituye por el de fábrica', () => {
    const tema = {
      usuario: { colores: { primario: 'rgba(1,2,3,0.5)', acento: 'rojo', navbarFondo: 42 } },
    }
    const colores = coloresDelPortal(tema)
    expect(colores.primario).toBe(COLORES_PORTAL_POR_DEFECTO.primario)
    expect(colores.acento).toBe(COLORES_PORTAL_POR_DEFECTO.acento)
    expect(colores.navbarFondo).toBe(COLORES_PORTAL_POR_DEFECTO.navbarFondo)
  })

  it('tolera un tema con la forma equivocada sin lanzar', () => {
    expect(coloresDelPortal({ usuario: 'hola' })).toEqual(COLORES_PORTAL_POR_DEFECTO)
    expect(coloresDelPortal({ usuario: { colores: [] } })).toEqual(COLORES_PORTAL_POR_DEFECTO)
    expect(coloresDelPanel({ panel: 7 })).toEqual(COLORES_PANEL_POR_DEFECTO)
  })

  it('los colores del panel leen su propia sección', () => {
    const tema = { panel: { topbarFondo: '#8C1D3D', topbarTexto: '#fff' } }
    expect(coloresDelPanel(tema).topbarFondo).toBe('#8c1d3d')
    expect(coloresDelPanel(tema).topbarTexto).toBe('#ffffff')
    expect(coloresDelPanel(tema).adminBg).toBe(COLORES_PANEL_POR_DEFECTO.adminBg)
  })

  it('los íconos vacíos o ausentes vuelven al predeterminado', () => {
    const tema = {
      usuario: { iconos: { cardPrograma: '🌳', cardProceso: '  ', cardCalendario: 7 } },
    }
    const iconos = iconosDelPortal(tema)
    expect(iconos.cardPrograma).toBe('🌳')
    expect(iconos.cardProceso).toBe('📊')
    expect(iconos.cardCalendario).toBe('📅')
    expect(iconos.cardDocumentos).toBe('📈')
  })

  it('las fotos de la portada se limpian de vacías y repetidas, y nunca quedan en cero', () => {
    const por = '/ordena/assets/img/hero/hero.webp'
    expect(fotosDeLaPortada(null, por)).toEqual([por])
    expect(fotosDeLaPortada({ usuario: { imagenes: { heroImagenes: [] } } }, por)).toEqual([por])
    const tema = { usuario: { imagenes: { heroImagenes: ['/a.jpg', '', '/b.jpg', '/a.jpg', 3] } } }
    expect(fotosDeLaPortada(tema, por)).toEqual(['/a.jpg', '/b.jpg'])
    expect(fotosDeLaPortada({ usuario: { imagenes: { heroImagenes: 'x' } } }, por)).toEqual([por])
  })
})
