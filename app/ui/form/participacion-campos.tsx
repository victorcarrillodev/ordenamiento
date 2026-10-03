import type { Handle } from 'remix/ui'
import { css } from 'remix/ui'
import {
  GENEROS,
  LIMITES,
  TEMATICAS,
  TIPOS_PARTICIPANTE,
  type ErroresParticipacion,
  type ValoresParticipacion,
} from '../../data/participacion.ts'
import { FONT_STACK } from '../civic-horizon.ts'
import { Field, TextArea, type FieldAppearance } from './field.tsx'
import { SelectField } from './select-field.tsx'
import { UbicacionFields } from './ubicacion-fields.tsx'
import { UploadField } from './upload-field.tsx'

export interface ParticipacionCamposProps {
  /** Endpoint de búsqueda de colonias, ya resuelto con routes.colonias.href(). */
  coloniasEndpoint: string
  values?: ValoresParticipacion
  errors?: ErroresParticipacion
  appearance?: FieldAppearance
}

const filaStyle = css({
  display: 'grid',
  gridTemplateColumns: '1fr 1fr',
  gap: '14px',
  '@media (max-width: 560px)': { gridTemplateColumns: '1fr' },
})

const complementariosStyle = css({
  border: '1px solid #cbd5e1',
  borderRadius: '10px',
  padding: '16px',
  minWidth: 0,
  display: 'grid',
  gap: '16px',
})

/**
 * Los campos del formulario de participación. Los usan el formulario ciudadano
 * y las dos capturas presenciales del panel, para que las tres pidan lo mismo,
 * con los mismos límites y las mismas reglas.
 */
export function ParticipacionCampos(handle: Handle<ParticipacionCamposProps>) {
  return () => {
    const { coloniasEndpoint, values = {}, errors = {}, appearance = 'civic' } = handle.props

    return (
      <>
        <div mix={filaStyle}>
          <Field
            name="nombre"
            label="Nombre completo"
            placeholder="Ej. María González López"
            required
            maxLength={LIMITES.nombre}
            value={values.nombre}
            error={errors.nombre}
            appearance={appearance}
          />
          <Field
            name="email"
            type="email"
            label="Correo electrónico"
            placeholder="correo@ejemplo.com"
            required
            maxLength={LIMITES.email}
            value={values.email}
            error={errors.email}
            appearance={appearance}
          />
        </div>

        <UbicacionFields
          endpoint={coloniasEndpoint}
          values={values}
          errors={errors}
          appearance={appearance}
        />

        <Field
          name="institucion"
          label="Empresa, institución u organización (opcional)"
          placeholder="Ej. Colectivo Ambiental, ITESO"
          maxLength={LIMITES.institucion}
          contador
          value={values.institucion}
          error={errors.institucion}
          appearance={appearance}
          wide
        />

        <TextArea
          name="observacion"
          label="Observación o propuesta"
          placeholder="Describe tu observación o propuesta sobre el Proyecto del Programa."
          required
          rows={5}
          minHeight="120px"
          maxLength={LIMITES.observacion}
          contador
          hint={`Máximo ${LIMITES.observacion} caracteres, incluidos los espacios.`}
          value={values.observacion}
          error={errors.observacion}
          appearance={appearance}
          wide
        />

        <SelectField
          name="tematica"
          label="Temática de la propuesta"
          opciones={TEMATICAS}
          value={values.tematica}
          error={errors.tematica}
          appearance={appearance}
          otra={{
            name: 'tematica_otra',
            label: 'Especifica la temática',
            maximo: LIMITES.tematica_otra,
            value: values.tematica_otra,
            error: errors.tematica_otra,
          }}
        />

        <fieldset mix={complementariosStyle}>
          <legend mix={css({ fontSize: '14px', fontWeight: 700, fontFamily: FONT_STACK })}>
            Datos complementarios (opcionales)
          </legend>
          <p mix={css({ margin: 0, fontSize: '13px', color: '#475569', fontFamily: FONT_STACK })}>
            Estos datos corresponden a quien participa y pueden ser distintos de la ubicación de la
            propuesta.
          </p>
          <Field
            name="domicilio"
            label="Domicilio de quien participa, para notificaciones"
            value={values.domicilio}
            error={errors.domicilio}
            placeholder="Calle y número, colonia"
            maxLength={LIMITES.domicilio}
            appearance={appearance}
          />
          <div mix={filaStyle}>
            <Field
              name="municipio_participante"
              label="Municipio de residencia"
              value={values.municipio_participante}
              error={errors.municipio_participante}
              maxLength={LIMITES.municipio_participante}
              appearance={appearance}
            />
            <Field
              name="ocupacion"
              label="Ocupación o puesto"
              value={values.ocupacion}
              error={errors.ocupacion}
              maxLength={LIMITES.ocupacion}
              appearance={appearance}
            />
          </div>
          <div mix={filaStyle}>
            <SelectField
              name="fuente"
              label="Tipo de participante"
              opciones={TIPOS_PARTICIPANTE}
              value={values.fuente}
              error={errors.fuente}
              appearance={appearance}
              otra={{
                name: 'fuente_otra',
                label: 'Especifica el tipo de participante',
                maximo: LIMITES.fuente_otra,
                value: values.fuente_otra,
                error: errors.fuente_otra,
              }}
            />
            <SelectField
              name="genero"
              label="Género"
              opciones={GENEROS}
              value={values.genero}
              error={errors.genero}
              appearance={appearance}
            />
          </div>
        </fieldset>

        <UploadField error={errors.archivos} appearance={appearance} />
      </>
    )
  }
}
