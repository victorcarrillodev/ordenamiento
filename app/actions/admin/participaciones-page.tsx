import type { Handle } from 'remix/ui'

import { adminRoutes } from '../../routes.ts'
import { AdminLayout } from '../../ui/admin/admin-layout.tsx'

interface Adjunto {
  id: number
  nombre_original: string
  mime: string
  size: number
}

interface ParticipationRow {
  id: number
  folio: string
  origen: string
  nombre: string
  estado: string
  fecha: string
  adjuntos: Adjunto[]
}

export interface ParticipacionesPageProps {
  user: { name: string; role: string }
  origen: 'digital' | 'fisica'
  items: ParticipationRow[]
}

const ESTADO_BADGE: Record<string, string> = {
  Procedente: 'procedente',
  'En proceso': 'en-proceso',
  'No procedente': 'no-procedente',
}

function fmtFecha(v: unknown): string {
  const s = String(v ?? '')
  const d = new Date(s.replace(' ', 'T'))
  return isNaN(d.getTime()) ? s : d.toLocaleDateString('es-MX')
}

function fmtSize(bytes: number): string {
  if (!bytes) return '—'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function ParticipacionesPage(handle: Handle<ParticipacionesPageProps>) {
  return () => {
    const { user, origen, items } = handle.props
    const titulo =
      origen === 'fisica'
        ? 'Gestión de participaciones físicas'
        : 'Gestión de participaciones digitales'

    return (
      <AdminLayout user={user} active="participaciones" title={titulo}>
        <h1 class="page-title">{titulo}</h1>
        <p class="breadcrumb">
          <a href={adminRoutes.index.href()}>Vista general</a> / {titulo}
        </p>

        <div class="panel">
          {origen === 'fisica' ? (
            <div class="panel__head">
              <a
                class="btn btn--green"
                href={`${adminRoutes.participacionNueva.index.href()}?origen=fisica`}
              >
                ＋ Ingresa aquí tu participación
              </a>
            </div>
          ) : null}
          <div class="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Folio</th>
                  <th>Nombre</th>
                  <th>Estatus</th>
                  <th>Registro</th>
                  <th>Adjuntos</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {items.length === 0 ? (
                  <tr>
                    <td colspan={6} class="empty">
                      No hay registros
                    </td>
                  </tr>
                ) : (
                  items.map((p) => (
                    <tr key={p.id}>
                      <td>{p.folio}</td>
                      <td>{p.nombre}</td>
                      <td>
                        <span class={'badge ' + (ESTADO_BADGE[p.estado] ?? 'en-proceso')}>
                          {p.estado}
                        </span>
                      </td>
                      <td>{fmtFecha(p.fecha)}</td>
                      <td>
                        {p.adjuntos.length === 0 ? (
                          <span class="breadcrumb">sin PDF</span>
                        ) : (
                          p.adjuntos.map((a) => (
                            <span key={a.id}>
                              {a.nombre_original} ({fmtSize(a.size)})
                            </span>
                          ))
                        )}
                      </td>
                      <td>
                        <div style="display: flex; gap: 6px;">
                          <a
                            class="btn btn--green"
                            href={adminRoutes.participacionDetalle.href({ id: p.id })}
                            title="Ver detalle"
                          >
                            👁 Ver
                          </a>
                          {p.adjuntos.length > 0 ? (
                            <a
                              class="btn btn--excel"
                              href={adminRoutes.word.href({ id: p.id })}
                              title="Descargar datos (.docx)"
                            >
                              ⬇
                            </a>
                          ) : null}
                        </div>
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
