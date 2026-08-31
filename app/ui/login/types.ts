/**
 * Login UI – tipos compartidos
 * Componentes modulares del login en app/ui/login/
 */

export interface LoginErrors {
  email?: string
  password?: string
  name?: string
}

export interface LoginAlert {
  type: 'error' | 'success' | 'warning' | 'info'
  message: string
}
