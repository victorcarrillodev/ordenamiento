import type { Handle } from 'remix/ui'

import type { ErroresParticipacion, ValoresParticipacion } from '../../data/participacion.ts'
import { adminRoutes, routes } from '../../routes.ts'
import { AdminAlert } from '../../ui/admin/alert.tsx'
import { AdminLayout } from '../../ui/admin/admin-layout.tsx'
import { Button } from '../../ui/button.tsx'
import { Field } from '../../ui/form/field.tsx'
import { ParticipacionCampos } from '../../ui/form/participacion-campos.tsx'

/**
 * Lo que el capturista escribió, para repintarlo cuando el alta no prospera.
 *
 * No incluye los adjuntos: el navegador no permite repoblar un input de tipo file.
 */
export type NuevaValues = ValoresParticipacion

export interface NuevaPageProps {
  user: { name: string; role: string }
  error?: string
  folioRegistrado?: string
  values?: NuevaValues
  errors?: ErroresParticipacion
}

export function NuevaPage(handle: Handle<NuevaPageProps>) {
  return () => {
    const { user, error, folioRegistrado, values = {}, errors = {} } = handle.props

    return (
      <AdminLayout
        user={user}
        active="participaciones-fisica"
        title="Nueva participación física"
        subtitle="Captura una participación recibida en ventanilla. Se le asigna folio al guardarla."
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
        {error ? <AdminAlert type="error" message={error} /> : null}

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
            Captura la participación con lo que la persona indique. Los campos marcados con * son
            obligatorios.
          </div>

          <Field
            label="Folio"
            name="folio"
            value="Se genera automáticamente"
            readOnly
            appearance="admin"
          />

          <ParticipacionCampos
            coloniasEndpoint={routes.colonias.href()}
            values={values}
            errors={errors}
            appearance="admin"
          />

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
