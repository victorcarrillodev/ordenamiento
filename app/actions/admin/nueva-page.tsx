import type { Handle } from 'remix/ui'

import { adminRoutes, routes } from '../../routes.ts'
import { AdminLayout } from '../../ui/admin/admin-layout.tsx'
import { DireccionFields } from '../../ui/form/direccion-fields.tsx'
import { Field, TextArea } from '../../ui/form/field.tsx'

export interface NuevaPageProps {
  user: { name: string; role: string }
  error?: string
  folioRegistrado?: string
}

export function NuevaPage(handle: Handle<NuevaPageProps>) {
  return () => {
    const { user, error, folioRegistrado } = handle.props

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
              placeholder="Ej. María González López"
              appearance="admin"
            />
            <Field
              label="Correo"
              name="correo"
              type="email"
              required
              placeholder="correo@ejemplo.com"
              appearance="admin"
            />
            <Field
              label="Domicilio de quien participa"
              name="domicilio"
              placeholder="Calle, colonia, municipio"
              appearance="admin"
            />
            <Field
              label="Municipio"
              name="municipio_participante"
              value="San Pedro Tlaquepaque"
              placeholder="Ej. San Pedro Tlaquepaque"
              appearance="admin"
            />
            <Field label="Institución o empresa" name="institucion" appearance="admin" />
            <Field label="Ocupación o puesto" name="ocupacion" appearance="admin" />
          </div>

          <h3 class="form-card__section">Domicilio del aporte:</h3>
          <DireccionFields endpoint={routes.colonias.href()} appearance="admin" required />

          <h3 class="form-card__section">¿Cómo obtener las coordenadas? ⓘ</h3>
          <div class="form-grid">
            <Field label="Coordenadas latitud" name="latitud" value="20.659" appearance="admin" />
            <Field
              label="Coordenadas longitud"
              name="longitud"
              value="-103.349"
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
            appearance="admin"
          />

          <div class="form-field form-field--wide">
            <label>Clasificación</label>
            <div class="form-grid">
              <select name="fuente">
                <option value="Empresa">Empresa</option>
                <option value="Dependencia">Organismo público</option>
                <option value="Organización">Organización civil</option>
                <option value="Persona ciudadana">Persona ciudadana</option>
                <option value="Otra">Otra</option>
              </select>
              <select name="genero">
                <option value="Hombre">Hombre</option>
                <option value="Mujer">Mujer</option>
                <option value="Otro">Otro</option>
              </select>
              <select name="tematica">
                <option value="Servicios Ambientales">Servicios Ambientales</option>
                <option value="Gestión del Agua">Gestión del Agua</option>
                <option value="Gestión de Riesgo">Gestión de Riesgo</option>
                <option value="Desarrollo urbano y gestión de suelo">
                  Desarrollo urbano y gestión de suelo
                </option>
                <option value="Vivienda">Vivienda</option>
                <option value="Movilidad">Movilidad</option>
                <option value="Equipamiento">Equipamiento</option>
                <option value="Infraestructura">Infraestructura</option>
                <option value="Gestión de Residuos">Gestión de Residuos</option>
                <option value="Patrimonio">Patrimonio</option>
                <option value="Otra">Otra</option>
              </select>
            </div>
          </div>

          <p class="form-hint">Los campos marcados con (*) son obligatorios</p>

          <div class="form-actions">
            <button type="submit" class="btn btn-primary">
              Guardar participación
            </button>
            <a href={adminRoutes.participaciones.href()} class="btn btn-secondary">
              Cancelar
            </a>
          </div>
        </form>
      </AdminLayout>
    )
  }
}
