/**
 * Login Page – Portal de Ordenamiento Ecológico
 * Compone los componentes modulares de app/ui/login/ sobre la carcasa común
 * de autenticación (AuthShell), que comparte con /recuperar y /restablecer.
 *
 * No hay alta de cuenta desde aquí: participar en la consulta no requiere
 * cuenta, y las del panel las crea un administrador en /admin/usuarios. Un
 * formulario de registro abierto solo servía para que cualquiera llenara de
 * cuentas el sistema del municipio.
 */
import type { Handle } from 'remix/ui'

import { AuthShell } from '../../ui/login/auth-shell.tsx'
import { LoginForm } from '../../ui/login/login-form.tsx'
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
      >
        <LoginForm errors={errors} email={email} />
      </AuthShell>
    )
  }
}
