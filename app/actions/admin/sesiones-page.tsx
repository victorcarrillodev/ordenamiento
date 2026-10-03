import type { Handle } from 'remix/ui'

import { adminRoutes } from '../../routes.ts'
import { AdminAlert } from '../../ui/admin/alert.tsx'
import { AdminLayout } from '../../ui/admin/admin-layout.tsx'
import { Icon } from '../../ui/admin/icon.tsx'
import { formatearDiaFechaHora, formatearDuracion } from '../../ui/admin/formato.ts'
import { FinDeSesion, TiempoDeUso } from './sesiones-celdas.tsx'
import type { ResumenSesiones, SesionRegistrada } from './sesiones-tipos.ts'

export type { EstadoSesion, ResumenSesiones, SesionRegistrada } from './sesiones-tipos.ts'

export interface SesionesPageProps {
  user: { name: string; role: string }
  items: SesionRegistrada[]
  resumen: ResumenSesiones
  total: number
  page: number
  limit: number
  /** Cuenta por la que se está filtrando, si hay filtro activo. */
  usuarioFiltrado?: { id: string; nombre: string }
}

/**
 * Nombre corto del navegador y el sistema, a partir del user-agent. No
 * pretende ser exhaustivo: en la bitácora sirve para reconocer «entré desde
 * otro equipo», no para hacer analítica.
 */
function dispositivo(userAgent: string): string {
  if (!userAgent) return 'Desconocido'
  const navegador = /Edg\//.test(userAgent)
    ? 'Edge'
    : /OPR\/|Opera/.test(userAgent)
      ? 'Opera'
      : /Chrome\//.test(userAgent)
        ? 'Chrome'
        : /Safari\//.test(userAgent)
          ? 'Safari'
          : /Firefox\//.test(userAgent)
            ? 'Firefox'
            : 'Navegador'
  const sistema = /Android/.test(userAgent)
    ? 'Android'
    : /iPhone|iPad|iPod/.test(userAgent)
      ? 'iOS'
      : /Windows/.test(userAgent)
        ? 'Windows'
        : /Mac OS X|Macintosh/.test(userAgent)
          ? 'macOS'
          : /Linux/.test(userAgent)
            ? 'Linux'
            : ''
  return sistema ? `${navegador} · ${sistema}` : navegador
}

function Paginacion(handle: Handle<{ page: number; limit: number; total: number; base: string }>) {
  return () => {
    const { page, limit, total, base } = handle.props
    const paginas = Math.max(1, Math.ceil(total / limit))
    if (paginas <= 1) return null
    const unir = (p: number) => `${base}${base.includes('?') ? '&' : '?'}page=${p}&limit=${limit}`
    return (
      <div class="pager">
        {page > 1 ? (
          <a class="btn btn--white btn--sm" href={unir(page - 1)}>
            ← Anterior
          </a>
        ) : (
          <span class="btn btn--white btn--sm is-disabled" aria-disabled="true">
            ← Anterior
          </span>
        )}
        <span class="pager__info">
          Página {page} de {paginas}
        </span>
        {page < paginas ? (
          <a class="btn btn--white btn--sm" href={unir(page + 1)}>
            Siguiente →
          </a>
        ) : (
          <span class="btn btn--white btn--sm is-disabled" aria-disabled="true">
            Siguiente →
          </span>
        )}
      </div>
    )
  }
}

export function SesionesPage(handle: Handle<SesionesPageProps>) {
  return () => {
    const { user, items, resumen, total, page, limit, usuarioFiltrado } = handle.props
    const base = usuarioFiltrado
      ? `${adminRoutes.sesiones.href()}?user_id=${encodeURIComponent(usuarioFiltrado.id)}`
      : adminRoutes.sesiones.href()
    // El promedio es sobre las sesiones que se midieron: las anteriores a la medición
    // no tienen tiempo, y contarlas como 0 lo bajaría sin que sea verdad.
    const promedio =
      resumen.medidas > 0 ? Math.round(resumen.segundos_totales / resumen.medidas) : 0
    const sinMedir = resumen.sesiones - resumen.medidas

    return (
      <AdminLayout
        user={user}
        active="sesiones"
        title="Registro de sesiones"
        subtitle="Quién entró al panel, cuándo y cuánto tiempo lo usó de verdad."
        actions={
          <a class="btn btn--white" href={adminRoutes.usuarios.index.href()}>
            <Icon name="mdi:account-group-outline" size={16} /> Gestionar usuarios
          </a>
        }
      >
        <AdminAlert type="info">
          Esta bitácora registra accesos de personas identificadas. Solo la consultan las cuentas
          con rol administrador, y se usa para control de acceso, no para supervisar productividad.
        </AdminAlert>
        <AdminAlert type="info">
          El tiempo de uso cuenta solo mientras la persona tiene el panel a la vista y está haciendo
          algo (un clic, una tecla, desplazarse o mover el ratón). No cuenta la pestaña oculta ni
          las pausas de más de 2 minutos. Una sesión que nadie cerró no se da por activa: queda como
          «Sin cerrar», desde su último movimiento.
        </AdminAlert>

        <div class="cards">
          <div class="card">
            <div class="card__icon violet">
              <Icon name="mdi:account-clock-outline" size={22} />
            </div>
            <div>
              <div class="card__label">
                Sesiones <span>| Registradas</span>
              </div>
              <div class="card__value">{resumen.sesiones}</div>
            </div>
          </div>
          <div class="card">
            <div class="card__icon green">
              <Icon name="mdi:access-point" size={22} />
            </div>
            <div>
              <div class="card__label">
                En línea <span>| Ahora mismo</span>
              </div>
              <div class="card__value">{resumen.en_linea}</div>
            </div>
          </div>
          <div class="card">
            <div class="card__icon blue">
              <Icon name="mdi:account-group-outline" size={22} />
            </div>
            <div>
              <div class="card__label">
                Cuentas <span>| Con actividad</span>
              </div>
              <div class="card__value">{resumen.usuarios}</div>
            </div>
          </div>
          <div class="card">
            <div class="card__icon amber">
              <Icon name="mdi:timer-outline" size={22} />
            </div>
            <div>
              <div class="card__label">
                Tiempo de uso <span>| Promedio {formatearDuracion(promedio)} por sesión</span>
              </div>
              <div class="card__value">{formatearDuracion(resumen.segundos_totales)}</div>
            </div>
          </div>
        </div>

        <div class="panel">
          <div class="panel__head">
            <h2 class="panel__title">
              {usuarioFiltrado ? `Sesiones de ${usuarioFiltrado.nombre}` : 'Todas las sesiones'}
            </h2>
            <div class="panel__tools">
              {usuarioFiltrado ? (
                <a class="btn btn--white btn--sm" href={adminRoutes.sesiones.href()}>
                  ✕ Quitar filtro
                </a>
              ) : null}
              <input
                type="search"
                class="admin-search"
                id="sesiones-search"
                placeholder="Buscar por persona, correo o equipo…"
                aria-label="Buscar en el registro de sesiones"
                data-filter-rows="sesiones-tbody"
                data-filter-empty="sesiones-vacio"
                data-filter-count="sesiones-count"
                data-filter-noun="sesión|sesiones"
              />
              <span class="panel__count" id="sesiones-count">
                {total} sesiones
              </span>
            </div>
          </div>

          <div class="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Persona</th>
                  <th>Inicio</th>
                  <th>Fin o último movimiento</th>
                  <th title="Tiempo con el panel a la vista y en uso. No cuenta la pestaña oculta ni las pausas de más de 2 minutos.">
                    Tiempo de uso
                  </th>
                  <th>Equipo</th>
                </tr>
              </thead>
              <tbody id="sesiones-tbody">
                <tr id="sesiones-vacio" style={items.length === 0 ? '' : 'display: none;'}>
                  <td colspan={5} class="empty">
                    {items.length === 0
                      ? 'Todavía no hay sesiones registradas. Aparecerán conforme las cuentas inicien sesión.'
                      : 'Ninguna sesión coincide con la búsqueda.'}
                  </td>
                </tr>
                {items.map((s) => (
                  <tr
                    key={s.id}
                    data-search={`${s.nombre} ${s.email} ${dispositivo(s.user_agent)} ${s.ip}`}
                  >
                    <td>
                      <a
                        class="user-cell"
                        href={`${adminRoutes.sesiones.href()}?user_id=${encodeURIComponent(s.user_id)}`}
                        title={`Ver solo las sesiones de ${s.nombre}`}
                      >
                        <span class="user-avatar" aria-hidden="true">
                          {(s.nombre || '?').trim().charAt(0).toUpperCase()}
                        </span>
                        <span>
                          <span class="user-cell__name">{s.nombre}</span>
                          <span class="user-cell__meta">{s.email}</span>
                        </span>
                      </a>
                    </td>
                    <td>{formatearDiaFechaHora(s.inicio)}</td>
                    <td>
                      <FinDeSesion sesion={s} />
                    </td>
                    <td>
                      <TiempoDeUso segundos={s.uso_segundos} />
                    </td>
                    <td>
                      <span class="user-cell__name">{dispositivo(s.user_agent)}</span>
                      {s.ip ? <span class="user-cell__meta">{s.ip}</span> : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {sinMedir > 0 ? (
            <p class="form-hint">
              {sinMedir === 1
                ? '1 sesión es anterior a la medición del uso real: se muestra «Sin medir» y no suma al tiempo total.'
                : `${sinMedir} sesiones son anteriores a la medición del uso real: se muestran «Sin medir» y no suman al tiempo total.`}
            </p>
          ) : null}

          <Paginacion page={page} limit={limit} total={total} base={base} />
        </div>
      </AdminLayout>
    )
  }
}
