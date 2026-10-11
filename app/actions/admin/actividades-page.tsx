import type { Handle } from 'remix/ui'

import {
  ESTADOS_ACTIVIDAD,
  ESTADOS_PUBLICACION,
  ETIQUETA_ESTADO,
  ETIQUETA_PUBLICACION,
  FASES_PROGRAMA,
  type ActividadGestion,
  type EstadoActividad,
  type EstadoAviso,
  type EstadoPublicacion,
} from '../../data/programa.ts'
import { adminRoutes, routes } from '../../routes.ts'
import { AdminAlert } from '../../ui/admin/alert.tsx'
import { AdminLayout } from '../../ui/admin/admin-layout.tsx'
import { BotonEliminar } from '../../ui/admin/boton-eliminar.tsx'
import { cuantosArchivos } from '../../ui/admin/formato.ts'
import { Icon } from '../../ui/admin/icon.tsx'
import { ACUSES, type Acuse } from './actividad-datos.ts'
import {
  agruparPorFecha,
  claveMes,
  claveMesVecino,
  construirGrilla,
  diasEntre,
  fechaLarga,
  horario,
  nombreMes,
  parsearFecha,
  relativoA,
} from '../../utils/calendario.ts'

export interface ResumenGestion {
  total: number
  proximas: number
  realizadas: number
  borradores: number
  avisosVigentes: number
  avisos: Array<{
    actividad_id: string
    titulo: string
    inicio: string
    fin: string
    estado: 'vigente' | 'programado'
  }>
}

export interface FiltrosLista {
  estado?: string
  publicacion?: string
  fase?: string
  /** Texto de la búsqueda (ya recortado). Se filtra en el panel, no en el backend. */
  q?: string
}

export interface ActividadesPageProps {
  user: { name: string; role: string }
  vista: 'lista' | 'calendario'
  actividades: ActividadGestion[]
  resumen: ResumenGestion
  filtros: FiltrosLista
  /** Mes del calendario (0-indexado) y día elegido (`YYYY-MM-DD`). */
  calendario: { anio: number; mes: number; dia?: string }
  hoy: string
  acuse?: Acuse
  error?: string
}

const DIAS_SEMANA_CORTOS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']

/** Icono de cada estado: la forma refuerza al color, que solo no basta para distinguirlos. */
const ICONO_ESTADO: Record<EstadoActividad, string> = {
  programada: 'mdi:calendar-clock-outline',
  realizada: 'mdi:check-circle-outline',
  reprogramada: 'mdi:calendar-edit-outline',
  cancelada: 'mdi:close-circle-outline',
}

const ICONO_PUBLICACION: Record<EstadoPublicacion, string> = {
  publicado: 'mdi:earth',
  borrador: 'mdi:file-edit-outline',
  oculto: 'mdi:eye-off-outline',
}

/** Hasta cuántos días antes se avisa «Hoy / Mañana / En 3 días» junto a la fecha. */
const DIAS_DE_AVISO = 14

const ETIQUETA_AVISO: Record<EstadoAviso, string> = {
  sin_aviso: '',
  vigente: 'Aviso vigente',
  programado: 'Aviso programado',
  vencido: 'Aviso vencido',
}

function fechaCorta(iso: string): string {
  const { anio, mes, dia } = parsearFecha(iso)
  return `${String(dia).padStart(2, '0')} ${nombreMes(mes).slice(0, 3).toLowerCase()} ${anio}`
}

function Resumen(handle: Handle<{ resumen: ResumenGestion }>) {
  return () => {
    const { resumen } = handle.props
    const vigente = resumen.avisos.find((a) => a.estado === 'vigente')
    return (
      <div class="act-resumen">
        <a
          class="act-resumen__tarjeta"
          href={`${adminRoutes.actividades.index.href()}?estado=programada`}
        >
          <Icon name="mdi:calendar-clock-outline" size={22} />
          <span class="act-resumen__valor">{resumen.proximas}</span>
          <span class="act-resumen__etiqueta">En «Próximas actividades»</span>
        </a>
        <a
          class="act-resumen__tarjeta"
          href={`${adminRoutes.actividades.index.href()}?estado=realizada`}
        >
          <Icon name="mdi:chart-timeline-variant" size={22} />
          <span class="act-resumen__valor">{resumen.realizadas}</span>
          <span class="act-resumen__etiqueta">Realizadas (Avances)</span>
        </a>
        <a
          class="act-resumen__tarjeta"
          href={`${adminRoutes.actividades.index.href()}?publicacion=borrador`}
        >
          <Icon name="mdi:file-edit-outline" size={22} />
          <span class="act-resumen__valor">{resumen.borradores}</span>
          <span class="act-resumen__etiqueta">Borradores sin publicar</span>
        </a>
        <div class="act-resumen__tarjeta act-resumen__tarjeta--aviso">
          <Icon name="mdi:bullhorn-outline" size={22} />
          {vigente ? (
            <a
              class="act-resumen__aviso"
              href={adminRoutes.actividadEditar.index.href({ id: vigente.actividad_id })}
            >
              {vigente.titulo}
            </a>
          ) : (
            <span class="act-resumen__aviso">Ninguno</span>
          )}
          <span class="act-resumen__etiqueta">
            {vigente
              ? `Aviso en la portada hasta el ${fechaCorta(vigente.fin)}`
              : 'Aviso en la portada'}
          </span>
        </div>
      </div>
    )
  }
}

/** Las reglas con que el sistema coloca cada actividad en el portal. */
function ComoSePublica() {
  return () => (
    <details class="panel act-ayuda">
      <summary>
        <Icon name="mdi:help-circle-outline" /> ¿Dónde aparece cada actividad en el portal?
      </summary>
      <ul>
        <li>
          <strong>Programada o reprogramada</strong>, con fecha de hoy en adelante: en «Próximas
          actividades» de la portada y en el calendario.
        </li>
        <li>
          <strong>Realizada</strong>: en «Avances del Programa», con su resultado, acuerdos,
          fotografías y documentos. Sigue en el calendario en su fecha.
        </li>
        <li>
          <strong>Cancelada</strong>: solo en el calendario, marcada como cancelada.
        </li>
        <li>
          <strong>Mostrar también como aviso</strong>: en la franja superior de la portada, solo
          entre sus fechas de publicación. Si hay varios, se muestra el más reciente.
        </li>
        <li>
          <strong>Borrador u oculto</strong>: no aparece en ninguna sección pública.
        </li>
      </ul>
    </details>
  )
}

function Filtros(handle: Handle<{ filtros: FiltrosLista }>) {
  return () => {
    const { filtros } = handle.props
    const hayFiltros = Boolean(filtros.estado || filtros.publicacion || filtros.fase || filtros.q)
    return (
      <form
        method="get"
        class="lista-barra"
        action={adminRoutes.actividades.index.href()}
        role="search"
      >
        <label class="lista-busqueda">
          <Icon name="mdi:magnify" size={18} />
          <input
            type="search"
            name="q"
            value={filtros.q ?? ''}
            placeholder="Buscar por título, tipo o lugar…"
            aria-label="Buscar por título, tipo o lugar"
            title="Busca en el título, el tipo, la fase y el lugar. Escribe al menos 2 letras."
            minlength={2}
            maxlength={80}
            autocomplete="off"
          />
        </label>
        <label class="lista-select">
          <span>Estado</span>
          <select name="estado" aria-label="Filtrar por estado">
            <option value="">Todos</option>
            {ESTADOS_ACTIVIDAD.map((e) => (
              <option key={e} value={e} selected={e === filtros.estado}>
                {ETIQUETA_ESTADO[e]}
              </option>
            ))}
          </select>
        </label>
        <label class="lista-select">
          <span>Publicación</span>
          <select name="publicacion" aria-label="Filtrar por publicación">
            <option value="">Todas</option>
            {ESTADOS_PUBLICACION.map((p) => (
              <option key={p} value={p} selected={p === filtros.publicacion}>
                {ETIQUETA_PUBLICACION[p]}
              </option>
            ))}
          </select>
        </label>
        <label class="lista-select">
          <span>Fase</span>
          <select name="fase" aria-label="Filtrar por fase">
            <option value="">Todas</option>
            {FASES_PROGRAMA.map((f) => (
              <option key={f} value={f} selected={f === filtros.fase}>
                {f}
              </option>
            ))}
          </select>
        </label>
        <button class="btn btn--dark" type="submit">
          <Icon name="mdi:magnify" size={16} /> Buscar
        </button>
        {hayFiltros ? (
          <a class="btn btn--white" href={adminRoutes.actividades.index.href()}>
            <Icon name="mdi:close" size={16} /> Limpiar
          </a>
        ) : null}
      </form>
    )
  }
}

function Tabla(
  handle: Handle<{
    actividades: ActividadGestion[]
    hayFiltros: boolean
    hoy: string
    /** Cuántas actividades hay en total, con o sin filtros. */
    total: number
  }>,
) {
  return () => {
    const { actividades, hayFiltros, hoy, total } = handle.props
    const lista = adminRoutes.actividades.index.href()

    if (actividades.length === 0) {
      return (
        <div class="vacio">
          <span class="vacio__icono" aria-hidden="true">
            <Icon name="mdi:calendar-blank-outline" size={30} />
          </span>
          <strong class="vacio__titulo">
            {hayFiltros ? 'Ninguna actividad coincide' : 'Todavía no hay actividades'}
          </strong>
          <p class="vacio__texto">
            {hayFiltros
              ? 'Prueba con otras palabras o quita los filtros para ver todas.'
              : 'Registra la primera: el portal la mostrará como próxima, en el calendario o en los avances según su fecha y su estado.'}
          </p>
          {hayFiltros ? (
            <a class="btn btn--white btn--sm" href={lista}>
              <Icon name="mdi:close" size={14} /> Quitar filtros
            </a>
          ) : (
            <a class="btn btn--green btn--sm" href={adminRoutes.actividadNueva.index.href()}>
              <Icon name="mdi:plus" size={14} /> Agregar actividad
            </a>
          )}
        </div>
      )
    }

    return (
      <>
        <div class="table-wrap table-wrap--lista">
          <table class="tabla-lista act-tabla">
            <thead>
              <tr>
                <th scope="col" class="col-justa">
                  Fecha
                </th>
                <th scope="col">Actividad</th>
                <th scope="col" class="col-justa">
                  Estado
                </th>
                <th scope="col" class="col-justa">
                  Publicación
                </th>
                <th scope="col" class="col-justa tabla-lista__acciones">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody>
              {actividades.map((a) => {
                const v = a.visibilidad
                const lugares = [
                  v.proximas ? 'Próximas' : null,
                  v.avances ? 'Avances' : null,
                  v.calendario ? 'Calendario' : null,
                ].filter(Boolean)
                const horas = horario(a.hora_inicio, a.hora_fin)
                const dias = diasEntre(hoy, a.fecha)
                // «Hoy / Mañana / En 3 días» solo para lo que todavía va a pasar: en una
                // actividad ya realizada o cancelada no dice nada útil.
                const pronto =
                  (a.estado === 'programada' || a.estado === 'reprogramada') &&
                  dias >= 0 &&
                  dias <= DIAS_DE_AVISO
                const editar = adminRoutes.actividadEditar.index.href({ id: a.id })
                const conArchivos = a.total_archivos > 0
                return (
                  <tr key={a.id}>
                    <td data-label="Fecha" class="col-justa act-tabla__fecha">
                      <div class="celda-doble">
                        <span class="celda-doble__titulo celda-doble__titulo--fecha">
                          {fechaCorta(a.fecha)}
                        </span>
                        {horas || pronto ? (
                          <span class="celda-doble__sub act-tabla__cuando">
                            {horas ? `${horas} h` : null}
                            {pronto ? (
                              <span class={'act-pronto' + (dias <= 1 ? ' act-pronto--ya' : '')}>
                                {relativoA(hoy, a.fecha)}
                              </span>
                            ) : null}
                          </span>
                        ) : null}
                      </div>
                    </td>
                    <td data-label="Actividad" class="tabla-lista__principal act-tabla__actividad">
                      <div class="celda-doble">
                        <a class="celda-doble__titulo" href={editar} title="Editar esta actividad">
                          {a.titulo}
                        </a>
                        <span
                          class="celda-doble__sub act-tabla__meta"
                          title={a.lugar ? `Lugar: ${a.lugar}` : undefined}
                        >
                          {a.tipo} · {a.fase}
                          {conArchivos ? (
                            <span class="archivos archivos--mini" title="Archivos de la actividad">
                              <Icon name="mdi:paperclip" size={13} />
                              <span aria-hidden="true">{a.total_archivos}</span>
                              <span class="solo-lector">{cuantosArchivos(a.total_archivos)}</span>
                            </span>
                          ) : null}
                        </span>
                        {v.fechaPasada ? (
                          <a
                            class="act-alerta"
                            href={editar}
                            title="Sigue como programada aunque su fecha ya pasó"
                          >
                            <Icon name="mdi:alert-outline" size={13} /> La fecha ya pasó: actualiza
                            su estado
                          </a>
                        ) : null}
                      </div>
                    </td>
                    <td data-label="Estado" class="col-justa">
                      <span class={`act-estado act-estado--${a.estado}`}>
                        <Icon name={ICONO_ESTADO[a.estado]} size={14} /> {ETIQUETA_ESTADO[a.estado]}
                      </span>
                    </td>
                    <td data-label="Publicación" class="col-justa act-tabla__portal">
                      <div class="celda-doble">
                        <span class={`act-pub act-pub--${a.publicacion}`}>
                          <Icon name={ICONO_PUBLICACION[a.publicacion]} size={14} />{' '}
                          {ETIQUETA_PUBLICACION[a.publicacion]}
                        </span>
                        <span class="celda-doble__sub" title="Dónde aparece en el portal">
                          {lugares.length > 0 ? lugares.join(' · ') : 'No aparece en el portal'}
                        </span>
                        {v.aviso !== 'sin_aviso' ? (
                          <span class={`act-aviso-chip act-aviso-chip--${v.aviso}`}>
                            <Icon name="mdi:bullhorn-outline" size={12} /> {ETIQUETA_AVISO[v.aviso]}
                          </span>
                        ) : null}
                      </div>
                    </td>
                    <td data-label="Acciones" class="col-justa tabla-lista__acciones">
                      <div class="acciones-fila">
                        <a
                          class="btn btn--green btn--sm"
                          href={editar}
                          title={`Editar «${a.titulo}»`}
                          aria-label={`Editar «${a.titulo}»`}
                        >
                          <Icon name="mdi:pencil-outline" size={15} /> Editar
                        </a>
                        {a.publicacion === 'publicado' ? (
                          <a
                            class="btn btn--white btn--sm btn--icono"
                            href={routes.poetdum.actividades.detalle.href({ id: a.id })}
                            target="_blank"
                            rel="noopener"
                            title="Ver esta actividad en el portal (se abre en otra pestaña)"
                            aria-label={`Ver «${a.titulo}» en el portal (se abre en otra pestaña)`}
                          >
                            <Icon name="mdi:open-in-new" size={16} />
                            <span class="btn__texto">Portal</span>
                          </a>
                        ) : null}
                        <BotonEliminar
                          nombre={a.titulo}
                          confirmacion={
                            conArchivos
                              ? `¿Eliminar «${a.titulo}» y todos sus archivos? No se puede deshacer.`
                              : `¿Eliminar «${a.titulo}»? No se puede deshacer.`
                          }
                          campos={{ intent: 'eliminar', id: a.id }}
                        />
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        <div class="paginacion">
          <span class="paginacion__meta">
            {hayFiltros
              ? `Mostrando ${actividades.length} de ${total} ${total === 1 ? 'actividad' : 'actividades'}`
              : `${actividades.length} ${actividades.length === 1 ? 'actividad' : 'actividades'}`}
          </span>
        </div>
      </>
    )
  }
}

function Calendario(
  handle: Handle<{
    actividades: ActividadGestion[]
    anio: number
    mes: number
    dia?: string
    hoy: string
  }>,
) {
  return () => {
    const { actividades, anio, mes, dia, hoy } = handle.props
    const base = `${adminRoutes.actividades.index.href()}?vista=calendario`
    const botonMes = (delta: number, icono: string, etiqueta: string) => {
      const clave = claveMesVecino(anio, mes, delta)
      return clave ? (
        <a class="cal-nav__btn" href={`${base}&mes=${clave}`} title={etiqueta} rel="nofollow">
          <Icon name={icono} size={20} label={etiqueta} />
        </a>
      ) : (
        // En los extremos del calendario (años 0100 y 9999) no hay mes al cual ir.
        <span class="cal-nav__btn cal-nav__btn--inactivo" aria-hidden="true">
          <Icon name={icono} size={20} />
        </span>
      )
    }
    const hrefDia = (fecha?: string) =>
      `${base}&mes=${claveMes(anio, mes)}${fecha ? `&dia=${fecha}` : ''}`
    const porDia = agruparPorFecha(actividades)
    const celdas = construirGrilla(anio, mes, porDia)
    const delDia = dia ? (porDia.get(dia) ?? []) : []
    const esMesActual = hoy.startsWith(claveMes(anio, mes))

    return (
      <section class="panel panel--suave">
        <div class="panel__head">
          <h2 class="panel__title panel__title--icono" style="margin:0;">
            <Icon name="mdi:calendar-month-outline" /> Calendario de actividades
          </h2>
          <div class="cal-leyenda">
            {ESTADOS_ACTIVIDAD.map((e) => (
              <span key={e} class={`cal-leyenda__item ev--${e}`}>
                <span class="cal-leyenda__punto" aria-hidden="true" />
                {ETIQUETA_ESTADO[e]}
              </span>
            ))}
          </div>
        </div>

        <div class="cal-nav">
          {botonMes(-1, 'mdi:chevron-left', 'Mes anterior')}
          <div class="cal-nav__mes">
            <strong>
              {nombreMes(mes)} {anio}
            </strong>
            <small>
              {actividades.length === 0
                ? 'Sin actividades este mes'
                : `${actividades.length} actividad${actividades.length === 1 ? '' : 'es'}`}
            </small>
          </div>
          <div class="cal-nav__derecha">
            {esMesActual ? null : (
              <a class="cal-nav__hoy" href={base}>
                Ir a hoy
              </a>
            )}
            {botonMes(1, 'mdi:chevron-right', 'Mes siguiente')}
          </div>
        </div>

        <div class="cal">
          <div class="cal__semana">
            {DIAS_SEMANA_CORTOS.map((d) => (
              <div key={d} class="cal__dia-nombre">
                {d}
              </div>
            ))}
          </div>
          <div class="cal__rejilla">
            {celdas.map((celda, i) => {
              if (!celda) return <div key={`vacia-${i}`} class="cal__celda cal__celda--vacia" />
              const visibles = celda.items.slice(0, 3)
              const ocultas = celda.items.length - visibles.length
              const esHoy = celda.fecha === hoy
              const elegida = celda.fecha === dia
              return (
                <div
                  key={celda.fecha}
                  class={`cal__celda${esHoy ? ' cal__celda--hoy' : ''}${elegida ? ' cal__celda--sel' : ''}`}
                >
                  <div class="cal__celda-cabecera">
                    <a
                      class="cal__numero"
                      href={hrefDia(elegida ? undefined : celda.fecha)}
                      title={
                        elegida
                          ? 'Quitar la selección'
                          : `Ver la agenda del ${fechaLarga(celda.fecha)}`
                      }
                    >
                      {celda.dia}
                    </a>
                    {esHoy ? <span class="cal__hoy">Hoy</span> : null}
                  </div>
                  <div class="cal__eventos">
                    {visibles.map((a) => (
                      <a
                        key={a.id}
                        class={`cal__evento ev--${a.estado}${a.publicacion === 'publicado' ? '' : ' cal__evento--sin-publicar'}`}
                        href={adminRoutes.actividadEditar.index.href({ id: a.id })}
                        title={`${a.titulo} · ${ETIQUETA_ESTADO[a.estado]} · ${ETIQUETA_PUBLICACION[a.publicacion]}`}
                      >
                        {a.titulo}
                      </a>
                    ))}
                    {ocultas > 0 ? (
                      <a class="cal__mas" href={hrefDia(celda.fecha)}>
                        +{ocultas} más
                      </a>
                    ) : null}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {dia ? (
          <div class="cal-agenda">
            <div class="cal-agenda__cabecera">
              <h3 class="cal-agenda__titulo">
                <Icon name="mdi:calendar-check-outline" /> Agenda del {fechaLarga(dia)}
              </h3>
              <a class="cal-agenda__cerrar" href={hrefDia()} title="Quitar la selección">
                <Icon name="mdi:close" label="Quitar la selección" />
              </a>
            </div>
            {delDia.length === 0 ? (
              <p class="empty">No hay actividades registradas este día.</p>
            ) : (
              <ul class="cal-agenda__lista">
                {delDia.map((a) => (
                  <li key={a.id} class={`cal-agenda__item ev--${a.estado}`}>
                    <span class="cal-agenda__icono">
                      <Icon name="mdi:calendar-star" size={18} />
                    </span>
                    <div class="cal-agenda__cuerpo">
                      <strong>{a.titulo}</strong>
                      <small>
                        {a.tipo} · {ETIQUETA_ESTADO[a.estado]} ·{' '}
                        {ETIQUETA_PUBLICACION[a.publicacion]}
                        {horario(a.hora_inicio, a.hora_fin)
                          ? ` · ${horario(a.hora_inicio, a.hora_fin)}`
                          : ''}
                        {a.lugar ? ` · ${a.lugar}` : ''}
                      </small>
                      {a.descripcion ? <p>{a.descripcion}</p> : null}
                    </div>
                    <a
                      class="cal-agenda__ir"
                      href={adminRoutes.actividadEditar.index.href({ id: a.id })}
                    >
                      Editar →
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ) : null}
      </section>
    )
  }
}

export function ActividadesPage(handle: Handle<ActividadesPageProps>) {
  return () => {
    const { user, vista, actividades, resumen, filtros, calendario, hoy, acuse, error } =
      handle.props
    const lista = adminRoutes.actividades.index.href()
    const hayFiltros = Boolean(filtros.estado || filtros.publicacion || filtros.fase || filtros.q)
    return (
      <AdminLayout
        user={user}
        active="actividades"
        title="Actividades y avances del Programa"
        subtitle="Registra cada actividad una sola vez: el portal la muestra como próxima, en el calendario, como aviso o en los avances según su fecha, estado y contenido."
        actions={
          <>
            <a class="btn btn--dark" href={adminRoutes.actividadNueva.index.href()}>
              <Icon name="mdi:plus" size={16} /> Agregar actividad
            </a>
            <a
              class="btn btn--white"
              href={routes.poetdum.show.href()}
              target="_blank"
              rel="noopener"
            >
              <Icon name="mdi:open-in-new" size={16} /> Ver en el portal
            </a>
            <a class="btn btn--excel" href={`${adminRoutes.exportar.href()}?tabla=actividades`}>
              <Icon name="mdi:microsoft-excel" size={16} /> Exportar
            </a>
          </>
        }
      >
        {error ? <AdminAlert type="error" message={error} /> : null}
        {acuse ? <AdminAlert type="success" message={ACUSES[acuse]} /> : null}

        <Resumen resumen={resumen} />
        <ComoSePublica />

        <nav class="tabs" aria-label="Vista">
          <a
            class={`tabs__item${vista === 'lista' ? ' active' : ''}`}
            href={lista}
            aria-current={vista === 'lista' ? 'page' : undefined}
          >
            <Icon name="mdi:format-list-bulleted" /> Lista
            <span class="tabs__count">{resumen.total}</span>
          </a>
          <a
            class={`tabs__item${vista === 'calendario' ? ' active' : ''}`}
            href={`${lista}?vista=calendario`}
            aria-current={vista === 'calendario' ? 'page' : undefined}
          >
            <Icon name="mdi:calendar-month-outline" /> Calendario
          </a>
        </nav>

        {vista === 'lista' ? (
          <section class="panel">
            <Filtros filtros={filtros} />
            <Tabla
              actividades={actividades}
              hayFiltros={hayFiltros}
              hoy={hoy}
              total={resumen.total}
            />
          </section>
        ) : (
          <Calendario
            actividades={actividades}
            anio={calendario.anio}
            mes={calendario.mes}
            dia={calendario.dia}
            hoy={hoy}
          />
        )}
      </AdminLayout>
    )
  }
}
