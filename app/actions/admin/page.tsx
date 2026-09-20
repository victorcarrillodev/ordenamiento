import type { Handle } from 'remix/ui'

import { adminRoutes } from '../../routes.ts'
import { AdminLayout } from '../../ui/admin/admin-layout.tsx'
import { Icon } from '../../ui/admin/icon.tsx'
import { BarrasMensuales, Donut, type SerieMensual } from '../../ui/admin/charts.tsx'
import { formatearFecha } from '../../ui/admin/formato.ts'

/** Cifras de «Actividades y avances del Programa» para la vista general. */
export interface ContenidoPortal {
  actividades: number
  proximas: number
  realizadas: number
  borradores: number
  avisosVigentes: number
  indicadores: number
}

export interface ProximaActividad {
  id: string
  titulo: string
  fecha: string
  hora_inicio: string
  hora_fin: string
  lugar: string
}

/** Avisos publicados en vigencia o por empezar. */
export interface AvisoResumen {
  actividad_id: string
  titulo: string
  inicio: string
  fin: string
  estado: 'vigente' | 'programado'
}

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
    contenido?: ContenidoPortal
    participacionesPorMes?: SerieMensual[]
    proximaActividad?: ProximaActividad | null
    avisos?: AvisoResumen[]
  }
  ahora: { dia: string; saludo?: string; fecha: string; hora: string }
}

interface AtajoContenido {
  href: string
  etiqueta: string
  icono: string
  total: number
}

/** Tarjeta grande de cifra, con enlace a la sección que la explica. */
function Kpi(
  handle: Handle<{
    href: string
    titulo: string
    pie: string
    valor: number
    tono: string
    icono: string
  }>,
) {
  return () => {
    const { href, titulo, pie, valor, tono, icono } = handle.props
    return (
      <a class="card card--link" href={href} title={`Ir a ${titulo}`}>
        <div class={`card__icon ${tono}`}>
          <Icon name={icono} size={22} />
        </div>
        <div>
          <div class="card__label">
            {titulo} <span>| {pie}</span>
          </div>
          <div class="card__value">{valor}</div>
          <div class="card__action green">Gestionar →</div>
        </div>
      </a>
    )
  }
}

/** Fecha de una actividad sin desplazamiento de zona: `YYYY-MM-DD` es un día, no un instante. */
function fechaActividad(valor: string): string {
  const partes = valor.split('-')
  if (partes.length === 3) {
    const d = new Date(Date.UTC(Number(partes[0]), Number(partes[1]) - 1, Number(partes[2])))
    return d.toLocaleDateString('es-MX', {
      timeZone: 'UTC',
      weekday: 'long',
      day: '2-digit',
      month: 'long',
    })
  }
  return formatearFecha(valor)
}

export function AdminPage(handle: Handle<AdminPageProps>) {
  return () => {
    const { user, stats, ahora } = handle.props
    const contenido = stats.contenido
    const totalParticipaciones = stats.digitales + stats.fisicas
    const resultado = (stats.resultado ?? []).map((r) => [r.estado, r.total] as [string, number])
    const avisos = stats.avisos ?? []
    const proxima = stats.proximaActividad
    const lista = adminRoutes.actividades.index.href()

    const atajos: AtajoContenido[] = [
      {
        href: lista,
        etiqueta: 'Actividades',
        icono: 'mdi:calendar-check-outline',
        total: contenido?.actividades ?? 0,
      },
      {
        href: `${lista}?estado=programada`,
        etiqueta: 'Próximas',
        icono: 'mdi:calendar-clock-outline',
        total: contenido?.proximas ?? 0,
      },
      {
        href: `${lista}?estado=realizada`,
        etiqueta: 'Avances',
        icono: 'mdi:chart-timeline-variant',
        total: contenido?.realizadas ?? 0,
      },
      {
        href: `${lista}?publicacion=borrador`,
        etiqueta: 'Borradores',
        icono: 'mdi:file-edit-outline',
        total: contenido?.borradores ?? 0,
      },
      {
        href: lista,
        etiqueta: 'Avisos vigentes',
        icono: 'mdi:bullhorn-outline',
        total: contenido?.avisosVigentes ?? 0,
      },
      {
        href: adminRoutes.indicadores.index.href(),
        etiqueta: 'Indicadores',
        icono: 'mdi:chart-line',
        total: contenido?.indicadores ?? 0,
      },
    ]

    return (
      <AdminLayout
        user={user}
        active="general"
        title={`${ahora.saludo ?? 'Hola'}, ${user.name.split(' ')[0]}`}
        subtitle={`${ahora.dia} ${ahora.fecha} · Bitácora Ambiental del POETDUM`}
        actions={
          <>
            {/* Va directo al formulario de captura: el botón promete capturar,
                no listar. */}
            <a class="btn btn--white" href={adminRoutes.participacionNueva.index.href()}>
              <Icon name="mdi:plus" size={16} /> Capturar participación
            </a>
            <a class="btn btn--dark" href={adminRoutes.estadisticas.href()}>
              <Icon name="mdi:chart-bar" size={16} /> Ver estadísticas
            </a>
          </>
        }
      >
        {/* Cifras principales */}
        <div class="cards">
          <div class="card card--clock">
            <div class="card__icon blue">
              <Icon name="mdi:clock-outline" size={22} />
            </div>
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
          <Kpi
            href={`${adminRoutes.participaciones.href()}?origen=digital`}
            titulo="Digitales"
            pie="Desde el portal"
            valor={stats.digitales}
            tono="green"
            icono="mdi:laptop"
          />
          <Kpi
            href={`${adminRoutes.participaciones.href()}?origen=fisica`}
            titulo="Físicas"
            pie="En ventanilla"
            valor={stats.fisicas}
            tono="amber"
            icono="mdi:clipboard-text-outline"
          />
          <Kpi
            href={adminRoutes.usuarios.index.href()}
            titulo="Usuarios"
            pie="Cuentas del portal"
            valor={stats.usuarios}
            tono="violet"
            icono="mdi:account-group-outline"
          />
        </div>

        {/* Analítica a la izquierda, agenda a la derecha: la columna estrecha
            evita que los paneles cortos ocupen todo el ancho vacíos. */}
        <div class="dash">
          <div class="dash__main">
            <div class="panel">
              <div class="panel__head">
                <h2 class="panel__title">
                  <Icon name="mdi:chart-timeline-variant" size={18} /> Participaciones por mes
                </h2>
                <span class="panel__count">{totalParticipaciones} en total</span>
              </div>
              <BarrasMensuales datos={stats.participacionesPorMes} />
            </div>

            <div class="panel">
              <div class="panel__head">
                <h2 class="panel__title">
                  <Icon name="mdi:chart-donut" size={18} /> Resultado del dictamen
                </h2>
                <a class="btn btn--white btn--sm" href={adminRoutes.estadisticas.href()}>
                  Ver detalle →
                </a>
              </div>
              <Donut datos={resultado} etiqueta="Dictaminadas" tamano={190} />
            </div>

            <div class="panel">
              <h2 class="panel__title">
                <Icon name="mdi:folder-multiple-outline" size={18} /> Contenido del portal
              </h2>
              <div class="atajos">
                {atajos.map((a) => (
                  <a class="atajo" href={a.href} key={a.etiqueta}>
                    <Icon name={a.icono} size={20} />
                    <span class="atajo__valor">{a.total}</span>
                    <span class="atajo__etiqueta">{a.etiqueta}</span>
                  </a>
                ))}
              </div>
            </div>
          </div>

          <aside class="dash__side">
            <div class="panel">
              <h2 class="panel__title">
                <Icon name="mdi:calendar-clock-outline" size={18} /> Próxima actividad
              </h2>
              {proxima ? (
                <div class="reunion">
                  <a
                    class="reunion__titulo"
                    href={adminRoutes.actividadEditar.index.href({ id: proxima.id })}
                  >
                    {proxima.titulo}
                  </a>
                  <p class="reunion__fecha">
                    <Icon name="mdi:calendar-outline" size={14} />
                    {fechaActividad(proxima.fecha)}
                  </p>
                  {proxima.hora_inicio ? (
                    <p class="reunion__fecha">
                      <Icon name="mdi:clock-outline" size={14} />
                      {proxima.hora_fin
                        ? `${proxima.hora_inicio} – ${proxima.hora_fin}`
                        : proxima.hora_inicio}
                    </p>
                  ) : null}
                  {proxima.lugar ? (
                    <p class="reunion__fecha">
                      <Icon name="mdi:map-marker-outline" size={14} />
                      {proxima.lugar}
                    </p>
                  ) : null}
                  <a class="btn btn--white btn--sm" href={`${lista}?vista=calendario`}>
                    Ver calendario →
                  </a>
                </div>
              ) : (
                <p class="empty">Sin actividades programadas</p>
              )}
            </div>

            <div class="panel">
              <div class="panel__head">
                <h2 class="panel__title">
                  <Icon name="mdi:bullhorn-outline" size={18} /> Avisos en la portada
                </h2>
                <a class="btn btn--white btn--sm" href={lista}>
                  Gestionar
                </a>
              </div>
              {avisos.length === 0 ? (
                <p class="empty">Sin avisos vigentes ni programados</p>
              ) : (
                <ul class="lista-avisos">
                  {avisos.map((a) => (
                    <li key={a.actividad_id}>
                      <a
                        class="lista-avisos__titulo"
                        href={adminRoutes.actividadEditar.index.href({ id: a.actividad_id })}
                      >
                        {a.titulo}
                      </a>
                      <span class="lista-avisos__meta">
                        {fechaActividad(a.inicio)} – {fechaActividad(a.fin)}
                        <span
                          class={'badge ' + (a.estado === 'vigente' ? 'procedente' : 'en-proceso')}
                        >
                          {a.estado === 'vigente' ? 'Vigente' : 'Programado'}
                        </span>
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div class="panel">
              <h2 class="panel__title">
                <Icon name="mdi:lightning-bolt-outline" size={18} /> Accesos rápidos
              </h2>
              <div class="acciones-rapidas">
                <a class="btn btn--white" href={adminRoutes.personalizacion.index.href()}>
                  <Icon name="mdi:palette-outline" size={16} /> Personalización y marca
                </a>
                <a class="btn btn--white" href={adminRoutes.sesiones.href()}>
                  <Icon name="mdi:account-clock-outline" size={16} /> Registro de sesiones
                </a>
                <a class="btn btn--excel" href={`${adminRoutes.exportar.href()}?tabla=actividades`}>
                  <Icon name="mdi:microsoft-excel" size={16} /> Actividades a Excel
                </a>
                <a class="btn btn--white" href={adminRoutes.exportar.href()}>
                  <Icon name="mdi:table-arrow-down" size={16} /> Exportar otras tablas
                </a>
              </div>
            </div>
          </aside>
        </div>
      </AdminLayout>
    )
  }
}
