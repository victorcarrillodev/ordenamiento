import type { Handle } from 'remix/ui'
import { css } from 'remix/ui'
import { Field, type FieldAppearance } from './field.tsx'

export interface DireccionValues {
  calle?: string
  colonia?: string
  cp?: string
  direccion_origen?: string
}

export interface DireccionErrors {
  calle?: string
  colonia?: string
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
  /** Marca el domicilio o referencia y la colonia o zona como requeridos. */
  required?: boolean
  maxCalle?: number
  maxColonia?: number
}

const gridStyle = css({
  display: 'grid',
  gridTemplateColumns: '1.6fr 1.2fr 0.8fr',
  gap: '14px',
  '@media (max-width: 760px)': { gridTemplateColumns: '1fr 1fr' },
  '@media (max-width: 520px)': { gridTemplateColumns: '1fr' },
})

/**
 * Domicilio o referencia, colonia o zona y código postal de la propuesta. El
 * municipio no se pregunta: el Programa abarca uno solo. Con `required` el
 * domicilio y la colonia son obligatorios (la propuesta es de un lugar o predio
 * específico); sin él, son opcionales (abarca todo el municipio).
 */
export function DireccionFields(handle: Handle<DireccionFieldsProps>) {
  return () => {
    const {
      endpoint,
      values = {},
      errors = {},
      namePrefix = '',
      appearance = 'civic',
      required = true,
      maxCalle,
      maxColonia,
    } = handle.props

    const p = namePrefix

    return (
      <div
        data-autocomplete-group="direccion"
        data-endpoint={endpoint}
        mix={appearance === 'civic' ? gridStyle : undefined}
        class={appearance === 'admin' ? 'form-grid' : undefined}
      >
        <Field
          id={`${p}calle`}
          name={`${p}calle`}
          label="Domicilio o referencia del lugar o predio"
          placeholder="Ej. Av. Juárez 100, o frente al mercado"
          value={values.calle}
          error={errors.calle}
          required={required}
          maxLength={maxCalle}
          autoComplete="off"
          appearance={appearance}
        />
        <Field
          id={`${p}colonia`}
          name={`${p}colonia`}
          label="Colonia o zona"
          placeholder="Ej. Centro"
          value={values.colonia}
          error={errors.colonia}
          required={required}
          maxLength={maxColonia}
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
          maxLength={5}
          appearance={appearance}
        />
        <input
          type="hidden"
          id={`${p}direccion_origen`}
          name={`${p}direccion_origen`}
          value={values.direccion_origen ?? 'manual'}
        />
      </div>
    )
  }
}
