import type { Handle } from 'remix/ui'
import { css } from 'remix/ui'
import { colors, FONT_STACK, type ThemeData } from './civic-horizon.ts'
import { routes } from '../routes.ts'
import { shadows } from '../styles/shadows.tsx'

export interface NavBarProps {
  theme?: ThemeData
}

export function NavBar(handle: Handle<NavBarProps>) {
  return () => {
    const theme = handle.props.theme
    const u = theme?.usuario || {}
    const c = u.colores || {}
    const img = u.imagenes || {}

    const navBg = c.navbarFondo || 'rgba(255,255,255,0.98)'
    const navText = c.navbarTexto || '#1a1d26'
    const logoUrl = img.logoNavbar || 'https://ordenamiento.tlaquepaque.gob.mx/img/image5.png'
    const primaryBtnColor = c.primario || '#0f172a'
    const accentHover = c.acento || colors.gold300

    const navbarStyle = css({
      alignItems: 'center',
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      zIndex: 100,
      background: navBg,
      backdropFilter: 'blur(12px)',
      borderBottom: `1px solid rgba(0,0,0,0.08)`,
      boxShadow:shadows.xl,
    })

    const navInnerStyle = css({
      maxWidth: '1280px',
      margin: '0 auto',
      padding: '0 24px',
      height: '85px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: '32px',
    })

    const navBrandStyle = css({
      display: 'flex',
      alignItems: 'center',
      gap: '14px',
      textDecoration: 'none',
      flexShrink: 0,
    })

    const imgLogoStyle = css({
      backgroundImage: `url(${logoUrl})`,
      backgroundSize: 'contain',
      backgroundRepeat: 'no-repeat',
      backgroundPosition: 'left center',
      width: '180px',
      height: '60px',
    })

    const navLinksStyle = css({
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      '@media (max-width: 768px)': { display: 'none' },
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
    })

    return (
      <nav role="navigation" aria-label="Navegación principal" mix={navbarStyle}>
        <div mix={navInnerStyle}>
          {/* Brand */}
          <a
            href={routes.home.href()}
            aria-label="Inicio – Portal de Ordenamiento Territorial"
            mix={navBrandStyle}
          >
            <div mix={imgLogoStyle} role="img" aria-label="Logotipo Portal" />
          </a>

          {/* Nav links */}
          <div mix={navLinksStyle}>
            <a href={routes.home.href()} mix={navLinkStyle}>
              Inicio y proceso
            </a>
            <a href={routes.poetdum.show.href()} mix={navLinkStyle}>
              Elaboración del POETDUM
            </a>
          </div>

          {/* CTA */}
          <a href={routes.participation.index.href()} id="nav-participar-btn" mix={navCtaStyle}>
            Subir participación
          </a>
        </div>
      </nav>
    )
  }
}
