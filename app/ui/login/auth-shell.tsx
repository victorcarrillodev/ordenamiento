/**
 * AuthShell — carcasa común de las pantallas públicas de acceso
 * (iniciar sesión, recuperar contraseña y restablecerla).
 *
 * Las tres comparten documento, hoja de estilos, tarjeta, encabezado y pies.
 * Vivir aquí evita que un cambio de marca (logo, colores, aviso legal) haya
 * que repetirlo en tres páginas y que una se quede atrás.
 */
import type { Handle, RemixNode } from 'remix/ui'

import { Document } from '../../actions/document.tsx'
import { routes } from '../../routes.ts'
import { LoginAlert } from './login-alert.tsx'
import { LoginFooter } from './login-footer.tsx'
import { LoginHeader } from './login-header.tsx'
import type { LoginAlert as LoginAlertType } from './types.ts'

const basePath = (process.env.BASE_PATH ?? '/ordena').replace(/\/$/, '')

export interface AuthShellProps {
  children?: RemixNode
  /** Título del documento (pestaña del navegador). */
  documentTitle: string
  description?: string
  /** Título visible dentro de la tarjeta. */
  heading: string
  subtitle: string
  alert?: LoginAlertType
  /** Contenido opcional al pie de la tarjeta, sobre los enlaces. */
  aside?: RemixNode
}

const PORTAL_ICON = (
  <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path
      d="M3 11.5 12 4l9 7.5"
      stroke="currentColor"
      stroke-width="1.5"
      stroke-linecap="round"
      stroke-linejoin="round"
    />
    <path
      d="M5.5 10v9h13v-9"
      stroke="currentColor"
      stroke-width="1.5"
      stroke-linecap="round"
      stroke-linejoin="round"
    />
  </svg>
)

const HELP_ICON = (
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
)

export function AuthShell(handle: Handle<AuthShellProps>) {
  return () => {
    const { children, documentTitle, description, heading, subtitle, alert, aside } = handle.props
    const anio = new Date().getFullYear()

    return (
      <Document
        title={documentTitle}
        description={
          description ?? 'Accede al Portal de Ordenamiento Ecológico de San Pedro Tlaquepaque.'
        }
        head={
          <>
            <link rel="stylesheet" href={`${basePath}/login.css`} />
            <script src={`${basePath}/login.js`} defer></script>
          </>
        }
      >
        <main class="login">
          <div class="login__viewport">
            <div class="login__card">
              <LoginHeader
                title={heading}
                subtitle={subtitle}
                logoSrc={`${basePath}/assets/img/logo/logo-200x60.webp`}
                logoAlt="Escudo del Municipio de San Pedro Tlaquepaque"
              />
              <div class="login__body">
                {alert ? <LoginAlert type={alert.type} message={alert.message} /> : null}
                {children}
              </div>
              {aside}
              <LoginFooter
                links={[
                  { label: 'Volver al portal', href: routes.home.href(), icon: PORTAL_ICON },
                  {
                    label: '¿Problemas para entrar?',
                    href: routes.recuperar.index.href(),
                    icon: HELP_ICON,
                  },
                ]}
              />
            </div>
          </div>

          <footer class="login__page-footer">
            <span>
              © {String(anio)} Gobierno de San Pedro Tlaquepaque · Portal de Ordenamiento Ecológico.
            </span>
          </footer>
        </main>
      </Document>
    )
  }
}
