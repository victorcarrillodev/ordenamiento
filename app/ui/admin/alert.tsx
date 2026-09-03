/**
 * Acuse de una acción del panel.
 *
 * Existía tres veces con tres aspectos distintos: `<p class="form-error">`,
 * `<p class="form-ok">` y divs con estilo suelto. El mismo mensaje se veía
 * diferente según la pantalla, que es la forma más barata de que un panel
 * parezca hecho por tres personas que no se hablan.
 */
import type { Handle, RemixNode } from 'remix/ui'

import { Icon } from './icon.tsx'

export type AdminAlertType = 'success' | 'error' | 'warning' | 'info'

export interface AdminAlertProps {
  type: AdminAlertType
  children?: RemixNode
  /** Texto plano, alternativa a `children` cuando no hace falta marcado. */
  message?: string
}

const ICONO: Record<AdminAlertType, string> = {
  success: 'mdi:check-circle-outline',
  error: 'mdi:alert-circle-outline',
  warning: 'mdi:alert-outline',
  info: 'mdi:information-outline',
}

/**
 * `alert` interrumpe al lector de pantalla y `status` no. Un error merece la
 * interrupción; un «guardado correctamente» no tiene por qué cortar lo que la
 * persona esté escuchando.
 */
const ROL: Record<AdminAlertType, 'alert' | 'status'> = {
  success: 'status',
  error: 'alert',
  warning: 'alert',
  info: 'status',
}

export function AdminAlert(handle: Handle<AdminAlertProps>) {
  return () => {
    const { type, children, message } = handle.props
    return (
      <div class={`admin-alert admin-alert--${type}`} role={ROL[type]}>
        <Icon name={ICONO[type]} size={18} />
        <span>{children ?? message}</span>
      </div>
    )
  }
}
