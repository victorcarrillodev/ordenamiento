/**
 * Configurar cuenta – primer acceso de una cuenta que dio de alta un root.
 *
 * La persona llega con el enlace del correo de bienvenida (o iniciando sesión
 * con la contraseña provisional) y aquí completa lo que falta: nombre(s),
 * apellidos, la contraseña que usará de ahora en adelante (con confirmación) y,
 * si quiere, su foto de perfil. Hasta que lo hace la cuenta no abre sesión.
 *
 * Si el enlace no sirve no se muestra el formulario: pedir datos que de todas
 * formas se van a rechazar solo hace perder el tiempo.
 */
import type { Handle } from 'remix/ui'

import { routes } from '../../routes.ts'
import { Button } from '../../ui/button.tsx'
import { AuthShell } from '../../ui/login/auth-shell.tsx'
import { TextField } from '../../ui/login/text-field.tsx'
import {
  PASSWORD_MAX,
  PASSWORD_MIN,
  type LoginAlert as LoginAlertType,
} from '../../ui/login/types.ts'
import { etiquetaDeRol } from '../../ui/admin/roles.ts'

export interface ConfigurarCuentaErrors {
  nombres?: string
  apellidos?: string
  password?: string
  confirmacion?: string
  avatar?: string
}

export interface ConfigurarCuentaPageProps {
  /** Enlace del correo. Ausente cuando ya no sirve. */
  token?: string
  /** A quién da paso el enlace; solo cuando sirve. */
  cuenta?: { name: string; email: string; rol: string }
  alert?: LoginAlertType
  errors?: ConfigurarCuentaErrors
  /** Lo escrito en el intento anterior, para no perderlo al corregir. Nunca las contraseñas. */
  valores?: { nombres?: string; apellidos?: string }
  /** Enlace vencido o gastado: se muestra la salida en vez del formulario. */
  invalido?: boolean
}

export function ConfigurarCuentaPage(handle: Handle<ConfigurarCuentaPageProps>) {
  return () => {
    const { token, cuenta, alert, errors = {}, valores = {}, invalido } = handle.props

    return (
      <AuthShell
        documentTitle="Configurar cuenta – Portal de Ordenamiento Ecológico"
        description="Completa tu nombre, elige tu contraseña y activa tu cuenta del Portal de Ordenamiento Ecológico."
        heading={invalido ? 'Enlace no válido' : 'Configura tu cuenta'}
        subtitle={
          invalido ? 'Pide que te reenvíen la invitación' : 'Un último paso antes de entrar'
        }
        alert={alert}
      >
        {invalido ? (
          <div class="login__notice">
            <p class="login__notice-text">
              Este enlace ya venció o se usó antes. Por seguridad, cada invitación sirve una sola
              vez y durante un tiempo limitado.
            </p>
            <p class="login__notice-text">
              Pide a quien administra el portal que te <strong>reenvíe la invitación</strong>, o
              inicia sesión si ya configuraste tu cuenta.
            </p>
            <div class="login__actions">
              <Button href={routes.login.index.href()} variant="primary" fullWidth>
                Ir a iniciar sesión
              </Button>
            </div>
          </div>
        ) : (
          <form
            class="login__form"
            method="POST"
            action={routes.configurarCuenta.action.href()}
            enctype="multipart/form-data"
            // `rmx-document`: al terminar se entra al panel como un documento nuevo. Sin
            // esto, Remix navega dentro del mismo documento y NO ejecuta los scripts del
            // `<head>` de la página que llega (ver el formulario de inicio de sesión).
            rmx-document
            noValidate
          >
            <input type="hidden" name="token" value={token} />

            {cuenta ? (
              <p class="login__intro">
                Tu cuenta <strong>{cuenta.email}</strong> se dio de alta con el rango de{' '}
                <strong>{etiquetaDeRol(cuenta.rol)}</strong>. Completa estos datos para empezar a
                usarla.
              </p>
            ) : null}

            <TextField
              id="nombres"
              name="nombres"
              label="Nombre(s)"
              type="text"
              placeholder="Ana María"
              autoComplete="given-name"
              maxLength={50}
              value={valores.nombres}
              autoFocus
              error={errors.nombres}
            />

            <TextField
              id="apellidos"
              name="apellidos"
              label="Apellidos"
              type="text"
              placeholder="López Pérez"
              autoComplete="family-name"
              maxLength={50}
              value={valores.apellidos}
              error={errors.apellidos}
            />

            <TextField
              id="password"
              name="password"
              label="Nueva contraseña"
              type="password"
              placeholder="••••••••"
              autoComplete="new-password"
              minLength={PASSWORD_MIN}
              maxLength={PASSWORD_MAX}
              hint={`Entre ${PASSWORD_MIN} y ${PASSWORD_MAX} caracteres. Será la que uses a partir de ahora, distinta de la provisional.`}
              reveal
              error={errors.password}
            />

            <TextField
              id="confirmacion"
              name="confirmacion"
              label="Confirma la contraseña"
              type="password"
              placeholder="••••••••"
              autoComplete="new-password"
              minLength={PASSWORD_MIN}
              maxLength={PASSWORD_MAX}
              reveal
              error={errors.confirmacion}
            />

            <div class="login__field">
              <div class="login__field-row">
                <label class="login__label" for="avatar">
                  Foto de perfil <span class="login__optional">(opcional)</span>
                </label>
              </div>
              <input
                class={errors.avatar ? 'login__file login__input--error' : 'login__file'}
                id="avatar"
                name="avatar"
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                aria-describedby="avatar-hint"
              />
              {errors.avatar ? (
                <span class="login__error" role="alert">
                  {errors.avatar}
                </span>
              ) : null}
              <span class="login__hint" id="avatar-hint">
                JPG, PNG, WEBP o GIF · máximo 5 MB. Puedes agregarla o cambiarla después en «Mi
                cuenta».
              </span>
            </div>

            <Button buttonType="submit" variant="primary" fullWidth class="login__submit">
              Guardar y entrar
            </Button>
          </form>
        )}
      </AuthShell>
    )
  }
}
