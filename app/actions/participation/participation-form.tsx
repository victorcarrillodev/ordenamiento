import type { Handle } from 'remix/ui'
import { css } from 'remix/ui'
import { routes } from '../../routes.ts'
import { colors, FONT_STACK } from '../../ui/civic-horizon.ts'
import { DireccionFields } from '../../ui/form/direccion-fields.tsx'
import { CheckboxField, Field, TextArea } from '../../ui/form/field.tsx'
import { SubmitButton } from './public/submit-button.tsx'
import type { FormErrors } from './schema.ts'
import { UploadField } from './upload-field.tsx'

export interface ParticipationFormProps {
  errors?: FormErrors
}

const fieldRowStyle = css({
  display: 'grid',
  gridTemplateColumns: '1fr 1fr',
  gap: '16px',
  '@media (max-width: 560px)': { gridTemplateColumns: '1fr' },
})

export function ParticipationForm(handle: Handle<ParticipationFormProps>) {
  return () => {
    const { errors = {} } = handle.props

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
        >
          <div mix={fieldRowStyle}>
            <Field
              name="nombre"
              label="Nombre completo"
              placeholder="Ej. María González López"
              required
              error={errors.nombre}
            />
            <Field
              name="email"
              type="email"
              label="Correo electrónico"
              placeholder="correo@ejemplo.com"
              required
              error={errors.email}
            />
          </div>

          <DireccionFields
            endpoint={routes.colonias.href()}
            errors={{
              calle: errors.calle,
              colonia: errors.colonia,
              municipio: errors.municipio,
              cp: errors.cp,
            }}
            required
          />

          <Field
            name="institucion"
            label="Institución u organización"
            placeholder="Opcional (ej. Colectivo Ambiental, ITESO)"
            error={errors.institucion}
          />

          <TextArea
            name="observacion"
            label="Observación o propuesta"
            placeholder="Describe tu observación, comentario técnico o propuesta sobre el ordenamiento territorial..."
            required
            rows={3}
            minHeight="80px"
            error={errors.observacion}
          />

          <UploadField error={errors.archivos} />

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

          <CheckboxField name="consentimiento" required error={errors.consentimiento}>
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
