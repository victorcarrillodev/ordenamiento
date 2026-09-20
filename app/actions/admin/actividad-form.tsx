/**
 * Formulario de una actividad del Programa (alta y edición del MISMO registro).
 *
 * Todo lo que el documento pide capturar vive aquí, en el orden en que se
 * completa: primero se programa (datos, lugar, descripción, convocatoria,
 * aviso) y después de realizarse se vuelve al mismo formulario para cambiar el
 * estado y agregar resultados, acuerdos, fotografías y documentos.
 */
import type { Handle } from 'remix/ui'

import {
  ESTADOS_ACTIVIDAD,
  ESTADOS_PUBLICACION,
  ETIQUETA_ESTADO,
  ETIQUETA_PUBLICACION,
  FASES_PROGRAMA,
  TIPOS_ACTIVIDAD,
  TIPOS_DOCUMENTO,
  type EstadoPublicacion,
} from '../../data/programa.ts'
import { Icon } from '../../ui/admin/icon.tsx'
import { Button } from '../../ui/button.tsx'
import { FILAS_DOCUMENTOS, type ValoresActividad } from './actividad-datos.ts'
import { MapaSelector } from './public/mapa-selector.tsx'

/** Sufijo de los ids que enlazan los campos de ubicación con el mapa. */
const DESTINO_MAPA = 'actividad'

const AYUDA_PUBLICACION: Record<EstadoPublicacion, string> = {
  publicado: 'Se muestra en el portal según su estado y sus fechas.',
  borrador: 'No se muestra todavía: puedes seguir completándola.',
  oculto: 'Se retira del portal sin borrarla ni perder sus archivos.',
}

function Opciones(
  handle: Handle<{
    opciones: readonly string[]
    valor?: string
    etiquetas?: Record<string, string>
  }>,
) {
  return () => {
    const { opciones, valor, etiquetas } = handle.props
    return (
      <>
        {opciones.map((opcion) => (
          <option key={opcion} value={opcion} selected={opcion === valor}>
            {etiquetas?.[opcion] ?? opcion}
          </option>
        ))}
      </>
    )
  }
}

export interface ActividadFormularioProps {
  valores: ValoresActividad
  /** Texto del botón principal. */
  enviar: string
}

export function ActividadFormulario(handle: Handle<ActividadFormularioProps>) {
  return () => {
    const { valores: v, enviar } = handle.props
    const publicacion = (v.publicacion || 'publicado') as EstadoPublicacion
    return (
      <form method="post" enctype="multipart/form-data" class="act-form">
        <input type="hidden" name="intent" value="guardar" />

        <section class="panel act-seccion">
          <h2 class="panel__title panel__title--icono">
            <Icon name="mdi:calendar-edit-outline" /> Datos de la actividad
          </h2>
          <div class="form-field">
            <label for="titulo">
              Nombre de la actividad <span class="req">*</span>
            </label>
            <input
              id="titulo"
              name="titulo"
              required
              maxlength={300}
              value={v.titulo ?? ''}
              placeholder="Ej. Sesión de Cabildo para la aprobación del Programa"
            />
          </div>
          <div class="act-grid">
            <div class="form-field">
              <label for="fase">
                Fase del Programa <span class="req">*</span>
              </label>
              <select id="fase" name="fase" required>
                <Opciones opciones={FASES_PROGRAMA} valor={v.fase || 'Formulación'} />
              </select>
            </div>
            <div class="form-field">
              <label for="tipo">
                Tipo de actividad <span class="req">*</span>
              </label>
              <select id="tipo" name="tipo" required>
                <option value="" selected={!v.tipo}>
                  Elige un tipo…
                </option>
                <Opciones opciones={TIPOS_ACTIVIDAD} valor={v.tipo} />
              </select>
            </div>
            <div class="form-field">
              <label for="estado">
                Estado <span class="req">*</span>
              </label>
              <select id="estado" name="estado" required>
                <Opciones
                  opciones={ESTADOS_ACTIVIDAD}
                  valor={v.estado || 'programada'}
                  etiquetas={ETIQUETA_ESTADO}
                />
              </select>
            </div>
          </div>
          <div class="act-grid">
            <div class="form-field">
              <label for="fecha">
                Fecha <span class="req">*</span>
              </label>
              <input id="fecha" name="fecha" type="date" required value={v.fecha ?? ''} />
            </div>
            <div class="form-field">
              <label for="hora_inicio">Hora de inicio</label>
              <input id="hora_inicio" name="hora_inicio" type="time" value={v.hora_inicio ?? ''} />
            </div>
            <div class="form-field">
              <label for="hora_fin">Hora de conclusión</label>
              <input id="hora_fin" name="hora_fin" type="time" value={v.hora_fin ?? ''} />
            </div>
          </div>
          <p class="form-hint">
            Para una acción que ya ocurrió (la firma de un convenio, una aprobación previa),
            regístrala directamente como «Realizada»: aparecerá en Avances del Programa.
          </p>
        </section>

        <section class="panel act-seccion">
          <h2 class="panel__title panel__title--icono">
            <Icon name="mdi:map-marker-outline" /> Lugar
          </h2>
          <div class="act-grid act-grid--2">
            <div class="form-field">
              <label for="lugar">Lugar o sede</label>
              <input
                id="lugar"
                name="lugar"
                maxlength={300}
                value={v.lugar ?? ''}
                placeholder="Ej. Salón de Cabildo"
              />
            </div>
            <div class="form-field">
              <label for={`ubicacion_${DESTINO_MAPA}`}>Dirección</label>
              <input
                id={`ubicacion_${DESTINO_MAPA}`}
                name="direccion"
                maxlength={500}
                value={v.direccion ?? ''}
                placeholder="Calle y número — o pega un enlace de Google Maps"
              />
            </div>
          </div>
          <details class="ubicacion-coords" open={Boolean(v.latitud && v.longitud)}>
            <summary>
              <Icon name="mdi:crosshairs-gps" size={14} /> Ubicación en el mapa (opcional)
            </summary>
            <p class="form-hint">
              Haz clic en el mapa y las coordenadas se llenan solas; si pegas arriba un enlace de
              Google Maps que las traiga, también se copian. Con ellas la ficha pública muestra el
              punto exacto y el botón «Cómo llegar».
            </p>
            <div class="ubicacion-coords__campos">
              <div class="form-field">
                <label for={`lat_${DESTINO_MAPA}`}>Latitud</label>
                <input
                  id={`lat_${DESTINO_MAPA}`}
                  name="latitud"
                  inputmode="decimal"
                  value={v.latitud ?? ''}
                  placeholder="Se llena al hacer clic"
                />
              </div>
              <div class="form-field">
                <label for={`lng_${DESTINO_MAPA}`}>Longitud</label>
                <input
                  id={`lng_${DESTINO_MAPA}`}
                  name="longitud"
                  inputmode="decimal"
                  value={v.longitud ?? ''}
                  placeholder="Se llena al hacer clic"
                />
              </div>
            </div>
            <MapaSelector destino={DESTINO_MAPA} latitud={v.latitud} longitud={v.longitud} />
          </details>
        </section>

        <section class="panel act-seccion">
          <h2 class="panel__title panel__title--icono">
            <Icon name="mdi:text-box-outline" /> Descripción y resultados
          </h2>
          <div class="form-field">
            <label for="descripcion">Descripción</label>
            <textarea
              id="descripcion"
              name="descripcion"
              rows={3}
              maxlength={5000}
              value={v.descripcion ?? ''}
            />
          </div>
          <div class="act-grid act-grid--2">
            <div class="form-field">
              <label for="resultados">Resultado</label>
              <textarea
                id="resultados"
                name="resultados"
                rows={3}
                maxlength={5000}
                value={v.resultados ?? ''}
              />
            </div>
            <div class="form-field">
              <label for="acuerdos">Principales acuerdos</label>
              <textarea
                id="acuerdos"
                name="acuerdos"
                rows={3}
                maxlength={5000}
                value={v.acuerdos ?? ''}
              />
            </div>
          </div>
          <p class="form-hint">
            Completa el resultado y los acuerdos cuando la actividad se haya realizado. Al marcarla
            como «Realizada» pasa sola a Avances del Programa, con todo lo que ya tenía.
          </p>
        </section>

        <section class="panel act-seccion">
          <h2 class="panel__title panel__title--icono">
            <Icon name="mdi:paperclip" /> Fotografías y documentos
          </h2>
          <div class="form-field">
            <label for="fotos">Fotografías</label>
            <input
              id="fotos"
              name="fotos"
              type="file"
              multiple
              accept="image/jpeg,image/png,image/webp,image/gif"
            />
            <small class="form-hint">JPG, PNG, WEBP o GIF. Puedes elegir varias a la vez.</small>
          </div>
          <div class="act-docs">
            <span class="act-docs__titulo">Documentos (convocatoria, acta, acuerdo…)</span>
            {Array.from({ length: FILAS_DOCUMENTOS }, (_, fila) => (
              <div class="act-docs__fila" key={fila}>
                <div class="form-field">
                  <label for={`documentos_tipo_${fila}`}>Tipo de documento</label>
                  <select id={`documentos_tipo_${fila}`} name={`documentos_tipo_${fila}`}>
                    <option value="">Elige el tipo…</option>
                    <Opciones opciones={TIPOS_DOCUMENTO} />
                  </select>
                </div>
                <div class="form-field">
                  <label for={`documentos_${fila}`}>Archivos</label>
                  <input
                    id={`documentos_${fila}`}
                    name={`documentos_${fila}`}
                    type="file"
                    multiple
                  />
                </div>
              </div>
            ))}
            <small class="form-hint">
              Cada grupo lleva su tipo. Los archivos se suman a los que la actividad ya tenga y
              quedan ligados a ella: no hay que volver a cargarlos en ningún otro apartado.
            </small>
          </div>
        </section>

        <section class="panel act-seccion act-aviso">
          <input
            type="checkbox"
            id="aviso_activo"
            name="aviso_activo"
            value="1"
            class="act-aviso__interruptor"
            checked={v.aviso_activo === '1'}
          />
          <label for="aviso_activo" class="act-aviso__etiqueta">
            <Icon name="mdi:bullhorn-outline" /> Mostrar también como aviso
          </label>
          <p class="form-hint act-aviso__ayuda">
            El aviso aparece en la franja superior de la portada solo entre las fechas de
            publicación, y sigue perteneciendo a esta actividad.
          </p>
          <div class="act-aviso__campos">
            <div class="form-field">
              <label for="aviso_titulo">Título del aviso</label>
              <input
                id="aviso_titulo"
                name="aviso_titulo"
                maxlength={200}
                value={v.aviso_titulo ?? ''}
                placeholder="Si lo dejas vacío se usa el nombre de la actividad"
              />
            </div>
            <div class="form-field">
              <label for="aviso_descripcion">Descripción breve</label>
              <textarea
                id="aviso_descripcion"
                name="aviso_descripcion"
                rows={2}
                maxlength={500}
                value={v.aviso_descripcion ?? ''}
              />
            </div>
            <div class="act-grid act-grid--2">
              <div class="form-field">
                <label for="aviso_inicio">Inicio de publicación</label>
                <input
                  id="aviso_inicio"
                  name="aviso_inicio"
                  type="date"
                  value={v.aviso_inicio ?? ''}
                />
                <small class="form-hint">Vacío: desde hoy.</small>
              </div>
              <div class="form-field">
                <label for="aviso_fin">Término de publicación</label>
                <input id="aviso_fin" name="aviso_fin" type="date" value={v.aviso_fin ?? ''} />
                <small class="form-hint">Vacío: hasta el día de la actividad.</small>
              </div>
            </div>
          </div>
        </section>

        <section class="panel act-seccion">
          <h2 class="panel__title panel__title--icono">
            <Icon name="mdi:earth" /> Estado de publicación
          </h2>
          <div class="act-publicacion" role="radiogroup" aria-label="Estado de publicación">
            {ESTADOS_PUBLICACION.map((estado) => (
              <label class="act-publicacion__opcion" key={estado}>
                <input
                  type="radio"
                  name="publicacion"
                  value={estado}
                  checked={estado === publicacion}
                />
                <span>
                  <strong>{ETIQUETA_PUBLICACION[estado]}</strong>
                  <small>{AYUDA_PUBLICACION[estado]}</small>
                </span>
              </label>
            ))}
          </div>
        </section>

        <div class="act-form__acciones">
          <Button buttonType="submit" variant="dark">
            {enviar}
          </Button>
        </div>
      </form>
    )
  }
}
