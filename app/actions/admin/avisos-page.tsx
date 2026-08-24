import type { Handle } from 'remix/ui'

import { AdminLayout } from '../../ui/admin/admin-layout.tsx'

export interface AvisosPageProps {
  user: { name: string; role: string }
  avisos: Array<{ id: number; titulo: string; descripcion: string; activo: boolean }>
  error?: string
}

export function AvisosPage(handle: Handle<AvisosPageProps>) {
  return () => {
    const { user, avisos, error } = handle.props

    return (
      <AdminLayout user={user} active="avisos" title="Gestión de Avisos">
        <h1 class="page-title">Gestión de Avisos</h1>
        <p class="breadcrumb">
          <a href="/admin">Vista general</a> / Gestión de avisos
        </p>

        {error ? <p class="form-error">{error}</p> : null}

        <div class="panel">
          <h2 class="panel__title">Nuevo aviso</h2>
          <form method="post" class="form-row">
            <div class="form-field">
              <label for="titulo">Título</label>
              <input id="titulo" name="titulo" required />
            </div>
            <div class="form-field">
              <label for="descripcion">Descripción</label>
              <input id="descripcion" name="descripcion" />
            </div>
            <button type="submit" class="btn btn--dark">＋ Publicar</button>
          </form>
        </div>

        <div class="panel">
          <div class="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Título</th>
                  <th>Descripción</th>
                  <th>Estado</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {avisos.length === 0 ? (
                  <tr><td colspan={4} class="empty">No hay avisos</td></tr>
                ) : (
                  avisos.map((a) => (
                    <tr key={a.id}>
                      <td>{a.titulo}</td>
                      <td>{a.descripcion}</td>
                      <td><span class={'badge ' + (a.activo ? 'procedente' : 'no-procedente')}>{a.activo ? 'Activo' : 'Inactivo'}</span></td>
                      <td>
                        <form method="post" style="margin:0;">
                          <input type="hidden" name="intent" value="eliminar" />
                          <input type="hidden" name="id" value={String(a.id)} />
                          <button type="submit" class="btn btn--red">🗑</button>
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
