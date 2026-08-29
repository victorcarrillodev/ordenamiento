import type { Handle } from 'remix/ui'

import { CATEGORIAS_POEL } from '../../data/poetdum.ts'
import { adminRoutes } from '../../routes.ts'
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

export type PoelFeedback = 'creada' | 'editada' | 'imagen' | 'estado' | 'error'

export interface PoelPageProps {
  user: { name: string; role: string }
  sesiones: Sesion[]
  feedback?: PoelFeedback
  error?: string
}

const AVISOS: Record<PoelFeedback, { clase: string; texto: string }> = {
  creada: { clase: 'form-ok', texto: '✓ Sesión añadida.' },
  editada: { clase: 'form-ok', texto: '✓ Cambios guardados.' },
  imagen: { clase: 'form-ok', texto: '✓ Imagen actualizada.' },
  estado: { clase: 'form-ok', texto: '✓ Visibilidad actualizada.' },
  error: {
    clase: 'form-error',
    texto: '⚠️ No se pudo guardar. Revisa los datos e inténtalo de nuevo.',
  },
}

function fmtFecha(v: string | null): string {
  if (!v) return 'Sin fecha'
  const d = new Date(v + 'T12:00:00')
  return isNaN(d.getTime())
    ? v
    : d.toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' })
}

/** Campos de ubicación: dirección escrita + coordenadas + mapa para fijarlas. */
function CamposUbicacion(
  handle: Handle<{ destino: string; ubicacion?: string; latitud?: string; longitud?: string }>,
) {
  return () => {
    const { destino, ubicacion = '', latitud = '', longitud = '' } = handle.props
    return (
      <div class="poel-ubicacion">
        <div class="form-field">
          <label for={`ubicacion_${destino}`}>Ubicación (cómo se lee)</label>
          <input
            id={`ubicacion_${destino}`}
            name="ubicacion"
            value={ubicacion}
            placeholder="Ej. Casa de la Cultura, Centro"
          />
        </div>
        <div class="poel-coords">
          <div class="form-field">
            <label for={`lat_${destino}`}>Latitud</label>
            <input id={`lat_${destino}`} name="latitud" value={latitud} placeholder="20.640900" />
          </div>
          <div class="form-field">
            <label for={`lng_${destino}`}>Longitud</label>
            <input
              id={`lng_${destino}`}
              name="longitud"
              value={longitud}
              placeholder="-103.312600"
            />
          </div>
        </div>
        <p class="breadcrumb" style="margin:0 0 6px;">
          Haz clic en el mapa para fijar el punto, o escribe las coordenadas a mano.
        </p>
        <MapaSelector destino={destino} latitud={latitud} longitud={longitud} />
      </div>
    )
  }
}

/** Ficha de una sesión: resumen siempre visible y edición desplegable. */
function FichaSesion(handle: Handle<{ s: Sesion }>) {
  return () => {
    const { s } = handle.props
    const tieneMapa = Boolean(s.latitud && s.longitud)

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
            <Icon name="mdi:map-marker-outline" size={14} /> {s.ubicacion || 'Sin ubicación'}
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
          {s.imagen_nombre ? (
            <span>
              <Icon name="mdi:image-outline" size={14} /> {s.imagen_nombre}
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

            {/* La imagen va en su propio formulario porque necesita multipart. */}
            <form method="post" enctype="multipart/form-data" class="poel-imagen">
              <input type="hidden" name="intent" value="imagen" />
              <input type="hidden" name="id" value={s.id} />

              <h4 class="poel-imagen__titulo">
                <Icon name="mdi:image-plus-outline" /> Imagen de la sesión
              </h4>

              {s.imagen_nombre ? (
                <img
                  class="poel-imagen__vista"
                  src={adminRoutes.poelImagen.href({ id: s.id })}
                  alt={`Imagen de ${s.titulo}`}
                />
              ) : (
                <p class="empty" style="margin:0 0 10px;">
                  Esta sesión todavía no tiene imagen.
                </p>
              )}

              <div class="form-field">
                <label for={`imagen_${s.id}`}>Subir desde tu computadora</label>
                <input
                  id={`imagen_${s.id}`}
                  name="imagen"
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  required
                />
                <small class="breadcrumb">JPG, PNG, WEBP o GIF. Sustituye a la anterior.</small>
              </div>

              <Button buttonType="submit" variant="primary">
                Subir imagen
              </Button>
            </form>
          </div>
        </details>
      </article>
    )
  }
}

export function PoelPage(handle: Handle<PoelPageProps>) {
  return () => {
    const { user, sesiones, feedback, error } = handle.props
    const visibles = sesiones.filter((s) => s.activo).length

    return (
      <AdminLayout user={user} active="poel" title="Gestión de sesiones POEL">
        <h1 class="page-title">Gestión de sesiones POEL</h1>
        <p class="breadcrumb">
          <a href={adminRoutes.index.href()}>Vista general</a> / Sesiones POEL
        </p>

        {error ? <p class="form-error">{error}</p> : null}
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
                <FichaSesion key={s.id} s={s} />
              ))}
            </div>
          )}
        </section>
      </AdminLayout>
    )
  }
}
