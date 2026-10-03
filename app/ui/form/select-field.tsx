import type { Handle } from 'remix/ui'
import { css } from 'remix/ui'
import { FONT_STACK, inputErrorProps, inputProps } from '../civic-horizon.ts'
import { Field, type FieldAppearance } from './field.tsx'

/** Texto de la opción vacía de toda lista desplegable: elegir es siempre opcional. */
export const SIN_ELEGIR = 'Selecciona una opción'

export interface OtraEspecificacion {
  /** Nombre del campo de texto que se abre al elegir «Otra». */
  name: string
  label: string
  maximo: number
  value?: string
  error?: string
}

export interface SelectFieldProps {
  name: string
  label: string
  opciones: readonly string[]
  value?: string
  error?: string
  /** Etiqueta «(opcional)» junto al nombre. Por omisión sí: son listas que se pueden dejar sin contestar. */
  opcional?: boolean
  appearance?: FieldAppearance
  /** Con «Otra» entre las opciones, el campo para especificarla. */
  otra?: OtraEspecificacion
}

const labelStyle = css({
  display: 'block',
  fontFamily: FONT_STACK,
  fontSize: '13px',
  fontWeight: 700,
  marginBottom: '6px',
  color: '#1e293b',
})

const errorStyle = css({
  display: 'block',
  fontFamily: FONT_STACK,
  fontSize: '12.5px',
  fontWeight: 600,
  color: '#dc2626',
  marginTop: '4px',
})

const otraStyle = css({ marginTop: '10px' })

/**
 * Lista desplegable de una opción. Siempre abre en «Selecciona una opción» y
 * deja enviar el formulario sin elegir. Si ofrece «Otra», el campo para
 * especificarla se muestra solo con esa opción (`public/participacion.js` lo
 * abre y lo cierra; aquí se pinta ya en el estado correcto, para que también
 * sirva al repintar tras un error).
 */
export function SelectField(handle: Handle<SelectFieldProps>) {
  return () => {
    const {
      name,
      label,
      opciones,
      value,
      error,
      opcional = true,
      appearance = 'civic',
      otra,
    } = handle.props

    const errorId = error ? `${name}-error` : undefined
    const otraId = otra ? `${otra.name}-campo` : undefined
    const otraVisible = otra ? value === 'Otra' : false

    return (
      <div class={appearance === 'admin' ? 'form-field' : undefined}>
        <label for={name} mix={appearance === 'admin' ? undefined : labelStyle}>
          {label}
          {opcional ? ' (opcional)' : null}
        </label>
        <select
          id={name}
          name={name}
          data-otra={otraId}
          mix={
            appearance === 'admin'
              ? undefined
              : css(error ? { ...inputProps, ...inputErrorProps } : inputProps)
          }
          aria-invalid={error ? 'true' : undefined}
          aria-describedby={errorId}
        >
          <option value="" selected={!value}>
            {SIN_ELEGIR}
          </option>
          {opciones.map((opcion) => (
            <option key={opcion} value={opcion} selected={value === opcion}>
              {opcion}
            </option>
          ))}
        </select>
        {error ? (
          <span
            id={errorId}
            role="alert"
            class={appearance === 'admin' ? 'form-error' : undefined}
            mix={appearance === 'admin' ? undefined : errorStyle}
          >
            ⚠ {error}
          </span>
        ) : null}
        {otra ? (
          <div id={otraId} hidden={!otraVisible} mix={otraStyle}>
            <Field
              name={otra.name}
              label={otra.label}
              value={otra.value}
              error={otra.error}
              maxLength={otra.maximo}
              contador
              appearance={appearance}
              autoComplete="off"
            />
          </div>
        ) : null}
      </div>
    )
  }
}
