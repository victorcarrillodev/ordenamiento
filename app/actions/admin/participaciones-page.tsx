import type { Handle } from 'remix/ui'

import { adminRoutes } from '../../routes.ts'
import { AdminLayout } from '../../ui/admin/admin-layout.tsx'
import { ETAPAS, infoEtapa, INFO_ETAPA, type Etapa } from './etapa.ts'

interface Adjunto {
  id: number
  nombre_original: string
  mime: string
  size: number
}

interface ParticipationRow {
  id: number
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
}

const ESTADO_BADGE: Record<string, string> = {
  Procedente: 'procedente',
  'En proceso': 'en-proceso',
  'No procedente': 'no-procedente',
}

function fmtFecha(v: unknown): string {
  const s = String(v ?? '')
  const d = new Date(s.replace(' ', 'T'))
  return isNaN(d.getTime()) ? s : d.toLocaleDateString('es-MX')
}

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
    const { user, origen, items, etapa, page, limit, total } = handle.props
    const titulo =
      origen === 'fisica'
        ? 'Gestión de participaciones físicas'
        : 'Gestión de participaciones digitales'

    const totalPages = Math.max(1, Math.ceil(total / limit))
    const desde = total === 0 ? 0 : (page - 1) * limit + 1
    const hasta = Math.min(total, page * limit)

    // El enlace conserva los filtros activos (origen/etapa) junto a la página.
    const paginaHref = (p: number) =>
      `${adminRoutes.participaciones.href()}?origen=${origen}` +
      (etapa ? `&etapa=${encodeURIComponent(etapa)}` : '') +
      `&limit=${limit}&page=${p}`

    return (
      <AdminLayout user={user} active="participaciones" title={titulo}>
        <h1 class="page-title">{titulo}</h1>
        <p class="breadcrumb">
          <a href={adminRoutes.index.href()}>Vista general</a> / {titulo}
        </p>

        <div class="panel">
          {origen === 'fisica' ? (
            <div class="panel__head">
              <a
                class="btn btn--green"
                href={`${adminRoutes.participacionNueva.index.href()}?origen=fisica`}
              >
                ＋ Ingresa aquí tu participación
              </a>
            </div>
          ) : null}
          <div class="etapa-filtros">
            <span class="meta-label">Seguimiento</span>
            <a
              class={'etapa-filtro' + (etapa ? '' : ' etapa-filtro--activo')}
              href={`${adminRoutes.participaciones.href()}?origen=${origen}`}
            >
              Todas
            </a>
            {ETAPAS.map((e) => {
              const info = INFO_ETAPA[e]
              return (
                <a
                  key={e}
                  class={
                    `etapa-filtro ${info.clase}` + (etapa === e ? ' etapa-filtro--activo' : '')
                  }
                  href={`${adminRoutes.participaciones.href()}?origen=${origen}&etapa=${encodeURIComponent(e)}`}
                >
                  {info.icono} {info.titulo}
                </a>
              )
            })}
          </div>
          <div class="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Folio</th>
                  <th>Nombre</th>
                  <th>Estatus</th>
                  <th>Seguimiento</th>
                  <th>Registro</th>
                  <th>Adjuntos</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {items.length === 0 ? (
                  <tr>
                    <td colspan={7} class="empty">
                      No hay registros
                    </td>
                  </tr>
                ) : (
                  items.map((p) => (
                    <tr key={p.id}>
                      <td>{p.folio}</td>
                      <td>{p.nombre}</td>
                      <td>
                        <span class={'badge ' + (ESTADO_BADGE[p.estado] ?? 'en-proceso')}>
                          {p.estado}
                        </span>
                      </td>
                      <td>
                        {(() => {
                          const info = infoEtapa(p)
                          return (
                            <span class={`etapa-badge ${info.clase}`} title={info.pendiente}>
                              <span aria-hidden="true">{info.icono}</span> {info.titulo}
                              {info.pendiente ? <small>{info.pendiente}</small> : null}
                            </span>
                          )
                        })()}
                      </td>
                      <td>{fmtFecha(p.fecha)}</td>
                      <td>
                        {p.adjuntos.length === 0 ? (
                          <span class="breadcrumb">sin PDF</span>
                        ) : (
                          p.adjuntos.map((a) => (
                            <span key={a.id}>
                              {a.nombre_original} ({fmtSize(a.size)})
                            </span>
                          ))
                        )}
                      </td>
                      <td>
                        <div style="display: flex; gap: 6px;">
                          <a
                            class="btn btn--green"
                            href={adminRoutes.participacionDetalle.href({ id: p.id })}
                            title="Ver detalle"
                          >
                            👁 Ver
                          </a>
                          {p.adjuntos.length > 0 ? (
                            <a
                              class="btn btn--excel"
                              href={adminRoutes.word.href({ id: p.id })}
                              title="Descargar datos (.docx)"
                            >
                              ⬇
                            </a>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {total > 0 ? (
            <div class="paginacion">
              <span class="paginacion__meta">
                Mostrando {desde}–{hasta} de {total} registros
              </span>
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
                        class={
                          'paginacion__link' + (p === page ? ' paginacion__link--activo' : '')
                        }
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
