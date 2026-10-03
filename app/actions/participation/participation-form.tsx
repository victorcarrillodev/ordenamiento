import type { Handle } from 'remix/ui'
import { css } from 'remix/ui'
import type { ErroresParticipacion, ValoresParticipacion } from '../../data/participacion.ts'
import { routes } from '../../routes.ts'
import { colors, FONT_STACK } from '../../ui/civic-horizon.ts'
import { CheckboxField } from '../../ui/form/field.tsx'
import { ParticipacionCampos } from '../../ui/form/participacion-campos.tsx'
import { SubmitButton } from './public/submit-button.tsx'

export interface ParticipationFormProps {
  errors?: ErroresParticipacion
  /** Lo ya escrito, para no perderlo cuando la validación rechaza el envío. */
  values?: ValoresParticipacion
}

export function ParticipationForm(handle: Handle<ParticipationFormProps>) {
  return () => {
    const { errors = {}, values = {} } = handle.props

    return (
      <>
        <a
          href={routes.home.href()}
          mix={css({
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            fontFamily: FONT_STACK,
            fontSize: '13.5px',
            fontWeight: 600,
            color: '#475569',
            textDecoration: 'none',
            marginBottom: '12px',
            transition: 'color 150ms ease',
            '&:hover': { color: colors.burgundy900 },
          })}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true">
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
            fontWeight: 800,
            lineHeight: 1.2,
            color: '#0f172a',
            margin: '0 0 6px',
          })}
        >
          Registra tu participación
        </h1>
        <p
          mix={css({
            fontFamily: FONT_STACK,
            fontSize: '14.5px',
            lineHeight: 1.55,
            color: '#334155',
            margin: '0 0 20px',
          })}
        >
          Comparte tus observaciones o propuestas sobre el Proyecto del Programa. Los campos
          marcados con <strong mix={css({ color: colors.burgundy900 })}>*</strong> son obligatorios.
        </p>

        <form
          id="participation-form"
          method="POST"
          action={routes.participation.action.href()}
          encType="multipart/form-data"
          mix={css({ display: 'flex', flexDirection: 'column', gap: '16px' })}
        >
          <ParticipacionCampos
            coloniasEndpoint={routes.colonias.href()}
            values={values}
            errors={errors}
          />

          <p
            mix={css({
              fontFamily: FONT_STACK,
              fontSize: '12.5px',
              lineHeight: 1.6,
              color: '#334155',
              fontWeight: 500,
              backgroundColor: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '6px',
              padding: '10px 14px',
              margin: '6px 0 2px',
            })}
          >
            🔒 <strong>Aviso de Privacidad:</strong> La información proporcionada será tratada
            conforme a la Ley General de Protección de Datos Personales en Posesión de Sujetos
            Obligados y solo se usará en el marco de este programa.
          </p>

          <CheckboxField
            name="consentimiento"
            required
            checked={values.consentimiento}
            error={errors.consentimiento}
          >
            Doy mi consentimiento para el uso de esta información en el proceso de ordenamiento
            territorial. <span mix={css({ color: '#dc2626' })}>*</span>
          </CheckboxField>

          <div mix={css({ display: 'flex', justifyContent: 'flex-end', paddingTop: '4px' })}>
            <SubmitButton label="Enviar participación" pendingLabel="Enviando participación…" />
          </div>
        </form>
      </>
    )
  }
}
