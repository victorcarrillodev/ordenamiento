/**
 * Login Page – Portal de Ordenamiento Ecológico
 * Renderiza la pantalla de acceso componiendo los componentes modulares de app/ui/login/.
 */
import type { Handle } from 'remix/ui'

import { routes } from '../../routes.ts'
import { Document } from '../document.tsx'
import { LoginFooter } from '../../ui/login/login-footer.tsx'
import { LoginForm } from '../../ui/login/login-form.tsx'
import { LoginHeader } from '../../ui/login/login-header.tsx'
import { TextField } from '../../ui/login/text-field.tsx'
import type { LoginErrors } from '../../ui/login/types.ts'

const basePath = (process.env.BASE_PATH ?? '/ordena').replace(/\/$/, '')

export interface LoginPageProps {
  errors?: LoginErrors
}

export function LoginPage(handle: Handle<LoginPageProps>) {
  return () => {
    const { errors = {} } = handle.props

    return (
      <Document
        title="Iniciar Sesión – Portal de Ordenamiento Ecológico"
        description="Accede al Portal de Ordenamiento Ecológico de San Pedro Tlaquepaque."
        head={<link rel="stylesheet" href={`${basePath}/login.css`} />}
      >
        <main class="login">
          <div class="login__viewport">
            <div class="login__card">
              <LoginHeader
                title="Iniciar Sesión"
                subtitle="Portal de Ordenamiento Ecológico"
                logoSrc={`${basePath}/images/tlaquepaque.png`}
                logoAlt="Logo Tlaquepaque"
              />
              <div class="login__body">
                <LoginForm errors={errors} />
              </div>
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
                      placeholder="Admin"
                      autoComplete="name"
                      error={errors.name}
                    />
                    <TextField
                      id="email-reg"
                      name="email"
                      label="Correo electrónico"
                      type="email"
                      placeholder="admin@ejemplo.com"
                      autoComplete="email"
                      error={errors.email}
                    />
                    <TextField
                      id="password-reg"
                      name="password"
                      label="Contraseña (mín. 8)"
                      type="password"
                      placeholder="••••••••"
                      autoComplete="new-password"
                      error={errors.password}
                    />
                    <button class="login__submit login__submit--accent" type="submit">
                      Crear cuenta
                    </button>
                  </form>
                </details>
              </div>
              <LoginFooter
                links={[
                  {
                    label: 'Ayuda',
                    icon: (
                      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                        <circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="1.5" />
                        <path
                          d="M9.6 9.2a2.5 2.5 0 1 1 3.6 2.3c-.8.4-1.2 1-1.2 1.8"
                          stroke="currentColor"
                          stroke-width="1.5"
                          stroke-linecap="round"
                        />
                        <circle cx="12" cy="16.5" r="1" fill="currentColor" />
                      </svg>
                    ),
                  },
                  {
                    label: 'Términos',
                    icon: (
                      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                        <circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="1.5" />
                        <path
                          d="M12 11v5"
                          stroke="currentColor"
                          stroke-width="1.5"
                          stroke-linecap="round"
                        />
                        <circle cx="12" cy="8" r="1" fill="currentColor" />
                      </svg>
                    ),
                  },
                ]}
              />
            </div>
          </div>

          <footer class="login__page-footer">
            <span>© 2024 Gobierno de Tlaquepaque. Portal de Ordenamiento Ecológico.</span>
            <div class="login__page-footer-links">
              <a href="#">Privacidad</a>
              <a href="#">Términos</a>
              <a href="#">Contacto</a>
            </div>
          </footer>
        </main>
      </Document>
    )
  }
}
