/**
 * Participation Page – Portal de Ordenamiento Territorial
 * Civic Horizon Design System
 *
 * Shell modular de la ruta /participation.
 */
import type { Handle } from 'remix/ui'
import { css } from 'remix/ui'
import type { ErroresParticipacion, ValoresParticipacion } from '../../data/participacion.ts'
import { routes } from '../../routes.ts'
import { colors, FONT_STACK, type ThemeData } from '../../ui/civic-horizon.ts'
import {
  NAVBAR_ALTURA,
  NAVBAR_ALTURA_MOVIL,
  NAVBAR_CORTE_MOVIL,
  NavBar,
} from '../../ui/nav-bar.tsx'
import { Document } from '../document.tsx'
import { ParticipationForm } from './participation-form.tsx'
import { SuccessDialog } from './success-dialog.tsx'

const basePath = (process.env.BASE_PATH ?? '/ordena').replace(/\/$/, '')

export interface ParticipationPageProps {
  theme?: ThemeData
  errors?: ErroresParticipacion
  /** Lo ya escrito, para no perderlo cuando la validación rechaza el envío. */
  values?: ValoresParticipacion
  success?: boolean
  folio?: string
  /** Firma del enlace de descarga del acuse, emitida por el backend al registrar. */
  acuseToken?: string
}

const splitStyle = css({
  display: 'flex',
  minHeight: '100vh',
  fontFamily: FONT_STACK,
  '& *, & *::before, & *::after': { boxSizing: 'border-box' },
})

/**
 * Columna lateral: arriba la fotografía del territorio —a su tamaño, sin
 * recortarla ni ampliarla, para que se vea nítida— y abajo la frase sobre el
 * color institucional, con el contraste de texto blanco sobre guinda.
 */
const imagePanelStyle = css({
  flex: '1 1 40%',
  minHeight: '100vh',
  display: 'flex',
  flexDirection: 'column',
  background: `linear-gradient(180deg, ${colors.burgundy900} 0%, #5c1428 100%)`,
  '@media (max-width: 860px)': { display: 'none' },
})

const imageFotoStyle = css({
  display: 'block',
  width: '100%',
  aspectRatio: '860 / 516',
  objectFit: 'cover',
  // Deja libre la barra de navegación fija, que si no tapa la parte alta de la foto.
  marginTop: NAVBAR_ALTURA,
  borderBottom: `4px solid ${colors.gold300}`,
})

const imageCaptionStyle = css({
  flex: '1 1 auto',
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'center',
  padding: '40px',
  color: '#ffffff',
})

const formPanelStyle = css({
  flex: '1 1 60%',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  padding: `calc(${NAVBAR_ALTURA} + 12px) 36px 28px`,
  // El corte es el mismo con el que la barra encoge: usar 768px dejaba, entre
  // 769 y 900px, un hueco de 21px bajo un encabezado que ya medía 64.
  [`@media (max-width: ${NAVBAR_CORTE_MOVIL})`]: {
    padding: `calc(${NAVBAR_ALTURA_MOVIL} + 12px) 16px 24px`,
  },
})

const formShellStyle = css({
  width: '100%',
  maxWidth: '820px',
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'center',
})

export function ParticipationPage(handle: Handle<ParticipationPageProps>) {
  return () => {
    const { errors = {}, values, success = false, folio, acuseToken, theme } = handle.props

    return (
      <Document
        title="Registra tu Participación – Portal de Ordenamiento Territorial"
        description="Formulario de participación ciudadana para el Programa de Ordenamiento Ecológico Territorial y de Desarrollo Urbano de San Pedro Tlaquepaque."
      >
        <NavBar theme={theme} />
        <div mix={splitStyle}>
          <aside mix={imagePanelStyle}>
            <img
              src={`${basePath}/assets/img/participacion/territorio.webp`}
              alt="Vista aérea del centro de San Pedro Tlaquepaque, con la Parroquia de San Pedro y el jardín"
              width="860"
              height="516"
              mix={imageFotoStyle}
            />
            <div mix={imageCaptionStyle}>
              <span
                mix={css({
                  fontFamily: FONT_STACK,
                  fontSize: '12px',
                  fontWeight: 700,
                  letterSpacing: '0.18em',
                  textTransform: 'uppercase',
                  color: colors.gold300,
                })}
              >
                Bitácora
              </span>
              <p
                mix={css({
                  fontFamily: FONT_STACK,
                  fontSize: 'clamp(24px, 2.4vw, 32px)',
                  fontWeight: 700,
                  lineHeight: 1.3,
                  margin: '12px 0 0',
                  maxWidth: '420px',
                })}
              >
                Tu voz ayuda a construir el futuro de San Pedro Tlaquepaque.
              </p>
            </div>
          </aside>

          <div mix={formPanelStyle}>
            <div mix={formShellStyle}>
              {success ? (
                <SuccessDialog
                  folio={folio}
                  acuseHref={
                    folio && acuseToken
                      ? `${routes.acuse.href({ folio })}?t=${encodeURIComponent(acuseToken)}`
                      : undefined
                  }
                  homeHref={routes.home.href()}
                />
              ) : (
                <ParticipationForm errors={errors} values={values} />
              )}
            </div>
          </div>
        </div>
      </Document>
    )
  }
}
