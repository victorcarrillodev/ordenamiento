import type { Handle } from 'remix/ui'

import { adminRoutes } from '../../routes.ts'
import { AdminLayout } from '../../ui/admin/admin-layout.tsx'

export interface DatosOrigen {
  total: number
  resultado: Array<[string, number]>
  fuente: Array<[string, number]>
  genero: Array<[string, number]>
  tematica: Array<[string, number]>
}

export interface EstadisticasPageProps {
  user: { name: string; role: string }
  digital: DatosOrigen
  fisica: DatosOrigen
}

const COLORES = ['#6cb2d6', '#1f4d6e', '#a06cd5', '#e8a54f', '#4fb286', '#d67f7f', '#9aa5b1']

function totalDe(data: Array<[string, number]> | undefined | null): number {
  return (data || []).reduce((a, [, n]) => a + n, 0)
}

function Donut(handle: Handle<{ data?: Array<[string, number]> }>) {
  return () => {
    const data = handle.props.data || []
    const total = totalDe(data)
    if (total === 0) return <p class="empty">Sin datos</p>
    const r = 60
    const c = 2 * Math.PI * r
    let offset = 0
    return (
      <div class="donut-wrap">
        <svg width="160" height="160" viewBox="0 0 160 160">
          <g transform="rotate(-90 80 80)">
            {data.map(([k, n], i) => {
              const len = (n / total) * c
              const el = (
                <circle
                  key={k}
                  cx="80"
                  cy="80"
                  r={r}
                  fill="none"
                  stroke={COLORES[i % COLORES.length]}
                  stroke-width="28"
                  stroke-dasharray={`${len} ${c - len}`}
                  stroke-dashoffset={-offset}
                />
              )
              offset += len
              return el
            })}
          </g>
          <text x="80" y="76" text-anchor="middle" font-size="22" font-weight="800" fill="#2b3445">
            {total}
          </text>
          <text x="80" y="94" text-anchor="middle" font-size="10" fill="#7a8699">
            Total
          </text>
        </svg>
        <div class="legend">
          {data.map(([k, n], i) => (
            <span key={k}>
              <span class="legend__dot" style={`background: ${COLORES[i % COLORES.length]}`} />
              {k}: <strong>{n}</strong>
            </span>
          ))}
        </div>
      </div>
    )
  }
}

function Bars(handle: Handle<{ data?: Array<[string, number]> }>) {
  return () => {
    const data = handle.props.data || []
    if (data.length === 0) return <p class="empty">Sin datos</p>
    const max = Math.max(1, ...data.map(([, n]) => n))
    const w = 20,
      gap = 18,
      baseH = 120,
      dark = data.length <= 1
    return (
      <svg
        width={data.length * (w + gap)}
        height={baseH + 40}
        viewBox={`0 0 ${data.length * (w + gap)} ${baseH + 40}`}
      >
        {data.map(([k, n], i) => {
          const h = (n / max) * baseH
          const x = i * (w + gap) + 6
          const y = baseH - h + 10
          return (
            <g key={k}>
              <rect
                x={x}
                y={y}
                width={w}
                height={h}
                rx="3"
                fill={dark ? '#2b3445' : COLORES[i % COLORES.length]}
              />
              <text x={x + w / 2} y={y - 4} text-anchor="middle" font-size="10" fill="#2b3445">
                {n}
              </text>
              <text
                x={x + w / 2}
                y={baseH + 24}
                text-anchor="middle"
                font-size="10"
                fill="#7a8699"
                transform={`rotate(-20 ${x + w / 2} ${baseH + 24})`}
              >
                {k}
              </text>
            </g>
          )
        })}
      </svg>
    )
  }
}

function Seccion(handle: Handle<{ titulo: string; icono: string; accent: string; datos: DatosOrigen }>) {
  return () => {
    const { titulo, icono, accent, datos } = handle.props
    return (
      <section class="stats-section">
        <div class={`panel stats-section__head stats-section__head--${accent}`}>
          <div class="stats-section__title">
            <span class={`card__icon ${accent === 'blue' ? 'blue' : 'amber'}`}>{icono}</span>
            <h2 style="margin:0; font-size:16px; font-weight:800;">{titulo}</h2>
          </div>
          <span class="conteo">{datos.total}</span>
        </div>

        <div class="charts-row">
          <div class="panel chart-panel">
            <h3 class="panel__title" style="text-align:center;">
              Resultado
            </h3>
            <p class="meta-label">Total: {totalDe(datos.resultado)}</p>
            <Donut data={datos.resultado} />
          </div>
          <div class="panel chart-panel">
            <h3 class="panel__title" style="text-align:center;">
              Fuente
            </h3>
            <p class="meta-label">Total: {totalDe(datos.fuente)}</p>
            <Bars data={datos.fuente} />
          </div>
          <div class="panel chart-panel">
            <h3 class="panel__title" style="text-align:center;">
              Género
            </h3>
            <p class="meta-label">Total: {totalDe(datos.genero)}</p>
            <Bars data={datos.genero} />
          </div>
        </div>

        <div class="panel">
          <h3 class="panel__title" style="text-align:center;">
            Temática
          </h3>
          <p class="meta-label">Total: {totalDe(datos.tematica)}</p>
          <Donut data={datos.tematica} />
        </div>
      </section>
    )
  }
}

export function EstadisticasPage(handle: Handle<EstadisticasPageProps>) {
  return () => {
    const { user, digital, fisica } = handle.props
    return (
      <AdminLayout user={user} active="estadisticas" title="Estadísticas">
        <h1 class="page-title">Estadísticas</h1>
        <p class="breadcrumb">
          <a href={adminRoutes.index.href()}>Vista general</a> / Estadísticas
        </p>

        <Seccion titulo="Estadísticas Digitales" icono="🖥️" accent="blue" datos={digital} />
        <Seccion titulo="Estadísticas Físicas" icono="📋" accent="amber" datos={fisica} />
      </AdminLayout>
    )
  }
}
