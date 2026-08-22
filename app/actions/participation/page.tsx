/**
 * Participation Page – Portal de Ordenamiento Territorial
 * Civic Horizon Design System
 *
 * Renders the citizen participation registration form.
 */
import type { Handle } from 'remix/ui'
import { css } from 'remix/ui'
import {NavBar} from "../../components/NavBar.tsx"

import {
  btnPrimaryProps,
  colors,
  eyebrowProps,
  FONT_STACK,
  headingLProps,
  headingMProps,
  inputErrorProps,
  inputProps,
  sectionContainerProps,
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
}

export interface ParticipationPageProps {
  errors?: FormErrors
  success?: boolean
}

// ---------------------------------------------------------------------------
// Shared styles (pre-built descriptors for repeated use)
// ---------------------------------------------------------------------------

const labelStyle = css({
  fontFamily: FONT_STACK,
  fontSize: '13px',
  fontWeight: 700,
  color: colors.gray700,
  letterSpacing: '0.04em',
  display: 'block',
  marginBottom: '6px',
})

const fieldGroupStyle = css({
  display: 'flex',
  flexDirection: 'column',
  gap: '0',
})

const errorMsgStyle = css({
  fontFamily: FONT_STACK,
  fontSize: '13px',
  color: '#dc2626',
  marginTop: '4px',
})

const fieldsetStyle = css({
  border: 'none',
  padding: 0,
  margin: 0,
  display: 'flex',
  flexDirection: 'column',
  gap: '24px',
})

const legendStyle = css({
  fontFamily: FONT_STACK,
  fontSize: '13px',
  fontWeight: 700,
  letterSpacing: '0.1em',
  textTransform: 'uppercase',
  color: colors.burgundy900,
  paddingBottom: '12px',
  borderBottom: `2px solid ${colors.burgundy900}22`,
  width: '100%',
  marginBottom: '8px',
})

// ---------------------------------------------------------------------------
// Page root
// ---------------------------------------------------------------------------

export function ParticipationPage(handle: Handle<ParticipationPageProps>) {
  return () => {
    const { errors = {}, success = false } = handle.props

    return (
      <Document
        title="Registra tu Participación – Portal de Ordenamiento Territorial"
        description="Formulario de participación ciudadana para el Programa de Ordenamiento Ecológico Territorial y de Desarrollo Urbano de San Pedro Tlaquepaque."
      >
        <div
          mix={css({
            '& *, & *::before, & *::after': { boxSizing: 'border-box' },
            fontFamily: FONT_STACK,
            background: colors.gray50,
            minHeight: '100vh',
          })}
        >
          {/* Page header */}
          <header
            mix={css({
              background: `linear-gradient(135deg, ${colors.burgundy900} 0%, ${colors.gray900} 100%)`,
              padding: '48px 24px 64px',
            })}
          >
            <div
              mix={css({
                ...sectionContainerProps,
                display: 'flex',
                flexDirection: 'column',
                gap: '16px',
              })}
            >
              <a
                href="/"
                mix={css({
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  fontFamily: FONT_STACK,
                  fontSize: '13px',
                  fontWeight: 600,
                  color: 'rgba(255,255,255,0.65)',
                  textDecoration: 'none',
                  marginBottom: '8px',
                  transition: 'color 150ms ease',
                  '&:hover': { color: colors.white },
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
              <span mix={css({ ...eyebrowProps, color: colors.gold400 })}>
                Participación ciudadana
              </span>
              <h1
                mix={css({ ...headingLProps, color: colors.white, margin: 0, maxWidth: '600px' })}
              >
                Registra tu observación y participación
              </h1>
              <p
                mix={css({
                  fontFamily: FONT_STACK,
                  fontSize: '16px',
                  lineHeight: 1.7,
                  color: 'rgba(255,255,255,0.72)',
                  margin: 0,
                  maxWidth: '560px',
                })}
              >
                Comparte tus observaciones, propuestas y documentos técnicos con el equipo
                responsable del Programa de Ordenamiento Territorial.
              </p>
            </div>
          </header>

          {/* Form card */}
          <div
            mix={css({
              ...sectionContainerProps,
              maxWidth: '860px',
              padding: '0 24px',
              marginTop: '-40px',
              marginBottom: '80px',
              position: 'relative',
              zIndex: 1,
            })}
          >
            {success ? <SuccessMessage /> : <ParticipationForm errors={errors} />}
          </div>
        </div>
      <NavBar/>

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
        background: colors.white,
        borderRadius: '16px',
        boxShadow: '0 8px 40px rgba(0,0,0,0.10)',
        padding: '64px 48px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '24px',
        textAlign: 'center',
        '@media (max-width: 600px)': { padding: '40px 24px' },
      })}
    >
      <div
        aria-hidden="true"
        mix={css({
          width: '80px',
          height: '80px',
          borderRadius: '50%',
          background: colors.green100,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '36px',
        })}
      >
        ✅
      </div>
      <h2 mix={css({ ...headingMProps, margin: 0, color: colors.green700 })}>
        ¡Participación registrada con éxito!
      </h2>
      <p
        mix={css({
          fontFamily: FONT_STACK,
          fontSize: '16px',
          lineHeight: 1.7,
          color: colors.gray500,
          margin: 0,
          maxWidth: '480px',
        })}
      >
        Tu registro ha sido recibido correctamente. El equipo técnico revisará tu aportación en el
        contexto del Programa de Ordenamiento Territorial. Gracias por contribuir al futuro de San
        Pedro Tlaquepaque.
      </p>
      <a href="/" mix={css({ ...btnPrimaryProps, marginTop: '8px' })}>
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
      <div
        mix={css({
          background: colors.white,
          borderRadius: '16px',
          boxShadow: '0 8px 40px rgba(0,0,0,0.10)',
          overflow: 'hidden',
        })}
      >
        {/* Header strip */}
        <div
          mix={css({
            background: `linear-gradient(90deg, ${colors.burgundy900} 0%, ${colors.burgundy800} 100%)`,
            padding: '24px 40px',
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
            '@media (max-width: 600px)': { padding: '20px 24px' },
          })}
        >
          <div
            aria-hidden="true"
            mix={css({
              width: '40px',
              height: '40px',
              borderRadius: '10px',
              background: 'rgba(255,255,255,0.12)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '20px',
              flexShrink: 0,
            })}
          >
            📋
          </div>
          <div>
            <p
              mix={css({
                fontFamily: FONT_STACK,
                fontSize: '14px',
                fontWeight: 700,
                color: colors.white,
                margin: 0,
              })}
            >
              Formulario de participación ciudadana
            </p>
            <p
              mix={css({
                fontFamily: FONT_STACK,
                fontSize: '12px',
                color: 'rgba(255,255,255,0.65)',
                margin: 0,
                marginTop: '2px',
              })}
            >
              Campos marcados con{' '}
              <span mix={css({ color: colors.gold300, fontWeight: 700 })}>*</span> son obligatorios
            </p>
          </div>
        </div>

        {/* Form body */}
        <form
          id="participation-form"
          method="POST"
          action="/participation"
          encType="multipart/form-data"
          mix={css({
            padding: '40px',
            display: 'flex',
            flexDirection: 'column',
            gap: '32px',
            '@media (max-width: 600px)': { padding: '24px' },
          })}
          noValidate
        >
          {/* ── Section 1: Datos personales ── */}
          <fieldset mix={fieldsetStyle}>
            <legend mix={legendStyle}>1. Datos personales</legend>

            <div
              mix={css({
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '24px',
                '@media (max-width: 640px)': { gridTemplateColumns: '1fr' },
              })}
            >
              {/* Nombre */}
              <div mix={fieldGroupStyle}>
                <label for="nombre" mix={labelStyle}>
                  Nombre completo{' '}
                  <span mix={css({ color: colors.burgundy900 })} aria-hidden="true">
                    *
                  </span>
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

              {/* Email */}
              <div mix={fieldGroupStyle}>
                <label for="email" mix={labelStyle}>
                  Correo electrónico{' '}
                  <span mix={css({ color: colors.burgundy900 })} aria-hidden="true">
                    *
                  </span>
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

            <div
              mix={css({
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '24px',
                '@media (max-width: 640px)': { gridTemplateColumns: '1fr' },
              })}
            >
              {/* Domicilio */}
              <div mix={fieldGroupStyle}>
                <label for="domicilio" mix={labelStyle}>
                  Domicilio
                </label>
                <input
                  id="domicilio"
                  name="domicilio"
                  type="text"
                  placeholder="Calle, colonia, municipio"
                  mix={css(inputProps)}
                />
              </div>

              {/* Municipio */}
              <div mix={fieldGroupStyle}>
                <label for="municipio" mix={labelStyle}>
                  Colonia / Municipio{' '}
                  <span mix={css({ color: colors.burgundy900 })} aria-hidden="true">
                    *
                  </span>
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
            </div>

            {/* Institución */}
            <div mix={fieldGroupStyle}>
              <label for="institucion" mix={labelStyle}>
                Institución u organización
              </label>
              <input
                id="institucion"
                name="institucion"
                type="text"
                placeholder="Universidad, organización civil, empresa (opcional)"
                mix={css(inputProps)}
              />
            </div>
          </fieldset>

          {/* ── Section 2: Aportación ── */}
          <fieldset mix={fieldsetStyle}>
            <legend mix={legendStyle}>2. Tu aportación</legend>

            <div mix={fieldGroupStyle}>
              <label for="observacion" mix={labelStyle}>
                Observación o propuesta{' '}
                <span mix={css({ color: colors.burgundy900 })} aria-hidden="true">
                  *
                </span>
              </label>
              <textarea
                id="observacion"
                name="observacion"
                rows={6}
                placeholder="Describe tu observación, comentario técnico o propuesta sobre el ordenamiento territorial..."
                required
                aria-required="true"
                aria-describedby={errors.observacion ? 'observacion-error' : undefined}
                mix={css(
                  errors.observacion
                    ? { ...inputProps, ...inputErrorProps, resize: 'vertical', minHeight: '140px' }
                    : { ...inputProps, resize: 'vertical', minHeight: '140px' },
                )}
              />
              {errors.observacion && (
                <span id="observacion-error" role="alert" mix={errorMsgStyle}>
                  ⚠ {errors.observacion}
                </span>
              )}
            </div>
          </fieldset>

          {/* ── Section 3: Archivos ── */}
          <fieldset
            mix={css({
              border: 'none',
              padding: 0,
              margin: 0,
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
            })}
          >
            <legend mix={legendStyle}>3. Documentos adjuntos (opcional)</legend>

            <div
              mix={css({
                border: `2px dashed ${colors.gray300}`,
                borderRadius: '12px',
                padding: '40px 24px',
                textAlign: 'center',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '12px',
                transition: 'border-color 180ms ease, background 180ms ease',
                '&:hover': { borderColor: colors.burgundy900, background: colors.burgundy50 },
              })}
            >
              <div
                aria-hidden="true"
                mix={css({
                  width: '56px',
                  height: '56px',
                  borderRadius: '14px',
                  background: colors.burgundy50,
                  border: `1px solid ${colors.burgundy900}20`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '26px',
                })}
              >
                📁
              </div>
              <p
                mix={css({
                  fontFamily: FONT_STACK,
                  fontSize: '15px',
                  fontWeight: 600,
                  color: colors.gray700,
                  margin: 0,
                })}
              >
                Arrastra tus archivos aquí o{' '}
                <label
                  for="archivos"
                  mix={css({
                    color: colors.burgundy900,
                    cursor: 'pointer',
                    textDecoration: 'underline',
                    '&:hover': { color: colors.burgundy800 },
                  })}
                >
                  selecciónalos
                </label>
              </p>
              <p
                mix={css({
                  fontFamily: FONT_STACK,
                  fontSize: '13px',
                  color: colors.gray400,
                  margin: 0,
                })}
              >
                PDF, SHP, JPG, DWG · Hasta 850 MB por archivo
              </p>
              <input
                id="archivos"
                name="archivos"
                type="file"
                multiple
                accept=".pdf,.shp,.jpg,.jpeg,.dwg,.png"
                mix={css({
                  position: 'absolute',
                  opacity: 0,
                  width: '1px',
                  height: '1px',
                  overflow: 'hidden',
                  clip: 'rect(0,0,0,0)',
                  whiteSpace: 'nowrap',
                })}
              />
            </div>

            {/* Format tags */}
            <div mix={css({ display: 'flex', flexWrap: 'wrap', gap: '8px' })}>
              {[
                { label: '.PDF', desc: 'Documentos' },
                { label: '.SHP', desc: 'Cartografía SIG' },
                { label: '.JPG', desc: 'Imágenes' },
                { label: '.DWG', desc: 'Planos CAD' },
              ].map((fmt) => (
                <div
                  key={fmt.label}
                  mix={css({
                    padding: '6px 14px',
                    borderRadius: '6px',
                    background: colors.gray100,
                    border: `1px solid ${colors.gray200}`,
                    display: 'flex',
                    gap: '6px',
                    alignItems: 'center',
                  })}
                >
                  <span
                    mix={css({
                      fontFamily: FONT_STACK,
                      fontSize: '12px',
                      fontWeight: 700,
                      color: colors.burgundy900,
                    })}
                  >
                    {fmt.label}
                  </span>
                  <span
                    mix={css({ fontFamily: FONT_STACK, fontSize: '11px', color: colors.gray400 })}
                  >
                    {fmt.desc}
                  </span>
                </div>
              ))}
            </div>
          </fieldset>

          {/* ── Privacy notice ── */}
          <div
            mix={css({
              background: colors.gold100,
              border: `1px solid ${colors.gold300}`,
              borderRadius: '10px',
              padding: '16px 20px',
              display: 'flex',
              gap: '12px',
              alignItems: 'flex-start',
            })}
          >
            <span aria-hidden="true" mix={css({ fontSize: '18px', flexShrink: 0 })}>
              ℹ️
            </span>
            <p
              mix={css({
                fontFamily: FONT_STACK,
                fontSize: '13px',
                lineHeight: 1.65,
                color: colors.gray700,
                margin: 0,
              })}
            >
              La información proporcionada será tratada de conformidad con la{' '}
              <strong>
                Ley General de Protección de Datos Personales en Posesión de Sujetos Obligados
              </strong>{' '}
              y únicamente utilizada en el marco del Programa de Ordenamiento Ecológico Territorial
              y de Desarrollo Urbano de San Pedro Tlaquepaque.
            </p>
          </div>

          {/* ── Consent checkbox ── */}
          <label
            mix={css({ display: 'flex', alignItems: 'flex-start', gap: '12px', cursor: 'pointer' })}
          >
            <input
              id="consentimiento"
              name="consentimiento"
              type="checkbox"
              required
              mix={css({
                width: '18px',
                height: '18px',
                marginTop: '2px',
                accentColor: colors.burgundy900,
                flexShrink: 0,
                cursor: 'pointer',
              })}
            />
            <span
              mix={css({
                fontFamily: FONT_STACK,
                fontSize: '14px',
                lineHeight: 1.6,
                color: colors.gray700,
              })}
            >
              Doy mi consentimiento para que la información proporcionada sea utilizada con fines
              del proceso de ordenamiento territorial del Municipio de San Pedro Tlaquepaque.{' '}
              <span mix={css({ color: '#dc2626' })}>*</span>
            </span>
          </label>

          {/* ── Submit ── */}
          <div mix={css({ display: 'flex', justifyContent: 'flex-end', paddingTop: '8px' })}>
            <button
              id="participation-submit-btn"
              type="submit"
              mix={css({ ...btnPrimaryProps, fontSize: '15px', padding: '16px 40px' })}
            >
              Enviar participación
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
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
      </div>
    )
  }
}
