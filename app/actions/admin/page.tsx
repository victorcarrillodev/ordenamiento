import type { Handle } from 'remix/ui'

import { AdminLayout } from '../../ui/admin/admin-layout.tsx'

export interface AdminPageProps {
  user: { name: string; role: string }
  stats: {
    usuarios: number
    digitales: number
    fisicas: number
    resultado: Array<{ estado: string; total: number }>
  }
  users: Array<{ id: number; email: string; name: string; role: string; created_at: string }>
  ahora: { dia: string; fecha: string; hora: string }
}

const DIAS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']
const MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
]

const COLORS: Record<string, string> = {
  Procedente: '#16a34a',
  'En proceso': '#d97706',
  'No procedente': '#dc2626',
}

/** Dona SVG server-rendered: cero JavaScript de cliente. */
function Donut(handle: Handle<{ data: Array<{ estado: string; total: number }> }>) {
  return () => {
    const { data } = handle.props
    const total = data.reduce((sum, d) => sum + d.total, 0)
    if (total === 0) {
      return <p class="empty">Sin participaciones todavía.</p>
    }
    const r = 70
    const c = 2 * Math.PI * r
    let offset = 0
    return (
      <div class="donut-wrap">
        <svg width="190" height="190" viewBox="0 0 190 190" role="img" aria-label="Resultado de participaciones">
          <g transform="rotate(-90 95 95)">
            {data.map((d) => {
              const len = (d.total / total) * c
              const el = (
                <circle
                  key={d.estado}
                  cx="95"
                  cy="95"
                  r={r}
                  fill="none"
                  stroke={COLORS[d.estado] ?? '#64748b'}
                  stroke-width="34"
                  stroke-dasharray={`${len} ${c - len}`}
                  stroke-dashoffset={-offset}
                />
              )
              offset += len
              return el
            })}
          </g>
          <text x="95" y="90" text-anchor="middle" font-size="26" font-weight="800" fill="#2b3445">
            {total}
          </text>
          <text x="95" y="110" text-anchor="middle" font-size="11" fill="#7a8699">
            Total
          </text>
        </svg>
        <div class="legend">
          {data.map((d) => (
            <span key={d.estado}>
              <span class="legend__dot" style={`background: ${COLORS[d.estado] ?? '#64748b'}`} />
              {d.estado}: <strong>{d.total}</strong>
            </span>
          ))}
        </div>
      </div>
    )
  }
}

export function AdminPage(handle: Handle<AdminPageProps>) {
  return () => {
    const { user, stats, users, ahora } = handle.props

    return (
      <AdminLayout user={user} active="general" title="Vista general">
        <h1 class="page-title">Vista general</h1>
        <p class="breadcrumb">Vista general</p>

        <div class="cards">
          <div class="card">
            <div class="card__icon blue">🕐</div>
            <div>
              <div class="card__label">
                {ahora.dia} <span>| Buenos días</span>
              </div>
              <div class="card__value">{ahora.hora}</div>
              <div class="card__label">{ahora.fecha}</div>
            </div>
          </div>
          <div class="card">
            <div class="card__icon violet">👥</div>
            <div>
              <div class="card__label">
                Usuarios <span>| Total</span>
              </div>
              <div class="card__value">{stats.usuarios}</div>
              <div class="card__action green">Gestionar</div>
            </div>
          </div>
          <div class="card">
            <div class="card__icon green">🖥️</div>
            <div>
              <div class="card__label">
                Participaciones Digitales <span>| Total</span>
              </div>
              <div class="card__value">{stats.digitales}</div>
              <div class="card__action green">Gestionar</div>
            </div>
          </div>
          <div class="card">
            <div class="card__icon amber">📋</div>
            <div>
              <div class="card__label">
                Participaciones físicas <span>| Total</span>
              </div>
              <div class="card__value">{stats.fisicas}</div>
              <div class="card__action amber">Gestionar</div>
            </div>
          </div>
        </div>

        <div class="panel">
          <h2 class="panel__title" style="text-align: center;">Resultado</h2>
          <Donut data={stats.resultado} />
        </div>

        <div class="panel">
          <div class="panel__head">
            <h2 class="panel__title" style="margin: 0;">Exportar</h2>
            <a class="btn btn--excel" href="/admin/exportar?tabla=reuniones">
              ⬇ Reuniones a Excel
            </a>
          </div>
          <p class="breadcrumb" style="margin: 0;">
            Descarga rápida de la tabla de reuniones en formato .xlsx, o usa «Exportar tablas» en el menú.
          </p>
        </div>

        <div class="panel" id="usuarios">
          <h2 class="panel__title">👥 Usuarios (crear cuenta)</h2>
          <form method="post" action="/admin/usuarios" class="form-row" style="margin-bottom: 14px;">
            <div class="form-field">
              <label for="u-name">Nombre</label>
              <input id="u-name" name="name" required />
            </div>
            <div class="form-field">
              <label for="u-email">Correo</label>
              <input id="u-email" name="email" type="email" required />
            </div>
            <div class="form-field">
              <label for="u-pass">Contraseña (mín. 8)</label>
              <input id="u-pass" name="password" type="password" required />
            </div>
            <div class="form-field">
              <label for="u-role">Rol</label>
              <select id="u-role" name="role">
                <option value="user">Usuario</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            <button type="submit" class="btn btn--dark">＋ Crear usuario</button>
          </form>
          <div class="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Nombre</th>
                  <th>Correo</th>
                  <th>Rol</th>
                  <th>Registro</th>
                </tr>
              </thead>
              <tbody>
                {users.length === 0 ? (
                  <tr>
                    <td colspan={4} class="empty">Sin usuarios</td>
                  </tr>
                ) : (
                  users.map((u) => (
                    <tr key={u.id}>
                      <td>{u.name}</td>
                      <td>{u.email}</td>
                      <td>
                        <span class={'badge ' + (u.role === 'admin' ? 'procedente' : 'en-proceso')}>
                          {u.role === 'admin' ? 'Admin' : 'Usuario'}
                        </span>
                      </td>
                      <td>{new Date(u.created_at).toLocaleDateString('es-MX')}</td>
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
