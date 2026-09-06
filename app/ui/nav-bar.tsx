import type { Handle } from 'remix/ui'
import { css } from 'remix/ui'
import { colors, FONT_STACK, type ThemeData } from './civic-horizon.ts'
import { routes } from '../routes.ts'

export interface NavBarProps {
  theme?: ThemeData
}

/** Ancho a partir del cual caben la marca, los enlaces y el botón en una fila. */
export const NAVBAR_CORTE_MOVIL = '900px'

/**
 * Alto de la barra fija. Las páginas que dejan hueco para ella lo toman de
 * aquí: cuando la barra encogió en móvil, los `85px` copiados en cada página
 * dejaron una franja vacía bajo el encabezado.
 */
export const NAVBAR_ALTURA = '85px'
export const NAVBAR_ALTURA_MOVIL = '64px'

/**
 * Estado del menú desplegable en móvil.
 *
 * Va en una hoja de estilos cruda y no en `css()` porque necesita selectores
 * de hermano (`:checked ~ …`) entre elementos con clases generadas distintas,
 * y porque el estado vive en un checkbox: así el menú abre aunque el módulo
 * de navegador no haya cargado todavía o falle.
 */
const ESTILOS_MENU = `
#nav-toggle { position: absolute; width: 1px; height: 1px; margin: 0; opacity: 0; }
#nav-toggle:checked ~ #nav-panel { display: block; }
#nav-toggle:checked ~ * .nav-burger__abrir { display: none; }
#nav-toggle:checked ~ * .nav-burger__cerrar { display: inline; }
#nav-burger .nav-burger__cerrar { display: none; }
#nav-toggle:focus-visible ~ * #nav-burger { outline: 2px solid #8c1d3d; outline-offset: 2px; }
@media (min-width: ${NAVBAR_CORTE_MOVIL}) {
  #nav-panel { display: none !important; }
}
`

export function NavBar(handle: Handle<NavBarProps>) {
  return () => {
    const theme = handle.props.theme
    const u = theme?.usuario || {}
    const c = u.colores || {}
    const img = u.imagenes || {}
    const txt = u.textos || {}

    const basePath = (process.env.BASE_PATH ?? '/ordena').replace(/\/$/, '')
    const navBg = c.navbarFondo || 'rgba(255,255,255,0.98)'
    const navText = c.navbarTexto || '#1a1d26'
    const logoUrl = img.logoNavbar || `${basePath}/assets/img/logo/logo-200x60.webp`
    const primaryBtnColor = c.primario || '#0f172a'
    const accentHover = c.acento || colors.gold300

    const enlaces = [
      { href: routes.home.href(), texto: txt.navEnlaceInicio || 'Inicio y proceso' },
      {
        href: routes.poetdum.show.href(),
        texto: txt.navEnlacePoetdum || 'Elaboración del POETDUM',
      },
    ]
    const textoCta = txt.navCtaRegistrar || 'Registra tu participación'

    const navbarStyle = css({
      alignItems: 'center',
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      zIndex: 100,
      background: navBg,
      backdropFilter: 'blur(12px)',
      WebkitBackdropFilter: 'blur(12px)',
      borderBottom: `1px solid rgba(0,0,0,0.08)`,
      boxShadow: '0 4px 20px rgba(0, 0, 0, 0.06)',
    })

    const navInnerStyle = css({
      maxWidth: '1280px',
      margin: '0 auto',
      padding: '0 24px',
      height: NAVBAR_ALTURA,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: '32px',
      [`@media (max-width: ${NAVBAR_CORTE_MOVIL})`]: {
        height: NAVBAR_ALTURA_MOVIL,
        padding: '0 16px',
        gap: '12px',
      },
    })

    const navBrandStyle = css({
      display: 'flex',
      alignItems: 'center',
      gap: '14px',
      textDecoration: 'none',
      flexShrink: 0,
      minWidth: 0,
    })

    const imgLogoStyle = css({
      backgroundImage: `url(${logoUrl})`,
      backgroundSize: 'contain',
      backgroundRepeat: 'no-repeat',
      backgroundPosition: 'left center',
      width: '180px',
      height: '60px',
      maxWidth: '100%',
      [`@media (max-width: ${NAVBAR_CORTE_MOVIL})`]: { width: '132px', height: '44px' },
    })

    const navLinksStyle = css({
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      [`@media (max-width: ${NAVBAR_CORTE_MOVIL})`]: { display: 'none' },
    })

    const navLinkStyle = css({
      color: navText,
      textAlign: 'center',
      padding: '8px 16px',
      borderRadius: '6px',
      fontFamily: FONT_STACK,
      fontSize: '14px',
      fontWeight: 600,
      letterSpacing: '0.02em',
      textDecoration: 'none',
      transition: 'background 180ms ease, color 180ms ease',
      '&:hover': {
        color: accentHover,
      },
    })

    const navCtaStyle = css({
      padding: '10px 22px',
      borderRadius: '8px',
      background: primaryBtnColor,
      color: '#ffffff',
      fontFamily: FONT_STACK,
      fontSize: '13px',
      fontWeight: 700,
      letterSpacing: '0.04em',
      textDecoration: 'none',
      transition: 'background 180ms ease, transform 150ms ease, box-shadow 180ms ease',
      flexShrink: 0,
      boxShadow: '0 4px 12px rgba(0,0,0,0.12)',
      '&:hover': {
        background: accentHover,
        color: '#0f172a',
        transform: 'translateY(-1px)',
      },
      // En móvil el botón se muda al panel desplegable: dejarlo en la barra
      // obligaba a partirlo en dos líneas o a sacarlo fuera de la pantalla.
      [`@media (max-width: ${NAVBAR_CORTE_MOVIL})`]: { display: 'none' },
    })

    const burgerStyle = css({
      display: 'none',
      alignItems: 'center',
      justifyContent: 'center',
      width: '44px',
      height: '44px',
      flexShrink: 0,
      borderRadius: '8px',
      cursor: 'pointer',
      color: navText,
      fontSize: '24px',
      lineHeight: 1,
      [`@media (max-width: ${NAVBAR_CORTE_MOVIL})`]: { display: 'flex' },
    })

    const panelStyle = css({
      display: 'none',
      borderTop: '1px solid rgba(0,0,0,0.08)',
      background: navBg,
      padding: '10px 16px 18px',
    })

    const panelLinkStyle = css({
      display: 'block',
      padding: '14px 12px',
      borderRadius: '8px',
      color: navText,
      fontFamily: FONT_STACK,
      fontSize: '15px',
      fontWeight: 600,
      textDecoration: 'none',
      '&:hover': { background: 'rgba(0,0,0,0.05)' },
    })

    const panelCtaStyle = css({
      display: 'block',
      marginTop: '10px',
      padding: '14px 16px',
      borderRadius: '8px',
      background: primaryBtnColor,
      color: '#ffffff',
      fontFamily: FONT_STACK,
      fontSize: '14px',
      fontWeight: 700,
      letterSpacing: '0.04em',
      textAlign: 'center',
      textDecoration: 'none',
    })

    return (
      <nav role="navigation" aria-label="Navegación principal" mix={navbarStyle}>
        <style>{ESTILOS_MENU}</style>
        {/* El estado del menú vive en el checkbox: funciona sin JavaScript. */}
        <input type="checkbox" id="nav-toggle" aria-label="Abrir o cerrar el menú" />
        <div mix={navInnerStyle}>
          {/* Brand */}
          <a
            href={routes.home.href()}
            aria-label={txt.navbarTitulo || 'Inicio – Portal de Ordenamiento Territorial'}
            mix={navBrandStyle}
          >
            <div mix={imgLogoStyle} role="img" aria-label="Logotipo Portal" />
          </a>

          {/* Nav links */}
          <div mix={navLinksStyle}>
            {enlaces.map((enlace) => (
              <a key={enlace.href} href={enlace.href} mix={navLinkStyle}>
                {enlace.texto}
              </a>
            ))}
          </div>

          {/* CTA */}
          <a href={routes.participation.index.href()} id="nav-participar-btn" mix={navCtaStyle}>
            {textoCta}
          </a>

          <label id="nav-burger" for="nav-toggle" aria-hidden="true" mix={burgerStyle}>
            <span class="nav-burger__abrir" aria-hidden="true">
              ☰
            </span>
            <span class="nav-burger__cerrar" aria-hidden="true">
              ✕
            </span>
          </label>
        </div>

        <div id="nav-panel" mix={panelStyle}>
          {enlaces.map((enlace) => (
            <a key={enlace.href} href={enlace.href} mix={panelLinkStyle}>
              {enlace.texto}
            </a>
          ))}
          <a href={routes.participation.index.href()} mix={panelCtaStyle}>
            {textoCta}
          </a>
        </div>
      </nav>
    )
  }
}
