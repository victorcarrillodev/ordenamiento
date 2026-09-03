/**
 * Gráficas SVG renderizadas en el servidor.
 *
 * Vivían duplicadas en la vista general y en estadísticas, con paletas y
 * tamaños ligeramente distintos: el mismo dato se veía de dos colores según
 * la pantalla. Aquí hay una sola versión y una sola paleta.
 */
import type { Handle } from 'remix/ui'

/** Paleta categórica del panel. Ordenada para que dos series contiguas contrasten. */
export const PALETA = [
  '#3b82f6',
  '#f59e0b',
  '#8b5cf6',
  '#10b981',
  '#ec4899',
  '#06b6d4',
  '#ef4444',
  '#84cc16',
  '#6366f1',
]

/** Colores fijos por estado: el significado no debe cambiar entre pantallas. */
export const COLOR_ESTADO: Record<string, string> = {
  Procedente: '#16a34a',
  'En proceso': '#d97706',
  'No procedente': '#dc2626',
}

export type Serie = Array<[string, number]>

export function sumaSerie(datos: Serie | undefined | null): number {
  return (datos ?? []).reduce((acc, [, n]) => acc + n, 0)
}

function colorDe(clave: string, indice: number): string {
  return COLOR_ESTADO[clave] ?? PALETA[indice % PALETA.length]
}

export interface DonutProps {
  datos?: Serie
  /** Lado del SVG en píxeles. */
  tamano?: number
  /** Texto bajo el número central. */
  etiqueta?: string
}

/** Dona con leyenda y porcentajes. Sin JavaScript de cliente. */
export function Donut(handle: Handle<DonutProps>) {
  return () => {
    const datos = handle.props.datos ?? []
    const tamano = handle.props.tamano ?? 180
    const etiqueta = handle.props.etiqueta ?? 'Total'
    const total = sumaSerie(datos)
    if (total === 0) return <p class="empty">Sin datos todavía</p>

    const centro = tamano / 2
    const grosor = Math.round(tamano * 0.19)
    const radio = centro - grosor / 2 - 2
    const circunferencia = 2 * Math.PI * radio
    let recorrido = 0

    return (
      <div class="chart">
        <svg
          class="chart__svg"
          width={tamano}
          height={tamano}
          viewBox={`0 0 ${tamano} ${tamano}`}
          role="img"
          aria-label={`${etiqueta}: ${total}`}
        >
          <g transform={`rotate(-90 ${centro} ${centro})`}>
            {datos.map(([clave, n], i) => {
              const largo = (n / total) * circunferencia
              const arco = (
                <circle
                  key={clave}
                  cx={centro}
                  cy={centro}
                  r={radio}
                  fill="none"
                  stroke={colorDe(clave, i)}
                  stroke-width={grosor}
                  stroke-dasharray={`${largo} ${circunferencia - largo}`}
                  stroke-dashoffset={-recorrido}
                >
                  <title>{`${clave}: ${n}`}</title>
                </circle>
              )
              recorrido += largo
              return arco
            })}
          </g>
          <text
            x={centro}
            y={centro - 2}
            text-anchor="middle"
            font-size={Math.round(tamano * 0.16)}
            font-weight="800"
            fill="#1e293b"
          >
            {total}
          </text>
          <text
            x={centro}
            y={centro + Math.round(tamano * 0.11)}
            text-anchor="middle"
            font-size={Math.round(tamano * 0.065)}
            fill="#7a8699"
          >
            {etiqueta}
          </text>
        </svg>
        <ul class="chart__legend">
          {datos.map(([clave, n], i) => (
            <li key={clave}>
              <span class="chart__dot" style={`background: ${colorDe(clave, i)}`} />
              <span class="chart__legend-key">{clave}</span>
              <strong>{n}</strong>
              <span class="chart__legend-pct">{Math.round((n / total) * 100)}%</span>
            </li>
          ))}
        </ul>
      </div>
    )
  }
}

export interface BarrasProps {
  datos?: Serie
  /** Etiqueta accesible de la gráfica. */
  titulo?: string
}

/**
 * Barras horizontales. Se prefieren a las verticales porque las categorías
 * de este panel («Organización de la sociedad civil», «Sector académico») son
 * frases largas: en vertical había que rotarlas y quedaban ilegibles.
 */
export function Barras(handle: Handle<BarrasProps>) {
  return () => {
    const datos = handle.props.datos ?? []
    if (datos.length === 0) return <p class="empty">Sin datos todavía</p>
    const max = Math.max(1, ...datos.map(([, n]) => n))
    const total = sumaSerie(datos)

    return (
      <ul class="barras" aria-label={handle.props.titulo}>
        {datos.map(([clave, n], i) => (
          <li class="barras__fila" key={clave}>
            <span class="barras__etiqueta" title={clave}>
              {clave}
            </span>
            <span class="barras__pista">
              <span
                class="barras__valor"
                style={`width: ${Math.max(2, (n / max) * 100)}%; background: ${colorDe(clave, i)}`}
              />
            </span>
            <span class="barras__numero">
              {n}
              <span class="barras__pct">
                {total > 0 ? `${Math.round((n / total) * 100)}%` : ''}
              </span>
            </span>
          </li>
        ))}
      </ul>
    )
  }
}

export interface SerieMensual {
  mes: string
  total: number
}

const MESES_CORTOS = [
  'ene',
  'feb',
  'mar',
  'abr',
  'may',
  'jun',
  'jul',
  'ago',
  'sep',
  'oct',
  'nov',
  'dic',
]

/** «2026-03» → «mar 26». El backend devuelve la clave, no el rótulo. */
function rotuloMes(clave: string): string {
  const partes = clave.split('-')
  if (partes.length !== 2) return clave
  const mes = Number(partes[1])
  if (!Number.isInteger(mes) || mes < 1 || mes > 12) return clave
  return `${MESES_CORTOS[mes - 1]} ${partes[0].slice(2)}`
}

/** Columnas por mes, con la altura proporcional al máximo del periodo. */
export function BarrasMensuales(handle: Handle<{ datos?: SerieMensual[] }>) {
  return () => {
    const datos = handle.props.datos ?? []
    if (datos.length === 0) return <p class="empty">Sin datos todavía</p>
    const max = Math.max(1, ...datos.map((d) => d.total))

    return (
      <ul class="columnas" aria-label="Participaciones por mes">
        {datos.map((d) => (
          <li class="columnas__item" key={d.mes} title={`${rotuloMes(d.mes)}: ${d.total}`}>
            <span class="columnas__numero">{d.total}</span>
            <span class="columnas__pista">
              <span
                class="columnas__valor"
                style={`height: ${Math.max(3, (d.total / max) * 100)}%`}
              />
            </span>
            <span class="columnas__mes">{rotuloMes(d.mes)}</span>
          </li>
        ))}
      </ul>
    )
  }
}
