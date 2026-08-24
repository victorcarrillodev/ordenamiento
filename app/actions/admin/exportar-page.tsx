import type { Handle } from 'remix/ui'

import { AdminLayout } from '../../ui/admin/admin-layout.tsx'
import { BACKEND_URL } from '../../backend.ts'

export interface ExportarPageProps {
  user: { name: string; role: string }
}

const TABLAS = [
  { slug: 'reuniones', nombre: 'Reuniones', desc: 'Bitácora de reuniones: título, fecha y horarios.' },
  { slug: 'participaciones', nombre: 'Participaciones', desc: 'Todas las participaciones digitales y físicas con folio y estatus.' },
  { slug: 'usuarios', nombre: 'Usuarios', desc: 'Cuentas registradas con rol y fecha de creación.' },
]

export function ExportarPage(handle: Handle<ExportarPageProps>) {
  return () => {
    const { user } = handle.props

    return (
      <AdminLayout user={user} active="exportar" title="Exportar tablas">
        <h1 class="page-title">Exportar tablas</h1>
        <p class="breadcrumb">
          <a href="/admin">Vista general</a> / Exportar tablas
        </p>

        <div class="export-grid">
          {TABLAS.map((t) => (
            <div class="export-card" key={t.slug}>
              <h3>{t.nombre}</h3>
              <p>{t.desc}</p>
              {/* Descarga directa desde el backend (sin doble proxy): más rápido.
                  La cookie de sesión se comparte porque es del mismo dominio localhost. */}
              <a class="btn btn--excel" href={`${BACKEND_URL}/api/export/${t.slug}.xlsx`}>
                ⬇ Descargar .xlsx
              </a>
            </div>
          ))}
        </div>
      </AdminLayout>
    )
  }
}
