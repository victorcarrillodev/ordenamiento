import type { Handle } from 'remix/ui'

import { adminRoutes } from '../../routes.ts'
import { AdminAlert } from '../../ui/admin/alert.tsx'
import { AdminLayout } from '../../ui/admin/admin-layout.tsx'
import { Button } from '../../ui/button.tsx'
import { Icon } from '../../ui/admin/icon.tsx'
import { formatearFecha } from '../../ui/admin/formato.ts'
import { claseDeRol, esRoot, etiquetaDeRol, puedeActuarSobre } from '../../ui/admin/roles.ts'
import { PASSWORD_MAX, PASSWORD_MIN } from '../../ui/login/types.ts'

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
  user: { id?: string; name: string; role: string }
  users: UsuarioRow[]
  /** Acuse de la acción anterior (llega por `?estado=` tras el redirect). */
  feedback?: UsuarioFeedback
}

/**
 * Iniciales para el avatar. Se toman la primera y la última palabra:
 * «María de los Ángeles Ruiz» → «MR», no «MD».
 */
function iniciales(nombre: string): string {
  const partes = nombre.trim().split(/\s+/).filter(Boolean)
  if (partes.length === 0) return '?'
  const primera = partes[0][0]
  const ultima = partes.length > 1 ? partes[partes.length - 1][0] : ''
  return (primera + ultima).toUpperCase()
}

/** Acciones de una fila. Van dentro de un <details> para no llenar la tabla. */
function AccionesDeCuenta(handle: Handle<{ cuenta: UsuarioRow; actorEsRoot: boolean }>) {
  return () => {
    const { cuenta, actorEsRoot } = handle.props
    const accion = adminRoutes.usuarios.action.href()

    return (
      <details class="acciones">
        <summary class="btn btn--white btn--sm">Gestionar</summary>
        <div class="acciones__panel">
          {/* Restablecer contraseña: no pide la anterior, que es justo para
              lo que sirve — la persona perdió el acceso. */}
          <form method="post" action={accion} class="acciones__form">
            <input type="hidden" name="intent" value="password" />
            <input type="hidden" name="id" value={cuenta.id} />
            <label for={`pass-${cuenta.id}`}>Contraseña nueva</label>
            <div class="acciones__fila">
              <input
                id={`pass-${cuenta.id}`}
                name="password"
                type="text"
                minlength={PASSWORD_MIN}
                maxlength={PASSWORD_MAX}
                placeholder={`${PASSWORD_MIN}–${PASSWORD_MAX} caracteres`}
                autocomplete="off"
                required
              />
              <Button buttonType="submit" variant="dark" size="sm">
                Restablecer
              </Button>
            </div>
            <span class="form-hint">
              Se le cierran las sesiones abiertas. Entrégasela por un medio seguro.
            </span>
          </form>

          {/* Cambio de rango */}
          <form method="post" action={accion} class="acciones__form">
            <input type="hidden" name="intent" value="rol" />
            <input type="hidden" name="id" value={cuenta.id} />
            <label for={`rol-${cuenta.id}`}>Rango</label>
            <div class="acciones__fila">
              <select id={`rol-${cuenta.id}`} name="role">
                <option value="user" selected={cuenta.role === 'user'}>
                  Ciudadano
                </option>
                <option value="admin" selected={cuenta.role === 'admin'}>
                  Administrador
                </option>
                {/* Solo un root reparte el rango root. */}
                {actorEsRoot ? (
                  <option value="root" selected={cuenta.role === 'root'}>
                    Root
                  </option>
                ) : null}
              </select>
              <Button buttonType="submit" variant="dark" size="sm">
                Cambiar
              </Button>
            </div>
          </form>

          {/* Baja */}
          <form method="post" action={accion} class="acciones__form eliminar-cuenta">
            <input type="hidden" name="intent" value="eliminar" />
            <input type="hidden" name="id" value={cuenta.id} />
            <Button buttonType="submit" variant="danger" size="sm" fullWidth>
              <Icon name="mdi:trash-can-outline" size={15} /> Eliminar la cuenta
            </Button>
            <span class="form-hint">
              Sus participaciones y contenido se conservan; solo se va la cuenta.
            </span>
          </form>
        </div>
      </details>
    )
  }
}

export function UsuariosPage(handle: Handle<UsuariosPageProps>) {
  return () => {
    const { user, users, feedback } = handle.props
    const actorEsRoot = esRoot(user.role)
    const roots = users.filter((u) => u.role === 'root').length
    const admins = users.filter((u) => u.role === 'admin').length
    const ciudadanos = users.length - roots - admins

    return (
      <AdminLayout
        user={user}
        active="usuarios"
        title="Usuarios"
        subtitle={
          actorEsRoot
            ? 'Como root puedes crear, editar, dar de baja y restablecer la contraseña de cualquier cuenta.'
            : 'Cuentas con acceso al portal. Las cuentas root solo las gestiona otra cuenta root.'
        }
        actions={
          <a class="btn btn--white" href={adminRoutes.sesiones.href()}>
            <Icon name="mdi:account-clock-outline" size={16} /> Registro de sesiones
          </a>
        }
      >
        {feedback ? <AdminAlert type={feedback.type} message={feedback.message} /> : null}

        <div class="cards">
          <div class="card">
            <div class="card__icon amber">
              <Icon name="mdi:shield-crown-outline" size={22} />
            </div>
            <div>
              <div class="card__label">
                Root <span>| Control total</span>
              </div>
              <div class="card__value">{roots}</div>
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
        </div>

        <div class="panel" id="usuarios-nuevo">
          <div class="panel__head">
            <h2 class="panel__title">
              <Icon name="mdi:account-plus-outline" size={18} /> Crear cuenta
            </h2>
          </div>
          <p class="breadcrumb" style="margin: 0 0 12px;">
            Un <strong>administrador</strong> entra al panel y ve los datos personales de las
            participaciones. Un <strong>ciudadano</strong> solo puede enviar la suya.
            {actorEsRoot ? ' Un ' : null}
            {actorEsRoot ? <strong>root</strong> : null}
            {actorEsRoot ? ' manda sobre todas las cuentas, incluidas las de otros root.' : null}
          </p>
          <form method="post" action={adminRoutes.usuarios.action.href()} class="form-row">
            <input type="hidden" name="intent" value="crear" />
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
                minlength={PASSWORD_MIN}
                maxlength={PASSWORD_MAX}
                autocomplete="new-password"
                aria-describedby="u-pass-hint"
                required
              />
              <span class="form-hint" id="u-pass-hint">
                Entre {String(PASSWORD_MIN)} y {String(PASSWORD_MAX)} caracteres
              </span>
            </div>
            <div class="form-field">
              <label for="u-role">Rango</label>
              <select id="u-role" name="role">
                <option value="user">Ciudadano</option>
                <option value="admin">Administrador</option>
                {actorEsRoot ? <option value="root">Root</option> : null}
              </select>
            </div>
            <Button buttonType="submit" variant="dark">
              ＋ Crear cuenta
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
                placeholder="Buscar por nombre, correo o rango…"
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
                  <th>Rango</th>
                  <th>Registro</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody id="usuarios-tbody">
                <tr id="usuarios-vacio" style={users.length === 0 ? '' : 'display: none;'}>
                  <td colspan={5} class="empty">
                    {users.length === 0
                      ? 'Todavía no hay cuentas registradas.'
                      : 'Ninguna cuenta coincide con la búsqueda.'}
                  </td>
                </tr>
                {users.map((u) => (
                  <tr key={u.id} data-search={`${u.name} ${u.email} ${etiquetaDeRol(u.role)}`}>
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
                      <span class={claseDeRol(u.role)}>{etiquetaDeRol(u.role)}</span>
                    </td>
                    <td>{formatearFecha(u.created_at)}</td>
                    <td>
                      {puedeActuarSobre(user.role, u.role) ? (
                        <AccionesDeCuenta cuenta={u} actorEsRoot={actorEsRoot} />
                      ) : (
                        <span class="form-hint">Solo root</span>
                      )}
                    </td>
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
