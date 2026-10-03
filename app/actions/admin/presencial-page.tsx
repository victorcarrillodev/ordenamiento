import type { Handle } from 'remix/ui'

import type { EtapaConsulta } from '../../data/consulta.ts'
import { adminRoutes } from '../../routes.ts'
import { AdminAlert } from '../../ui/admin/alert.tsx'
import { AdminLayout } from '../../ui/admin/admin-layout.tsx'
import { Icon } from '../../ui/admin/icon.tsx'
import { Button } from '../../ui/button.tsx'

export interface FormatoPendiente {
  id: string
  folio: string
  created_at: string
  generado_por: string
  pendiente: boolean
}

export interface PresencialPageProps {
  user: { name: string; role: string }
  etapa: EtapaConsulta
  pendientes: FormatoPendiente[]
  /** Formato que se acaba de generar, para ofrecer su descarga. */
  generado?: FormatoPendiente
  error?: string
}

function fechaHora(iso: string): string {
  const d = new Date(iso)
  return isNaN(d.getTime())
    ? iso
    : d.toLocaleString('es-MX', {
        dateStyle: 'medium',
        timeStyle: 'short',
        timeZone: 'America/Mexico_City',
      })
}

const SIN_RECEPCION: Record<EtapaConsulta, string> = {
  pendiente:
    'La consulta pública aún no inicia: todavía no se reciben participaciones. Cuando inicie podrás capturarlas o generar formatos.',
  abierta: '',
  concluida:
    'La consulta pública concluyó: ya no se reciben participaciones nuevas ni se generan formatos. Los formatos que ya se entregaron se pueden registrar al regresar.',
}

const tarjetaStyle =
  'border:1px solid var(--a-line, #e2e8f0);border-radius:12px;padding:20px;display:flex;flex-direction:column;gap:10px;background:#fff;'

export function PresencialPage(handle: Handle<PresencialPageProps>) {
  return () => {
    const { user, etapa, pendientes, generado, error } = handle.props
    const recibe = etapa === 'abierta'
    return (
      <AdminLayout
        user={user}
        active="participaciones-fisica"
        title="Registrar participación presencial"
        subtitle="Elige cómo recibir la participación de quien acude a ventanilla. En ambos casos el folio es el mismo durante todo el proceso."
        breadcrumb={
          <>
            <a href={`${adminRoutes.participaciones.href()}?origen=fisica`}>
              Participaciones físicas
            </a>
            <span class="breadcrumb__sep" aria-hidden="true">
              /
            </span>
            Registrar
          </>
        }
      >
        {error ? <AdminAlert type="error" message={error} /> : null}
        {recibe ? null : <AdminAlert type="warning" message={SIN_RECEPCION[etapa]} />}

        {generado ? (
          <AdminAlert type="success">
            Se generó el formato con el folio <strong>{generado.folio}</strong>. Descárgalo,
            imprímelo y entrégalo para que la persona lo llene a mano:{' '}
            <a
              class="btn btn--green btn--sm"
              href={adminRoutes.formatoPdf.href({ id: generado.id })}
              download={`Formato de participación ${generado.folio}.pdf`}
            >
              ⬇ Descargar formato PDF
            </a>
          </AdminAlert>
        ) : null}

        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:16px;">
          <section style={tarjetaStyle} aria-labelledby="opcion-asistida">
            <h2 id="opcion-asistida" class="panel__title panel__title--icono">
              <Icon name="mdi:account-edit-outline" /> Captura asistida
            </h2>
            <p class="form-hint">
              Llena el registro con la información que la persona participante te indique. Al
              guardarlo se genera el folio y puedes descargar el acuse para imprimirlo y entregarlo.
            </p>
            {recibe ? (
              <a class="btn btn--dark" href={adminRoutes.participacionNueva.index.href()}>
                Capturar participación
              </a>
            ) : (
              <span class="btn btn--dark is-disabled" aria-disabled="true">
                Capturar participación
              </span>
            )}
          </section>

          <section style={tarjetaStyle} aria-labelledby="opcion-mano">
            <h2 id="opcion-mano" class="panel__title panel__title--icono">
              <Icon name="mdi:file-document-edit-outline" /> Llenado a mano
            </h2>
            <p class="form-hint">
              Genera un formato con folio para imprimirlo y que la persona lo complete de su puño y
              letra. Después registra la participación y carga el formato escaneado en PDF, con el
              mismo folio.
            </p>
            <form method="post" action={adminRoutes.formatoNuevo.action.href()}>
              {recibe ? (
                <Button buttonType="submit" variant="dark">
                  Generar formato con folio
                </Button>
              ) : (
                <Button buttonType="button" variant="dark" disabled>
                  Generar formato con folio
                </Button>
              )}
            </form>
          </section>
        </div>

        <section class="panel" aria-labelledby="pendientes-titulo">
          <div class="panel__head">
            <h2 id="pendientes-titulo" class="panel__title">
              Formatos pendientes de recepción
            </h2>
            <span class="badge en-proceso">
              {pendientes.length === 1 ? '1 pendiente' : `${pendientes.length} pendientes`}
            </span>
          </div>
          {pendientes.length === 0 ? (
            <p class="empty">
              No hay formatos pendientes: todos los que se generaron ya se registraron.
            </p>
          ) : (
            <div class="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Folio</th>
                    <th>Generado</th>
                    <th>Por</th>
                    <th>Estado</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {pendientes.map((f) => (
                    <tr key={f.id}>
                      <td>{f.folio}</td>
                      <td>{fechaHora(f.created_at)}</td>
                      <td>{f.generado_por || '—'}</td>
                      <td>
                        <span class="badge en-proceso">Pendiente de recepción</span>
                      </td>
                      <td>
                        <div style="display:flex;gap:6px;flex-wrap:wrap;">
                          <a
                            class="btn btn--white"
                            href={adminRoutes.formatoPdf.href({ id: f.id })}
                            download={`Formato de participación ${f.folio}.pdf`}
                            title="Volver a descargar el formato en blanco"
                          >
                            ⬇ Formato
                          </a>
                          <a
                            class="btn btn--green"
                            href={`${adminRoutes.participacionNueva.index.href()}?formato=${encodeURIComponent(f.id)}`}
                          >
                            Registrar participación recibida
                          </a>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </AdminLayout>
    )
  }
}
