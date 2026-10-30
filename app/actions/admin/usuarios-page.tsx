import type { Handle } from 'remix/ui'

import { adminRoutes } from '../../routes.ts'
import { AdminAlert } from '../../ui/admin/alert.tsx'
import { AdminLayout } from '../../ui/admin/admin-layout.tsx'
import { Button } from '../../ui/button.tsx'
import { Icon } from '../../ui/admin/icon.tsx'
import { formatearFecha } from '../../ui/admin/formato.ts'
import {
  claseDeRol,
  esRoot,
  etiquetaDeRol,
  puedeActuarSobre,
  puedeCrearCuentas,
  puedeVerBitacoraDeSesiones,
} from '../../ui/admin/roles.ts'
import { PASSWORD_MAX, PASSWORD_MIN } from '../../ui/login/types.ts'

export interface UsuarioRow {
  id: string
  email: string
  name: string
  role: string
  created_at: string
  /** La cuenta existe pero su titular todavía no completa el primer acceso. */
  setup_pending?: boolean
  /** Está por configurar y la contraseña provisional ya no sirve. */
  setup_vencida?: boolean
}

export interface UsuarioFeedback {
  type: 'success' | 'error' | 'warning'
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
    const porConfigurar = cuenta.setup_pending === true

    return (
      <details class="acciones">
        <summary class="btn btn--white btn--sm">Gestionar</summary>
        <div class="acciones__panel">
          {/* Una cuenta por configurar todavía no tiene su contraseña propia: lo que
              se ofrece es reenviar el correo con el enlace a su panel de configuración. */}
          {porConfigurar && actorEsRoot ? (
            <form method="post" action={accion} class="acciones__form">
              <input type="hidden" name="intent" value="invitacion" />
              <input type="hidden" name="id" value={cuenta.id} />
              <Button buttonType="submit" variant="dark" size="sm" fullWidth>
                <Icon name="mdi:email-fast-outline" size={15} /> Reenviar invitación
              </Button>
              <span class="form-hint">
                Manda otro correo con un enlace nuevo (vale 7 días) y renueva la contraseña
                provisional. El enlace anterior deja de servir.
              </span>
            </form>
          ) : null}

          {/* Restablecer contraseña: no pide la anterior, que es justo para
              lo que sirve — la persona perdió el acceso. */}
          <form method="post" action={accion} class="acciones__form">
            <input type="hidden" name="intent" value="password" />
            <input type="hidden" name="id" value={cuenta.id} />
            <label for={`pass-${cuenta.id}`}>
              {porConfigurar ? 'Contraseña provisional nueva' : 'Contraseña nueva'}
            </label>
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
              {porConfigurar
                ? 'Renueva también el plazo para configurar la cuenta. Entrégasela por un medio seguro.'
                : 'Se le cierran las sesiones abiertas. Entrégasela por un medio seguro.'}
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
            ? 'Como root das de alta cuentas y puedes editar, dar de baja y restablecer la contraseña de cualquiera.'
            : 'Cuentas con acceso al portal. Solo una cuenta root da de alta cuentas nuevas y gestiona a otros root.'
        }
        actions={
          puedeVerBitacoraDeSesiones(user.role) ? (
            <a class="btn btn--white" href={adminRoutes.sesiones.href()}>
              <Icon name="mdi:account-clock-outline" size={16} /> Registro de sesiones
            </a>
          ) : undefined
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

        {puedeCrearCuentas(user.role) ? (
          <div class="panel" id="usuarios-nuevo">
            <div class="panel__head">
              <h2 class="panel__title">
                <Icon name="mdi:account-plus-outline" size={18} /> Crear cuenta
              </h2>
            </div>
            <p class="breadcrumb" style="margin: 0 0 12px;">
              Un <strong>administrador</strong> entra al panel y ve los datos personales de las
              participaciones. Un <strong>ciudadano</strong> solo puede enviar la suya. Un{' '}
              <strong>root</strong> manda sobre todas las cuentas, incluidas las de otros root.
            </p>
            <form method="post" action={adminRoutes.usuarios.action.href()} class="form-row">
              <input type="hidden" name="intent" value="crear" />
              <div class="form-field">
                <label for="u-name">Nombre</label>
                <input id="u-name" name="name" autocomplete="off" required />
              </div>
              <div class="form-field">
                <label for="u-email">Correo</label>
                <input id="u-email" name="email" type="email" autocomplete="off" required />
              </div>
              <div class="form-field">
                <label for="u-pass">Contraseña provisional</label>
                {/* Visible a propósito: la escribe quien da de alta y se la entrega a la persona. */}
                <input
                  id="u-pass"
                  name="password"
                  type="text"
                  minlength={PASSWORD_MIN}
                  maxlength={PASSWORD_MAX}
                  autocomplete="off"
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
                  <option value="root">Root</option>
                </select>
              </div>
              <Button buttonType="submit" variant="dark">
                ＋ Crear cuenta y enviar correo
              </Button>
            </form>
            <p class="form-hint" style="margin: 10px 0 0;">
              La persona recibe un correo con un enlace a su panel de configuración, donde captura
              su nombre y apellidos, crea su contraseña y, si quiere, su foto. La contraseña
              provisional <strong>no viaja en el correo</strong>: entrégasela por otro medio. Con
              ella puede entrar directo a ese panel, y el enlace y la contraseña provisional valen 7
              días.
            </p>
          </div>
        ) : (
          <div class="panel" id="usuarios-nuevo">
            <p class="breadcrumb" style="margin: 0;">
              <Icon name="mdi:lock-outline" size={15} /> Solo una cuenta <strong>root</strong> puede
              dar de alta cuentas nuevas.
            </p>
          </div>
        )}

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
                      {u.setup_pending ? (
                        <span
                          class={'badge ' + (u.setup_vencida ? 'no-procedente' : 'en-proceso')}
                          title={
                            u.setup_vencida
                              ? 'La contraseña provisional venció: reenvía la invitación.'
                              : 'Aún no configura su cuenta (nombre, contraseña propia).'
                          }
                          style="margin-left: 6px;"
                        >
                          {u.setup_vencida ? 'Invitación vencida' : 'Pendiente de configurar'}
                        </span>
                      ) : null}
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
