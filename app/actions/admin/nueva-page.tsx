import type { Handle } from 'remix/ui'

import { adminRoutes } from '../../routes.ts'
import { AdminLayout } from '../../ui/admin/admin-layout.tsx'

export interface NuevaPageProps {
  user: { name: string; role: string }
  error?: string
}

interface CampoProps {
  label: string
  name: string
  value?: string
  required?: boolean
  placeholder?: string
  wide?: boolean
}

function Campo(handle: Handle<CampoProps>) {
  return () => {
    const { label, name, value, required, placeholder, wide } = handle.props
    return (
      <div class={'form-field' + (wide ? ' form-field--wide' : '')}>
        <label for={name}>
          {label} {required ? <span class="req">*</span> : null}
        </label>
        <input
          id={name}
          name={name}
          type="text"
          value={value}
          required={required}
          placeholder={placeholder}
        />
      </div>
    )
  }
}

export function NuevaPage(handle: Handle<NuevaPageProps>) {
  return () => {
    const { user, error } = handle.props

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

        <form method="post" class="panel form-card" enctype="multipart/form-data">
          <div class="form-card__notice">
            ⚠️ Llena todos los campos a continuación para registrar su participación
          </div>

          <div class="form-field">
            <label for="folio">Folio</label>
            <input id="folio" name="folio" value="Se genera automáticamente" readonly />
          </div>

          <div class="form-grid">
            <Campo
              label="Nombre completo"
              name="nombre"
              required
              placeholder="Ej. María González López"
            />
            <Campo label="Correo" name="correo" required placeholder="correo@ejemplo.com" />
            <Campo
              label="Domicilio de quien participa"
              name="domicilio"
              placeholder="Calle, colonia, municipio"
            />
            <Campo label="Municipio" name="municipio" value="Tlaquepaque" />
            <Campo label="Institución o empresa" name="institucion" />
            <Campo label="Ocupación o puesto" name="ocupacion" />
          </div>

          <h3 class="form-card__section">Domicilio del aporte:</h3>
          <div class="form-grid">
            <Campo label="Calle" name="calle" required />
            <Campo label="Número" name="numero" />
            <Campo label="Colonia" name="colonia" required />
            <Campo label="Municipio" name="municipio_aporte" value="Tlaquepaque" />
          </div>

          <h3 class="form-card__section">¿Cómo obtener las coordenadas? ⓘ</h3>
          <div class="form-grid">
            <Campo label="Coordenadas latitud" name="latitud" value="20.659" />
            <Campo label="Coordenadas longitud" name="longitud" value="-103.349" />
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

          <div class="form-field form-field--wide">
            <label for="observacion">
              Observaciones <span class="req">*</span>
            </label>
            <textarea id="observacion" name="observacion" rows={4} required></textarea>
          </div>

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

          <div class="btn-row-admin">
            <a class="btn btn--ghost" href={`${adminRoutes.participaciones.href()}?origen=fisica`}>
              Cancelar
            </a>
            <button type="submit" class="btn btn--dark">
              Registrar participación
            </button>
          </div>
        </form>
      </AdminLayout>
    )
  }
}
