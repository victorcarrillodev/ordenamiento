import type { Handle } from 'remix/ui'

import { nombreDeArchivo, type DocumentoPublico } from '../../data/programa.ts'
import { routes } from '../../routes.ts'
import { AdminAlert } from '../../ui/admin/alert.tsx'
import { AdminLayout } from '../../ui/admin/admin-layout.tsx'
import { BotonEliminar } from '../../ui/admin/boton-eliminar.tsx'
import { Icon } from '../../ui/admin/icon.tsx'

export interface IndicadorAdmin {
  id: string
  nombre: string
  descripcion: string
  unidad: string
  /** El backend la manda como texto (columna NUMERIC); un número también se acepta. */
  meta: number | string | null
  fecha_evaluacion: string | null
  resultado_texto: string | null
  documento_respaldo: { id: string; titulo: string } | null
  /** Más antigua primero. Pueden faltar en una respuesta de un backend anterior. */
  mediciones?: Array<{ id: string; periodo: string; valor: string }>
}

export interface PortalIndicadoresPageProps {
  user: { name: string; role: string }
  indicadores: IndicadorAdmin[]
  /** Archivos de actividades publicadas que pueden servir de respaldo. */
  documentos: DocumentoPublico[]
  /** Programa aprobado: el portal publica «Seguimiento y evaluación». */
  programaAprobado: boolean
  programaCambiado?: boolean
  error?: string
}

/** «45 %», «120 ha»; sin unidad, solo el número; sin dato, el guion largo. */
function conUnidad(valor: number | string | null | undefined, unidad: string): string {
  if (valor === null || valor === undefined || valor === '') return '—'
  return unidad ? `${valor} ${unidad}` : `${valor}`
}

export function PortalIndicadoresPage(handle: Handle<PortalIndicadoresPageProps>) {
  return () => {
    const { user, indicadores, documentos, programaAprobado, programaCambiado, error } =
      handle.props
    return (
      <AdminLayout
        user={user}
        active="indicadores"
        title="Indicadores"
        subtitle="Seguimiento y evaluación: metas y mediciones del Programa."
        ajustada
        actions={
          <a
            class="btn btn--white"
            href={routes.poetdum.seguimiento.href()}
            target="_blank"
            rel="noreferrer"
          >
            <Icon name="mdi:open-in-new" size={16} /> Ver en el portal
          </a>
        }
      >
        {error ? <AdminAlert type="error" message={error} /> : null}
        {programaCambiado ? (
          <AdminAlert type="success" message="Estado del Programa actualizado en el portal." />
        ) : null}

        <div class="indic">
          <section
            class={`panel indic__programa act-programa${programaAprobado ? ' act-programa--aprobado' : ''}`}
          >
            <div class="indic__programa-texto">
              <h2 class="panel__title panel__title--icono">
                <Icon name="mdi:flag-checkered" /> Estado del Programa:{' '}
                {programaAprobado ? 'aprobado y en aplicación' : 'en elaboración'}
              </h2>
              <p class="form-hint">
                {programaAprobado
                  ? 'El portal muestra en «Seguimiento y evaluación» estos indicadores, con sus metas, mediciones, resultados y documentos de respaldo.'
                  : 'En elaboración, el portal dice en «Seguimiento y evaluación»: «Esta sección estará disponible una vez aprobado el Programa…». Puedes capturar los indicadores desde ahora.'}
              </p>
            </div>
            <form
              method="post"
              class="form-en-linea"
              data-confirmar={
                programaAprobado
                  ? '¿Retirar del portal la sección «Seguimiento y evaluación»?'
                  : '¿Marcar el Programa como aprobado y publicar «Seguimiento y evaluación»?'
              }
            >
              <input type="hidden" name="intent" value="programa" />
              <input type="hidden" name="aprobado" value={programaAprobado ? '0' : '1'} />
              <button type="submit" class={`btn ${programaAprobado ? 'btn--white' : 'btn--dark'}`}>
                <Icon
                  name={programaAprobado ? 'mdi:undo' : 'mdi:check-decagram-outline'}
                  size={16}
                />{' '}
                {programaAprobado
                  ? 'Volver a «en elaboración»'
                  : 'Marcar como aprobado y publicar el seguimiento'}
              </button>
            </form>
          </section>

          <section class="panel indic__nuevo">
            <h2 class="panel__title panel__title--icono">
              <Icon name="mdi:plus-circle" /> Nuevo indicador
            </h2>
            <form method="post" class="indic-form">
              <input type="hidden" name="intent" value="crear" />
              <div class="form-field indic-form__nombre">
                <label for="nombre">Nombre</label>
                <input
                  id="nombre"
                  name="nombre"
                  required
                  maxlength={300}
                  placeholder="Indicador de cobertura…"
                />
              </div>
              <div class="form-field indic-form__unidad">
                <label for="unidad">Unidad</label>
                <input id="unidad" name="unidad" maxlength={50} placeholder="%, ha, km…" />
              </div>
              <div class="form-field indic-form__meta">
                <label for="meta">Meta</label>
                <input id="meta" name="meta" type="number" step="any" placeholder="100" />
              </div>
              <div class="form-field indic-form__fecha">
                <label for="fecha_evaluacion">Fecha de evaluación</label>
                <input
                  id="fecha_evaluacion"
                  name="fecha_evaluacion"
                  maxlength={60}
                  placeholder="2026-06-01 o texto"
                />
              </div>
              <div class="form-field indic-form__descripcion">
                <label for="descripcion">Descripción</label>
                <textarea id="descripcion" name="descripcion" rows={2} maxlength={5000} />
              </div>
              <div class="form-field indic-form__resultado">
                <label for="resultado_texto">Resultado</label>
                <textarea id="resultado_texto" name="resultado_texto" rows={2} maxlength={5000} />
              </div>
              <div class="form-field indic-form__documento">
                <label for="documento_respaldo">Documento de respaldo</label>
                <select id="documento_respaldo" name="documento_respaldo">
                  <option value="">— Sin documento —</option>
                  {documentos.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.actividad_titulo} — {nombreDeArchivo(d)} ({d.tipo})
                    </option>
                  ))}
                </select>
                <small class="form-hint">
                  Los documentos se suben en «Actividades y avances», dentro de su actividad.
                </small>
              </div>

              <fieldset class="indic-form__mediciones">
                <legend>Mediciones (hasta 3)</legend>
                {[1, 2, 3].map((n) => (
                  <div key={n} class="indic-form__medicion">
                    <div class="form-field">
                      <label for={`periodo_${n}`}>Periodo {n}</label>
                      <input
                        id={`periodo_${n}`}
                        name={`periodo_${n}`}
                        maxlength={60}
                        placeholder={String(2023 + n)}
                      />
                    </div>
                    <div class="form-field">
                      <label for={`valor_${n}`}>Valor {n}</label>
                      <input id={`valor_${n}`} name={`valor_${n}`} type="number" step="any" />
                    </div>
                  </div>
                ))}
              </fieldset>

              <div class="indic-form__pie">
                <button type="submit" class="btn btn--dark">
                  <Icon name="mdi:plus" size={16} /> Guardar indicador
                </button>
              </div>
            </form>
          </section>

          <section class="panel indic__lista">
            <h2 class="panel__title panel__title--icono">
              <Icon name="mdi:chart-timeline-variant" /> Indicadores registrados
              <span class="conteo">{indicadores.length}</span>
            </h2>
            {indicadores.length === 0 ? (
              <div class="vacio vacio--compacto">
                <span class="vacio__icono" aria-hidden="true">
                  <Icon name="mdi:chart-timeline-variant" size={22} />
                </span>
                <div>
                  <strong class="vacio__titulo">No hay indicadores registrados</strong>
                  <p class="vacio__texto">
                    Registra el primero con el formulario de arriba; con el Programa aprobado se
                    publica en el portal.
                  </p>
                </div>
              </div>
            ) : (
              <div class="table-wrap table-wrap--lista">
                <table class="tabla-lista indic-tabla">
                  <thead>
                    <tr>
                      <th scope="col">Indicador</th>
                      <th scope="col" class="col-justa">
                        Meta
                      </th>
                      <th scope="col" class="col-justa">
                        Última medición
                      </th>
                      <th scope="col" class="col-justa">
                        Evaluación
                      </th>
                      <th scope="col" class="col-justa">
                        Respaldo
                      </th>
                      <th scope="col" class="col-justa tabla-lista__acciones">
                        Acciones
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {indicadores.map((ind) => {
                      const ultima = ind.mediciones?.at(-1)
                      return (
                        <tr key={ind.id}>
                          <td data-label="Indicador" class="tabla-lista__principal">
                            <div class="celda-doble">
                              <span class="celda-doble__titulo">{ind.nombre}</span>
                              {ind.descripcion ? (
                                <span class="celda-doble__sub indic-tabla__descripcion">
                                  {ind.descripcion}
                                </span>
                              ) : null}
                            </div>
                          </td>
                          <td data-label="Meta" class="col-justa">
                            {conUnidad(ind.meta, ind.unidad)}
                          </td>
                          <td data-label="Última medición" class="col-justa">
                            {ultima ? (
                              <div class="celda-doble">
                                <span class="celda-doble__titulo celda-doble__titulo--fecha">
                                  {conUnidad(ultima.valor, ind.unidad)}
                                </span>
                                {ultima.periodo ? (
                                  <span class="celda-doble__sub">{ultima.periodo}</span>
                                ) : null}
                              </div>
                            ) : (
                              '—'
                            )}
                          </td>
                          <td data-label="Evaluación" class="col-justa">
                            {ind.fecha_evaluacion || '—'}
                          </td>
                          <td data-label="Respaldo" class="col-justa">
                            {ind.documento_respaldo ? (
                              <span class="archivos" title={ind.documento_respaldo.titulo}>
                                <Icon name="mdi:paperclip" size={15} /> Documento
                              </span>
                            ) : (
                              '—'
                            )}
                          </td>
                          <td data-label="Acciones" class="col-justa tabla-lista__acciones">
                            <div class="acciones-fila">
                              <BotonEliminar
                                nombre={ind.nombre}
                                confirmacion={`¿Eliminar el indicador «${ind.nombre}» con todas sus mediciones? No se puede deshacer.`}
                                campos={{ intent: 'eliminar', id: String(ind.id) }}
                              />
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>
      </AdminLayout>
    )
  }
}
