/**
 * Pestaña «Historial de cambios»: quién cambió la marca, cuándo y por qué, y la forma de
 * volver a cualquiera de esas versiones.
 *
 * Es la misma tabla que el resto de listados del panel (celda doble, acciones con nombre,
 * tarjetas cuando no hay ancho). La versión más reciente se marca como «Actual» y no
 * ofrece restaurarse: ya es lo que está publicado.
 */
import type { Handle } from 'remix/ui'

import { adminRoutes } from '../../routes.ts'
import { Icon } from '../../ui/admin/icon.tsx'
import { formatearFecha, formatearHora } from '../../ui/admin/formato.ts'
import { diaEnMexico, hoyEnMexico, relativoA } from '../../utils/calendario.ts'

export interface AuditLogEntry {
  id: string
  user_name: string
  user_email: string
  motivo: string
  section: string
  created_at: string
}

export interface HistorialCambiosProps {
  registros: AuditLogEntry[]
}

/** Cómo se llama y cómo se dibuja cada sección del historial. */
const SECCIONES: Record<string, { nombre: string; icono: string }> = {
  usuario: { nombre: 'Portal ciudadano', icono: 'mdi:web' },
  panel: { nombre: 'Panel', icono: 'mdi:view-dashboard-outline' },
  general: { nombre: 'General', icono: 'mdi:cog-outline' },
}

/** Las iniciales de quien hizo el cambio, para el círculo de la lista. */
export function inicialesDe(nombre: string): string {
  const palabras = nombre.trim().split(/\s+/).filter(Boolean)
  if (palabras.length === 0) return '?'
  const primera = palabras[0][0] ?? ''
  const ultima = palabras.length > 1 ? (palabras[palabras.length - 1][0] ?? '') : ''
  return (primera + ultima).toUpperCase()
}

/**
 * El número de versión tal como se lee: los identificadores son UUID y completos ocupan
 * toda la columna. Con los primeros ocho caracteres basta para distinguirlas; el completo
 * va en el tooltip.
 */
export function versionCorta(id: string): string {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-/i.test(id) ? id.slice(0, 8) : id
}

/** «Hoy», «Ayer», «Hace 3 días»…; vacío si la fecha no se puede leer. */
function cuando(creado: string): string {
  const instante = new Date(creado)
  const dia = diaEnMexico(instante)
  return dia ? relativoA(hoyEnMexico(), dia) : ''
}

export function HistorialCambios(handle: Handle<HistorialCambiosProps>) {
  return () => {
    const { registros } = handle.props
    return (
      <section class="panel pz-historial">
        <div class="pz-historial__cabecera">
          <div>
            <h2 class="panel__title panel__title--icono">
              <Icon name="mdi:history" /> Historial de cambios
            </h2>
            <p class="pz-historial__descripcion">
              Cada vez que se guarda la marca queda un registro con quién lo hizo, cuándo y por qué.
              Puedes volver a cualquier versión: restaurarla guarda un registro nuevo, no borra
              nada.
            </p>
          </div>
          {registros.length > 0 ? (
            <label class="lista-busqueda pz-historial__buscar">
              <Icon name="mdi:magnify" size={18} />
              <input
                type="search"
                placeholder="Buscar por persona, motivo o sección…"
                aria-label="Buscar en el historial de cambios"
                autocomplete="off"
                data-pz-filtro="pz-historial-filas"
              />
            </label>
          ) : null}
        </div>

        {registros.length === 0 ? (
          <div class="vacio">
            <span class="vacio__icono" aria-hidden="true">
              <Icon name="mdi:history" size={30} />
            </span>
            <strong class="vacio__titulo">Aún no hay cambios registrados</strong>
            <p class="vacio__texto">
              Cuando guardes cambios en el portal o en el panel, aparecerán aquí con su motivo.
            </p>
          </div>
        ) : (
          <>
            <div class="table-wrap table-wrap--lista">
              <table class="tabla-lista pz-tabla">
                <thead>
                  <tr>
                    <th scope="col" class="col-justa">
                      Versión
                    </th>
                    <th scope="col">Quién y por qué</th>
                    <th scope="col" class="col-justa">
                      Cuándo
                    </th>
                    <th scope="col" class="col-justa">
                      Sección
                    </th>
                    <th scope="col" class="col-justa tabla-lista__acciones">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody id="pz-historial-filas" data-pz-filas>
                  {registros.map((r, i) => {
                    const seccion = SECCIONES[r.section] ?? {
                      nombre: r.section || 'General',
                      icono: 'mdi:cog-outline',
                    }
                    const actual = i === 0
                    return (
                      <tr
                        key={r.id}
                        data-busqueda={`${r.user_name} ${r.user_email} ${r.motivo} ${seccion.nombre}`.toLowerCase()}
                      >
                        <td data-label="Versión" class="col-justa">
                          <span class="pz-version">
                            <strong title={`Versión ${r.id}`}>#{versionCorta(r.id)}</strong>
                            {actual ? <span class="pz-version__actual">Actual</span> : null}
                          </span>
                        </td>
                        <td data-label="Quién y por qué" class="tabla-lista__principal">
                          <div class="pz-autor">
                            <span class="pz-autor__avatar" aria-hidden="true">
                              {inicialesDe(r.user_name)}
                            </span>
                            <div class="celda-doble">
                              <span class="celda-doble__titulo">{r.user_name}</span>
                              <span class="celda-doble__sub">{r.user_email}</span>
                              <span class="pz-autor__motivo">«{r.motivo}»</span>
                            </div>
                          </div>
                        </td>
                        <td data-label="Cuándo" class="col-justa">
                          <div class="celda-doble">
                            <span class="celda-doble__titulo celda-doble__titulo--fecha">
                              {formatearFecha(r.created_at)}
                            </span>
                            <span class="celda-doble__sub">
                              {formatearHora(r.created_at)} h
                              {cuando(r.created_at) ? ` · ${cuando(r.created_at)}` : ''}
                            </span>
                          </div>
                        </td>
                        <td data-label="Sección" class="col-justa">
                          <span class="pz-seccion-chip">
                            <Icon name={seccion.icono} size={14} /> {seccion.nombre}
                          </span>
                        </td>
                        <td data-label="Acciones" class="col-justa tabla-lista__acciones">
                          {actual ? (
                            <span class="pz-version__nota">Es la que está publicada</span>
                          ) : (
                            <form
                              method="post"
                              action={adminRoutes.personalizacion.index.href()}
                              class="form-en-linea"
                              data-confirmar={`¿Restaurar la versión #${versionCorta(r.id)}, del ${formatearFecha(r.created_at)}? Se volverá a aplicar la configuración de ese momento y quedará anotado en el historial.`}
                            >
                              <input type="hidden" name="_action" value="restore" />
                              <input type="hidden" name="log_id" value={r.id} />
                              <input type="hidden" name="tab" value="historial" />
                              <button
                                type="submit"
                                class="btn btn--white btn--sm"
                                title={`Restaurar la versión #${versionCorta(r.id)}`}
                                aria-label={`Restaurar la versión #${versionCorta(r.id)}, del ${formatearFecha(r.created_at)}`}
                              >
                                <Icon name="mdi:backup-restore" size={15} /> Restaurar
                              </button>
                            </form>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            <p class="pz-historial__vacio" data-pz-filtro-vacio="pz-historial-filas" hidden>
              Ninguna versión coincide con la búsqueda.
            </p>
            <div class="paginacion">
              <span class="paginacion__meta" data-pz-filtro-conteo="pz-historial-filas">
                {registros.length} {registros.length === 1 ? 'versión' : 'versiones'}
              </span>
            </div>
          </>
        )}
      </section>
    )
  }
}
