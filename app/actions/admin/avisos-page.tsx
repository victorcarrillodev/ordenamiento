import type { Handle } from 'remix/ui'

import { adminRoutes } from '../../routes.ts'
import { AdminLayout } from '../../ui/admin/admin-layout.tsx'
import { Button } from '../../ui/button.tsx'
import { Icon } from '../../ui/admin/icon.tsx'

interface Aviso {
  id: string
  titulo: string
  descripcion: string
  activo: boolean
  fecha?: string
}

export interface AvisosPageProps {
  user: { name: string; role: string }
  avisos: Aviso[]
  reuniones?: Array<{
    id: string
    titulo: string
    fecha: string
    hora_inicio: string | null
    hora_fin: string | null
  }>
  sesiones?: Array<{
    id: string
    categoria: string
    titulo: string
    fecha?: string
    ubicacion?: string
  }>
  /** Mes que se está viendo, en formato YYYY-MM. Por defecto, el actual. */
  mes?: string
  /** Día seleccionado dentro del mes visible (1-31), si el admin eligió uno. */
  dia?: string
  error?: string
}

const MESES = [
  'Enero',
  'Febrero',
  'Marzo',
  'Abril',
  'Mayo',
  'Junio',
  'Julio',
  'Agosto',
  'Septiembre',
  'Octubre',
  'Noviembre',
  'Diciembre',
]

const DIAS_SEMANA = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']

type TipoEvento = 'aviso' | 'reunion' | 'poel'

const TIPO: Record<TipoEvento, { icono: string; etiqueta: string; clase: string }> = {
  aviso: { icono: 'mdi:bullhorn-outline', etiqueta: 'Aviso oficial', clase: 'ev--aviso' },
  reunion: {
    icono: 'mdi:account-group-outline',
    etiqueta: 'Reunión de trabajo',
    clase: 'ev--reunion',
  },
  poel: { icono: 'mdi:bank-outline', etiqueta: 'Sesión POEL', clase: 'ev--poel' },
}

interface EventoDetallado {
  tipo: TipoEvento
  id: string
  titulo: string
  fecha?: string
  hora?: string
  ubicacion?: string
  descripcion?: string
  linkHref: string
  linkTexto: string
}

/** Día del mes de una fecha ISO, o null si cae fuera del mes que se muestra. */
function diaDelMes(iso: string | undefined, anio: number, mes: number): number | null {
  if (!iso) return null
  const d = new Date(iso)
  if (isNaN(d.getTime())) return null
  return d.getFullYear() === anio && d.getMonth() === mes ? d.getDate() : null
}

function fmtFechaLarga(dia: number, anio: number, mes: number): string {
  return `${dia} de ${MESES[mes]} de ${anio}`
}

export function AvisosPage(handle: Handle<AvisosPageProps>) {
  return () => {
    const {
      user,
      avisos,
      reuniones = [],
      sesiones = [],
      mes: mesParam,
      dia: diaParam,
      error,
    } = handle.props

    const hoy = new Date()
    // `mes` llega como YYYY-MM desde los botones de navegación. Si no es válido,
    // se cae al mes actual en vez de renderizar un calendario con NaN.
    const partes = /^(\d{4})-(\d{2})$/.exec(mesParam ?? '')
    const anio = partes ? Number(partes[1]) : hoy.getFullYear()
    const mes = partes ? Number(partes[2]) - 1 : hoy.getMonth()
    const mesValido = mes >= 0 && mes <= 11
    const anioVista = mesValido ? anio : hoy.getFullYear()
    const mesVista = mesValido ? mes : hoy.getMonth()

    const esMesActual = anioVista === hoy.getFullYear() && mesVista === hoy.getMonth()
    const totalDias = new Date(anioVista, mesVista + 1, 0).getDate()
    const primerDia = new Date(anioVista, mesVista, 1).getDay()
    const offsetInicio = primerDia === 0 ? 6 : primerDia - 1 // la semana arranca en lunes

    const hrefMes = (delta: number) => {
      const d = new Date(anioVista, mesVista + delta, 1)
      const yyyymm = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      return `${adminRoutes.avisos.index.href()}?mes=${yyyymm}`
    }

    // Día seleccionado: se descarta si no cae dentro del mes que se ve, para
    // que un ?dia= manipulado no marque una celda inexistente.
    const diaSel = Number(diaParam)
    const diaSeleccionado =
      Number.isInteger(diaSel) && diaSel >= 1 && diaSel <= totalDias ? diaSel : null

    const yyyymmVista = `${anioVista}-${String(mesVista + 1).padStart(2, '0')}`
    const hrefDia = (d: number | null) =>
      d === null
        ? `${adminRoutes.avisos.index.href()}?mes=${yyyymmVista}`
        : `${adminRoutes.avisos.index.href()}?mes=${yyyymmVista}&dia=${d}`

    const eventosPorDia: Record<number, EventoDetallado[]> = {}
    const agregar = (dia: number, evento: EventoDetallado) => {
      if (!eventosPorDia[dia]) eventosPorDia[dia] = []
      eventosPorDia[dia].push(evento)
    }

    for (const a of avisos) {
      const dia = diaDelMes(a.fecha, anioVista, mesVista)
      if (dia === null) continue
      agregar(dia, {
        tipo: 'aviso',
        id: a.id,
        titulo: a.titulo,
        fecha: fmtFechaLarga(dia, anioVista, mesVista),
        descripcion:
          a.descripcion || 'Aviso oficial emitido por el Portal de Ordenamiento Territorial.',
        linkHref: '#lista-avisos',
        linkTexto: 'Ver en la lista de avisos',
      })
    }

    for (const r of reuniones) {
      const dia = diaDelMes(r.fecha, anioVista, mesVista)
      if (dia === null) continue
      agregar(dia, {
        tipo: 'reunion',
        id: r.id,
        titulo: r.titulo,
        fecha: fmtFechaLarga(dia, anioVista, mesVista),
        hora: r.hora_inicio ? `${r.hora_inicio}${r.hora_fin ? ' - ' + r.hora_fin : ''}` : undefined,
        descripcion:
          'Reunión de trabajo técnico institucional para el seguimiento del ordenamiento territorial.',
        linkHref: adminRoutes.reuniones.index.href(),
        linkTexto: 'Gestionar reuniones →',
      })
    }

    for (const s of sesiones) {
      const dia = diaDelMes(s.fecha, anioVista, mesVista)
      if (dia === null) continue
      agregar(dia, {
        tipo: 'poel',
        id: s.id,
        titulo: s.titulo,
        fecha: fmtFechaLarga(dia, anioVista, mesVista),
        ubicacion: s.ubicacion || 'San Pedro Tlaquepaque',
        descripcion: `Sesión del Comité del Programa de Ordenamiento Ecológico Local (categoría: ${s.categoria}).`,
        linkHref: adminRoutes.poel.index.href(),
        linkTexto: 'Gestionar sesiones POEL →',
      })
    }

    const totalEventosMes = Object.values(eventosPorDia).reduce((n, e) => n + e.length, 0)

    return (
      <AdminLayout user={user} active="avisos" title="Gestión de Avisos y Calendario">
        <h1 class="page-title">Avisos y Calendario de Bitácora</h1>
        <p class="breadcrumb">
          <a href={adminRoutes.index.href()}>Vista general</a> / Avisos y Calendario
        </p>

        {error ? <p class="form-error">{error}</p> : null}

        {/* ── Publicar ────────────────────────────────────────────────── */}
        <section class="panel panel--suave">
          <h2 class="panel__title panel__title--icono">
            <Icon name="mdi:playlist-plus" /> Publicar nuevo aviso
          </h2>
          <form method="post" class="aviso-form">
            <div class="form-field">
              <label for="titulo">Título del aviso *</label>
              <input
                id="titulo"
                name="titulo"
                required
                placeholder="Ej. Convocatoria a consulta pública…"
              />
            </div>
            <div class="form-field aviso-form__ancho">
              <label for="descripcion">Descripción o enlaces</label>
              <input
                id="descripcion"
                name="descripcion"
                placeholder="Detalles o indicaciones para la ciudadanía…"
              />
            </div>
            <div class="form-field">
              <label for="correo_destino">Correo destino (opcional)</label>
              <input
                id="correo_destino"
                name="correo_destino"
                type="email"
                placeholder="correo@ejemplo.com"
              />
            </div>
            <Button buttonType="submit" variant="dark">
              ＋ Publicar y notificar
            </Button>
          </form>
        </section>

        {/* ── Calendario + lista, lado a lado ─────────────────────────── */}
        <div class="bento">
          <section class="panel panel--suave bento__principal">
            <div class="panel__head">
              <h2 class="panel__title panel__title--icono" style="margin:0;">
                <Icon name="mdi:calendar-month-outline" /> Calendario de actividades
              </h2>
              <div class="cal-leyenda">
                {(Object.keys(TIPO) as TipoEvento[]).map((t) => (
                  <span key={t} class={`cal-leyenda__item ${TIPO[t].clase}`}>
                    <span class="cal-leyenda__punto" aria-hidden="true" />
                    {TIPO[t].etiqueta}
                  </span>
                ))}
              </div>
            </div>

            <div class="cal-nav">
              <a class="cal-nav__btn" href={hrefMes(-1)} title="Mes anterior" rel="nofollow">
                <Icon name="mdi:chevron-left" size={20} label="Mes anterior" />
              </a>
              <div class="cal-nav__mes">
                <strong>
                  {MESES[mesVista]} {anioVista}
                </strong>
                <small>
                  {totalEventosMes === 0
                    ? 'Sin actividades este mes'
                    : `${totalEventosMes} actividad${totalEventosMes === 1 ? '' : 'es'}`}
                </small>
              </div>
              <div class="cal-nav__derecha">
                {esMesActual ? null : (
                  <a class="cal-nav__hoy" href={adminRoutes.avisos.index.href()}>
                    Ir a hoy
                  </a>
                )}
                <a class="cal-nav__btn" href={hrefMes(1)} title="Mes siguiente" rel="nofollow">
                  <Icon name="mdi:chevron-right" size={20} label="Mes siguiente" />
                </a>
              </div>
            </div>

            <div class="cal">
              <div class="cal__semana">
                {DIAS_SEMANA.map((d) => (
                  <div key={d} class="cal__dia-nombre">
                    {d}
                  </div>
                ))}
              </div>

              <div class="cal__rejilla">
                {Array.from({ length: offsetInicio }).map((_, i) => (
                  <div key={'vacio-' + i} class="cal__celda cal__celda--vacia" />
                ))}

                {Array.from({ length: totalDias }).map((_, i) => {
                  const dia = i + 1
                  const esHoy = esMesActual && dia === hoy.getDate()
                  const evts = eventosPorDia[dia] ?? []
                  const visibles = evts.slice(0, 3)
                  const ocultos = evts.length - visibles.length

                  const seleccionado = diaSeleccionado === dia

                  return (
                    <div
                      key={'dia-' + dia}
                      class={
                        'cal__celda' +
                        (esHoy ? ' cal__celda--hoy' : '') +
                        (seleccionado ? ' cal__celda--sel' : '')
                      }
                    >
                      <div class="cal__celda-cabecera">
                        {/* El número es el que selecciona el día: un enlace, no
                            un botón de JS, para que funcione igual sin scripts
                            y se pueda compartir la URL de un día concreto. */}
                        <a
                          class="cal__numero"
                          href={hrefDia(seleccionado ? null : dia)}
                          title={
                            seleccionado
                              ? 'Quitar la selección de este día'
                              : `Ver la agenda del ${dia} de ${MESES[mesVista]}`
                          }
                        >
                          {dia}
                        </a>
                        {esHoy ? <span class="cal__hoy">Hoy</span> : null}
                      </div>

                      <div class="cal__eventos">
                        {visibles.map((e) => (
                          <button
                            key={e.tipo + '-' + e.id}
                            type="button"
                            class={`cal-event-btn cal__evento ${TIPO[e.tipo].clase}`}
                            data-tipo={e.tipo}
                            data-titulo={e.titulo}
                            data-fecha={e.fecha ?? ''}
                            data-hora={e.hora ?? ''}
                            data-ubicacion={e.ubicacion ?? ''}
                            data-desc={e.descripcion ?? ''}
                            data-href={e.linkHref}
                            data-linktext={e.linkTexto}
                            title={`Ver información: ${e.titulo}`}
                          >
                            <Icon name={TIPO[e.tipo].icono} size={12} /> {e.titulo}
                          </button>
                        ))}
                        {ocultos > 0 ? (
                          <a class="cal__mas" href={hrefDia(dia)}>
                            +{ocultos} más
                          </a>
                        ) : null}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Agenda del día seleccionado: la celda no cabe más de 3 eventos,
                aquí se ven todos y completos. */}
            {diaSeleccionado !== null ? (
              <div class="cal-agenda">
                <div class="cal-agenda__cabecera">
                  <h3 class="cal-agenda__titulo">
                    <Icon name="mdi:calendar-check-outline" /> Agenda del{' '}
                    {fmtFechaLarga(diaSeleccionado, anioVista, mesVista)}
                  </h3>
                  <a class="cal-agenda__cerrar" href={hrefDia(null)} title="Quitar la selección">
                    <Icon name="mdi:close" label="Quitar la selección" />
                  </a>
                </div>

                {(eventosPorDia[diaSeleccionado] ?? []).length === 0 ? (
                  <p class="empty">No hay actividades registradas este día.</p>
                ) : (
                  <ul class="cal-agenda__lista">
                    {(eventosPorDia[diaSeleccionado] ?? []).map((e) => (
                      <li
                        key={e.tipo + '-' + e.id}
                        class={`cal-agenda__item ${TIPO[e.tipo].clase}`}
                      >
                        <span class="cal-agenda__icono">
                          <Icon name={TIPO[e.tipo].icono} size={18} />
                        </span>
                        <div class="cal-agenda__cuerpo">
                          <strong>{e.titulo}</strong>
                          <small>
                            {TIPO[e.tipo].etiqueta}
                            {e.hora ? ` · ${e.hora}` : ''}
                            {e.ubicacion ? ` · ${e.ubicacion}` : ''}
                          </small>
                          <p>{e.descripcion}</p>
                        </div>
                        <a class="cal-agenda__ir" href={e.linkHref}>
                          {e.linkTexto}
                        </a>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ) : null}
          </section>

          {/* ── Lista de avisos ───────────────────────────────────────── */}
          <section class="panel panel--suave bento__lateral" id="lista-avisos">
            <div class="panel__head">
              <h2 class="panel__title panel__title--icono" style="margin:0;">
                <Icon name="mdi:format-list-bulleted" /> Lista de avisos
              </h2>
              <span class="conteo">{avisos.length}</span>
            </div>

            {avisos.length === 0 ? (
              <p class="empty">Todavía no hay avisos publicados.</p>
            ) : (
              <div class="aviso-lista">
                {avisos.map((a) => (
                  <article key={a.id} class="aviso-card">
                    <div class="aviso-card__cabecera">
                      <h3 class="aviso-card__titulo">
                        <Icon name="mdi:bullhorn-outline" /> {a.titulo}
                      </h3>
                      <span class={'badge ' + (a.activo ? 'procedente' : 'no-procedente')}>
                        {a.activo ? 'Activo' : 'Inactivo'}
                      </span>
                    </div>

                    <p class="aviso-card__desc">{a.descripcion || 'Sin descripción.'}</p>

                    <div class="aviso-card__pie">
                      <form method="post" class="aviso-card__envio">
                        <input type="hidden" name="intent" value="enviar_correo" />
                        <input type="hidden" name="id" value={String(a.id)} />
                        <input
                          type="email"
                          name="para"
                          required
                          placeholder="Reenviar a…"
                          aria-label={`Reenviar el aviso "${a.titulo}" por correo`}
                        />
                        <Button
                          buttonType="submit"
                          variant="dark"
                          size="sm"
                          title="Enviar este aviso por correo"
                        >
                          <Icon name="mdi:send-outline" />
                        </Button>
                      </form>

                      <form method="post" class="aviso-card__borrar">
                        <input type="hidden" name="intent" value="eliminar" />
                        <input type="hidden" name="id" value={String(a.id)} />
                        <Button
                          buttonType="submit"
                          variant="danger"
                          size="sm"
                          title={`Eliminar el aviso "${a.titulo}"`}
                        >
                          <Icon name="mdi:trash-can-outline" />
                        </Button>
                      </form>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        </div>

        {/* Modal de detalle. Los ids y los data-* los consume public/admin.js. */}
        <div id="cal-detail-modal" class="cal-modal-backdrop" style="display: none;">
          <div class="cal-modal">
            {/* El icono va en su propio elemento y el texto en un <span> aparte:
                admin.js escribe con textContent sobre el span (los títulos los
                teclea el admin, así que nunca se interpretan como HTML) y solo
                cambia el atributo `icon`, que sale de una lista fija del script. */}
            <div class="cal-modal__header">
              <span id="cal-m-tag" class="cal-modal__tag">
                <iconify-icon
                  id="cal-m-tag-icon"
                  icon="mdi:bullhorn-outline"
                  width="16"
                  height="16"
                />
                <span id="cal-m-tag-txt">Aviso Oficial</span>
              </span>
              <button id="cal-m-close" type="button" class="cal-modal__close" aria-label="Cerrar">
                <iconify-icon icon="mdi:close" width="18" height="18" />
              </button>
            </div>
            <h3 id="cal-m-title" class="cal-modal__title">
              Título del Evento
            </h3>
            <div class="cal-modal__info">
              <div id="cal-m-fecha">
                <iconify-icon icon="mdi:calendar-outline" width="15" height="15" />
                <span id="cal-m-fecha-txt">Fecha: —</span>
              </div>
              <div id="cal-m-hora" style="display: none;">
                <iconify-icon icon="mdi:clock-outline" width="15" height="15" />
                <span id="cal-m-hora-txt">Horario: —</span>
              </div>
              <div id="cal-m-lugar" style="display: none;">
                <iconify-icon icon="mdi:map-marker-outline" width="15" height="15" />
                <span id="cal-m-lugar-txt">Ubicación: —</span>
              </div>
            </div>
            <div id="cal-m-desc" class="cal-modal__desc">
              Descripción
            </div>
            <div class="cal-modal__actions">
              <button id="cal-m-btn-close" type="button" class="btn btn--white">
                Cerrar
              </button>
              <a id="cal-m-link" href="#" class="btn btn--dark">
                Ir a la sección →
              </a>
            </div>
          </div>
        </div>
      </AdminLayout>
    )
  }
}
