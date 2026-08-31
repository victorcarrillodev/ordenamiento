import type { Handle } from 'remix/ui'

import { adminRoutes } from '../../routes.ts'
import { AdminLayout } from '../../ui/admin/admin-layout.tsx'

export interface EstadisticasPageProps {
  user: { name: string; role: string }
  origen: 'digital' | 'fisica'
  stats: {
    usuarios: number
    digitales: number
    fisicas: number
    resultado: Array<{ estado: string; total: number }>
    fuente: Array<[string, number]>
    genero: Array<[string, number]>
    tematica: Array<[string, number]>
  }
}

const COLORES = ['#6cb2d6', '#1f4d6e', '#a06cd5', '#e8a54f', '#4fb286', '#d67f7f', '#9aa5b1']

function totalDe(data: Array<[string, number]> | undefined | null): number {
  return (data || []).reduce((a, [, n]) => a + n, 0)
}

/** Dona SVG server-side. */
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

/** Barras verticales SVG server-side. */
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

export function EstadisticasPage(handle: Handle<EstadisticasPageProps>) {
  return () => {
    const { user, origen, stats } = handle.props
    const total = origen === 'fisica' ? (stats?.fisicas ?? 0) : (stats?.digitales ?? 0)
    const titulo =
      origen === 'fisica' ? 'Gestión de estadísticas físicas' : 'Gestión de estadísticas digitales'

    const resultado = (stats?.resultado ?? []).map((r) => [r.estado, r.total] as [string, number])
    const fuente = stats?.fuente ?? []
    const genero = stats?.genero ?? []
    const tematica = stats?.tematica ?? []

    return (
      <AdminLayout
        user={user}
        active={origen === 'fisica' ? 'estadisticas-fisica' : 'estadisticas-digital'}
        title={titulo}
      >
        <h1 class="page-title">{titulo}</h1>
        <p class="breadcrumb">
          <a href={adminRoutes.index.href()}>Vista general</a> / {titulo}
        </p>

        <div class="charts-row">
          <div class="panel chart-panel">
            <h3 class="panel__title" style="text-align:center;">
              Resultado
            </h3>
            <p class="meta-label">Total: {total}</p>
            <Donut data={resultado} />
          </div>
          <div class="panel chart-panel">
            <h3 class="panel__title" style="text-align:center;">
              Fuente
            </h3>
            <p class="meta-label">Total: {totalDe(fuente)}</p>
            <Bars data={fuente} />
          </div>
          <div class="panel chart-panel">
            <h3 class="panel__title" style="text-align:center;">
              Género
            </h3>
            <p class="meta-label">Total: {totalDe(genero)}</p>
            <Bars data={genero} />
          </div>
        </div>

        <div class="panel">
          <h3 class="panel__title" style="text-align:center;">
            Temática
          </h3>
          <p class="meta-label">Total: {totalDe(tematica)}</p>
          <Donut data={tematica} />
        </div>
      </AdminLayout>
    )
  }
}
