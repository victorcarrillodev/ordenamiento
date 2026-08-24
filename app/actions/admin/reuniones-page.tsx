import type { Handle } from 'remix/ui'

import { adminRoutes } from '../../routes.ts'
import { AdminLayout } from '../../ui/admin/admin-layout.tsx'

export interface ReunionesPageProps {
  user: { name: string; role: string }
  reuniones: Array<{
    id: number
    titulo: string
    fecha: string
    hora_inicio: string | null
    hora_fin: string | null
    created_at: string
  }>
  error?: string
  ok?: string
}

function fechaLarga(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number)
  const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']
  return `${String(d).padStart(2, '0')}/${MESES[(m ?? 1) - 1]}/${y}`
}

export function ReunionesPage(handle: Handle<ReunionesPageProps>) {
  return () => {
    const { user, reuniones, error, ok } = handle.props

    return (
      <AdminLayout user={user} active="reuniones" title="Gestión de Reuniones">
        <h1 class="page-title">Gestión de Reuniones</h1>
        <p class="breadcrumb">
          <a href={adminRoutes.index.href()}>Vista general</a> / Gestión de reuniones
        </p>

        {error ? <p class="form-error">{error}</p> : null}
        {ok ? <p class="form-ok">{ok}</p> : null}

        <div class="panel">
          <h2 class="panel__title">Nueva reunión</h2>
          <form method="post" class="form-row">
            <div class="form-field">
              <label for="titulo">Título</label>
              <input id="titulo" name="titulo" required placeholder="Sesión POEL…" />
            </div>
            <div class="form-field">
              <label for="fecha">Fecha</label>
              <input id="fecha" name="fecha" type="date" required />
            </div>
            <div class="form-field">
              <label for="hora_inicio">Hora de inicio</label>
              <input id="hora_inicio" name="hora_inicio" type="time" />
            </div>
            <div class="form-field">
              <label for="hora_fin">Hora de conclusión</label>
              <input id="hora_fin" name="hora_fin" type="time" />
            </div>
            <button type="submit" class="btn btn--dark">
              ＋ Agendar
            </button>
          </form>
        </div>

        <div class="panel">
          <div class="panel__head">
            <h2 class="panel__title" style="margin: 0;">Reuniones registradas</h2>
            <a class="btn btn--excel" href={`${adminRoutes.exportar.href()}?tabla=reuniones`}>
              ⬇ Exportar a Excel
            </a>
          </div>
          <div class="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Título</th>
                  <th>Fecha</th>
                  <th>Hora de inicio</th>
                  <th>Hora de conclusión</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {reuniones.length === 0 ? (
                  <tr>
                    <td colspan={5} class="empty">
                      No hay reuniones registradas
                    </td>
                  </tr>
                ) : (
                  reuniones.map((r) => (
                    <tr key={r.id}>
                      <td>{r.titulo}</td>
                      <td>{fechaLarga(r.fecha)}</td>
                      <td>{r.hora_inicio || '—'}</td>
                      <td>{r.hora_fin || '—'}</td>
                      <td>
                        <form method="post" style="margin: 0;">
                          <input type="hidden" name="intent" value="eliminar" />
                          <input type="hidden" name="id" value={String(r.id)} />
                          <button type="submit" class="btn btn--red">
                            🗑
                          </button>
                        </form>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </AdminLayout>
    )
  }
}
