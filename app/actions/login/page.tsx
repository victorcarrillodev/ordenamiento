/**
 * Login Page – Portal de Ordenamiento Ecológico
 * Renderiza la pantalla de acceso componiendo los componentes modulares de app/ui/login/.
 */
import type { Handle } from 'remix/ui'

import { Document } from '../document.tsx'
import { LoginFooter } from '../../ui/login/login-footer.tsx'
import { LoginForm } from '../../ui/login/login-form.tsx'
import { LoginHeader } from '../../ui/login/login-header.tsx'
import type { LoginErrors } from '../../ui/login/types.ts'

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
        head={<link rel="stylesheet" href="/login.css" />}
      >
        <main class="login">
          <div class="login__viewport">
            <div class="login__card">
              <LoginHeader
                title="Iniciar Sesión"
                subtitle="Portal de Ordenamiento Ecológico"
                logoSrc="/images/tlaquepaque.png"
                logoAlt="Logo Tlaquepaque"
              />
              <div class="login__body">
                <LoginForm errors={errors} />
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
