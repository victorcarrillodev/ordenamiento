import type { Handle } from 'remix/ui'

import { adminRoutes } from '../../routes.ts'
import { AdminLayout } from '../../ui/admin/admin-layout.tsx'
import { Button } from '../../ui/button.tsx'

export interface UsuariosPageProps {
  user: { name: string; role: string }
  users: Array<{ id: string; email: string; name: string; role: string; created_at: string }>
}

export function UsuariosPage(handle: Handle<UsuariosPageProps>) {
  return () => {
    const { user, users } = handle.props
    return (
      <AdminLayout user={user} active="usuarios" title="Usuarios">
        <h1 class="page-title">Usuarios</h1>
        <p class="breadcrumb">
          <a href={adminRoutes.index.href()}>Vista general</a> / Usuarios
        </p>

        <div class="panel" id="usuarios">
          <h2 class="panel__title">👥 Usuarios (crear cuenta)</h2>
          <form
            method="post"
            action={adminRoutes.usuarios.action.href()}
            class="form-row"
            style="margin-bottom: 14px;"
          >
            <div class="form-field">
              <label for="u-name">Nombre</label>
              <input id="u-name" name="name" required />
            </div>
            <div class="form-field">
              <label for="u-email">Correo</label>
              <input id="u-email" name="email" type="email" required />
            </div>
            <div class="form-field">
              <label for="u-pass">Contraseña (mín. 8)</label>
              <input id="u-pass" name="password" type="password" required />
            </div>
            <div class="form-field">
              <label for="u-role">Rol</label>
              <select id="u-role" name="role">
                <option value="user">Usuario</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            <Button buttonType="submit" variant="dark">
              ＋ Crear usuario
            </Button>
          </form>
          <div class="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Nombre</th>
                  <th>Correo</th>
                  <th>Rol</th>
                  <th>Registro</th>
                </tr>
              </thead>
              <tbody>
                {users.length === 0 ? (
                  <tr>
                    <td colspan={4} class="empty">
                      Sin usuarios
                    </td>
                  </tr>
                ) : (
                  users.map((u) => (
                    <tr key={u.id}>
                      <td>{u.name}</td>
                      <td>{u.email}</td>
                      <td>
                        <span class={'badge ' + (u.role === 'admin' ? 'procedente' : 'en-proceso')}>
                          {u.role === 'admin' ? 'Admin' : 'Usuario'}
                        </span>
                      </td>
                      <td>{new Date(u.created_at).toLocaleDateString('es-MX')}</td>
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
