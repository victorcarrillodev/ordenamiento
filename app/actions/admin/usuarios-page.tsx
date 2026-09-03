import type { Handle } from 'remix/ui'

import { adminRoutes } from '../../routes.ts'
import { AdminAlert } from '../../ui/admin/alert.tsx'
import { AdminLayout } from '../../ui/admin/admin-layout.tsx'
import { Button } from '../../ui/button.tsx'
import { Icon } from '../../ui/admin/icon.tsx'

export interface UsuarioRow {
  id: string
  email: string
  name: string
  role: string
  created_at: string
}

export interface UsuarioFeedback {
  type: 'success' | 'error'
  message: string
}

export interface UsuariosPageProps {
  user: { name: string; role: string }
  users: UsuarioRow[]
  /** Acuse del alta anterior (llega por `?estado=` tras el redirect del POST). */
  feedback?: UsuarioFeedback
}

/**
 * Iniciales para el avatar de la tabla. Se toman la primera y la última
 * palabra: «María de los Ángeles Ruiz» → «MR», no «MD».
 */
function iniciales(nombre: string): string {
  const partes = nombre.trim().split(/\s+/).filter(Boolean)
  if (partes.length === 0) return '?'
  const primera = partes[0][0]
  const ultima = partes.length > 1 ? partes[partes.length - 1][0] : ''
  return (primera + ultima).toUpperCase()
}

function formatearFecha(valor: string): string {
  const fecha = new Date(valor)
  return Number.isNaN(fecha.getTime())
    ? '—'
    : fecha.toLocaleDateString('es-MX', { year: 'numeric', month: 'short', day: '2-digit' })
}

export function UsuariosPage(handle: Handle<UsuariosPageProps>) {
  return () => {
    const { user, users, feedback } = handle.props
    const admins = users.filter((u) => u.role === 'admin').length
    const ciudadanos = users.length - admins

    return (
      <AdminLayout
        user={user}
        active="usuarios"
        title="Usuarios"
        subtitle="Cuentas con acceso al portal. Solo las de rol administrador entran a este panel."
        actions={
          <a class="btn btn--white" href={adminRoutes.sesiones.href()}>
            <Icon name="mdi:account-clock-outline" size={16} /> Registro de sesiones
          </a>
        }
      >
        {feedback ? <AdminAlert type={feedback.type} message={feedback.message} /> : null}

        <div class="cards">
          <div class="card">
            <div class="card__icon violet">
              <Icon name="mdi:account-group-outline" size={22} />
            </div>
            <div>
              <div class="card__label">
                Cuentas <span>| Total</span>
              </div>
              <div class="card__value">{users.length}</div>
            </div>
          </div>
          <div class="card">
            <div class="card__icon green">
              <Icon name="mdi:shield-account-outline" size={22} />
            </div>
            <div>
              <div class="card__label">
                Administradores <span>| Acceso al panel</span>
              </div>
              <div class="card__value">{admins}</div>
            </div>
          </div>
          <div class="card">
            <div class="card__icon blue">
              <Icon name="mdi:account-outline" size={22} />
            </div>
            <div>
              <div class="card__label">
                Ciudadanos <span>| Solo participación</span>
              </div>
              <div class="card__value">{ciudadanos}</div>
            </div>
          </div>
        </div>

        <div class="panel" id="usuarios-nuevo">
          <div class="panel__head">
            <h2 class="panel__title">Crear cuenta</h2>
          </div>
          <p class="breadcrumb" style="margin: 0 0 12px;">
            Un <strong>administrador</strong> entra a este panel y ve los datos personales de las
            participaciones. Un <strong>ciudadano</strong> solo puede enviar su participación.
          </p>
          <form method="post" action={adminRoutes.usuarios.action.href()} class="form-row">
            <div class="form-field">
              <label for="u-name">Nombre</label>
              <input id="u-name" name="name" autocomplete="name" required />
            </div>
            <div class="form-field">
              <label for="u-email">Correo</label>
              <input id="u-email" name="email" type="email" autocomplete="email" required />
            </div>
            <div class="form-field">
              <label for="u-pass">Contraseña</label>
              <input
                id="u-pass"
                name="password"
                type="password"
                minlength={8}
                autocomplete="new-password"
                aria-describedby="u-pass-hint"
                required
              />
              <span class="form-hint" id="u-pass-hint">
                Mínimo 8 caracteres
              </span>
            </div>
            <div class="form-field">
              <label for="u-role">Rol</label>
              <select id="u-role" name="role">
                <option value="user">Ciudadano</option>
                <option value="admin">Administrador</option>
              </select>
            </div>
            <Button buttonType="submit" variant="dark">
              ＋ Crear usuario
            </Button>
          </form>
        </div>

        <div class="panel" id="usuarios">
          <div class="panel__head">
            <h2 class="panel__title">Cuentas registradas</h2>
            <div class="panel__tools">
              <input
                type="search"
                class="admin-search"
                id="usuarios-search"
                placeholder="Buscar por nombre, correo o rol…"
                aria-label="Buscar usuarios"
                data-filter-rows="usuarios-tbody"
                data-filter-empty="usuarios-vacio"
                data-filter-count="usuarios-count"
                data-filter-noun="cuenta|cuentas"
              />
              <span class="panel__count" id="usuarios-count">
                {users.length} cuentas
              </span>
            </div>
          </div>
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
              <tbody id="usuarios-tbody">
                <tr id="usuarios-vacio" style={users.length === 0 ? '' : 'display: none;'}>
                  <td colspan={4} class="empty">
                    {users.length === 0
                      ? 'Todavía no hay cuentas registradas.'
                      : 'Ninguna cuenta coincide con la búsqueda.'}
                  </td>
                </tr>
                {users.map((u) => (
                  <tr key={u.id} data-search={`${u.name} ${u.email} ${u.role}`}>
                    <td>
                      <span class="user-cell">
                        <span class="user-avatar" aria-hidden="true">
                          {iniciales(u.name)}
                        </span>
                        <span>{u.name}</span>
                      </span>
                    </td>
                    <td>{u.email}</td>
                    <td>
                      <span class={'badge ' + (u.role === 'admin' ? 'procedente' : 'en-proceso')}>
                        {u.role === 'admin' ? 'Administrador' : 'Ciudadano'}
                      </span>
                    </td>
                    <td>{formatearFecha(u.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </AdminLayout>
    )
  }
}
