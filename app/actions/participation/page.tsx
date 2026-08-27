/**
 * Participation Page – Portal de Ordenamiento Territorial
 * Civic Horizon Design System
 *
 * Shell modular de la ruta /participation.
 */
import type { Handle } from 'remix/ui'
import { css } from 'remix/ui'
import { routes } from '../../routes.ts'
import { colors, FONT_STACK } from '../../ui/civic-horizon.ts'
import { NavBar } from '../../ui/nav-bar.tsx'
import { Document } from '../document.tsx'
import { ParticipationForm } from './participation-form.tsx'
import type { FormErrors, FormValues } from './schema.ts'
import { SuccessDialog } from './success-dialog.tsx'

export type { FormErrors }

export interface ParticipationPageProps {
  errors?: FormErrors
  /** Lo ya escrito, para no perderlo cuando la validación rechaza el envío. */
  values?: FormValues
  success?: boolean
  folio?: string
}

const NAVBAR_HEIGHT = '85px'

const splitStyle = css({
  display: 'flex',
  minHeight: '100vh',
  fontFamily: FONT_STACK,
  '& *, & *::before, & *::after': { boxSizing: 'border-box' },
})

const imagePanelStyle = css({
  position: 'relative',
  flex: '1 1 40%',
  minHeight: '100vh',
  backgroundImage: 'url(/images/hero-landscape.jpg)',
  backgroundSize: 'cover',
  backgroundPosition: 'center 35%',
  '@media (max-width: 860px)': { display: 'none' },
})

const imageOverlayStyle = css({
  position: 'absolute',
  inset: 0,
  background: `linear-gradient(200deg, rgba(15,17,23,0.15) 0%, rgba(140,29,61,0.55) 65%, rgba(15,17,23,0.75) 100%)`,
})

const imageCaptionStyle = css({
  position: 'absolute',
  bottom: '40px',
  left: '40px',
  right: '40px',
  color: '#ffffff',
})

const formPanelStyle = css({
  flex: '1 1 60%',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  padding: `calc(${NAVBAR_HEIGHT} + 12px) 36px 28px`,
  '@media (max-width: 768px)': {
    padding: `calc(${NAVBAR_HEIGHT} + 12px) 20px 24px`,
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
    const { errors = {}, values, success = false, folio } = handle.props

    return (
      <Document
        title="Registra tu Participación – Portal de Ordenamiento Territorial"
        description="Formulario de participación ciudadana para el Programa de Ordenamiento Ecológico Territorial y de Desarrollo Urbano de San Pedro Tlaquepaque."
      >
        <NavBar />
        <div mix={splitStyle}>
          <div mix={imagePanelStyle} role="img" aria-label="Paisaje de San Pedro Tlaquepaque">
            <div mix={imageOverlayStyle} aria-hidden="true" />
            <div mix={imageCaptionStyle} aria-hidden="true">
              <span
                mix={css({
                  fontFamily: FONT_STACK,
                  fontSize: '11px',
                  fontWeight: 700,
                  letterSpacing: '0.18em',
                  textTransform: 'uppercase',
                  color: colors.gold300,
                })}
              >
                Bitácora Ambiental
              </span>
              <p
                mix={css({
                  fontFamily: FONT_STACK,
                  fontSize: '20px',
                  fontWeight: 600,
                  lineHeight: 1.4,
                  margin: '10px 0 0',
                  maxWidth: '360px',
                })}
              >
                Tu voz ayuda a construir el territorio que queremos para San Pedro Tlaquepaque.
              </p>
            </div>
          </div>

          <div mix={formPanelStyle}>
            <div mix={formShellStyle}>
              {success ? (
                <SuccessDialog folio={folio} homeHref={routes.home.href()} />
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
