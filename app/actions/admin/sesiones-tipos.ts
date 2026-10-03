/**
 * Lo que el backend entrega de la bitácora de sesiones (`GET /api/sessions`).
 * Vive aparte para que la pantalla de la bitácora y la de «Mi cuenta» lean lo
 * mismo, igual que `backend/src/services/sesiones.ts` lo escribe.
 */

/**
 * En qué está una sesión ahora mismo. El backend la calcula al consultar, porque
 * cambia sola con el paso del tiempo:
 *  · `en_linea`  alguien está usando el panel (hay un aviso de presencia reciente).
 *  · `inactiva`  sigue abierta pero nadie la usa: la persona se fue sin cerrarla.
 *  · `cerrada`   la persona pulsó «Cerrar sesión».
 *  · `expirada`  pasaron los 7 días de la sesión sin cerrarse.
 *  · `revocada`  se cambió la contraseña de la cuenta después de abrirla.
 */
export type EstadoSesion = 'en_linea' | 'inactiva' | 'cerrada' | 'expirada' | 'revocada'

export interface SesionRegistrada {
  id: string
  user_id: string
  nombre: string
  email: string
  rol: string
  inicio: string
  /** Cuándo pulsó «Cerrar sesión»; null si no lo hizo. */
  fin: string | null
  /** Último momento en que se le vio usando el panel. */
  ultima_actividad: string
  /**
   * Segundos de uso real (panel a la vista y persona haciendo algo). null en las
   * sesiones anteriores a que se midiera: no se sabe, y no se inventa.
   */
  uso_segundos: number | null
  estado: EstadoSesion
  /** Atajo de `estado === 'en_linea'`. */
  activa: boolean
  ip: string
  user_agent: string
}

export interface ResumenSesiones {
  /** Cuentas distintas con al menos una sesión. */
  usuarios: number
  sesiones: number
  /** Sesiones en uso ahora mismo. */
  en_linea: number
  /** Sesiones con tiempo de uso medido (las anteriores a la medición no lo tienen). */
  medidas: number
  /** Suma del tiempo de uso medido, en segundos. */
  segundos_totales: number
}
