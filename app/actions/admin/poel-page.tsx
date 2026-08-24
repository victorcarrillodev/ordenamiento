import type { Handle } from 'remix/ui'

import { adminRoutes } from '../../routes.ts'
import { AdminLayout } from '../../ui/admin/admin-layout.tsx'

export interface PoelPageProps {
  user: { name: string; role: string }
  sesiones: Array<{
    id: number
    categoria: string
    orden: number
    titulo: string
    descripcion: string
    fecha: string | null
    ubicacion: string
    activo: boolean
  }>
  error?: string
}

export function PoelPage(handle: Handle<PoelPageProps>) {
  return () => {
    const { user, sesiones, error } = handle.props

    return (
      <AdminLayout user={user} active="poel" title="Gestión de sesiones POEL">
        <h1 class="page-title">Gestión de sesiones POEL</h1>
        <p class="breadcrumb">
          <a href={adminRoutes.index.href()}>Vista general</a> / Sesiones POEL
        </p>

        {error ? <p class="form-error">{error}</p> : null}

        <div class="panel">
          <h2 class="panel__title">Añadir sesión</h2>
          <form method="post" class="form-row">
            <div class="form-field">
              <label>Orden</label>
              <input name="orden" type="number" min="0" value={String(sesiones.length + 1)} />
            </div>
            <div class="form-field">
              <label>Categoría</label>
              <input name="categoria" placeholder="Diagnóstico" />
            </div>
            <div class="form-field">
              <label>Título</label>
              <input name="titulo" required />
            </div>
            <div class="form-field">
              <label>Descripción</label>
              <input name="descripcion" />
            </div>
            <div class="form-field">
              <label>Fecha</label>
              <input name="fecha" type="date" />
            </div>
            <div class="form-field">
              <label>Ubicación</label>
              <input name="ubicacion" />
            </div>
            <button type="submit" class="btn btn--dark">＋ Añadir sesión</button>
          </form>
        </div>

        <div class="panel">
          <div class="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Categoría</th>
                  <th>Orden</th>
                  <th>Título</th>
                  <th>Descripción</th>
                  <th>Fecha</th>
                  <th>Ubicación</th>
                  <th>Activo</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {sesiones.length === 0 ? (
                  <tr><td colspan={8} class="empty">No hay sesiones</td></tr>
                ) : (
                  sesiones.map((s) => (
                    <tr key={s.id}>
                      <td>{s.categoria}</td>
                      <td>{s.orden}</td>
                      <td>{s.titulo}</td>
                      <td>{s.descripcion}</td>
                      <td>{s.fecha ?? '—'}</td>
                      <td>{s.ubicacion}</td>
                      <td><span class={'badge ' + (s.activo ? 'procedente' : 'no-procedente')}>{s.activo ? 'Sí' : 'No'}</span></td>
                      <td>
                        <form method="post" style="margin:0;">
                          <input type="hidden" name="intent" value="eliminar" />
                          <input type="hidden" name="id" value={String(s.id)} />
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
