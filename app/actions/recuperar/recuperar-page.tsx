/**
 * Recuperar Page – solicitar el enlace de restablecimiento por correo.
 *
 * Dos estados sobre la misma carcasa: el formulario y el acuse de envío.
 */
import type { Handle } from 'remix/ui'

import { routes } from '../../routes.ts'
import { Button } from '../../ui/button.tsx'
import { AuthShell } from '../../ui/login/auth-shell.tsx'
import { TextField } from '../../ui/login/text-field.tsx'
import type { LoginAlert as LoginAlertType } from '../../ui/login/types.ts'

export interface RecuperarPageProps {
  alert?: LoginAlertType
  error?: string
  email?: string
  /** Ya se procesó la solicitud: se muestra el acuse en vez del formulario. */
  enviado?: boolean
  expiraMinutos?: number
}

export function RecuperarPage(handle: Handle<RecuperarPageProps>) {
  return () => {
    const { alert, error, email, enviado, expiraMinutos = 60 } = handle.props

    return (
      <AuthShell
        documentTitle="Recuperar contraseña – Portal de Ordenamiento Ecológico"
        description="Solicita un enlace para restablecer la contraseña de tu cuenta del Portal de Ordenamiento Ecológico."
        heading={enviado ? 'Revisa tu correo' : 'Recuperar contraseña'}
        subtitle={
          enviado
            ? 'Te enviamos las instrucciones para continuar'
            : 'Te enviaremos un enlace para crear una contraseña nueva'
        }
        alert={alert}
      >
        {enviado ? (
          <div class="login__notice">
            <p class="login__notice-text">
              Si <strong>{email}</strong> corresponde a una cuenta registrada, ya salió un correo
              con el enlace para restablecer la contraseña.
            </p>
            <ul class="login__steps">
              <li>
                El enlace vence en {String(expiraMinutos)} minutos y solo puede usarse una vez.
              </li>
              <li>Revisa la bandeja de correo no deseado si no aparece en unos minutos.</li>
              <li>Mientras tanto, tu contraseña actual sigue funcionando.</li>
            </ul>
            <div class="login__actions">
              <Button href={routes.login.index.href()} variant="primary" fullWidth>
                Volver a iniciar sesión
              </Button>
              <a class="login__forgot login__forgot--block" href={routes.recuperar.index.href()}>
                Enviar el enlace de nuevo
              </a>
            </div>
          </div>
        ) : (
          <form
            class="login__form"
            method="POST"
            action={routes.recuperar.action.href()}
            noValidate
          >
            <p class="login__intro">
              Escribe el correo con el que entras al portal. Si hay una cuenta asociada, recibirás
              un enlace temporal para elegir una contraseña nueva.
            </p>

            <TextField
              id="email"
              name="email"
              label="Correo electrónico"
              type="email"
              placeholder="usuario@ejemplo.com"
              autoComplete="email"
              error={error}
              value={email}
              autoFocus
            />

            <Button buttonType="submit" variant="primary" fullWidth class="login__submit">
              Enviar enlace de recuperación
            </Button>

            <a class="login__forgot login__forgot--block" href={routes.login.index.href()}>
              ← Volver a iniciar sesión
            </a>
          </form>
        )}
      </AuthShell>
    )
  }
}
