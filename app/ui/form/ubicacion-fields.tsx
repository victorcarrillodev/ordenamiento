import type { Handle } from 'remix/ui'
import { css } from 'remix/ui'
import {
  ALCANCES,
  ETIQUETA_ALCANCE,
  LIMITES,
  type Alcance,
  type ErroresParticipacion,
  type ValoresParticipacion,
} from '../../data/participacion.ts'
import { colors, FONT_STACK } from '../civic-horizon.ts'
import { DireccionFields } from './direccion-fields.tsx'
import type { FieldAppearance } from './field.tsx'

export interface UbicacionFieldsProps {
  endpoint: string
  values?: ValoresParticipacion
  errors?: ErroresParticipacion
  appearance?: FieldAppearance
}

const legendStyle = css({
  fontFamily: FONT_STACK,
  fontSize: '14px',
  fontWeight: 700,
  color: '#0f172a',
  padding: 0,
  marginBottom: '10px',
})

const opcionesStyle = css({
  display: 'flex',
  flexWrap: 'wrap',
  gap: '10px',
  marginBottom: '14px',
})

const opcionStyle = css({
  display: 'inline-flex',
  alignItems: 'center',
  gap: '8px',
  padding: '10px 14px',
  borderRadius: '8px',
  border: '1.5px solid #cbd5e1',
  background: '#ffffff',
  fontFamily: FONT_STACK,
  fontSize: '13.5px',
  fontWeight: 600,
  color: '#1e293b',
  cursor: 'pointer',
  '&:has(input:checked)': {
    borderColor: colors.burgundy900,
    background: '#fdf8f9',
    color: colors.burgundy900,
  },
})

const errorStyle = css({
  display: 'block',
  fontFamily: FONT_STACK,
  fontSize: '12.5px',
  fontWeight: 600,
  color: '#dc2626',
  margin: '-6px 0 10px',
})

const notaStyle = css({
  fontFamily: FONT_STACK,
  fontSize: '12.5px',
  lineHeight: 1.5,
  color: '#475569',
  margin: '0 0 12px',
})

/** Sin una opción marcada, la propuesta se toma como de un lugar específico: pide más datos, no menos. */
const ALCANCE_POR_OMISION: Alcance = 'especifico'

/**
 * Ubicación de la propuesta: ¿abarca todo el municipio o un lugar o predio
 * específico? Los asteriscos y la obligatoriedad de los campos de abajo siguen
 * a la opción elegida. Aquí se pintan según el valor con que llega el formulario;
 * `public/participacion.js` los cambia al elegir otra opción, y el servidor
 * valida lo mismo, así que el formulario también es correcto sin JavaScript.
 */
export function UbicacionFields(handle: Handle<UbicacionFieldsProps>) {
  return () => {
    const { endpoint, values = {}, errors = {}, appearance = 'civic' } = handle.props
    const alcance = (
      (ALCANCES as readonly string[]).includes(values.alcance_ubicacion ?? '')
        ? values.alcance_ubicacion
        : ALCANCE_POR_OMISION
    ) as Alcance

    return (
      <fieldset
        data-ubicacion
        mix={css({ border: 'none', padding: 0, margin: 0, minWidth: 0 })}
        aria-describedby={errors.alcance_ubicacion ? 'alcance_ubicacion-error' : undefined}
      >
        <legend mix={legendStyle}>Ubicación de la propuesta</legend>
        <div mix={opcionesStyle} role="radiogroup">
          {ALCANCES.map((opcion) => (
            <label key={opcion} mix={opcionStyle}>
              <input
                type="radio"
                name="alcance_ubicacion"
                value={opcion}
                checked={alcance === opcion}
                mix={css({ accentColor: colors.burgundy900 })}
              />
              {ETIQUETA_ALCANCE[opcion]}
            </label>
          ))}
        </div>
        {errors.alcance_ubicacion ? (
          <span id="alcance_ubicacion-error" role="alert" mix={errorStyle}>
            ⚠ {errors.alcance_ubicacion}
          </span>
        ) : null}
        <p mix={notaStyle} id="ubicacion-nota">
          {alcance === 'municipio'
            ? 'La propuesta abarca todo el municipio: los datos de ubicación son opcionales.'
            : 'Indica el domicilio o una referencia que permita identificar el lugar o predio, y su colonia o zona.'}
        </p>
        <DireccionFields
          endpoint={endpoint}
          values={{
            calle: values.calle,
            colonia: values.colonia,
            cp: values.cp,
            direccion_origen: values.direccion_origen,
          }}
          errors={{ calle: errors.calle, colonia: errors.colonia, cp: errors.cp }}
          required={alcance === 'especifico'}
          maxCalle={LIMITES.calle}
          maxColonia={LIMITES.colonia}
          appearance={appearance}
        />
      </fieldset>
    )
  }
}
