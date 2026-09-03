/**
 * Login Page – Portal de Ordenamiento Ecológico
 * Compone los componentes modulares de app/ui/login/ sobre la carcasa común
 * de autenticación (AuthShell), que comparte con /recuperar y /restablecer.
 */
import type { Handle } from 'remix/ui'

import { routes } from '../../routes.ts'
import { Button } from '../../ui/button.tsx'
import { AuthShell } from '../../ui/login/auth-shell.tsx'
import { LoginForm } from '../../ui/login/login-form.tsx'
import { TextField } from '../../ui/login/text-field.tsx'
import type { LoginAlert as LoginAlertType, LoginErrors } from '../../ui/login/types.ts'

export interface LoginPageProps {
  errors?: LoginErrors
  alert?: LoginAlertType
  /** Correo enviado en el intento anterior, para reponerlo en el formulario. */
  email?: string
}

export function LoginPage(handle: Handle<LoginPageProps>) {
  return () => {
    const { errors = {}, alert, email } = handle.props

    return (
      <AuthShell
        documentTitle="Iniciar Sesión – Portal de Ordenamiento Ecológico"
        heading="Iniciar Sesión"
        subtitle="Portal de Ordenamiento Ecológico"
        alert={alert}
        aside={
          <div class="login__admin">
            <details class="login__admin-details">
              <summary>¿Necesitas una cuenta?</summary>
              <form
                class="login__form login__register"
                method="POST"
                action={routes.login.action.href()}
                noValidate
              >
                <input type="hidden" name="intent" value="registro" />
                <TextField
                  id="name"
                  name="name"
                  label="Nombre completo"
                  type="text"
                  placeholder="Nombre y apellidos"
                  autoComplete="name"
                  error={errors.name}
                />
                <TextField
                  id="email-reg"
                  name="email"
                  label="Correo electrónico"
                  type="email"
                  placeholder="usuario@ejemplo.com"
                  autoComplete="email"
                  error={errors.email}
                />
                <TextField
                  id="password-reg"
                  name="password"
                  label="Contraseña"
                  type="password"
                  placeholder="••••••••"
                  autoComplete="new-password"
                  minLength={8}
                  hint="Mínimo 8 caracteres."
                  reveal
                  error={errors.password}
                />
                <Button
                  buttonType="submit"
                  variant="gold"
                  fullWidth
                  class="login__submit login__submit--accent"
                >
                  Crear cuenta
                </Button>
              </form>
            </details>
          </div>
        }
      >
        <LoginForm errors={errors} email={email} />
      </AuthShell>
    )
  }
}
