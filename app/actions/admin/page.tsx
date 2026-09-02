import type { Handle } from 'remix/ui'

import { adminRoutes } from '../../routes.ts'
import { AdminLayout } from '../../ui/admin/admin-layout.tsx'

export interface AdminPageProps {
  user: { name: string; role: string }
  stats: {
    usuarios: number
    digitales: number
    fisicas: number
    resultado: Array<{ estado: string; total: number }>
    fuente?: Array<[string, number]>
    genero?: Array<[string, number]>
    tematica?: Array<[string, number]>
    contenido?: {
      actividades: number
      documentos: number
      indicadores: number
      poelSesiones: number
      reuniones: number
      avisos: number
    }
    participacionesPorMes?: Array<{ mes: string; total: number }>
    proximaReunion?: { id: string; titulo: string; fecha: string; hora_inicio: string; hora_fin: string } | null
    ultimosAvisos?: Array<{ id: string; titulo: string; descripcion: string; activo: boolean; fecha?: string }>
  }
  ahora: { dia: string; saludo?: string; fecha: string; hora: string }
}

const COLORS: Record<string, string> = {
  Procedente: '#16a34a',
  'En proceso': '#d97706',
  'No procedente': '#dc2626',
}

const BAR_COLORS = ['#6cb2d6', '#1f4d6e', '#a06cd5', '#e8a54f', '#4fb286', '#d67f7f', '#9aa5b1']

/** Barras verticales SVG server-side (espejo estadisticas-page.tsx). */
function Bars(handle: Handle<{ data?: Array<{ mes: string; total: number }> }>) {
  return () => {
    const data = handle.props.data ?? []
    if (data.length === 0) return <p class="empty">Sin datos</p>
    const max = Math.max(1, ...data.map((d) => d.total))
    const w = 20
    const gap = 18
    const baseH = 120
    const dark = data.length <= 1
    return (
      <svg
        width={data.length * (w + gap)}
        height={baseH + 40}
        viewBox={`0 0 ${data.length * (w + gap)} ${baseH + 40}`}
      >
        {data.map((d, i) => {
          const h = (d.total / max) * baseH
          const x = i * (w + gap) + 6
          const y = baseH - h + 10
          return (
            <g key={d.mes}>
              <rect
                x={x}
                y={y}
                width={w}
                height={h}
                rx="3"
                fill={dark ? '#2b3445' : BAR_COLORS[i % BAR_COLORS.length]}
              />
              <text x={x + w / 2} y={y - 4} text-anchor="middle" font-size="10" fill="#2b3445">
                {d.total}
              </text>
              <text
                x={x + w / 2}
                y={baseH + 24}
                text-anchor="middle"
                font-size="10"
                fill="#7a8699"
                transform={`rotate(-20 ${x + w / 2} ${baseH + 24})`}
              >
                {d.mes}
              </text>
            </g>
          )
        })}
      </svg>
    )
  }
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
        <svg
          width="190"
          height="190"
          viewBox="0 0 190 190"
          role="img"
          aria-label="Resultado de participaciones"
        >
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
    const { user, stats, ahora } = handle.props

    return (
      <AdminLayout user={user} active="general" title="Vista general">
        <h1 class="page-title">Vista general</h1>
        <p class="breadcrumb">Vista general</p>

        <div class="cards">
          <div class="card card--clock">
            <div class="card__icon blue">🕐</div>
            <div>
              <div class="card__label">
                <span id="live-clock-day">{ahora.dia}</span> <span>| </span>
                <span id="live-clock-greeting">{ahora.saludo ?? 'Buenos días'}</span>
              </div>
              <div class="card__value" id="live-clock-time">
                {ahora.hora}
              </div>
              <div class="card__label" id="live-clock-date">
                {ahora.fecha}
              </div>
            </div>
          </div>
          <a
            href={adminRoutes.usuarios.index.href()}
            class="card card--link"
            title="Gestionar Usuarios"
          >
            <div class="card__icon violet">👥</div>
            <div>
              <div class="card__label">
                Usuarios <span>| Total</span>
              </div>
              <div class="card__value">{stats.usuarios}</div>
              <div class="card__action green">Gestionar →</div>
            </div>
          </a>
          <a
            href={`${adminRoutes.participaciones.href()}?origen=digital`}
            class="card card--link"
            title="Ver Participaciones Digitales"
          >
            <div class="card__icon green">🖥️</div>
            <div>
              <div class="card__label">
                Participaciones Digitales <span>| Total</span>
              </div>
              <div class="card__value">{stats.digitales}</div>
              <div class="card__action green">Gestionar →</div>
            </div>
          </a>
          <a
            href={`${adminRoutes.participaciones.href()}?origen=fisica`}
            class="card card--link"
            title="Ver Participaciones Físicas"
          >
            <div class="card__icon amber">📋</div>
            <div>
              <div class="card__label">
                Participaciones físicas <span>| Total</span>
              </div>
              <div class="card__value">{stats.fisicas}</div>
              <div class="card__action amber">Gestionar →</div>
            </div>
          </a>
        </div>

        {/* Script de reloj en tiempo real para zona horaria de México */}
        <script
          innerHTML={`
            (function() {
              function updateClock() {
                try {
                  var formatter = new Intl.DateTimeFormat('es-MX', {
                    timeZone: 'America/Mexico_City',
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    hour: 'numeric',
                    minute: 'numeric',
                    second: 'numeric',
                    hour12: false
                  });
                  var parts = formatter.formatToParts(new Date());
                  var map = {};
                  for (var i = 0; i < parts.length; i++) {
                    map[parts[i].type] = parts[i].value;
                  }
                  var h = parseInt(map.hour, 10) || 0;
                  var m = (map.minute || '00').padStart(2, '0');
                  var ampm = h < 12 ? 'am' : 'pm';
                  var h12 = h % 12 === 0 ? 12 : h % 12;
                  var timeStr = (h12 < 10 ? '0' + h12 : h12) + ':' + m + ' ' + ampm;
                  
                  var greeting = 'Buenos días';
                  if (h >= 12 && h < 19) greeting = 'Buenas tardes';
                  else if (h >= 19 || h < 5) greeting = 'Buenas noches';

                  var day = map.weekday ? map.weekday.charAt(0).toUpperCase() + map.weekday.slice(1) : '';
                  var dateStr = map.day + ' de ' + map.month + ' de ' + map.year;

                  var elTime = document.getElementById('live-clock-time');
                  var elGreeting = document.getElementById('live-clock-greeting');
                  var elDay = document.getElementById('live-clock-day');
                  var elDate = document.getElementById('live-clock-date');

                  if (elTime) elTime.textContent = timeStr;
                  if (elGreeting) elGreeting.textContent = greeting;
                  if (elDay) elDay.textContent = day;
                  if (elDate) elDate.textContent = dateStr;
                } catch(e) {}
              }
              setInterval(updateClock, 1000);
            })();
          `}
        />

        {/* Segunda fila: 6 cards de contenido */}
        <div class="cards" style="margin-top:16px;">
          <a href={adminRoutes.actividades.index.href()} class="card card--link" title="Actividades">
            <div class="card__icon blue">📅</div>
            <div>
              <div class="card__label">Actividades <span>| Total</span></div>
              <div class="card__value">{stats.contenido?.actividades ?? 0}</div>
              <div class="card__action green">Ver →</div>
            </div>
          </a>
          <a href={adminRoutes.documentos.index.href()} class="card card--link" title="Documentos">
            <div class="card__icon violet">📄</div>
            <div>
              <div class="card__label">Documentos <span>| Total</span></div>
              <div class="card__value">{stats.contenido?.documentos ?? 0}</div>
              <div class="card__action green">Ver →</div>
            </div>
          </a>
          <a href={adminRoutes.indicadores.index.href()} class="card card--link" title="Indicadores">
            <div class="card__icon green">📊</div>
            <div>
              <div class="card__label">Indicadores <span>| Total</span></div>
              <div class="card__value">{stats.contenido?.indicadores ?? 0}</div>
              <div class="card__action green">Ver →</div>
            </div>
          </a>
          <a href={adminRoutes.poel.index.href()} class="card card--link" title="Sesiones POEL">
            <div class="card__icon amber">🗂️</div>
            <div>
              <div class="card__label">Sesiones POEL <span>| Total</span></div>
              <div class="card__value">{stats.contenido?.poelSesiones ?? 0}</div>
              <div class="card__action green">Ver →</div>
            </div>
          </a>
          <a href={adminRoutes.reuniones.index.href()} class="card card--link" title="Reuniones">
            <div class="card__icon blue">🗓️</div>
            <div>
              <div class="card__label">Reuniones <span>| Total</span></div>
              <div class="card__value">{stats.contenido?.reuniones ?? 0}</div>
              <div class="card__action green">Ver →</div>
            </div>
          </a>
          <a href={adminRoutes.avisos.index.href()} class="card card--link" title="Avisos">
            <div class="card__icon violet">🔔</div>
            <div>
              <div class="card__label">Avisos <span>| Total</span></div>
              <div class="card__value">{stats.contenido?.avisos ?? 0}</div>
              <div class="card__action green">Ver →</div>
            </div>
          </a>
        </div>

        <div class="panel">
          <h2 class="panel__title" style="text-align: center;">
            Resultado
          </h2>
          <Donut data={stats.resultado} />
        </div>

        <div class="panel">
          <h2 class="panel__title">Participaciones por mes</h2>
          <Bars data={stats.participacionesPorMes ?? []} />
        </div>

        <div class="panel">
          <h2 class="panel__title">Próxima reunión</h2>
          {(stats.proximaReunion ?? null) ? (
            <div>
              <p>
                <strong>{(stats.proximaReunion as { titulo: string }).titulo}</strong>
              </p>
              <p>
                {(() => {
                  const f = (stats.proximaReunion as { fecha: string }).fecha
                  try {
                    // Evita TZ shifts: parsea YYYY-MM-DD como UTC
                    const parts = f.split('-')
                    if (parts.length === 3) {
                      const d = new Date(Date.UTC(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2])))
                      return d.toLocaleDateString('es-MX', { timeZone: 'UTC' })
                    }
                    return new Date(f).toLocaleDateString('es-MX', { timeZone: 'UTC' })
                  } catch {
                    return f
                  }
                })()}
                {(stats.proximaReunion as { hora_inicio: string; hora_fin: string }).hora_inicio
                  ? ` · ${(stats.proximaReunion as { hora_inicio: string }).hora_inicio} - ${(stats.proximaReunion as { hora_fin: string }).hora_fin}`
                  : ''}
              </p>
            </div>
          ) : (
            <p class="empty">Sin reuniones próximas</p>
          )}
        </div>

        <div class="panel">
          <h2 class="panel__title">Últimos avisos</h2>
          {(stats.ultimosAvisos ?? []).length === 0 ? (
            <p class="empty">Sin avisos</p>
          ) : (
            <ul style="list-style:none; padding:0; margin:0;">
              {(stats.ultimosAvisos ?? []).map((a) => (
                <li key={a.id} style="display:flex; justify-content:space-between; align-items:center; padding:8px 0; border-bottom:1px solid #e2e8f0;">
                  <span>
                    <strong>{a.titulo}</strong>{' '}
                    <span class="breadcrumb" style="margin:0;">
                      {a.fecha ? new Date(a.fecha).toLocaleDateString('es-MX') : ''}
                    </span>
                  </span>
                  {a.activo ? <span class="badge procedente">Activo</span> : null}
                </li>
              ))}
            </ul>
          )}
        </div>

        <div class="panel">
          <div class="panel__head">
            <h2 class="panel__title" style="margin: 0;">
              Exportar
            </h2>
            <a class="btn btn--excel" href={`${adminRoutes.exportar.href()}?tabla=reuniones`}>
              ⬇ Reuniones a Excel
            </a>
          </div>
          <p class="breadcrumb" style="margin: 0;">
            Descarga rápida de la tabla de reuniones en formato .xlsx, o usa «Exportar tablas» en el
            menú.
          </p>
        </div>

      </AdminLayout>
    )
  }
}
