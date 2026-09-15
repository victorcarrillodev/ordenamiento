import type { Handle } from 'remix/ui'
import { css } from 'remix/ui'
import { inputProps } from '../civic-horizon.ts'
import type { FieldAppearance } from './field.tsx'

export interface ClasificacionValues {
  fuente?: string
  genero?: string
  tematica?: string
}

const CLASIFICACIONES = [
  {
    name: 'fuente',
    label: 'Tipo de participante',
    opciones: [
      ['Empresa'],
      ['Dependencia', 'Organismo público'],
      ['Organización', 'Organización civil'],
      ['Persona ciudadana'],
      ['Otra'],
    ],
  },
  {
    name: 'genero',
    label: 'Género',
    opciones: [['Hombre'], ['Mujer'], ['Otro'], ['Prefiero no responder']],
  },
  {
    name: 'tematica',
    label: 'Temática de la propuesta',
    opciones: [
      ['Servicios Ambientales'],
      ['Gestión del Agua'],
      ['Gestión de Riesgo'],
      ['Desarrollo urbano y gestión de suelo'],
      ['Vivienda'],
      ['Movilidad'],
      ['Equipamiento'],
      ['Infraestructura'],
      ['Gestión de Residuos'],
      ['Patrimonio'],
      ['Otra'],
    ],
  },
] as const satisfies ReadonlyArray<{
  name: keyof ClasificacionValues
  label: string
  opciones: ReadonlyArray<readonly [string, string?]>
}>

/** Las dos vías de captura guardan la misma clasificación y permiten omitirla. */
export function ClasificacionFields(
  handle: Handle<{
    values?: ClasificacionValues
    errors?: ClasificacionValues
    appearance?: FieldAppearance
  }>,
) {
  return () => {
    const { values = {}, errors = {}, appearance = 'civic' } = handle.props
    return (
      <div
        class={appearance === 'admin' ? 'form-grid' : undefined}
        mix={css({
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 200px), 1fr))',
          gap: '16px',
        })}
      >
        {CLASIFICACIONES.map(({ name, label, opciones }) => (
          <div key={name} class="form-field">
            <label
              for={name}
              mix={css({
                display: 'block',
                fontSize: '13px',
                fontWeight: 700,
                marginBottom: '6px',
                color: '#1e293b',
              })}
            >
              {label} (opcional)
            </label>
            <select
              id={name}
              name={name}
              mix={css(inputProps)}
              aria-invalid={errors[name] ? 'true' : undefined}
              aria-describedby={errors[name] ? `${name}-error` : undefined}
            >
              <option value="" selected={!values[name]}>
                Sin especificar
              </option>
              {opciones.map(([valor, etiqueta]) => (
                <option key={valor} value={valor} selected={values[name] === valor}>
                  {etiqueta ?? valor}
                </option>
              ))}
            </select>
            {errors[name] ? (
              <span id={`${name}-error`} role="alert">
                {errors[name]}
              </span>
            ) : null}
          </div>
        ))}
      </div>
    )
  }
}
