import type { Handle } from 'remix/ui'

import { AdminLayout } from '../../ui/admin/admin-layout.tsx'

export interface CuentaPageProps {
  user: { name: string; role: string }
}

export function CuentaPage(handle: Handle<CuentaPageProps>) {
  return () => {
    const { user } = handle.props

    return (
      <AdminLayout user={user} active="cuenta" title="Mi cuenta">
        <h1 class="page-title">Mi cuenta</h1>
        <p class="breadcrumb">
          <a href="/admin">Vista general</a> / Mi cuenta
        </p>

        <div class="panel">
          <h2 class="panel__title">Datos de la sesión</h2>
          <p>Nombre: <strong>{user.name}</strong></p>
          <p>Rol: <strong>{user.role === 'admin' ? 'Administrador' : 'Usuario'}</strong></p>
          <p>Eres la cuenta Root del sistema. Puedes crear cuentas y gestionar la bitácora desde «Vista general».</p>
        </div>
      </AdminLayout>
    )
  }
}
