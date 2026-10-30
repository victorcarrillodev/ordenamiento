import type { Handle } from 'remix/ui'

import { adminRoutes } from '../../routes.ts'
import { AdminLayout } from './admin-layout.tsx'
import { Icon } from './icon.tsx'

export interface AccesoRestringidoProps {
  user: { name: string; role: string }
  /** Nombre de la pantalla a la que se intentó entrar. */
  title: string
  /** Quién sí puede verla; se muestra tal cual. */
  mensaje: string
}

/**
 * Pantalla para quien entra al panel pero no tiene rango para ver esta sección
 * (por ejemplo, un administrador que escribe la dirección del registro de
 * sesiones, que es solo de root). Se responde con 403 desde el controller.
 */
export function AccesoRestringido(handle: Handle<AccesoRestringidoProps>) {
  return () => {
    const { user, title, mensaje } = handle.props
    return (
      <AdminLayout user={user} active="restringido" title={title}>
        <div class="panel">
          <h2 class="panel__title">
            <Icon name="mdi:lock-outline" size={18} /> Acceso restringido
          </h2>
          <p>{mensaje}</p>
          <p>
            <a class="btn btn--white" href={adminRoutes.index.href()}>
              Volver a la vista general
            </a>
          </p>
        </div>
      </AdminLayout>
    )
  }
}
