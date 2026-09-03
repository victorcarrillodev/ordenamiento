import type { Handle } from 'remix/ui'

import { adminRoutes } from '../../routes.ts'
import { AdminLayout } from '../../ui/admin/admin-layout.tsx'
import { Button } from '../../ui/button.tsx'
import { Icon } from '../../ui/admin/icon.tsx'
import { formatearDuracion, formatearFecha, formatearFechaHora } from '../../ui/admin/formato.ts'
import type { SesionRegistrada } from './sesiones-page.tsx'

export interface UserProfile {
  id: string
  email: string
  name: string
  role: string
  created_at: string
  avatar_ruta: string
}

export interface CuentaFeedback {
  type: 'success' | 'error'
  message: string
}

export interface CuentaPageProps {
  user: { name: string; role: string }
  profile?: UserProfile | null
  feedback?: CuentaFeedback
  /** Dirección a la que se mandó la verificación, si se acaba de solicitar. */
  correoPendiente?: string
  /** Últimas sesiones de esta misma cuenta. */
  sesiones?: SesionRegistrada[]
}

function iniciales(nombre?: string | null): string {
  const partes = (nombre ?? '').trim().split(/\s+/).filter(Boolean)
  if (partes.length === 0) return '?'
  const primera = partes[0][0]
  const ultima = partes.length > 1 ? partes[partes.length - 1][0] : ''
  return (primera + ultima).toUpperCase()
}

export function CuentaPage(handle: Handle<CuentaPageProps>) {
  return () => {
    const { user, profile, feedback, correoPendiente, sesiones = [] } = handle.props
    const nombre = profile?.name ?? user.name
    const correo = profile?.email ?? '—'
    const rol = profile?.role ?? user.role
    const tieneFoto = Boolean(profile?.avatar_ruta)

    return (
      <AdminLayout
        user={user}
        active="cuenta"
        title="Mi cuenta"
        subtitle="Tu foto, tu nombre y el correo con el que entras al panel."
      >
        {feedback ? (
          <div class={`admin-alert admin-alert--${feedback.type}`} role="alert">
            <Icon
              name={
                feedback.type === 'success'
                  ? 'mdi:check-circle-outline'
                  : 'mdi:alert-circle-outline'
              }
              size={18}
            />
            <span>{feedback.message}</span>
          </div>
        ) : null}

        {correoPendiente ? (
          <div class="admin-alert admin-alert--info" role="status">
            <Icon name="mdi:email-fast-outline" size={18} />
            <span>
              Enviamos un enlace de confirmación a <strong>{correoPendiente}</strong>. Tu correo de
              acceso <strong>seguirá siendo el actual</strong> hasta que abras ese enlace. Vence en
              una hora.
            </span>
          </div>
        ) : null}

        {/* Identidad: foto grande, datos a un lado */}
        <div class="panel perfil">
          <div class="perfil__avatar-col">
            <div class="avatar-drop" id="avatar-drop">
              {tieneFoto ? (
                <img
                  id="avatar-preview"
                  class="avatar-drop__img"
                  src={adminRoutes.cuentaAvatar.href()}
                  alt={`Foto de perfil de ${nombre}`}
                />
              ) : (
                <div class="avatar-drop__fallback" id="avatar-preview-fallback">
                  {iniciales(nombre)}
                </div>
              )}
            </div>
          </div>

          <div class="perfil__datos">
            <h2 class="perfil__nombre">{nombre}</h2>
            <p class="perfil__correo">{correo}</p>
            <div class="perfil__chips">
              <span class={'badge ' + (rol === 'admin' ? 'procedente' : 'en-proceso')}>
                {rol === 'admin' ? 'Administrador' : 'Ciudadano'}
              </span>
              <span class="chip">
                <Icon name="mdi:calendar-account-outline" size={14} />
                Miembro desde {formatearFecha(profile?.created_at)}
              </span>
            </div>

            {/* Foto de perfil: se elige el archivo y se ve antes de guardar. */}
            <form
              class="perfil__form-foto"
              method="post"
              action={adminRoutes.cuenta.action.href()}
              encType="multipart/form-data"
            >
              <input type="hidden" name="intent" value="avatar" />
              <label class="file-field" for="avatar">
                <Icon name="mdi:image-plus-outline" size={16} />
                <span id="avatar-nombre">Elegir imagen…</span>
                <input
                  id="avatar"
                  name="avatar"
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  data-avatar-input
                  data-avatar-preview="avatar-preview"
                  data-avatar-fallback="avatar-preview-fallback"
                  data-avatar-label="avatar-nombre"
                  data-avatar-submit="avatar-guardar"
                  data-avatar-max-mb="5"
                  required
                />
              </label>
              <Button buttonType="submit" id="avatar-guardar" variant="dark" disabled>
                Guardar foto
              </Button>
              <p class="form-hint">
                JPG, PNG, WEBP o GIF · máximo 5 MB · se recorta en un círculo, así que funcionan
                mejor las imágenes cuadradas.
              </p>
            </form>
          </div>
        </div>

        <div class="grid-2">
          {/* Nombre */}
          <div class="panel">
            <div class="panel__head">
              <h2 class="panel__title">
                <Icon name="mdi:account-edit-outline" size={18} /> Nombre
              </h2>
            </div>
            <p class="breadcrumb">
              Es el nombre que aparece en el panel y en la bitácora de sesiones.
            </p>
            <form method="post" action={adminRoutes.cuenta.action.href()} class="form-stack">
              <input type="hidden" name="intent" value="nombre" />
              <div class="form-field">
                <label for="perfil-nombre">Nombre completo</label>
                <input
                  id="perfil-nombre"
                  name="name"
                  value={nombre}
                  minlength={2}
                  maxlength={120}
                  autocomplete="name"
                  required
                />
              </div>
              <Button buttonType="submit" variant="dark">
                Guardar nombre
              </Button>
            </form>
          </div>

          {/* Correo con verificación */}
          <div class="panel">
            <div class="panel__head">
              <h2 class="panel__title">
                <Icon name="mdi:email-sync-outline" size={18} /> Correo de acceso
              </h2>
            </div>
            <p class="breadcrumb">
              Mandaremos un enlace a la dirección nueva. El cambio se aplica cuando lo abras, no
              antes.
            </p>
            <form method="post" action={adminRoutes.cuenta.action.href()} class="form-stack">
              <input type="hidden" name="intent" value="correo" />
              <div class="form-field">
                <label for="perfil-correo">Correo nuevo</label>
                <input
                  id="perfil-correo"
                  name="email"
                  type="email"
                  placeholder="nombre@tlaquepaque.gob.mx"
                  autocomplete="email"
                  required
                />
              </div>
              <div class="form-field">
                <label for="perfil-password">Tu contraseña actual</label>
                <input
                  id="perfil-password"
                  name="password"
                  type="password"
                  autocomplete="current-password"
                  aria-describedby="perfil-password-hint"
                  required
                />
                <span class="form-hint" id="perfil-password-hint">
                  Se pide para confirmar que eres tú: con la sesión abierta no basta.
                </span>
              </div>
              <Button buttonType="submit" variant="dark">
                Enviar verificación
              </Button>
            </form>
          </div>
        </div>

        {/* Actividad propia */}
        <div class="panel">
          <div class="panel__head">
            <h2 class="panel__title">
              <Icon name="mdi:history" size={18} /> Tus últimas sesiones
            </h2>
            {rol === 'admin' ? (
              <a class="btn btn--white btn--sm" href={adminRoutes.sesiones.href()}>
                Ver el registro completo →
              </a>
            ) : null}
          </div>
          <div class="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Inicio</th>
                  <th>Fin</th>
                  <th>Tiempo conectado</th>
                </tr>
              </thead>
              <tbody>
                {sesiones.length === 0 ? (
                  <tr>
                    <td colspan={3} class="empty">
                      Todavía no hay sesiones registradas para tu cuenta.
                    </td>
                  </tr>
                ) : (
                  sesiones.map((s) => (
                    <tr key={s.id}>
                      <td>{formatearFechaHora(s.inicio)}</td>
                      <td>
                        {s.activa ? (
                          <span class="badge procedente">● Esta sesión</span>
                        ) : (
                          formatearFechaHora(s.fin)
                        )}
                      </td>
                      <td>
                        <strong>{formatearDuracion(s.duracion_segundos)}</strong>
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
