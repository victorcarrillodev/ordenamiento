import { describe, expect, it } from 'vitest'

import { capaDePortada } from '../../utils/color.ts'
import {
  MAX_ICONO,
  configuracionDelPanel,
  configuracionDelPortal,
  fotosDeLaPortadaDelFormulario,
  tituloDelPanel,
} from './personalizacion-guardado.ts'

const SIN_SUBIDAS = { hero: [], porCampo: {} }

function formulario(campos: Record<string, string | string[]>): FormData {
  const fd = new FormData()
  for (const [nombre, valor] of Object.entries(campos)) {
    for (const v of Array.isArray(valor) ? valor : [valor]) fd.append(nombre, v)
  }
  return fd
}

const COMPLETO = {
  color_primario: '#1b4332',
  color_acento: '#52b788',
  color_secundario: '#2d6a4f',
  color_navbar_fondo: '#ffffff',
  color_navbar_texto: '#081c15',
  color_footer_fondo: '#081c15',
  color_footer_texto: '#d8f3dc',
  hero_capa: '100',
  logo_navbar: '/a.png',
  logo_footer: '/b.png',
  imagen_ecologia: '/c.png',
  imagen_programa: '/d.png',
  'hero_imagenes[]': ['/f1.jpg', '/f2.jpg'],
  ico_card1: '🌳',
  ico_card2: '📈',
  ico_card3: '🗓️',
  ico_card4: '🔎',
}

describe('configuracionDelPortal', () => {
  it('traduce cada campo del formulario a su clave del tema', () => {
    const { usuario } = configuracionDelPortal(formulario(COMPLETO), SIN_SUBIDAS)
    expect(usuario.colores).toMatchObject({
      primario: '#1b4332',
      acento: '#52b788',
      secundario: '#2d6a4f',
      navbarFondo: '#ffffff',
      navbarTexto: '#081c15',
      footerFondo: '#081c15',
      footerTexto: '#d8f3dc',
    })
    expect(usuario.imagenes).toEqual({
      logoNavbar: '/a.png',
      logoFooter: '/b.png',
      imagenEcologia: '/c.png',
      imagenPrograma: '/d.png',
      heroImagenes: ['/f1.jpg', '/f2.jpg'],
    })
    expect(usuario.iconos).toEqual({
      cardPrograma: '🌳',
      cardProceso: '📈',
      cardCalendario: '🗓️',
      cardDocumentos: '🔎',
    })
  })

  it('un campo que no viene en el formulario no se toca (no vuelve a fábrica)', () => {
    const { usuario } = configuracionDelPortal(
      formulario({ color_primario: '#123456' }),
      SIN_SUBIDAS,
    )
    expect(Object.keys(usuario.colores)).toEqual(['primario'])
    expect(usuario.imagenes).toEqual({})
    expect(usuario.iconos).toEqual({})
  })

  it('un campo de imagen vacío sí cuenta: significa «usar la del proyecto»', () => {
    const { usuario } = configuracionDelPortal(formulario({ logo_navbar: '  ' }), SIN_SUBIDAS)
    expect(usuario.imagenes).toEqual({ logoNavbar: '' })
  })

  it('lleva los colores a #rrggbb pero no corrige a escondidas uno escrito mal', () => {
    const { usuario } = configuracionDelPortal(
      formulario({ color_primario: '#ABC', color_acento: 'rojo' }),
      SIN_SUBIDAS,
    )
    expect(usuario.colores.primario).toBe('#aabbcc')
    // El backend lo rechaza con «Color inválido en acento», que es lo que se debe leer.
    expect(usuario.colores.acento).toBe('rojo')
  })

  it('la capa de la portada sale del color primario y de la intensidad', () => {
    const { usuario } = configuracionDelPortal(
      formulario({ color_primario: '#1b4332', hero_capa: '60' }),
      SIN_SUBIDAS,
    )
    const esperada = capaDePortada('#1b4332', 60)
    expect(usuario.colores).toMatchObject({
      heroGradienteInicio: esperada.inicio,
      heroGradienteCentro: esperada.centro,
      heroGradienteFin: esperada.fin,
    })
  })

  it('sin control de capa o sin color primario no se inventa un degradado', () => {
    const a = configuracionDelPortal(formulario({ color_primario: '#1b4332' }), SIN_SUBIDAS)
    expect('heroGradienteCentro' in a.usuario.colores).toBe(false)
    const b = configuracionDelPortal(formulario({ hero_capa: '80' }), SIN_SUBIDAS)
    expect('heroGradienteCentro' in b.usuario.colores).toBe(false)
  })

  it('una capa fuera de rango se acota en vez de producir un degradado raro', () => {
    const { usuario } = configuracionDelPortal(
      formulario({ color_primario: '#8c1d3d', hero_capa: '9999' }),
      SIN_SUBIDAS,
    )
    expect(usuario.colores.heroGradienteInicio).toBe(capaDePortada('#8c1d3d', 100).inicio)
  })

  it('una imagen subida manda sobre la dirección escrita', () => {
    const { usuario } = configuracionDelPortal(formulario({ logo_navbar: '/vieja.png' }), {
      hero: [],
      porCampo: { archivo_logo_navbar: '/ordena/marca/brand-1-nuevo.png' },
    })
    expect(usuario.imagenes.logoNavbar).toBe('/ordena/marca/brand-1-nuevo.png')
  })

  it('las fotos subidas se suman al final de las direcciones, en orden', () => {
    const { usuario } = configuracionDelPortal(formulario({ 'hero_imagenes[]': ['/uno.jpg'] }), {
      hero: ['/ordena/marca/a.jpg', '/ordena/marca/b.jpg'],
      porCampo: {},
    })
    expect(usuario.imagenes.heroImagenes).toEqual([
      '/uno.jpg',
      '/ordena/marca/a.jpg',
      '/ordena/marca/b.jpg',
    ])
  })

  it('los íconos se recortan a un tamaño razonable sin partir un emoji', () => {
    const largo = '👨‍👩‍👧‍👦'.repeat(10)
    const { usuario } = configuracionDelPortal(formulario({ ico_card1: largo }), SIN_SUBIDAS)
    const icono = usuario.iconos.cardPrograma
    expect(Array.from(icono)).toHaveLength(MAX_ICONO)
    // Recortado por carácter: el resultado sigue siendo texto válido.
    expect(icono).toBe(Array.from(largo).slice(0, MAX_ICONO).join(''))
  })
})

describe('fotosDeLaPortadaDelFormulario', () => {
  it('quita vacías y repetidas', () => {
    const fd = formulario({ 'hero_imagenes[]': ['/a.jpg', '  ', '/b.jpg', '/a.jpg'] })
    expect(fotosDeLaPortadaDelFormulario(fd, ['/b.jpg', '/c.jpg'])).toEqual([
      '/a.jpg',
      '/b.jpg',
      '/c.jpg',
    ])
  })

  it('sin ninguna foto devuelve undefined: no se toca lo guardado', () => {
    expect(
      fotosDeLaPortadaDelFormulario(formulario({ 'hero_imagenes[]': ['', ' '] }), []),
    ).toBeUndefined()
    expect(fotosDeLaPortadaDelFormulario(formulario({}), [])).toBeUndefined()
  })
})

describe('configuracionDelPanel', () => {
  const PANEL = {
    panel_sidebar_fondo: '#1f2937',
    panel_sidebar_texto: '#e5e7eb',
    panel_topbar_fondo: '#111827',
    panel_topbar_texto: '#ffffff',
    panel_color_acento: '#0284c7',
    panel_admin_bg: '#f3f4f6',
    panel_admin_logo: '/logo.png',
    panel_admin_titulo: 'PANEL\r\nPRUEBA',
  }

  it('traduce los seis colores, el logotipo y el título', () => {
    expect(configuracionDelPanel(formulario(PANEL)).panel).toEqual({
      sidebarFondo: '#1f2937',
      sidebarTexto: '#e5e7eb',
      topbarFondo: '#111827',
      topbarTexto: '#ffffff',
      colorAcento: '#0284c7',
      adminBg: '#f3f4f6',
      adminLogo: '/logo.png',
      adminTitulo: 'PANEL\nPRUEBA',
    })
  })

  it('el color del texto de la barra superior ya se puede guardar (existía en el backend, no en el formulario)', () => {
    const { panel } = configuracionDelPanel(formulario({ panel_topbar_texto: '#ABCDEF' }))
    expect(panel.topbarTexto).toBe('#abcdef')
  })

  it('una imagen subida manda sobre la dirección', () => {
    const { panel } = configuracionDelPanel(formulario(PANEL), '/ordena/marca/nuevo.png')
    expect(panel.adminLogo).toBe('/ordena/marca/nuevo.png')
  })

  it('un campo ausente no se toca', () => {
    expect(configuracionDelPanel(formulario({ panel_admin_bg: '#ffffff' })).panel).toEqual({
      adminBg: '#ffffff',
    })
  })
})

describe('tituloDelPanel', () => {
  it('normaliza los saltos de línea, quita renglones vacíos y admite dos líneas', () => {
    expect(tituloDelPanel('UNO\r\n\r\nDOS\r\nTRES')).toBe('UNO\nDOS')
    expect(tituloDelPanel('  Solo  ')).toBe('Solo')
    expect(tituloDelPanel('')).toBe('')
  })

  it('acota el largo', () => {
    expect(Array.from(tituloDelPanel('x'.repeat(200))).length).toBe(60)
  })
})
