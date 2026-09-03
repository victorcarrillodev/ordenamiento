/**
 * Restablecer Page – elegir la contraseña nueva a partir del enlace del correo.
 *
 * Si el enlace no sirve no se muestra el formulario: pedir una contraseña que
 * de todas formas se va a rechazar solo hace perder el tiempo a quien ya está
 * bloqueado fuera de su cuenta.
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

export interface RestablecerPageProps {
  /** Token del correo. Ausente cuando el enlace ya no sirve. */
  token?: string
  alert?: LoginAlertType
  errors?: { password?: string; confirmacion?: string }
  /** Enlace caducado o inválido: se muestra la salida hacia /recuperar. */
  invalido?: boolean
}

export function RestablecerPage(handle: Handle<RestablecerPageProps>) {
  return () => {
    const { token, alert, errors = {}, invalido } = handle.props

    return (
      <AuthShell
        documentTitle="Nueva contraseña – Portal de Ordenamiento Ecológico"
        description="Elige una contraseña nueva para tu cuenta del Portal de Ordenamiento Ecológico."
        heading={invalido ? 'Enlace no válido' : 'Nueva contraseña'}
        subtitle={
          invalido
            ? 'Solicita uno nuevo para continuar'
            : 'Elige la contraseña con la que entrarás a partir de ahora'
        }
        alert={alert}
      >
        {invalido ? (
          <div class="login__notice">
            <p class="login__notice-text">
              Este enlace ya venció o se usó antes. Por seguridad, cada enlace sirve una sola vez y
              durante un tiempo limitado.
            </p>
            <div class="login__actions">
              <Button href={routes.recuperar.index.href()} variant="primary" fullWidth>
                Solicitar un enlace nuevo
              </Button>
              <a class="login__forgot login__forgot--block" href={routes.login.index.href()}>
                ← Volver a iniciar sesión
              </a>
            </div>
          </div>
        ) : (
          <form
            class="login__form"
            method="POST"
            action={routes.restablecer.action.href()}
            noValidate
          >
            <input type="hidden" name="token" value={token} />

            <TextField
              id="password"
              name="password"
              label="Nueva contraseña"
              type="password"
              placeholder="••••••••"
              autoComplete="new-password"
              minLength={PASSWORD_MIN}
              maxLength={PASSWORD_MAX}
              hint={`Entre ${PASSWORD_MIN} y ${PASSWORD_MAX} caracteres. Evita datos fáciles de adivinar.`}
              reveal
              autoFocus
              error={errors.password}
            />

            <TextField
              id="confirmacion"
              name="confirmacion"
              label="Repite la contraseña"
              type="password"
              placeholder="••••••••"
              autoComplete="new-password"
              minLength={PASSWORD_MIN}
              maxLength={PASSWORD_MAX}
              reveal
              error={errors.confirmacion}
            />

            <Button buttonType="submit" variant="primary" fullWidth class="login__submit">
              Guardar contraseña
            </Button>

            <a class="login__forgot login__forgot--block" href={routes.login.index.href()}>
              ← Cancelar y volver a iniciar sesión
            </a>
          </form>
        )}
      </AuthShell>
    )
  }
}
