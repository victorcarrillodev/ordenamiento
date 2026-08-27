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
      <AdminLayout user={user} active="participaciones" title="Nueva participación física">
        <h1 class="page-title">Ingresa aquí tu participación</h1>
        <p class="breadcrumb">
          <a href={`${adminRoutes.participaciones.href()}?origen=fisica`}>
            Volver a participaciones físicas
          </a>{' '}
          / Formulario de participación
        </p>

        {error ? <p class="form-error">{error}</p> : null}

        {folioRegistrado ? (
          <dialog
            open
            style="border: none; border-radius: 18px; padding: 32px 28px; max-width: 500px; width: 90%; background: #ffffff; box-shadow: 0 25px 50px -12px rgba(15, 23, 42, 0.35); margin: auto; font-family: Montserrat, sans-serif; text-align: center; z-index: 9999;"
          >
            <div style="width: 60px; height: 60px; border-radius: 50%; background: #dcfce7; color: #16a34a; display: flex; align-items: center; justify-content: center; font-size: 30px; margin: 0 auto 16px; box-shadow: 0 0 0 6px rgba(220, 252, 231, 0.5);">
              <iconify-icon icon="mdi:check-circle" width="36" height="36" />
            </div>

            <h2 style="font-size: 20px; font-weight: 800; color: #0f172a; margin: 0 0 8px;">
              ¡Participación física registrada con éxito!
            </h2>

            <p style="font-size: 13.5px; color: #475569; line-height: 1.5; margin: 0 0 16px;">
              La información y los documentos han sido vinculados correctamente al expediente
              ambiental del POETDUM.
            </p>

            <div style="background: #f8fafc; border: 1.5px dashed #cbd5e1; border-radius: 10px; padding: 12px 16px; margin-bottom: 22px;">
              <span style="font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: #64748b; display: block;">
                Folio Oficial Asignado
              </span>
              <strong style="font-size: 20px; font-weight: 900; color: #8c1d3d;">
                {folioRegistrado}
              </strong>
            </div>

            <div style="display: flex; flex-direction: column; gap: 10px;">
              <a
                href={adminRoutes.participacionNueva.index.href()}
                class="btn btn-primary"
                style="justify-content: center; padding: 12px 20px; font-size: 13.5px; font-weight: 700; text-decoration: none;"
              >
                <iconify-icon icon="mdi:plus-circle" width="18" height="18" />
                <span>Registrar otra participación</span>
              </a>

              <a
                href={adminRoutes.participaciones.href()}
                class="btn btn-secondary"
                style="justify-content: center; padding: 10px 20px; font-size: 13px; font-weight: 600; text-decoration: none;"
              >
                <iconify-icon icon="mdi:format-list-bulleted" width="18" height="18" />
                <span>Continuar con otras actividades</span>
              </a>
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

          <div class="form-actions" style="display: flex; gap: 12px; margin-top: 18px;">
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
