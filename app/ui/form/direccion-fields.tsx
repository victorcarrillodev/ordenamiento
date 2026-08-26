import type { Handle } from 'remix/ui'
import { css } from 'remix/ui'
import { Field, type FieldAppearance } from './field.tsx'
import { DireccionAutocomplete } from './public/direccion-autocomplete.tsx'

export interface DireccionValues {
  calle?: string
  colonia?: string
  municipio?: string
  cp?: string
  direccion_origen?: string
}

export interface DireccionErrors {
  calle?: string
  colonia?: string
  municipio?: string
  cp?: string
}

export interface DireccionFieldsProps {
  /** Endpoint de búsqueda ya resuelto en servidor con routes.colonias.href() */
  endpoint: string
  values?: DireccionValues
  errors?: DireccionErrors
  /** Prefijo de name opcional (ej: 'aporte_' en panel admin) */
  namePrefix?: string
  appearance?: FieldAppearance
  /** Marca colonia y municipio como requeridos */
  required?: boolean
}

const gridStyle = css({
  display: 'grid',
  gridTemplateColumns: '1.4fr 1.3fr 1.3fr 0.85fr',
  gap: '14px',
  '@media (max-width: 860px)': { gridTemplateColumns: '1fr 1fr' },
  '@media (max-width: 520px)': { gridTemplateColumns: '1fr' },
})

export function DireccionFields(handle: Handle<DireccionFieldsProps>) {
  return () => {
    const {
      endpoint,
      values = {},
      errors = {},
      namePrefix = '',
      appearance = 'civic',
      required = true,
    } = handle.props

    const p = namePrefix

    return (
      <DireccionAutocomplete
        endpoint={endpoint}
        names={{
          calle: `${p}calle`,
          colonia: `${p}colonia`,
          municipio: `${p}municipio`,
          cp: `${p}cp`,
          direccion_origen: `${p}direccion_origen`,
        }}
        initial={{
          calle: values.calle,
          colonia: values.colonia,
          municipio: values.municipio,
          cp: values.cp,
          direccion_origen: values.direccion_origen,
        }}
        appearance={appearance}
      >
        <div
          mix={appearance === 'civic' ? gridStyle : undefined}
          class={appearance === 'admin' ? 'form-grid' : undefined}
        >
          <Field
            id={`${p}calle`}
            name={`${p}calle`}
            label="Calle y número"
            placeholder="Ej. Av. Juárez 100"
            value={values.calle}
            error={errors.calle}
            autoComplete="off"
            appearance={appearance}
          />
          <Field
            id={`${p}colonia`}
            name={`${p}colonia`}
            label="Colonia"
            placeholder="Ej. Centro"
            value={values.colonia}
            error={errors.colonia}
            required={required}
            autoComplete="off"
            appearance={appearance}
          />
          <Field
            id={`${p}municipio`}
            name={`${p}municipio`}
            label="Municipio"
            placeholder="Ej. San Pedro Tlaquepaque"
            value={values.municipio}
            error={errors.municipio}
            required={required}
            autoComplete="off"
            appearance={appearance}
          />
          <Field
            id={`${p}cp`}
            name={`${p}cp`}
            label="C.P."
            placeholder="Ej. 45500"
            value={values.cp}
            error={errors.cp}
            appearance={appearance}
          />
          <input
            type="hidden"
            id={`${p}direccion_origen`}
            name={`${p}direccion_origen`}
            value={values.direccion_origen ?? 'manual'}
          />
        </div>
      </DireccionAutocomplete>
    )
  }
}
