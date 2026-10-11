import type { Handle } from 'remix/ui'

import { adminRoutes } from '../../routes.ts'
import { AdminLayout } from '../../ui/admin/admin-layout.tsx'
import { cuantosArchivos, formatearFecha, formatearHora } from '../../ui/admin/formato.ts'
import { Icon } from '../../ui/admin/icon.tsx'
import {
  DICTAMENES,
  ETAPAS,
  infoEtapa,
  INFO_ETAPA,
  type Dictamen,
  type Etapa,
  type ResumenParticipaciones,
} from './etapa.ts'

interface Adjunto {
  id: string
  nombre_original: string
  mime: string
  size: number
}

interface ParticipationRow {
  id: string
  folio: string
  origen: string
  nombre: string
  estado: string
  fecha: string
  notificado_en?: string | null
  adjuntos: Adjunto[]
}

export interface ParticipacionesPageProps {
  user: { name: string; role: string }
  origen: 'digital' | 'fisica'
  items: ParticipationRow[]
  /** Filtro de etapa activo, si el admin eligió uno. */
  etapa?: Etapa
  /** Filtro de dictamen activo. */
  estado?: Dictamen
  /** Texto de la búsqueda activa (ya recortado; vacío si no hay). */
  q?: string
  /** Cifras de las etiquetas de filtro. Sin ellas los filtros salen sin número. */
  resumen?: ResumenParticipaciones | null
  page: number
  limit: number
  total: number
}

const ESTADO_BADGE: Record<string, string> = {
  Procedente: 'procedente',
  'En proceso': 'en-proceso',
  'No procedente': 'no-procedente',
}

/** Tamaños de página que ofrece el selector del pie de la tabla. */
const TAMANOS = [10, 25, 50, 100]
const TAMANO_INICIAL = 10

function fmtSize(bytes: number): string {
  if (!bytes) return '—'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

/**
 * Ventana de páginas a mostrar: las dos extremas siempre, el rango alrededor de
 * la página actual y "…" para los huecos (nunca más de 7 enlaces).
 */
function paginasVisibles(page: number, totalPages: number): Array<number | '…'> {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, i) => i + 1)
  }
  const resultado: Array<number | '…'> = [1]
  const inicio = Math.max(2, page - 1)
  const fin = Math.min(totalPages - 1, page + 1)
  if (inicio > 2) resultado.push('…')
  for (let i = inicio; i <= fin; i++) resultado.push(i)
  if (fin < totalPages - 1) resultado.push('…')
  resultado.push(totalPages)
  return resultado
}

export function ParticipacionesPage(handle: Handle<ParticipacionesPageProps>) {
  return () => {
    const { user, origen, items, etapa, estado, q = '', resumen, page, limit, total } = handle.props
    // El título va corto, como el del resto de las pantallas: qué se hace ahí
    // ya lo dice el subtítulo, y «Gestión de…» solo alarga la barra superior.
    const titulo = origen === 'fisica' ? 'Participaciones físicas' : 'Participaciones digitales'

    const totalPages = Math.max(1, Math.ceil(total / limit))
    const desde = total === 0 ? 0 : (page - 1) * limit + 1
    const hasta = Math.min(total, page * limit)
    const hayFiltros = Boolean(etapa || estado || q)

    /**
     * Dirección del listado con los filtros activos, cambiando solo lo que se pida.
     * Cambiar un filtro vuelve a la primera página; moverse de página los conserva.
     */
    const href = (
      cambio: {
        etapa?: Etapa | null
        estado?: Dictamen | null
        limit?: number
        page?: number
      } = {},
    ) => {
      const e = 'etapa' in cambio ? cambio.etapa : etapa
      const d = 'estado' in cambio ? cambio.estado : estado
      const tamano = cambio.limit ?? limit
      const partes = [`origen=${origen}`]
      if (e) partes.push(`etapa=${encodeURIComponent(e)}`)
      if (d) partes.push(`estado=${encodeURIComponent(d)}`)
      if (q) partes.push(`q=${encodeURIComponent(q)}`)
      if (cambio.page !== undefined || tamano !== TAMANO_INICIAL) partes.push(`limit=${tamano}`)
      if (cambio.page !== undefined) partes.push(`page=${cambio.page}`)
      return `${adminRoutes.participaciones.href()}?${partes.join('&')}`
    }
    const paginaHref = (p: number) => href({ page: p })
    // Quita etapa, dictamen y búsqueda; conserva el tamaño de página elegido.
    const limpiarHref = `${adminRoutes.participaciones.href()}?origen=${origen}${
      limit !== TAMANO_INICIAL ? `&limit=${limit}` : ''
    }`

    return (
      <AdminLayout
        user={user}
        active={origen === 'fisica' ? 'participaciones-fisica' : 'participaciones-digital'}
        title={titulo}
        subtitle={
          origen === 'fisica'
            ? 'Participaciones capturadas en ventanilla u oficialía de partes.'
            : 'Participaciones que la ciudadanía envió desde el portal web.'
        }
        actions={
          origen === 'fisica' ? (
            <a class="btn btn--green" href={adminRoutes.presencial.href()}>
              <Icon name="mdi:plus" size={16} /> Registrar participación
            </a>
          ) : null
        }
      >
        <div class="panel">
          <form
            class="lista-barra"
            method="get"
            action={adminRoutes.participaciones.href()}
            role="search"
          >
            <input type="hidden" name="origen" value={origen} />
            {etapa ? <input type="hidden" name="etapa" value={etapa} /> : null}
            {limit !== TAMANO_INICIAL ? <input type="hidden" name="limit" value={limit} /> : null}
            <label class="lista-busqueda">
              <Icon name="mdi:magnify" size={18} />
              <input
                type="search"
                name="q"
                value={q}
                placeholder="Buscar por folio, nombre, colonia, calle u observación…"
                aria-label="Buscar por folio, nombre, colonia, calle u observación"
                title="Busca en el folio, el nombre, la colonia, la calle y la observación. Escribe al menos 2 letras."
                minlength={2}
                maxlength={80}
                autocomplete="off"
              />
            </label>
            <label class="lista-select">
              <span>Dictamen</span>
              <select name="estado" aria-label="Filtrar por dictamen">
                <option value="">Todos</option>
                {DICTAMENES.map((d) => (
                  <option key={d} value={d} selected={estado === d}>
                    {d}
                    {resumen ? ` (${resumen.estados[d]})` : ''}
                  </option>
                ))}
              </select>
            </label>
            <button class="btn btn--dark" type="submit">
              <Icon name="mdi:magnify" size={16} /> Buscar
            </button>
            {hayFiltros ? (
              <a class="btn btn--white" href={limpiarHref}>
                <Icon name="mdi:close" size={16} /> Limpiar
              </a>
            ) : null}
          </form>

          <div class="etapa-filtros" role="group" aria-label="Filtrar por seguimiento">
            <span class="etapa-filtros__titulo">Seguimiento</span>
            <a
              class={'etapa-filtro etapa-filtro--todas' + (etapa ? '' : ' etapa-filtro--activo')}
              href={href({ etapa: null })}
              aria-current={etapa ? undefined : 'true'}
            >
              Todas
              {resumen ? <span class="etapa-filtro__n">{resumen.total}</span> : null}
            </a>
            {ETAPAS.map((e) => {
              const info = INFO_ETAPA[e]
              const activa = etapa === e
              return (
                <a
                  key={e}
                  class={`etapa-filtro ${info.clase}` + (activa ? ' etapa-filtro--activo' : '')}
                  href={href({ etapa: e })}
                  title={info.ayuda}
                  aria-current={activa ? 'true' : undefined}
                >
                  <Icon name={info.icono} size={15} /> {info.titulo}
                  {resumen ? <span class="etapa-filtro__n">{resumen.etapas[e]}</span> : null}
                </a>
              )
            })}
          </div>

          {items.length === 0 ? (
            <div class="vacio">
              <span class="vacio__icono" aria-hidden="true">
                <Icon name="mdi:folder-search-outline" size={30} />
              </span>
              <strong class="vacio__titulo">No hay registros</strong>
              <p class="vacio__texto">
                {hayFiltros
                  ? 'Ninguna participación coincide con la búsqueda o los filtros elegidos.'
                  : origen === 'fisica'
                    ? 'Todavía no se ha capturado ninguna participación en ventanilla.'
                    : 'Todavía no ha llegado ninguna participación desde el portal.'}
              </p>
              {hayFiltros ? (
                <a class="btn btn--white btn--sm" href={limpiarHref}>
                  <Icon name="mdi:close" size={14} /> Quitar filtros
                </a>
              ) : origen === 'fisica' ? (
                <a class="btn btn--green btn--sm" href={adminRoutes.presencial.href()}>
                  <Icon name="mdi:plus" size={14} /> Registrar participación
                </a>
              ) : null}
            </div>
          ) : (
            <div class="table-wrap table-wrap--lista">
              <table class="tabla-lista">
                <thead>
                  <tr>
                    <th scope="col">Participación</th>
                    <th scope="col">Dictamen</th>
                    <th scope="col">Seguimiento</th>
                    <th scope="col">Registro</th>
                    <th scope="col">Archivos</th>
                    <th scope="col" class="tabla-lista__acciones">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((p) => {
                    const info = infoEtapa(p)
                    // El renglón de abajo nunca queda vacío: si falta algo por hacer lo dice;
                    // si ya se avisó, dice cuándo.
                    const pista =
                      info.pendiente ||
                      (p.notificado_en ? `Enviado el ${formatearFecha(p.notificado_en)}` : '')
                    return (
                      <tr key={p.id}>
                        <td data-label="Participación" class="tabla-lista__principal">
                          <div class="celda-doble">
                            <a
                              class="celda-doble__titulo"
                              href={adminRoutes.participacionDetalle.href({ id: p.id })}
                              title="Ver el detalle de esta participación"
                            >
                              {p.nombre}
                            </a>
                            <span class="celda-doble__sub celda-doble__sub--folio">{p.folio}</span>
                          </div>
                        </td>
                        <td data-label="Dictamen">
                          <span class={'badge ' + (ESTADO_BADGE[p.estado] ?? 'en-proceso')}>
                            {p.estado}
                          </span>
                        </td>
                        <td data-label="Seguimiento">
                          <span class={`etapa-badge ${info.clase}`} title={info.ayuda}>
                            <span class="etapa-badge__icono">
                              <Icon name={info.icono} size={15} />
                            </span>
                            <span class="etapa-badge__texto">
                              <strong>{info.titulo}</strong>
                              {pista ? <small>{pista}</small> : null}
                            </span>
                          </span>
                        </td>
                        <td data-label="Registro">
                          <div class="celda-doble">
                            <span class="celda-doble__titulo celda-doble__titulo--fecha">
                              {formatearFecha(p.fecha)}
                            </span>
                            <span class="celda-doble__sub">{formatearHora(p.fecha)} h</span>
                          </div>
                        </td>
                        <td data-label="Archivos">
                          {p.adjuntos.length === 0 ? (
                            <span class="archivos archivos--ninguno">
                              <span aria-hidden="true">—</span>
                              <span class="solo-lector">Sin archivos</span>
                            </span>
                          ) : (
                            <span
                              class="archivos"
                              title={p.adjuntos
                                .map((a) => `${a.nombre_original} (${fmtSize(a.size)})`)
                                .join('\n')}
                            >
                              <Icon name="mdi:paperclip" size={15} />
                              {cuantosArchivos(p.adjuntos.length)}
                            </span>
                          )}
                        </td>
                        <td data-label="Acciones" class="tabla-lista__acciones">
                          <div class="acciones-fila">
                            <a
                              class="btn btn--green btn--sm"
                              href={adminRoutes.participacionDetalle.href({ id: p.id })}
                              title="Ver el detalle, dictaminar y avisar al ciudadano"
                              aria-label={`Ver el detalle del folio ${p.folio}`}
                            >
                              <Icon name="mdi:eye-outline" size={15} /> Ver
                            </a>
                            <a
                              class="btn btn--white btn--sm btn--icono"
                              href={adminRoutes.participacionAcuse.href({ id: p.id })}
                              download={`Acuse ${p.folio}.pdf`}
                              title={`Descargar el acuse PDF del folio ${p.folio}`}
                              aria-label={`Descargar el acuse PDF del folio ${p.folio}`}
                            >
                              <Icon name="mdi:file-pdf-box" size={16} />
                              <span class="btn__texto">Acuse</span>
                            </a>
                            {p.adjuntos.length > 0 ? (
                              <a
                                class="btn btn--white btn--sm btn--icono"
                                href={adminRoutes.word.href({ id: p.id })}
                                title="Descargar los datos en Word (.docx)"
                                aria-label={`Descargar los datos del folio ${p.folio} en Word`}
                              >
                                <Icon name="mdi:file-word-outline" size={16} />
                                <span class="btn__texto">Datos</span>
                              </a>
                            ) : null}
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}

          {total > 0 ? (
            <div class="paginacion">
              <span class="paginacion__meta">
                Mostrando {desde}–{hasta} de {total} {total === 1 ? 'registro' : 'registros'}
              </span>
              {total > TAMANOS[0] ? (
                <div class="paginacion__tamano" role="group" aria-label="Registros por página">
                  <span>Por página</span>
                  {TAMANOS.map((n) => (
                    <a
                      key={n}
                      class={'paginacion__link' + (n === limit ? ' paginacion__link--activo' : '')}
                      href={href({ limit: n, page: 1 })}
                      aria-current={n === limit ? 'true' : undefined}
                    >
                      {n}
                    </a>
                  ))}
                </div>
              ) : null}
              {totalPages > 1 ? (
                <nav class="paginacion__nav" aria-label="Paginación">
                  {page > 1 ? (
                    <a class="paginacion__link" href={paginaHref(page - 1)}>
                      ← Anterior
                    </a>
                  ) : (
                    <span class="paginacion__link paginacion__link--disabled" aria-hidden="true">
                      ← Anterior
                    </span>
                  )}
                  {paginasVisibles(page, totalPages).map((p, i) =>
                    p === '…' ? (
                      <span key={`e${i}`} class="paginacion__ellipsis" aria-hidden="true">
                        …
                      </span>
                    ) : (
                      <a
                        key={p}
                        class={'paginacion__link' + (p === page ? ' paginacion__link--activo' : '')}
                        href={paginaHref(p)}
                        aria-current={p === page ? 'page' : undefined}
                      >
                        {p}
                      </a>
                    ),
                  )}
                  {page < totalPages ? (
                    <a class="paginacion__link" href={paginaHref(page + 1)}>
                      Siguiente →
                    </a>
                  ) : (
                    <span class="paginacion__link paginacion__link--disabled" aria-hidden="true">
                      Siguiente →
                    </span>
                  )}
                </nav>
              ) : null}
            </div>
          ) : null}
        </div>
      </AdminLayout>
    )
  }
}
