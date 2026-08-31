import { Document } from '../document.tsx'
import { NavBar } from '../../ui/nav-bar.tsx'
import { css, type Handle } from 'remix/ui'
import { Mapa } from './public/mapa.tsx'
import {
  colors,
  eyebrowProps,
  FONT_STACK,
  headingXLProps,
  sectionContainerProps,
  type ThemeData,
} from '../../ui/civic-horizon.ts'
import type { Actividad, Documento, Indicador, PublicPoelSesion } from './types.ts'
import { SesionesSection } from './sections/sesiones.tsx'
import { DescargasSection } from './sections/descargas.tsx'
import { ActividadesSection } from './sections/actividades.tsx'
import { DocumentosSection } from './sections/documentos.tsx'
import { SeguimientoSection } from './sections/seguimiento.tsx'

export interface PoetdumPageProps {
  theme?: ThemeData
  sesiones: PublicPoelSesion[]
  actividades: Actividad[]
  estado: string
  documentos: Documento[]
  tipo: string
  etapa: string
  indicadores: Indicador[]
}

const heroWrap = css({
  background: colors.burgundy900,
  padding: '120px 0 64px',
  textAlign: 'center',
})

const subnavWrap = css({
  position: 'sticky',
  top: '85px',
  zIndex: 50,
  background: colors.white,
  borderBottom: `1px solid ${colors.gray200}`,
  boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
})

const subnavInner = css({
  maxWidth: '1200px',
  margin: '0 auto',
  padding: '0 24px',
  display: 'flex',
  gap: '4px',
  overflowX: 'auto',
  scrollbarWidth: 'none',
})

const subnavLink = css({
  padding: '14px 18px',
  fontFamily: FONT_STACK,
  fontSize: '13px',
  fontWeight: 700,
  letterSpacing: '0.06em',
  textTransform: 'uppercase',
  color: colors.gray700,
  textDecoration: 'none',
  borderBottom: `3px solid transparent`,
  whiteSpace: 'nowrap',
  transition: 'color 180ms ease, border-color 180ms ease',
  '&:hover': { color: colors.burgundy900, borderBottomColor: colors.burgundy900 },
})

const sectionWrap = css({
  maxWidth: '1100px',
  margin: '0 auto',
  padding: '64px 24px',
  fontFamily: FONT_STACK,
})

const chipBase = css({
  display: 'inline-flex',
  alignItems: 'center',
  gap: '8px',
  padding: '6px 14px',
  borderRadius: '9999px',
  fontFamily: FONT_STACK,
  fontSize: '13px',
  fontWeight: 600,
  border: '1px solid',
})


export function PoetdumPage(handle: Handle<PoetdumPageProps>) {
  return () => {
    const { theme, sesiones, actividades, estado, documentos, tipo, etapa, indicadores } = handle.props
    return (
      <Document
        title="Elaboración del POETDUM"
        head={<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />}
      >
        <style>{'html{scroll-behavior:smooth} section[id]{scroll-margin-top:140px}'}</style>
        <NavBar theme={theme} />

        {/* Hero */}
        <section aria-labelledby="poetdum-hero" mix={heroWrap}>
          <div mix={css({ ...sectionContainerProps, display: 'flex', flexDirection: 'column', gap: '16px', alignItems: 'center' })}>
            <span mix={css({ ...eyebrowProps, color: colors.gold400 })}>Bitácora Ambiental · Tlaquepaque</span>
            <h1 id="poetdum-hero" mix={css({ ...headingXLProps, margin: 0, color: colors.white })}>
              ELABORACIÓN DEL POETDUM
            </h1>
            <p
              mix={css({
                fontFamily: FONT_STACK,
                fontSize: '18px',
                lineHeight: 1.6,
                color: 'rgba(255,255,255,0.85)',
                maxWidth: '720px',
                margin: 0,
              })}
            >
              Sigue el avance del Programa de Ordenamiento Ecológico Territorial y de Desarrollo Urbano: sesiones,
              documentos oficiales, actividades y seguimiento de indicadores en un solo lugar.
            </p>
          </div>
        </section>

        {/* Mapa + simbología */}
        <section aria-labelledby="mapa-heading" mix={css({ background: colors.gray50, padding: '48px 0' })}>
          <div mix={css({ ...sectionContainerProps })}>
            <h2
              id="mapa-heading"
              mix={css({
                fontFamily: FONT_STACK,
                fontSize: '22px',
                fontWeight: 700,
                color: colors.gray900,
                margin: '0 0 24px',
                textAlign: 'center',
              })}
            >
              Mapa del territorio
            </h2>
            <div
              mix={css({
                display: 'grid',
                gridTemplateColumns: '1fr 320px',
                gap: '32px',
                alignItems: 'start',
                '@media (max-width: 900px)': { gridTemplateColumns: '1fr' },
              })}
            >
              <Mapa />
              <div mix={css({ display: 'flex', flexDirection: 'column', gap: '12px' })}>
                <h3
                  mix={css({
                    fontFamily: FONT_STACK,
                    fontSize: '14px',
                    fontWeight: 700,
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                    color: colors.gray700,
                    margin: 0,
                  })}
                >
                  Simbología
                </h3>
                <div mix={css({ display: 'flex', flexDirection: 'column', gap: '8px' })}>
                  <span mix={[chipBase, css({ background: '#dcfce7', borderColor: '#86efac', color: '#166534' })]}>
                    <span
                      mix={css({ width: '12px', height: '12px', borderRadius: '50%', background: '#22c55e', display: 'inline-block' })}
                    />
                    Protección
                  </span>
                  <span mix={[chipBase, css({ background: '#fef3c7', borderColor: '#fcd34d', color: '#92400e' })]}>
                    <span
                      mix={css({ width: '12px', height: '12px', borderRadius: '50%', background: '#f59e0b', display: 'inline-block' })}
                    />
                    Conservación
                  </span>
                  <span mix={[chipBase, css({ background: '#dbeafe', borderColor: '#93c5fd', color: '#1e40af' })]}>
                    <span
                      mix={css({ width: '12px', height: '12px', borderRadius: '50%', background: '#3b82f6', display: 'inline-block' })}
                    />
                    Restauración
                  </span>
                  <span mix={[chipBase, css({ background: '#fee2e2', borderColor: '#fca5a5', color: '#991b1b' })]}>
                    <span
                      mix={css({ width: '12px', height: '12px', borderRadius: '50%', background: '#ef4444', display: 'inline-block' })}
                    />
                    Aprovechamiento sustentable
                  </span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Subnav sticky */}
        <nav aria-label="Secciones POETDUM" mix={subnavWrap}>
          <div mix={subnavInner}>
            <a href="#sesiones" mix={subnavLink}>
              Sesiones
            </a>
            <a href="#descargas" mix={subnavLink}>
              Documentos oficiales
            </a>
            <a href="#actividades" mix={subnavLink}>
              Actividades
            </a>
            <a href="#documentos" mix={subnavLink}>
              Repositorio
            </a>
            <a href="#seguimiento" mix={subnavLink}>
              Seguimiento
            </a>
          </div>
        </nav>

        <main>
          <section id="sesiones" mix={sectionWrap}>
            <h2
              mix={css({
                fontFamily: FONT_STACK,
                fontSize: '28px',
                fontWeight: 800,
                color: colors.gray900,
                margin: '0 0 24px',
              })}
            >
              Sesiones del proceso
            </h2>
            <SesionesSection sesiones={sesiones} />
          </section>

          <section id="descargas" mix={css({ maxWidth: '1100px', margin: '0 auto', padding: '32px 24px' })}>
            <DescargasSection />
          </section>

          <section id="actividades" mix={sectionWrap}>
            <ActividadesSection actividades={actividades} estado={estado} />
          </section>

          <section id="documentos" mix={sectionWrap}>
            <DocumentosSection documentos={documentos} tipo={tipo} etapa={etapa} />
          </section>

          <section id="seguimiento" mix={sectionWrap}>
            <SeguimientoSection indicadores={indicadores} />
          </section>
          <p>contained</p>
        </main>

        <footer
          mix={css({
            background: colors.gray900,
            color: 'rgba(255,255,255,0.7)',
            padding: '32px 24px',
            textAlign: 'center',
            fontFamily: FONT_STACK,
            fontSize: '13px',
            borderTop: `1px solid ${colors.gray800}`,
          })}
        >
          <p mix={css({ margin: 0 })}>
            © 2026 H. Ayuntamiento de San Pedro Tlaquepaque · Bitácora Ambiental POETDUM
          </p>
        </footer>
      </Document>
    )
  }
}
