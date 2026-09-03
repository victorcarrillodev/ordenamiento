import type { Handle } from 'remix/ui'

import { CATEGORIAS_POEL } from '../../data/poetdum.ts'
import { adminRoutes, routes } from '../../routes.ts'
import { AdminAlert } from '../../ui/admin/alert.tsx'
import { AdminLayout } from '../../ui/admin/admin-layout.tsx'
import { Button } from '../../ui/button.tsx'
import { Icon } from '../../ui/admin/icon.tsx'
import { MapaSelector } from './public/mapa-selector.tsx'

interface Sesion {
  id: string
  categoria: string
  orden: number
  titulo: string
  descripcion: string
  fecha: string | null
  ubicacion: string
  activo: boolean
  latitud: string
  longitud: string
  imagen_nombre: string
}

export interface ArchivoPoel {
  id: string
  tipo: 'imagen' | 'documento'
  nombre_original: string
  mime: string
  size: number
}

export type PoelFeedback = 'creada' | 'editada' | 'imagen' | 'archivo' | 'estado' | 'error'

export interface PoelPageProps {
  user: { name: string; role: string }
  sesiones: Sesion[]
  /** Archivos por sesión, indexados por id de sesión. */
  archivos: Record<string, ArchivoPoel[]>
  feedback?: PoelFeedback
  error?: string
}

const AVISOS: Record<PoelFeedback, { clase: string; texto: string }> = {
  creada: { clase: 'form-ok', texto: '✓ Sesión añadida.' },
  editada: { clase: 'form-ok', texto: '✓ Cambios guardados.' },
  imagen: { clase: 'form-ok', texto: '✓ Imagen actualizada.' },
  archivo: { clase: 'form-ok', texto: '✓ Archivos actualizados.' },
  estado: { clase: 'form-ok', texto: '✓ Visibilidad actualizada.' },
  error: {
    clase: 'form-error',
    texto: '⚠️ No se pudo guardar. Revisa los datos e inténtalo de nuevo.',
  },
}

/** La ubicación puede venir como texto o como enlace de Maps pegado. */
function esEnlace(v: string): boolean {
  const t = v.trim()
  return t.startsWith('http://') || t.startsWith('https://')
}

function fmtPeso(bytes: number): string {
  if (!bytes) return ''
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function fmtFecha(v: string | null): string {
  if (!v) return 'Sin fecha'
  const d = new Date(v + 'T12:00:00')
  return isNaN(d.getTime())
    ? v
    : d.toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' })
}

/**
 * Campos de ubicación.
 *
 * Lo único obligatorio en la práctica es la primera casilla, que acepta lo que
 * el admin tenga a mano: la dirección escrita o un enlace de Google Maps pegado
 * tal cual (que es como se viene capturando en el sitio en vivo).
 *
 * Las coordenadas son OPCIONALES y nadie tiene que saberlas: se rellenan solas
 * al hacer clic en el mapa, o al pegar un enlace de Maps que ya las traiga.
 * Sirven únicamente para poder pintar el punto; sin ellas todo sigue igual.
 */
function CamposUbicacion(
  handle: Handle<{ destino: string; ubicacion?: string; latitud?: string; longitud?: string }>,
) {
  return () => {
    const { destino, ubicacion = '', latitud = '', longitud = '' } = handle.props
    return (
      <div class="poel-ubicacion">
        <div class="form-field">
          <label for={`ubicacion_${destino}`}>Ubicación</label>
          <input
            id={`ubicacion_${destino}`}
            name="ubicacion"
            value={ubicacion}
            placeholder="Casa de la Cultura, Centro — o pega un enlace de Google Maps"
          />
          <small class="breadcrumb">
            Escribe la dirección como quieras que se lea, o pega el enlace de Google Maps. Si el
            enlace trae coordenadas, se copian solas abajo.
          </small>
        </div>

        <details class="poel-coords-detalle">
          <summary>
            <Icon name="mdi:crosshairs-gps" size={14} /> Punto exacto en el mapa (opcional)
          </summary>

          <p class="breadcrumb" style="margin:8px 0;">
            No hace falta que sepas las coordenadas: haz clic en el mapa y se llenan solas. Si no
            ubicas el punto exacto, déjalo vacío — con la dirección de arriba es suficiente.
          </p>

          <div class="poel-coords">
            <div class="form-field">
              <label for={`lat_${destino}`}>Latitud</label>
              <input
                id={`lat_${destino}`}
                name="latitud"
                value={latitud}
                placeholder="Se llena al hacer clic"
              />
            </div>
            <div class="form-field">
              <label for={`lng_${destino}`}>Longitud</label>
              <input
                id={`lng_${destino}`}
                name="longitud"
                value={longitud}
                placeholder="Se llena al hacer clic"
              />
            </div>
          </div>

          <MapaSelector destino={destino} latitud={latitud} longitud={longitud} />
        </details>
      </div>
    )
  }
}

/** Ficha de una sesión: resumen siempre visible y edición desplegable. */
function FichaSesion(handle: Handle<{ s: Sesion; archivos: ArchivoPoel[] }>) {
  return () => {
    const { s, archivos } = handle.props
    const tieneMapa = Boolean(s.latitud && s.longitud)
    const imagenes = archivos.filter((a) => a.tipo === 'imagen')
    const documentos = archivos.filter((a) => a.tipo === 'documento')

    return (
      <article class={'poel-card' + (s.activo ? '' : ' poel-card--inactiva')}>
        <div class="poel-card__cabecera">
          <div class="poel-card__identidad">
            <span class="poel-card__orden" title="Orden de aparición">
              {s.orden}
            </span>
            <div>
              <h3 class="poel-card__titulo">{s.titulo}</h3>
              <span class="poel-card__categoria">{s.categoria}</span>
            </div>
          </div>

          <div class="poel-card__acciones">
            <span class={'badge ' + (s.activo ? 'procedente' : 'no-procedente')}>
              {s.activo ? 'Visible' : 'Oculta'}
            </span>
            {/* Activar/desactivar es su propio formulario: un update parcial que
                no arrastra el resto de los campos ni pisa otra edición. */}
            <form method="post" class="poel-inline">
              <input type="hidden" name="intent" value="activo" />
              <input type="hidden" name="id" value={s.id} />
              <input type="hidden" name="activo" value={s.activo ? '0' : '1'} />
              <Button
                buttonType="submit"
                variant={s.activo ? 'outlined' : 'primary'}
                size="sm"
                title={s.activo ? 'Ocultar del sitio público' : 'Mostrar en el sitio público'}
              >
                <Icon name={s.activo ? 'mdi:eye-off-outline' : 'mdi:eye-outline'} />
              </Button>
            </form>
            <form method="post" class="poel-inline">
              <input type="hidden" name="intent" value="eliminar" />
              <input type="hidden" name="id" value={s.id} />
              <Button
                buttonType="submit"
                variant="danger"
                size="sm"
                title={`Eliminar "${s.titulo}"`}
              >
                <Icon name="mdi:trash-can-outline" />
              </Button>
            </form>
          </div>
        </div>

        <div class="poel-card__resumen">
          <span>
            <Icon name="mdi:calendar-outline" size={14} /> {fmtFecha(s.fecha)}
          </span>
          <span>
            <Icon name="mdi:map-marker-outline" size={14} />{' '}
            {s.ubicacion ? (
              esEnlace(s.ubicacion) ? (
                <a href={s.ubicacion} target="_blank" rel="noopener noreferrer">
                  Abrir ubicación
                </a>
              ) : (
                s.ubicacion
              )
            ) : (
              'Sin ubicación'
            )}
          </span>
          {tieneMapa ? (
            <a
              href={`https://www.openstreetmap.org/?mlat=${s.latitud}&mlon=${s.longitud}#map=17/${s.latitud}/${s.longitud}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              <Icon name="mdi:open-in-new" size={14} /> Ver en el mapa
            </a>
          ) : null}
          {archivos.length > 0 ? (
            <span>
              <Icon name="mdi:paperclip" size={14} /> {imagenes.length} imagen
              {imagenes.length === 1 ? '' : 'es'} · {documentos.length} documento
              {documentos.length === 1 ? '' : 's'}
            </span>
          ) : null}
        </div>

        {s.descripcion ? <p class="poel-card__desc">{s.descripcion}</p> : null}

        <details class="poel-editar">
          <summary>
            <Icon name="mdi:pencil-outline" size={14} /> Editar esta sesión
          </summary>

          <div class="poel-editar__cuerpo">
            <form method="post" class="poel-form">
              <input type="hidden" name="intent" value="editar" />
              <input type="hidden" name="id" value={s.id} />

              <div class="poel-form__fila">
                <div class="form-field poel-form__orden">
                  <label for={`orden_${s.id}`}>Orden</label>
                  <input
                    id={`orden_${s.id}`}
                    name="orden"
                    type="number"
                    min="0"
                    value={String(s.orden)}
                  />
                </div>
                <div class="form-field">
                  <label for={`categoria_${s.id}`}>Categoría</label>
                  <select id={`categoria_${s.id}`} name="categoria" required>
                    {CATEGORIAS_POEL.map((c) => (
                      <option key={c} value={c} selected={c === s.categoria}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
                <div class="form-field">
                  <label for={`fecha_${s.id}`}>Fecha</label>
                  <input id={`fecha_${s.id}`} name="fecha" type="date" value={s.fecha ?? ''} />
                </div>
              </div>

              <div class="form-field">
                <label for={`titulo_${s.id}`}>Título</label>
                <input id={`titulo_${s.id}`} name="titulo" value={s.titulo} required />
              </div>

              <div class="form-field">
                <label for={`descripcion_${s.id}`}>Descripción</label>
                <textarea
                  id={`descripcion_${s.id}`}
                  name="descripcion"
                  rows={3}
                  value={s.descripcion}
                />
              </div>

              <CamposUbicacion
                destino={s.id}
                ubicacion={s.ubicacion}
                latitud={s.latitud}
                longitud={s.longitud}
              />

              <Button buttonType="submit" variant="dark">
                Guardar cambios
              </Button>
            </form>

            {/* Los archivos van en su propio formulario porque necesita multipart. */}
            <div class="poel-archivos">
              <h4 class="poel-imagen__titulo">
                <Icon name="mdi:paperclip" /> Archivos de la sesión
              </h4>

              {imagenes.length > 0 ? (
                <div class="poel-galeria">
                  {imagenes.map((a) => (
                    <figure key={a.id} class="poel-galeria__item">
                      <img
                        src={adminRoutes.poelArchivo.href({ aid: a.id })}
                        alt={a.nombre_original}
                      />
                      <figcaption title={a.nombre_original}>{a.nombre_original}</figcaption>
                      <form method="post" class="poel-inline">
                        <input type="hidden" name="intent" value="archivo_eliminar" />
                        <input type="hidden" name="aid" value={a.id} />
                        <Button
                          buttonType="submit"
                          variant="danger"
                          size="sm"
                          title={`Quitar ${a.nombre_original}`}
                        >
                          <Icon name="mdi:close" size={12} />
                        </Button>
                      </form>
                    </figure>
                  ))}
                </div>
              ) : null}

              {documentos.length > 0 ? (
                <ul class="poel-docs">
                  {documentos.map((a) => (
                    <li key={a.id}>
                      <a
                        href={`${adminRoutes.poelArchivo.href({ aid: a.id })}?download=1`}
                        title={`Descargar ${a.nombre_original}`}
                      >
                        <Icon name="mdi:file-document-outline" size={14} /> {a.nombre_original}
                      </a>
                      <span class="poel-docs__peso">{fmtPeso(a.size)}</span>
                      <form method="post" class="poel-inline">
                        <input type="hidden" name="intent" value="archivo_eliminar" />
                        <input type="hidden" name="aid" value={a.id} />
                        <Button
                          buttonType="submit"
                          variant="danger"
                          size="sm"
                          title={`Quitar ${a.nombre_original}`}
                        >
                          <Icon name="mdi:close" size={12} />
                        </Button>
                      </form>
                    </li>
                  ))}
                </ul>
              ) : null}

              {archivos.length === 0 ? (
                <p class="empty" style="margin:0 0 10px;">
                  Esta sesión todavía no tiene archivos.
                </p>
              ) : null}

              <form method="post" enctype="multipart/form-data">
                <input type="hidden" name="intent" value="archivo" />
                <input type="hidden" name="id" value={s.id} />

                <div class="form-field">
                  <label for={`archivo_${s.id}`}>Subir desde tu computadora</label>
                  {/* Sin `accept`: se admite lo mismo que en los adjuntos
                      ciudadanos y el backend valida por firma binaria. Las
                      imágenes se separan de los documentos por su extensión. */}
                  <input id={`archivo_${s.id}`} name="archivo" type="file" multiple required />
                  <small class="breadcrumb">
                    Imágenes (JPG, PNG, WEBP, GIF) y documentos (PDF, Word, Excel…). Puedes
                    seleccionar varios a la vez; se añaden a los que ya hay.
                  </small>
                </div>

                <Button buttonType="submit" variant="primary">
                  Subir archivos
                </Button>
              </form>
            </div>
          </div>
        </details>
      </article>
    )
  }
}

export function PoelPage(handle: Handle<PoelPageProps>) {
  return () => {
    const { user, sesiones, archivos, feedback, error } = handle.props
    const visibles = sesiones.filter((s) => s.activo).length

    return (
      <AdminLayout
        user={user}
        active="poel"
        title="Sesiones POEL"
        subtitle="Sesiones del Programa de Ordenamiento Ecológico Local, con su acta, imagen y anexos."
        actions={
          <a
            class="btn btn--white"
            href={`${routes.poetdum.show.href()}#sesiones`}
            target="_blank"
            rel="noreferrer"
          >
            <Icon name="mdi:open-in-new" size={16} /> Ver en el portal
          </a>
        }
      >
        {error ? <AdminAlert type="error" message={error} /> : null}
        {feedback ? <p class={AVISOS[feedback].clase}>{AVISOS[feedback].texto}</p> : null}

        <section class="panel panel--suave">
          <h2 class="panel__title panel__title--icono">
            <Icon name="mdi:playlist-plus" /> Añadir sesión
          </h2>
          <form method="post" class="poel-form">
            <input type="hidden" name="intent" value="crear" />

            <div class="poel-form__fila">
              <div class="form-field poel-form__orden">
                <label for="orden_nueva">Orden</label>
                <input
                  id="orden_nueva"
                  name="orden"
                  type="number"
                  min="0"
                  value={String(sesiones.length + 1)}
                />
              </div>
              <div class="form-field">
                <label for="categoria_nueva">Categoría</label>
                <select id="categoria_nueva" name="categoria" required>
                  {CATEGORIAS_POEL.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
              <div class="form-field">
                <label for="fecha_nueva">Fecha</label>
                <input id="fecha_nueva" name="fecha" type="date" />
              </div>
            </div>

            <div class="form-field">
              <label for="titulo_nueva">Título</label>
              <input
                id="titulo_nueva"
                name="titulo"
                required
                placeholder="Ej. Taller sectorial 1"
              />
            </div>

            <div class="form-field">
              <label for="descripcion_nueva">Descripción</label>
              <textarea id="descripcion_nueva" name="descripcion" rows={2} value="" />
            </div>

            <CamposUbicacion destino="nueva" />

            <Button buttonType="submit" variant="dark">
              ＋ Añadir sesión
            </Button>
          </form>
        </section>

        <section class="panel panel--suave">
          <div class="panel__head">
            <h2 class="panel__title panel__title--icono" style="margin:0;">
              <Icon name="mdi:format-list-bulleted" /> Sesiones registradas
            </h2>
            <span class="breadcrumb" style="margin:0;">
              {visibles} visible{visibles === 1 ? '' : 's'} de {sesiones.length}
            </span>
          </div>

          {sesiones.length === 0 ? (
            <p class="empty">Todavía no hay sesiones registradas.</p>
          ) : (
            <div class="poel-lista">
              {sesiones.map((s) => (
                <FichaSesion key={s.id} s={s} archivos={archivos[s.id] ?? []} />
              ))}
            </div>
          )}
        </section>
      </AdminLayout>
    )
  }
}
