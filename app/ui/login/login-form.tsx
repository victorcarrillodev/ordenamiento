/**
 * LoginForm – formulario de acceso (email + contraseña + submit)
 */
import type { Handle } from 'remix/ui'

import { routes } from '../../routes.ts'
import { Button } from '../button.tsx'
import type { LoginErrors } from './types.ts'
import { TextField } from './text-field.tsx'

export interface LoginFormProps {
  errors?: LoginErrors
}

export function LoginForm(handle: Handle<LoginFormProps>) {
  return () => {
    const { errors = {} } = handle.props

    return (
      <form class="login__form" method="POST" action={routes.login.action.href()} noValidate>
        <TextField
          id="email"
          name="email"
          label="Correo electrónico"
          type="email"
          placeholder="usuario@ejemplo.com"
          autoComplete="email"
          error={errors.email}
        />

        <TextField
          id="password"
          name="password"
          label="Contraseña"
          type="password"
          placeholder="••••••••"
          autoComplete="current-password"
          error={errors.password}
          labelAside={
            <a class="login__forgot" href="#">
              ¿Olvidaste tu contraseña?
            </a>
          }
        />

        <Button
          buttonType="submit"
          variant="primary"
          fullWidth
          class="login__submit"
          iconRight={
            <svg
              viewBox="0 0 24 24"
              fill="none"
              aria-hidden="true"
              style="width: 16px; height: 16px;"
            >
              <path
                d="M4 12h16m0 0-6-6m6 6-6 6"
                stroke="currentColor"
                stroke-width="1.5"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
            </svg>
          }
        >
          Iniciar Sesión
        </Button>
      </form>
    )
  }
}
