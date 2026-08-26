import type { Handle } from 'remix/ui'

import { adminRoutes } from '../../routes.ts'
import { AdminLayout } from '../../ui/admin/admin-layout.tsx'
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
          <div
            class="form-card__notice"
            style="background: #f0fdf4; border: 1px solid #bbf7d0; color: #166534; font-size: 14px; margin-bottom: 16px; border-radius: 8px; padding: 12px 16px;"
          >
            ✅ Participación física registrada con éxito bajo el{' '}
            <strong>Folio Oficial: {folioRegistrado}</strong>. Los campos se han limpiado para la
            siguiente captura.
          </div>
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
            <Field label="Municipio" name="municipio" value="Tlaquepaque" appearance="admin" />
            <Field label="Institución o empresa" name="institucion" appearance="admin" />
            <Field label="Ocupación o puesto" name="ocupacion" appearance="admin" />
          </div>

          <h3 class="form-card__section">Domicilio del aporte:</h3>
          <div class="form-grid">
            <Field label="Calle" name="calle" required appearance="admin" />
            <Field label="Número" name="numero" appearance="admin" />
            <Field label="Colonia" name="colonia" required appearance="admin" />
            <Field
              label="Municipio"
              name="municipio_aporte"
              value="Tlaquepaque"
              appearance="admin"
            />
          </div>

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
            <label for="pdf">Subir archivo</label>
            <input
              id="pdf"
              name="pdf"
              type="file"
              accept=".pdf,.shp,.jpg,.jpeg,.dwg,.png,.xlsx,.docx"
            />
            <span class="form-hint">Archivo: PDF, SHP, JPG, DWG, Word, Excel, formato abierto</span>
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
