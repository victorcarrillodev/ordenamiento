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
  /** Identificador de la participación recién registrada, para ofrecer su acuse. */
  participacionId?: string
  values?: NuevaValues
  errors?: ErroresParticipacion
  /** Si se registra lo que regresó de un formato llenado a mano: el formato y su folio. */
  formato?: { id: string; folio: string }
  /** Si no se reciben participaciones nuevas, se explica en lugar del formulario. */
  aviso?: { titulo: string; texto: string }
}

export function NuevaPage(handle: Handle<NuevaPageProps>) {
  return () => {
    const {
      user,
      error,
      folioRegistrado,
      participacionId,
      values = {},
      errors = {},
      formato,
      aviso,
    } = handle.props

    return (
      <AdminLayout
        user={user}
        active="participaciones-fisica"
        title={formato ? `Registrar el formato ${formato.folio}` : 'Nueva participación física'}
        subtitle={
          formato
            ? 'Captura lo que la persona escribió a mano y carga el formato escaneado. Se conserva el folio del formato.'
            : 'Captura una participación recibida en ventanilla. Se le asigna folio al guardarla.'
        }
        breadcrumb={
          <>
            <a href={`${adminRoutes.participaciones.href()}?origen=fisica`}>
              Participaciones físicas
            </a>
            <span class="breadcrumb__sep" aria-hidden="true">
              /
            </span>
            <a href={adminRoutes.presencial.href()}>Registrar</a>
            <span class="breadcrumb__sep" aria-hidden="true">
              /
            </span>
            {formato ? formato.folio : 'Captura asistida'}
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
              {participacionId ? (
                <a
                  class="btn btn--green btn--full"
                  href={adminRoutes.participacionAcuse.href({ id: participacionId })}
                  download={`Acuse ${folioRegistrado}.pdf`}
                >
                  ⬇ Descargar acuse PDF para imprimir
                </a>
              ) : null}
              <Button
                href={adminRoutes.presencial.href()}
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

        {aviso && !formato ? (
          <AdminAlert type="warning">
            <strong>{aviso.titulo}.</strong> {aviso.texto}
          </AdminAlert>
        ) : (
          <form method="post" class="panel form-card" enctype="multipart/form-data">
            {formato ? <input type="hidden" name="formato_id" value={formato.id} /> : null}
            <div class="form-card__notice">
              {formato
                ? 'Captura lo que la persona escribió en el formato. Los campos marcados con * son obligatorios.'
                : 'Captura la participación con lo que la persona indique. Los campos marcados con * son obligatorios.'}
            </div>

            <Field
              label="Folio"
              name="folio"
              value={formato ? formato.folio : 'Se genera automáticamente'}
              readOnly
              appearance="admin"
            />

            <ParticipacionCampos
              coloniasEndpoint={routes.colonias.href()}
              values={values}
              errors={errors}
              appearance="admin"
            />

            {formato ? (
              <div class="form-field form-field--wide">
                <label for="escaneado">
                  Formato escaneado (PDF) <span class="req">*</span>
                </label>
                <input
                  id="escaneado"
                  name="escaneado"
                  type="file"
                  accept=".pdf,application/pdf"
                  required
                />
                <span class="form-hint">
                  El formato llenado a mano, escaneado en PDF. Queda ligado al folio {formato.folio}
                  .
                </span>
              </div>
            ) : null}

            <p class="form-hint">Los campos marcados con (*) son obligatorios</p>

            <div class="form-actions">
              <Button buttonType="submit" variant="primary">
                Guardar participación
              </Button>
              <Button href={adminRoutes.presencial.href()} variant="secondary">
                Cancelar
              </Button>
            </div>
          </form>
        )}
      </AdminLayout>
    )
  }
}
