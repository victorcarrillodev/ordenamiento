/**
 * Participation Page – Portal de Ordenamiento Territorial
 * Civic Horizon Design System
 *
 * Renders the citizen participation registration form as a split screen:
 * the form is the page (no card/paper chrome) and takes only the width its
 * fields need, with a scenic image filling whatever horizontal space is
 * left over. Sized to fit close to one viewport on typical screens.
 */
import type { Handle } from 'remix/ui'
import { css } from 'remix/ui'
import { routes } from '../../routes.ts'
import { NavBar } from '../../components/NavBar.tsx'

import {
  btnPrimaryProps,
  colors,
  FONT_STACK,
  inputErrorProps,
  inputProps,
} from '../../ui/civic-horizon.ts'
import { Document } from '../document.tsx'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface FormErrors {
  nombre?: string
  email?: string
  municipio?: string
  observacion?: string
  archivos?: string
}

export interface ParticipationPageProps {
  errors?: FormErrors
  success?: boolean
}

// ---------------------------------------------------------------------------
// Shared styles (pre-built descriptors for repeated use)
// ---------------------------------------------------------------------------

const NAVBAR_HEIGHT = '85px'

const labelStyle = css({
  fontFamily: FONT_STACK,
  fontSize: '12.5px',
  fontWeight: 700,
  color: colors.gray700,
  letterSpacing: '0.03em',
  display: 'block',
  marginBottom: '5px',
})

const fieldGroupStyle = css({
  display: 'flex',
  flexDirection: 'column',
  gap: '0',
  minWidth: 0,
})

const errorMsgStyle = css({
  fontFamily: FONT_STACK,
  fontSize: '12.5px',
  color: '#dc2626',
  marginTop: '4px',
})

const fieldRowStyle = css({
  display: 'grid',
  gridTemplateColumns: '1fr 1fr',
  gap: '16px',
  '@media (max-width: 560px)': { gridTemplateColumns: '1fr' },
})

const fieldRow3Style = css({
  display: 'grid',
  gridTemplateColumns: '1fr 1fr 1fr',
  gap: '16px',
  '@media (max-width: 640px)': { gridTemplateColumns: '1fr 1fr' },
  '@media (max-width: 420px)': { gridTemplateColumns: '1fr' },
})

const requiredMark = (
  <span mix={css({ color: colors.burgundy900 })} aria-hidden="true">
    {' '}
    *
  </span>
)

// ---------------------------------------------------------------------------
// Page root
// ---------------------------------------------------------------------------

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
  left: '40px',
  right: '40px',
  bottom: '48px',
  color: colors.white,
})

const formPanelStyle = css({
  flex: '1 1 60%',
  display: 'flex',
  justifyContent: 'center',
  padding: `calc(${NAVBAR_HEIGHT} + 28px) 32px 32px`,
})

const formShellStyle = css({
  width: '100%',
  maxWidth: '660px',
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'center',
})

export function ParticipationPage(handle: Handle<ParticipationPageProps>) {
  return () => {
    const { errors = {}, success = false } = handle.props

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
              {success ? <SuccessMessage /> : <ParticipationForm errors={errors} />}
            </div>
          </div>
        </div>
      </Document>
    )
  }
}

// ---------------------------------------------------------------------------
// Success message
// ---------------------------------------------------------------------------

function SuccessMessage() {
  return () => (
    <div
      mix={css({
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-start',
        gap: '20px',
      })}
    >
      <div
        aria-hidden="true"
        mix={css({
          width: '64px',
          height: '64px',
          borderRadius: '50%',
          background: colors.green100,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '30px',
        })}
      >
        ✅
      </div>
      <h1
        mix={css({
          fontFamily: FONT_STACK,
          fontSize: 'clamp(24px, 3vw, 30px)',
          fontWeight: 700,
          color: colors.green700,
          margin: 0,
        })}
      >
        ¡Participación registrada con éxito!
      </h1>
      <p
        mix={css({
          fontFamily: FONT_STACK,
          fontSize: '15px',
          lineHeight: 1.65,
          color: colors.gray500,
          margin: 0,
          maxWidth: '480px',
        })}
      >
        Tu registro ha sido recibido correctamente. El equipo técnico revisará tu aportación en el
        contexto del Programa de Ordenamiento Territorial. Gracias por contribuir al futuro de San
        Pedro Tlaquepaque.
      </p>
      <a href={routes.home.href()} mix={css({ ...btnPrimaryProps, marginTop: '4px' })}>
        Volver al portal
      </a>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Form
// ---------------------------------------------------------------------------

function ParticipationForm(handle: Handle<{ errors: FormErrors }>) {
  return () => {
    const { errors } = handle.props

    return (
      <>
        <a
          href={routes.home.href()}
          mix={css({
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            fontFamily: FONT_STACK,
            fontSize: '13px',
            fontWeight: 600,
            color: colors.gray500,
            textDecoration: 'none',
            marginBottom: '14px',
            transition: 'color 150ms ease',
            '&:hover': { color: colors.burgundy900 },
          })}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path
              d="M19 12H5M12 19l-7-7 7-7"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </svg>
          Volver al inicio
        </a>

        <h1
          mix={css({
            fontFamily: FONT_STACK,
            fontSize: 'clamp(24px, 2.6vw, 30px)',
            fontWeight: 700,
            lineHeight: 1.2,
            color: colors.gray900,
            margin: '0 0 6px',
          })}
        >
          Registra tu participación
        </h1>
        <p
          mix={css({
            fontFamily: FONT_STACK,
            fontSize: '14px',
            lineHeight: 1.55,
            color: colors.gray500,
            margin: '0 0 22px',
          })}
        >
          Comparte tu observación, propuesta o documento técnico con el equipo del Programa de
          Ordenamiento Territorial. Los campos con{' '}
          <strong mix={css({ color: colors.burgundy900 })}>*</strong> son obligatorios.
        </p>

        <form
          id="participation-form"
          method="POST"
          action={routes.participation.action.href()}
          encType="multipart/form-data"
          mix={css({ display: 'flex', flexDirection: 'column', gap: '16px' })}
          noValidate
        >
          <div mix={fieldRowStyle}>
            <div mix={fieldGroupStyle}>
              <label for="nombre" mix={labelStyle}>
                Nombre completo{requiredMark}
              </label>
              <input
                id="nombre"
                name="nombre"
                type="text"
                placeholder="Ej. María González López"
                required
                aria-required="true"
                aria-describedby={errors.nombre ? 'nombre-error' : undefined}
                mix={css(errors.nombre ? { ...inputProps, ...inputErrorProps } : inputProps)}
              />
              {errors.nombre && (
                <span id="nombre-error" role="alert" mix={errorMsgStyle}>
                  ⚠ {errors.nombre}
                </span>
              )}
            </div>

            <div mix={fieldGroupStyle}>
              <label for="email" mix={labelStyle}>
                Correo electrónico{requiredMark}
              </label>
              <input
                id="email"
                name="email"
                type="email"
                placeholder="correo@ejemplo.com"
                required
                aria-required="true"
                aria-describedby={errors.email ? 'email-error' : undefined}
                mix={css(errors.email ? { ...inputProps, ...inputErrorProps } : inputProps)}
              />
              {errors.email && (
                <span id="email-error" role="alert" mix={errorMsgStyle}>
                  ⚠ {errors.email}
                </span>
              )}
            </div>
          </div>

          <div mix={fieldRow3Style}>
            <div mix={fieldGroupStyle}>
              <label for="domicilio" mix={labelStyle}>
                Domicilio
              </label>
              <input
                id="domicilio"
                name="domicilio"
                type="text"
                placeholder="Calle y número"
                mix={css(inputProps)}
              />
            </div>

            <div mix={fieldGroupStyle}>
              <label for="municipio" mix={labelStyle}>
                Colonia / Municipio{requiredMark}
              </label>
              <input
                id="municipio"
                name="municipio"
                type="text"
                placeholder="Ej. Centro, Tlaquepaque"
                required
                aria-required="true"
                aria-describedby={errors.municipio ? 'municipio-error' : undefined}
                mix={css(errors.municipio ? { ...inputProps, ...inputErrorProps } : inputProps)}
              />
              {errors.municipio && (
                <span id="municipio-error" role="alert" mix={errorMsgStyle}>
                  ⚠ {errors.municipio}
                </span>
              )}
            </div>

            <div mix={fieldGroupStyle}>
              <label for="institucion" mix={labelStyle}>
                Institución u organización
              </label>
              <input
                id="institucion"
                name="institucion"
                type="text"
                placeholder="Opcional"
                mix={css(inputProps)}
              />
            </div>
          </div>

          <div mix={fieldGroupStyle}>
            <label for="observacion" mix={labelStyle}>
              Observación o propuesta{requiredMark}
            </label>
            <textarea
              id="observacion"
              name="observacion"
              rows={3}
              placeholder="Describe tu observación, comentario técnico o propuesta sobre el ordenamiento territorial..."
              required
              aria-required="true"
              aria-describedby={errors.observacion ? 'observacion-error' : undefined}
              mix={css(
                errors.observacion
                  ? { ...inputProps, ...inputErrorProps, resize: 'vertical', minHeight: '72px' }
                  : { ...inputProps, resize: 'vertical', minHeight: '72px' },
              )}
            />
            {errors.observacion && (
              <span id="observacion-error" role="alert" mix={errorMsgStyle}>
                ⚠ {errors.observacion}
              </span>
            )}
          </div>

          <div mix={fieldGroupStyle}>
            <label for="archivos" mix={labelStyle}>
              Documentos adjuntos (opcional)
            </label>
            <input
              id="archivos"
              name="archivos"
              type="file"
              multiple
              accept=".pdf,.shp,.jpg,.jpeg,.dwg,.png"
              mix={css({
                fontFamily: FONT_STACK,
                fontSize: '13px',
                color: colors.gray500,
                width: '100%',
                '&::file-selector-button': {
                  fontFamily: FONT_STACK,
                  fontSize: '13px',
                  fontWeight: 700,
                  color: colors.burgundy900,
                  background: colors.burgundy50,
                  border: `1px solid ${colors.burgundy900}30`,
                  borderRadius: '6px',
                  padding: '8px 14px',
                  marginRight: '12px',
                  cursor: 'pointer',
                },
              })}
            />
            <span
              mix={css({
                fontFamily: FONT_STACK,
                fontSize: '11.5px',
                color: colors.gray400,
                marginTop: '5px',
              })}
            >
              PDF, SHP, JPG, DWG · hasta 220 MB por archivo
            </span>
            {errors.archivos && (
              <span id="archivos-error" role="alert" mix={errorMsgStyle}>
                ⚠ {errors.archivos}
              </span>
            )}
          </div>

          <p
            mix={css({
              fontFamily: FONT_STACK,
              fontSize: '11.5px',
              lineHeight: 1.55,
              color: colors.gray400,
              margin: '4px 0 0',
            })}
          >
            La información proporcionada será tratada conforme a la Ley General de Protección de
            Datos Personales en Posesión de Sujetos Obligados y solo se usará en el marco de este
            programa.
          </p>

          <label
            mix={css({
              display: 'flex',
              alignItems: 'flex-start',
              gap: '10px',
              cursor: 'pointer',
              marginTop: '2px',
            })}
          >
            <input
              id="consentimiento"
              name="consentimiento"
              type="checkbox"
              required
              mix={css({
                width: '17px',
                height: '17px',
                marginTop: '2px',
                accentColor: colors.burgundy900,
                flexShrink: 0,
                cursor: 'pointer',
              })}
            />
            <span
              mix={css({
                fontFamily: FONT_STACK,
                fontSize: '13px',
                lineHeight: 1.5,
                color: colors.gray700,
              })}
            >
              Doy mi consentimiento para el uso de esta información en el proceso de ordenamiento
              territorial. <span mix={css({ color: '#dc2626' })}>*</span>
            </span>
          </label>

          <div mix={css({ display: 'flex', justifyContent: 'flex-end', paddingTop: '4px' })}>
            <button
              id="participation-submit-btn"
              type="submit"
              mix={css({ ...btnPrimaryProps, fontSize: '14px', padding: '13px 34px' })}
            >
              Enviar participación
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path
                  d="M22 2L11 13M22 2L15 22l-4-9-9-4 19-7z"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
              </svg>
            </button>
          </div>
        </form>
      </>
    )
  }
}
