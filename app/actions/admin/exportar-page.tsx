import type { Handle } from 'remix/ui'

import { adminRoutes } from '../../routes.ts'
import { AdminLayout } from '../../ui/admin/admin-layout.tsx'

export interface ExportarPageProps {
  user: { name: string; role: string }
}

const TABLAS = [
  {
    slug: 'reuniones',
    nombre: 'Reuniones',
    desc: 'Bitácora de reuniones: título, fecha y horarios.',
  },
  {
    slug: 'participaciones',
    nombre: 'Participaciones',
    desc: 'Todas las participaciones digitales y físicas con folio y estatus.',
  },
  {
    slug: 'usuarios',
    nombre: 'Usuarios',
    desc: 'Cuentas registradas con rol y fecha de creación.',
  },
]

export function ExportarPage(handle: Handle<ExportarPageProps>) {
  return () => {
    const { user } = handle.props

    return (
      <AdminLayout user={user} active="exportar" title="Exportar tablas">
        <div class="export-grid">
          {TABLAS.map((t) => (
            <div class="export-card" key={t.slug}>
              <h3>{t.nombre}</h3>
              <p>{t.desc}</p>
              <a class="btn btn--excel" href={`${adminRoutes.exportar.href()}?tabla=${t.slug}`}>
                ⬇ Descargar .xlsx
              </a>
            </div>
          ))}
        </div>
      </AdminLayout>
    )
  }
}
