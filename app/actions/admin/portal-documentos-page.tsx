import type { Handle } from 'remix/ui'

import { ETAPAS_DOCUMENTO, TIPOS_DOCUMENTO } from '../../data/poetdum.ts'
import { routes } from '../../routes.ts'
import { AdminAlert } from '../../ui/admin/alert.tsx'
import { AdminLayout } from '../../ui/admin/admin-layout.tsx'
import { Icon } from '../../ui/admin/icon.tsx'
import { Button } from '../../ui/button.tsx'

export interface PortalDocumentosPageProps {
  user: { name: string; role: string }
  documentos: Array<{
    id: string
    titulo: string
    tipo: string
    etapa: string
    fecha: string
    descripcion: string
  }>
  error?: string
}

export function PortalDocumentosPage(handle: Handle<PortalDocumentosPageProps>) {
  return () => {
    const { user, documentos, error } = handle.props
    return (
      <AdminLayout
        user={user}
        active="documentos"
        title="Documentos"
        subtitle="Repositorio público del POETDUM: convenios, actas, cartografía y documentos técnicos."
        actions={
          <a
            class="btn btn--white"
            href={`${routes.poetdum.show.href()}#documentos`}
            target="_blank"
            rel="noreferrer"
          >
            <Icon name="mdi:open-in-new" size={16} /> Ver en el portal
          </a>
        }
      >
        {error ? <AdminAlert type="error" message={error} /> : null}

        <div class="panel">
          <h2 class="panel__title">Nuevo documento</h2>
          <form
            method="post"
            encType="multipart/form-data"
            class="form-row"
            style="flex-wrap:wrap;"
          >
            <input type="hidden" name="intent" value="crear" />
            <div class="form-field">
              <label for="titulo">Título</label>
              <input id="titulo" name="titulo" required placeholder="Convenio…" />
            </div>
            <div class="form-field">
              <label for="tipo">Tipo</label>
              <select id="tipo" name="tipo" required>
                {TIPOS_DOCUMENTO.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
            <div class="form-field">
              <label for="etapa">Etapa</label>
              <select id="etapa" name="etapa" required>
                {ETAPAS_DOCUMENTO.map((e) => (
                  <option key={e} value={e}>
                    {e}
                  </option>
                ))}
              </select>
            </div>
            <div class="form-field">
              <label for="fecha">Fecha</label>
              <input id="fecha" name="fecha" type="date" />
            </div>
            <div class="form-field">
              <label for="descripcion">Descripción</label>
              <textarea id="descripcion" name="descripcion" rows={2} />
            </div>
            <div class="form-field">
              <label for="archivo">Archivo</label>
              <input id="archivo" name="archivo" type="file" required />
            </div>
            <Button buttonType="submit" variant="dark">
              ＋ Guardar documento
            </Button>
          </form>
        </div>

        <div class="panel">
          <h2 class="panel__title" style="margin:0;">
            Documentos registrados
          </h2>
          <div class="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Título</th>
                  <th>Tipo</th>
                  <th>Etapa</th>
                  <th>Fecha</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {documentos.length === 0 ? (
                  <tr>
                    <td colspan={5} class="empty">
                      No hay documentos registrados
                    </td>
                  </tr>
                ) : (
                  documentos.map((d) => (
                    <tr key={d.id}>
                      <td>{d.titulo}</td>
                      <td>{d.tipo}</td>
                      <td>{d.etapa}</td>
                      <td>{d.fecha || '—'}</td>
                      <td>
                        <form method="post" style="margin:0;">
                          <input type="hidden" name="intent" value="eliminar" />
                          <input type="hidden" name="id" value={String(d.id)} />
                          <Button buttonType="submit" variant="danger" size="sm" title="Eliminar">
                            🗑
                          </Button>
                        </form>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </AdminLayout>
    )
  }
}
