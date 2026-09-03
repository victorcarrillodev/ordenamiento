import { describe, expect, it } from 'bun:test'

import {
  IMAGEN,
  normalizarImagen,
  normalizarImagenesDelTema,
  urlImagenDeMarca,
  type ThemeConfig,
} from './customizations.ts'

/**
 * Normalización de las imágenes del tema, del lado del backend.
 *
 * Los casos son los que había realmente guardados en producción y dejaban
 * imágenes rotas en la portada.
 */
describe('normalizarImagen', () => {
  it('conserva rutas y URLs que sí resuelven', () => {
    expect(normalizarImagen('/ordena/assets/img/hero/hero.webp', IMAGEN.logo)).toBe(
      '/ordena/assets/img/hero/hero.webp',
    )
    expect(normalizarImagen('https://cdn.ejemplo.mx/x.png', IMAGEN.logo)).toBe(
      'https://cdn.ejemplo.mx/x.png',
    )
  })

  it('sustituye las rutas de la versión anterior', () => {
    expect(normalizarImagen('/ordena/images/ecology-split.jpg', IMAGEN.ecologia)).toBe(
      IMAGEN.ecologia,
    )
    expect(normalizarImagen('/ordena/assets/img/ecology-split.webp', IMAGEN.hero)).toBe(IMAGEN.hero)
  })

  it('traduce la ruta interna del backend al proxy público', () => {
    expect(normalizarImagen('/api/settings/assets/brand-9-foto.png', IMAGEN.logo)).toBe(
      urlImagenDeMarca('brand-9-foto.png'),
    )
  })

  it('descarta cualquier otra ruta de /api/, que el navegador no alcanza', () => {
    expect(normalizarImagen('/api/settings/assets/../../secreto', IMAGEN.logo)).toBe(IMAGEN.logo)
    expect(normalizarImagen('/api/otra/cosa.png', IMAGEN.logo)).toBe(IMAGEN.logo)
  })

  it('cae al valor por defecto ante vacíos y tipos raros', () => {
    for (const src of [undefined, null, '', '   ', 7, {}]) {
      expect(normalizarImagen(src, IMAGEN.hero)).toBe(IMAGEN.hero)
    }
  })
})

describe('normalizarImagenesDelTema', () => {
  /** El tema exacto que devolvía producción, con las tres imágenes rotas. */
  function temaDeProduccion(): ThemeConfig {
    return {
      usuario: {
        colores: {},
        imagenes: {
          logoNavbar: '/api/settings/assets/brand-1788392473964-foto.jpg',
          logoFooter: '/ordena/assets/img/logo/logo-200x60.webp',
          heroImagenes: ['/ordena/images/ecology-split.jpg'],
          imagenEcologia: '/ordena/images/ecology-split.jpg',
          imagenPrograma: '/ordena/images/ecology-split.jpg',
        },
        iconos: {},
        textos: {},
      },
      panel: { adminLogo: '/api/settings/assets/brand-1788392473964-foto.jpg' },
    } as unknown as ThemeConfig
  }

  it('deja todas las imágenes apuntando a algo que existe', () => {
    const t = normalizarImagenesDelTema(temaDeProduccion())
    const img = t.usuario.imagenes

    expect(img.logoNavbar).toBe(urlImagenDeMarca('brand-1788392473964-foto.jpg'))
    expect(img.logoFooter).toBe('/ordena/assets/img/logo/logo-200x60.webp')
    expect(img.imagenEcologia).toBe(IMAGEN.ecologia)
    expect(img.heroImagenes).toEqual([IMAGEN.hero])
    expect(t.panel.adminLogo).toBe(urlImagenDeMarca('brand-1788392473964-foto.jpg'))
  })

  it('no deja la misma ilustración en las dos secciones de la portada', () => {
    // Las dos venían de `ecology-split`: repetir la imagen se lee como un
    // fallo de carga, no como una decisión de diseño.
    const img = normalizarImagenesDelTema(temaDeProduccion()).usuario.imagenes
    expect(img.imagenPrograma).not.toBe(img.imagenEcologia)
    expect(img.imagenPrograma).toBe(IMAGEN.programa)
  })

  it('no repite una misma foto en el carrusel', () => {
    const t = temaDeProduccion()
    t.usuario.imagenes.heroImagenes = [
      '/ordena/images/ecology-split.jpg',
      '/ordena/images/ecology-split.jpg',
      'https://cdn.ejemplo.mx/otra.png',
    ]
    expect(normalizarImagenesDelTema(t).usuario.imagenes.heroImagenes).toEqual([
      IMAGEN.hero,
      'https://cdn.ejemplo.mx/otra.png',
    ])
  })

  it('deja el carrusel con la imagen del proyecto si se queda sin fotos', () => {
    const t = temaDeProduccion()
    t.usuario.imagenes.heroImagenes = []
    expect(normalizarImagenesDelTema(t).usuario.imagenes.heroImagenes).toEqual([IMAGEN.hero])
  })

  it('tolera un tema sin la sección de imágenes', () => {
    const t = { usuario: {}, panel: {} } as unknown as ThemeConfig
    expect(() => normalizarImagenesDelTema(t)).not.toThrow()
  })
})
