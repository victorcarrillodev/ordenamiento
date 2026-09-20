/**
 * Marco común de las páginas públicas del Programa (POETDUM): barra de
 * navegación, encabezado, submenú fijo entre sus secciones y pie.
 */
import { css, type Handle, type RemixNode } from 'remix/ui'

import { routes } from '../../routes.ts'
import {
  colors,
  eyebrowProps,
  FONT_STACK,
  headingXLProps,
  isSafeCssColor,
  sectionContainerProps,
  type ThemeData,
} from '../../ui/civic-horizon.ts'
import {
  NAVBAR_ALTURA,
  NAVBAR_ALTURA_MOVIL,
  NAVBAR_CORTE_MOVIL,
  NavBar,
} from '../../ui/nav-bar.tsx'
import { Document } from '../document.tsx'

export type SeccionPrograma =
  'inicio' | 'avances' | 'calendario' | 'proximas' | 'documentos' | 'seguimiento' | 'ficha'

const SECCIONES: Array<{ clave: SeccionPrograma; texto: string; href: string }> = [
  { clave: 'inicio', texto: 'El Programa', href: routes.poetdum.show.href() },
  { clave: 'avances', texto: 'Avances', href: routes.poetdum.avances.href() },
  { clave: 'calendario', texto: 'Calendario', href: routes.poetdum.calendario.href() },
  {
    clave: 'proximas',
    texto: 'Próximas actividades',
    href: routes.poetdum.actividades.show.href(),
  },
  { clave: 'documentos', texto: 'Documentos', href: `${routes.poetdum.show.href()}#documentos` },
  { clave: 'seguimiento', texto: 'Seguimiento', href: routes.poetdum.seguimiento.href() },
]

const subnavStyle = css({
  position: 'sticky',
  top: NAVBAR_ALTURA,
  [`@media (max-width: ${NAVBAR_CORTE_MOVIL})`]: { top: NAVBAR_ALTURA_MOVIL },
  zIndex: 50,
  background: colors.white,
  borderBottom: `1px solid ${colors.gray200}`,
  boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
})

const subnavInteriorStyle = css({
  maxWidth: '1200px',
  margin: '0 auto',
  padding: '0 24px',
  display: 'flex',
  gap: '4px',
  overflowX: 'auto',
  scrollbarWidth: 'none',
  '@media (max-width: 480px)': { padding: '0 12px' },
})

const enlaceSubnavStyle = css({
  padding: '14px 16px',
  fontFamily: FONT_STACK,
  fontSize: '13px',
  fontWeight: 700,
  letterSpacing: '0.05em',
  textTransform: 'uppercase',
  color: colors.gray700,
  textDecoration: 'none',
  borderBottom: '3px solid transparent',
  whiteSpace: 'nowrap',
  transition: 'color 180ms ease, border-color 180ms ease',
  '&:hover': { color: colors.burgundy900, borderBottomColor: colors.burgundy100 },
  '&[aria-current="page"]': { color: colors.burgundy900, borderBottomColor: colors.burgundy900 },
})

export interface ProgramaLayoutProps {
  theme?: ThemeData
  seccion: SeccionPrograma
  titulo: string
  eyebrow?: string
  descripcion?: string
  /** Título de la pestaña del navegador; por omisión, el de la página. */
  tituloDocumento?: string
  head?: RemixNode
  children?: RemixNode
}

export function ProgramaLayout(handle: Handle<ProgramaLayoutProps>) {
  return () => {
    const { theme, seccion, titulo, eyebrow, descripcion, tituloDocumento, head, children } =
      handle.props
    const primarioTema = theme?.usuario?.colores?.primario
    const primario = isSafeCssColor(primarioTema) ? primarioTema : colors.burgundy900
    return (
      <Document title={`${tituloDocumento ?? titulo} – Bitácora Ambiental`} head={head}>
        <style>{'html{scroll-behavior:smooth} [id]{scroll-margin-top:150px}'}</style>
        <NavBar theme={theme} />

        <header
          mix={css({
            background: primario,
            padding: `calc(${NAVBAR_ALTURA} + 48px) 0 48px`,
            [`@media (max-width: ${NAVBAR_CORTE_MOVIL})`]: {
              padding: `calc(${NAVBAR_ALTURA_MOVIL} + 32px) 0 36px`,
            },
          })}
        >
          <div
            mix={css({
              ...sectionContainerProps,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '14px',
              textAlign: 'center',
            })}
          >
            <span mix={css({ ...eyebrowProps, color: colors.gold400 })}>
              {eyebrow ?? 'Bitácora Ambiental · Programa de Ordenamiento'}
            </span>
            <h1
              mix={css({
                ...headingXLProps,
                fontSize: 'clamp(28px, 4.5vw, 48px)',
                margin: 0,
                maxWidth: '920px',
              })}
            >
              {titulo}
            </h1>
            {descripcion ? (
              <p
                mix={css({
                  fontFamily: FONT_STACK,
                  fontSize: '17px',
                  lineHeight: 1.6,
                  color: 'rgba(255,255,255,0.88)',
                  maxWidth: '760px',
                  margin: 0,
                })}
              >
                {descripcion}
              </p>
            ) : null}
          </div>
        </header>

        <nav aria-label="Secciones del Programa" mix={subnavStyle}>
          <div mix={subnavInteriorStyle}>
            {SECCIONES.map((s) => (
              <a
                key={s.clave}
                href={s.href}
                mix={enlaceSubnavStyle}
                aria-current={s.clave === seccion ? 'page' : undefined}
              >
                {s.texto}
              </a>
            ))}
          </div>
        </nav>

        <main id="main-content" mix={css({ fontFamily: FONT_STACK, background: colors.white })}>
          {children}
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

/** Contenedor estándar de una sección dentro de estas páginas. */
export const seccionStyle = css({
  maxWidth: '1100px',
  margin: '0 auto',
  padding: '56px 24px',
  '@media (max-width: 480px)': { padding: '40px 16px' },
})

export const tituloSeccionStyle = css({
  fontFamily: FONT_STACK,
  fontSize: 'clamp(22px, 3vw, 28px)',
  fontWeight: 800,
  color: colors.gray900,
  margin: '0 0 8px',
})

export const introSeccionStyle = css({
  fontFamily: FONT_STACK,
  fontSize: '16px',
  lineHeight: 1.6,
  color: colors.gray500,
  margin: '0 0 28px',
})

export const vacioStyle = css({
  fontFamily: FONT_STACK,
  fontSize: '15px',
  lineHeight: 1.6,
  color: colors.gray700,
  textAlign: 'center',
  padding: '32px 24px',
  background: colors.gray50,
  border: `1px dashed ${colors.gray300}`,
  borderRadius: '12px',
  margin: 0,
})
