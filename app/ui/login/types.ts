/**
 * Login UI – tipos compartidos
 * Componentes modulares del login en app/ui/login/
 */

export interface LoginErrors {
  email?: string
  password?: string
}

export interface LoginAlert {
  type: 'error' | 'success' | 'warning' | 'info'
  message: string
}

/**
 * Longitud de contraseña admitida. El backend aplica exactamente los mismos
 * topes (backend/src/auth/auth.ts); aquí se repiten para avisar antes de
 * mandar y para que el navegador no permita escribir de más.
 *
 * El máximo no es cosmético: cada hash argon2id cuesta 64 MB de memoria a
 * propósito, y sin tope una contraseña de megabytes convierte cada intento de
 * acceso en una forma barata de tumbar el servidor.
 */
export const PASSWORD_MIN = 8
export const PASSWORD_MAX = 128
