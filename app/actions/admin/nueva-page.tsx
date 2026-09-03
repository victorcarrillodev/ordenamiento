import type { Handle } from 'remix/ui'

import { adminRoutes, routes } from '../../routes.ts'
import { AdminLayout } from '../../ui/admin/admin-layout.tsx'
import { Button } from '../../ui/button.tsx'
import { DireccionFields } from '../../ui/form/direccion-fields.tsx'
import { Field, TextArea } from '../../ui/form/field.tsx'

/**
 * Lo que el capturista escribió, para repintarlo cuando el alta no prospera.
 *
 * No incluye el adjunto: el navegador no permite repoblar un input de tipo file.
 */
export type NuevaValues = Partial<
  Record<
    | 'nombre'
    | 'correo'
    | 'domicilio'
    | 'municipio_participante'
    | 'institucion'
    | 'ocupacion'
    | 'calle'
    | 'colonia'
    | 'municipio'
    | 'cp'
    | 'direccion_origen'
    | 'latitud'
    | 'longitud'
    | 'observacion'
    | 'fuente'
    | 'genero'
    | 'tematica',
    string
  >
>

/** Los tres desplegables de clasificación, como datos: `[valor, etiqueta?]`. */
const CLASIFICACIONES = [
  {
    name: 'fuente',
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
    opciones: [['Hombre'], ['Mujer'], ['Otro']],
  },
  {
    name: 'tematica',
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
  name: keyof NuevaValues
  opciones: ReadonlyArray<readonly [string, string?]>
}>

export interface NuevaPageProps {
  user: { name: string; role: string }
  error?: string
  folioRegistrado?: string
  values?: NuevaValues
}

export function NuevaPage(handle: Handle<NuevaPageProps>) {
  return () => {
    const { user, error, folioRegistrado, values = {} } = handle.props

    return (
      <AdminLayout
        user={user}
        active="participaciones-fisica"
        title="Nueva participación física"
        breadcrumb={
          <>
            <a href={`${adminRoutes.participaciones.href()}?origen=fisica`}>
              Participaciones físicas
            </a>
            <span class="breadcrumb__sep" aria-hidden="true">
              /
            </span>
            Nueva
          </>
        }
      >
        {error ? <p class="form-error">{error}</p> : null}

        {folioRegistrado ? (
          <dialog open class="dialog-success">
            <div class="dialog-success__icon">
              <iconify-icon icon="mdi:check-circle" width="36" height="36" />
            </div>

            <h2 class="dialog-success__title">¡Participación física registrada con éxito!</h2>

            <p class="dialog-success__desc">
              La información y los documentos han sido vinculados correctamente al expediente
              ambiental del POETDUM.
            </p>

            <div class="dialog-success__folio">
              <span>Folio Oficial Asignado</span>
              <strong>{folioRegistrado}</strong>
            </div>

            <div class="dialog-success__actions">
              <Button
                href={adminRoutes.participacionNueva.index.href()}
                variant="primary"
                fullWidth
                icon={<iconify-icon icon="mdi:plus-circle" width="18" height="18" />}
              >
                Registrar otra participación
              </Button>

              <Button
                href={adminRoutes.participaciones.href()}
                variant="secondary"
                fullWidth
                icon={<iconify-icon icon="mdi:format-list-bulleted" width="18" height="18" />}
              >
                Continuar con otras actividades
              </Button>
            </div>
          </dialog>
        ) : null}

        <form method="post" class="panel form-card" enctype="multipart/form-data">
          <div class="form-card__notice">
            ⚠️ Llena todos los campos a continuación para registrar su participación
          </div>

          <Field
            label="Folio"
            name="folio"
            value="Se genera automáticamente"
            readOnly
            appearance="admin"
          />

          <div class="form-grid">
            <Field
              label="Nombre completo"
              name="nombre"
              required
              value={values.nombre}
              placeholder="Ej. María González López"
              appearance="admin"
            />
            <Field
              label="Correo"
              name="correo"
              type="email"
              required
              value={values.correo}
              placeholder="correo@ejemplo.com"
              appearance="admin"
            />
            <Field
              label="Domicilio de quien participa"
              name="domicilio"
              value={values.domicilio}
              placeholder="Calle, colonia, municipio"
              appearance="admin"
            />
            <Field
              label="Municipio"
              name="municipio_participante"
              value={values.municipio_participante ?? 'San Pedro Tlaquepaque'}
              placeholder="Ej. San Pedro Tlaquepaque"
              appearance="admin"
            />
            <Field
              label="Institución o empresa"
              name="institucion"
              value={values.institucion}
              appearance="admin"
            />
            <Field
              label="Ocupación o puesto"
              name="ocupacion"
              value={values.ocupacion}
              appearance="admin"
            />
          </div>

          <h3 class="form-card__section">Domicilio del aporte:</h3>
          <DireccionFields
            endpoint={routes.colonias.href()}
            values={{
              calle: values.calle,
              colonia: values.colonia,
              municipio: values.municipio,
              cp: values.cp,
              direccion_origen: values.direccion_origen,
            }}
            appearance="admin"
            required
          />

          <h3 class="form-card__section">¿Cómo obtener las coordenadas? ⓘ</h3>
          <div class="form-grid">
            <Field
              label="Coordenadas latitud"
              name="latitud"
              value={values.latitud ?? '20.659'}
              appearance="admin"
            />
            <Field
              label="Coordenadas longitud"
              name="longitud"
              value={values.longitud ?? '-103.349'}
              appearance="admin"
            />
          </div>

          <div class="form-field form-field--wide">
            <label for="pdf">Subir archivo adjunto</label>
            <div style="border: 1.5px dashed #cbd5e1; border-radius: 8px; padding: 14px; background: #f8fafc; display: flex; flex-direction: column; gap: 8px;">
              <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 10px;">
                <label
                  for="pdf"
                  style="display: inline-flex; align-items: center; gap: 6px; background: #1e293b; color: #ffffff; font-size: 12.5px; font-weight: 600; padding: 7px 14px; border-radius: 6px; cursor: pointer;"
                >
                  <iconify-icon icon="mdi:paperclip" width="16" height="16" />
                  <span>Seleccionar archivo</span>
                </label>
                <span
                  id="admin-file-label"
                  style="font-size: 12px; color: #475569; font-weight: 500;"
                >
                  Ningún archivo seleccionado
                </span>
                <span style="font-size: 11px; color: #64748b; font-weight: 600;">Máx. 50 MB</span>
              </div>
              <input
                id="pdf"
                name="pdf"
                type="file"
                accept=".pdf,.shp,.jpg,.jpeg,.dwg,.png,.xlsx,.docx"
                style="position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0, 0, 0, 0); border: 0;"
              />
              <div
                id="admin-file-preview"
                style="display: none; margin-top: 6px; font-size: 12px; color: #0f172a; font-weight: 600;"
              />
            </div>
            <span class="form-hint">
              Formatos soportados: PDF, SHP, JPG, DWG, Word, Excel, PNG (hasta 50 MB)
            </span>
          </div>

          <TextArea
            label="Observaciones"
            name="observacion"
            rows={4}
            required
            wide
            value={values.observacion}
            appearance="admin"
          />

          <div class="form-field form-field--wide">
            <label>Clasificación</label>
            <div class="form-grid">
              {CLASIFICACIONES.map((clasificacion) => (
                <select key={clasificacion.name} name={clasificacion.name}>
                  {clasificacion.opciones.map(([valor, etiqueta]) => (
                    <option
                      key={valor}
                      value={valor}
                      selected={values[clasificacion.name] === valor}
                    >
                      {etiqueta ?? valor}
                    </option>
                  ))}
                </select>
              ))}
            </div>
          </div>

          <p class="form-hint">Los campos marcados con (*) son obligatorios</p>

          <div class="form-actions">
            <Button buttonType="submit" variant="primary">
              Guardar participación
            </Button>
            <Button href={adminRoutes.participaciones.href()} variant="secondary">
              Cancelar
            </Button>
          </div>
        </form>
      </AdminLayout>
    )
  }
}
