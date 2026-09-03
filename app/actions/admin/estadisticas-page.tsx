import type { Handle } from 'remix/ui'

import { adminRoutes } from '../../routes.ts'
import { AdminLayout } from '../../ui/admin/admin-layout.tsx'
import { Icon } from '../../ui/admin/icon.tsx'
import {
  Barras,
  BarrasMensuales,
  Donut,
  sumaSerie,
  type Serie,
  type SerieMensual,
} from '../../ui/admin/charts.tsx'

export interface DatosOrigen {
  total: number
  resultado: Serie
  fuente: Serie
  genero: Serie
  tematica: Serie
  porMes?: SerieMensual[]
}

/** Las tres vistas de la pantalla. `totales` es la que abre por omisión. */
export type VistaEstadisticas = 'totales' | 'digital' | 'fisica'

export interface EstadisticasPageProps {
  user: { name: string; role: string }
  totales: DatosOrigen
  digital: DatosOrigen
  fisica: DatosOrigen
  vista: VistaEstadisticas
}

const VISTAS: Array<{
  clave: VistaEstadisticas
  etiqueta: string
  icono: string
  descripcion: string
}> = [
  {
    clave: 'totales',
    etiqueta: 'Totales',
    icono: 'mdi:chart-box-outline',
    descripcion: 'Todas las participaciones recibidas, sin importar por qué vía llegaron.',
  },
  {
    clave: 'digital',
    etiqueta: 'Digitales',
    icono: 'mdi:laptop',
    descripcion: 'Participaciones enviadas por la ciudadanía desde el portal web.',
  },
  {
    clave: 'fisica',
    etiqueta: 'Físicas',
    icono: 'mdi:clipboard-text-outline',
    descripcion: 'Participaciones capturadas en ventanilla u oficialía de partes.',
  },
]

function Tarjeta(
  handle: Handle<{ titulo: string; valor: string; pie?: string; tono: string; icono: string }>,
) {
  return () => {
    const { titulo, valor, pie, tono, icono } = handle.props
    return (
      <div class="card">
        <div class={`card__icon ${tono}`}>
          <Icon name={icono} size={22} />
        </div>
        <div>
          <div class="card__label">
            {titulo} {pie ? <span>| {pie}</span> : null}
          </div>
          <div class="card__value">{valor}</div>
        </div>
      </div>
    )
  }
}

/** Cuerpo de una vista: cifras arriba y las cuatro gráficas debajo. */
function Vista(
  handle: Handle<{ datos: DatosOrigen; comparativa?: { digital: number; fisica: number } }>,
) {
  return () => {
    const { datos, comparativa } = handle.props
    const procedentes = (datos.resultado ?? []).find(([k]) => k === 'Procedente')?.[1] ?? 0
    const enProceso = (datos.resultado ?? []).find(([k]) => k === 'En proceso')?.[1] ?? 0
    const porcentaje = datos.total > 0 ? Math.round((procedentes / datos.total) * 100) : 0

    return (
      <>
        <div class="cards">
          <Tarjeta
            titulo="Participaciones"
            pie="Total del periodo"
            valor={String(datos.total)}
            tono="blue"
            icono="mdi:file-document-multiple-outline"
          />
          <Tarjeta
            titulo="Procedentes"
            pie={`${porcentaje}% del total`}
            valor={String(procedentes)}
            tono="green"
            icono="mdi:check-decagram-outline"
          />
          <Tarjeta
            titulo="En proceso"
            pie="Pendientes de dictamen"
            valor={String(enProceso)}
            tono="amber"
            icono="mdi:progress-clock"
          />
          <Tarjeta
            titulo="Ejes temáticos"
            pie="Distintos abordados"
            valor={String((datos.tematica ?? []).length)}
            tono="violet"
            icono="mdi:tag-multiple-outline"
          />
        </div>

        {comparativa ? (
          <div class="panel">
            <h2 class="panel__title">Digitales frente a físicas</h2>
            <Barras
              titulo="Participaciones por vía de ingreso"
              datos={[
                ['Digitales', comparativa.digital],
                ['Físicas', comparativa.fisica],
              ]}
            />
          </div>
        ) : null}

        <div class="grid-2">
          <div class="panel">
            <h2 class="panel__title">Resultado del dictamen</h2>
            <Donut datos={datos.resultado} etiqueta="Dictaminadas" />
          </div>
          <div class="panel">
            <h2 class="panel__title">
              Eje temático <span class="panel__hint">{sumaSerie(datos.tematica)} clasificadas</span>
            </h2>
            <Barras titulo="Participaciones por eje temático" datos={datos.tematica} />
          </div>
          <div class="panel">
            <h2 class="panel__title">
              Sector o actor <span class="panel__hint">{sumaSerie(datos.fuente)} clasificadas</span>
            </h2>
            <Barras titulo="Participaciones por sector" datos={datos.fuente} />
          </div>
          <div class="panel">
            <h2 class="panel__title">
              Género <span class="panel__hint">{sumaSerie(datos.genero)} clasificadas</span>
            </h2>
            <Barras titulo="Participaciones por género" datos={datos.genero} />
          </div>
        </div>

        <div class="panel">
          <h2 class="panel__title">Participaciones por mes</h2>
          <BarrasMensuales datos={datos.porMes} />
        </div>
      </>
    )
  }
}

export function EstadisticasPage(handle: Handle<EstadisticasPageProps>) {
  return () => {
    const { user, totales, digital, fisica, vista } = handle.props
    const activa = VISTAS.find((v) => v.clave === vista) ?? VISTAS[0]
    const datos = vista === 'digital' ? digital : vista === 'fisica' ? fisica : totales

    return (
      <AdminLayout
        user={user}
        active="estadisticas"
        title="Estadísticas"
        subtitle={activa.descripcion}
        actions={
          <a class="btn btn--excel" href={`${adminRoutes.exportar.href()}?tabla=participaciones`}>
            <Icon name="mdi:microsoft-excel" size={16} /> Exportar a Excel
          </a>
        }
      >
        {/* Las tres vistas son enlaces, no pestañas de JavaScript: cada una
            tiene su propia URL y se puede compartir o guardar en favoritos. */}
        <div class="tabs" role="tablist" aria-label="Ámbito de las estadísticas">
          {VISTAS.map((v) => (
            <a
              key={v.clave}
              role="tab"
              aria-selected={v.clave === vista ? 'true' : 'false'}
              class={'tabs__item' + (v.clave === vista ? ' active' : '')}
              href={
                v.clave === 'totales'
                  ? adminRoutes.estadisticas.href()
                  : `${adminRoutes.estadisticas.href()}?vista=${v.clave}`
              }
            >
              <Icon name={v.icono} size={16} />
              {v.etiqueta}
              <span class="tabs__count">
                {v.clave === 'totales'
                  ? totales.total
                  : v.clave === 'digital'
                    ? digital.total
                    : fisica.total}
              </span>
            </a>
          ))}
        </div>

        <Vista
          datos={datos}
          comparativa={
            vista === 'totales' ? { digital: digital.total, fisica: fisica.total } : undefined
          }
        />
      </AdminLayout>
    )
  }
}
