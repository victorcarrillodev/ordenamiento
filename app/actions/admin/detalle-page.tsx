import type { Handle } from 'remix/ui'

import { adminRoutes } from '../../routes.ts'
import { AdminLayout } from '../../ui/admin/admin-layout.tsx'
import { Button } from '../../ui/button.tsx'
import { etapaDe, PASOS } from './etapa.ts'

interface Adjunto {
  id: number
  nombre_original: string
  mime: string
  size: number
}
interface Detalle {
  id: number
  folio: string
  origen: string
  nombre: string
  correo: string
  colonia: string
  municipio: string
  domicilio: string
  municipio_participante: string
  institucion: string
  ocupacion: string
  observacion: string
  estado: string
  fuente: string
  genero: string
  tematica: string
  fecha: string
  resolucion_motivo: string
  resolucion_direccion: string
  resolucion_cita: string
  resolucion_en: string | null
  notificado_en: string | null
  notificado_a: string
  adjuntos: Adjunto[]
}

export type DictamenFeedback = 'notificado' | 'guardado' | 'error' | 'estado'

export interface DetallePageProps {
  user: { name: string; role: string }
  p: Detalle | null
  mail?: 'ok' | 'error' | null
  dictamen?: DictamenFeedback
}

const ESTADO_BADGE: Record<string, string> = {
  Procedente: 'procedente',
  'En proceso': 'en-proceso',
  'No procedente': 'no-procedente',
}

function Campo(handle: Handle<{ label: string; value: string }>) {
  return () => {
    const { label, value } = handle.props
    return (
      <div class="campo">
        <span class="meta-label">{label}</span>
        <span class="campo__value">{value || '—'}</span>
      </div>
    )
  }
}

function fmtFecha(v: string): string {
  const d = new Date(v)
  return isNaN(d.getTime()) ? v : d.toLocaleDateString('es-MX')
}

function fmtSize(bytes: number): string {
  if (!bytes) return '—'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function extensionDe(nombre: string): string {
  const base = nombre.split(/[\\/]/).pop() ?? ''
  const parts = base.split('.')
  return parts.length < 2 ? '' : (parts.pop() ?? '').toLowerCase()
}

/**
 * Visor del adjunto. Se usa `<object>` (y `<img>` para imágenes) a propósito:
 * `<iframe>` lo resuelve el servidor en render.tsx (resolveFrame), que inserta
 * el cuerpo de la respuesta dentro del HTML. Con un PDF eso vuelca bytes
 * binarios en el documento y el visor nunca aparece.
 */
function VistaAdjunto(handle: Handle<{ participacionId: number; adjunto: Adjunto }>) {
  return () => {
    const { participacionId, adjunto } = handle.props
    const href = adminRoutes.adjunto.href({ id: participacionId, aid: adjunto.id })
    const ext = extensionDe(adjunto.nombre_original)
    const esPdf = ext === 'pdf' || adjunto.mime === 'application/pdf'
    const esImagen = ['jpg', 'jpeg', 'png', 'webp', 'gif', 'bmp'].includes(ext)

    if (esImagen) {
      return (
        <img
          class="pdf-frame"
          src={href}
          alt={adjunto.nombre_original}
          style="object-fit:contain;"
        />
      )
    }

    if (!esPdf) {
      return (
        <p class="empty">
          Este adjunto ({adjunto.nombre_original}) no se puede previsualizar en el navegador.
          Descárgalo para abrirlo.
        </p>
      )
    }

    return (
      <object class="pdf-frame" type="application/pdf" data={href}>
        <p class="empty">
          Tu navegador no puede mostrar el PDF aquí. <a href={`${href}?download=1`}>Descárgalo</a>{' '}
          para verlo.
        </p>
      </object>
    )
  }
}

function fmtFechaHora(v: string | null): string {
  if (!v) return '—'
  const d = new Date(v)
  return isNaN(d.getTime())
    ? v
    : d.toLocaleString('es-MX', { dateStyle: 'long', timeStyle: 'short' })
}

/** Línea de tiempo: Recibida → Terminada → Datos enviados. */
function LineaEtapas(handle: Handle<{ p: Detalle }>) {
  return () => {
    const actual = etapaDe(handle.props.p)
    const indiceActual = PASOS.findIndex((paso) => paso.etapa === actual)

    return (
      <ol class="etapas">
        {PASOS.map((paso, i) => {
          const estado = i < indiceActual ? 'hecho' : i === indiceActual ? 'actual' : 'pendiente'
          return (
            <li key={paso.etapa} class={`etapas__paso etapas__paso--${estado}`}>
              <span class="etapas__marca">{i < indiceActual ? '✓' : i + 1}</span>
              <span class="etapas__texto">
                <strong>{paso.titulo}</strong>
                <small>{paso.detalle}</small>
              </span>
            </li>
          )
        })}
      </ol>
    )
  }
}

/**
 * Dictamen: el admin lee los datos, decide si procede, escribe el motivo y a
 * dónde debe acudir el ciudadano, y manda el correo formal. Si ya se notificó,
 * el formulario se sustituye por el acta de lo que se envió.
 */
function PanelDictamen(handle: Handle<{ p: Detalle }>) {
  return () => {
    const { p } = handle.props
    const yaNotificada = Boolean(p.notificado_en)
    const yaDictaminada = p.estado === 'Procedente' || p.estado === 'No procedente'

    return (
      <div class="panel">
        <div class="panel__head">
          <h2 class="panel__title" style="margin:0;">
            ⚖ Dictamen y notificación
          </h2>
          <span class={'badge ' + (ESTADO_BADGE[p.estado] ?? 'en-proceso')}>{p.estado}</span>
        </div>

        {yaNotificada ? (
          <div class="dictamen-acta">
            <p class="form-ok" style="margin-top:0;">
              ✓ Resolución notificada el {fmtFechaHora(p.notificado_en)} a{' '}
              <strong>{p.notificado_a || p.correo}</strong>.
            </p>
            <div class="campo campo--full">
              <span class="meta-label">Motivo comunicado</span>
              <p class="campo__value">{p.resolucion_motivo || '—'}</p>
            </div>
            {p.resolucion_direccion ? (
              <div class="campo campo--full">
                <span class="meta-label">Debe acudir a</span>
                <p class="campo__value">{p.resolucion_direccion}</p>
              </div>
            ) : null}
            {p.resolucion_cita ? (
              <div class="campo campo--full">
                <span class="meta-label">Día y horario</span>
                <p class="campo__value">{p.resolucion_cita}</p>
              </div>
            ) : null}
            <p class="breadcrumb">
              Para corregir algo, vuelve a emitir el dictamen desde abajo: se enviará un correo
              nuevo con la resolución actualizada.
            </p>
          </div>
        ) : null}

        <form
          method="post"
          action={adminRoutes.participacionResolver.action.href({ id: p.id })}
          class="dictamen-form"
        >
          <fieldset class="dictamen-opciones">
            <legend class="meta-label">Resolución</legend>
            <label class="dictamen-opcion dictamen-opcion--si">
              <input
                type="radio"
                name="estado"
                value="Procedente"
                required
                checked={p.estado === 'Procedente'}
              />
              <span>
                <strong>Procedente</strong>
                <small>La propuesta se acepta e integra al POETDUM.</small>
              </span>
            </label>
            <label class="dictamen-opcion dictamen-opcion--no">
              <input
                type="radio"
                name="estado"
                value="No procedente"
                checked={p.estado === 'No procedente'}
              />
              <span>
                <strong>No procedente</strong>
                <small>La propuesta no se integra; el motivo se le explica al ciudadano.</small>
              </span>
            </label>
          </fieldset>

          <div class="form-field">
            <label for="motivo">Motivo del dictamen (va en el correo)</label>
            <textarea
              id="motivo"
              name="motivo"
              rows={4}
              required
              placeholder="Explica al ciudadano por qué se resolvió así. Este texto se transcribe tal cual en el correo oficial."
              value={p.resolucion_motivo}
            />
          </div>

          <div class="form-grid">
            <div class="form-field">
              <label for="direccion">Domicilio al que debe acudir (opcional)</label>
              <input
                id="direccion"
                name="direccion"
                type="text"
                value={p.resolucion_direccion}
                placeholder="Independencia 58, Centro, San Pedro Tlaquepaque"
              />
            </div>
            <div class="form-field">
              <label for="cita">Día y horario de atención (opcional)</label>
              <input
                id="cita"
                name="cita"
                type="text"
                value={p.resolucion_cita}
                placeholder="Lunes a viernes de 9:00 a 15:00 h"
              />
            </div>
          </div>

          <div class="form-field">
            <label for="para">Correo del ciudadano</label>
            <input id="para" name="para" type="email" value={p.correo} placeholder={p.correo} />
            <small class="breadcrumb">
              Se toma el correo con el que se registró. Cámbialo solo si dio uno equivocado.
            </small>
          </div>

          <label class="dictamen-notificar">
            <input type="checkbox" name="notificar" value="1" checked />
            <span>
              Enviar ahora el correo formal con la resolución
              <small>
                Si lo dejas sin marcar, el dictamen queda guardado y podrás notificar después.
              </small>
            </span>
          </label>

          <Button buttonType="submit" variant="dark">
            {yaDictaminada ? '⚖ Actualizar dictamen' : '⚖ Emitir dictamen'}
          </Button>
        </form>
      </div>
    )
  }
}

export function DetallePage(handle: Handle<DetallePageProps>) {
  return () => {
    const { user, p, mail, dictamen } = handle.props
    const titulo = p ? `Participación ${p.folio}` : 'Participación no encontrada'

    return (
      <AdminLayout user={user} active="participaciones" title={titulo}>
        <h1 class="page-title">{titulo}</h1>
        <p class="breadcrumb">
          <a href={`${adminRoutes.participaciones.href()}?origen=${p?.origen ?? 'fisica'}`}>
            Volver a participaciones
          </a>
        </p>

        {!p ? (
          <div class="panel">
            <p class="empty">No se encontró la participación.</p>
          </div>
        ) : (
          <>
            {mail === 'ok' ? <p class="form-ok">📨 Participación enviada por correo.</p> : null}
            {mail === 'error' ? (
              <p class="form-error">
                ⚠️ No se pudo enviar. Revisa la dirección o la configuración de correo.
              </p>
            ) : null}

            {dictamen === 'notificado' ? (
              <p class="form-ok">
                ⚖ Dictamen guardado y correo de resolución enviado al ciudadano.
              </p>
            ) : null}
            {dictamen === 'guardado' ? (
              <p class="form-error">
                ⚠️ El dictamen quedó guardado, pero <strong>no se pudo enviar el correo</strong>.
                Revisa la configuración SMTP o el correo del ciudadano y vuelve a emitirlo.
              </p>
            ) : null}
            {dictamen === 'error' ? (
              <p class="form-error">⚠️ No se pudo guardar el dictamen. Inténtalo de nuevo.</p>
            ) : null}
            {dictamen === 'estado' ? (
              <p class="form-error">⚠️ Elige si la participación es procedente o no.</p>
            ) : null}
            <LineaEtapas p={p} />
            <div class="panel">
              <div class="panel__head">
                <h2 class="panel__title" style="margin:0;">
                  Datos de la participación
                </h2>
                <span class={'badge ' + (ESTADO_BADGE[p.estado] ?? 'en-proceso')}>{p.estado}</span>
              </div>
              <div class="detalle-grid">
                <Campo label="Folio" value={p.folio} />
                <Campo label="Nombre" value={p.nombre} />
                <Campo label="Correo" value={p.correo} />
                <Campo label="Municipio" value={p.municipio} />
                <Campo label="Colonia" value={p.colonia} />
                <Campo label="Domicilio" value={p.domicilio} />
                <Campo label="Municipio de participante" value={p.municipio_participante} />
                <Campo label="Fuente" value={p.fuente} />
                <Campo label="Género" value={p.genero} />
                <Campo label="Temática" value={p.tematica} />
                <Campo label="Institución" value={p.institucion} />
                <Campo label="Ocupación" value={p.ocupacion} />
                <Campo label="Registro" value={fmtFecha(p.fecha)} />
              </div>
              <div class="campo campo--full">
                <span class="meta-label">Observación</span>
                <p class="campo__value">{p.observacion || '—'}</p>
              </div>
            </div>

            <div class="panel">
              <div class="panel__head">
                <h2 class="panel__title" style="margin:0;">
                  Adjuntos
                </h2>
                {p.adjuntos.map((a) => (
                  <span key={a.id} style="display:flex; gap:8px; align-items:center;">
                    <span class="meta-label">
                      {a.nombre_original} · {fmtSize(a.size)}
                    </span>
                    <a
                      class="btn btn--green"
                      href={adminRoutes.adjunto.href({ id: p.id, aid: a.id })}
                      target="_blank"
                      rel="noopener"
                    >
                      👁 Ver
                    </a>
                    <a
                      class="btn btn--excel"
                      href={`${adminRoutes.adjunto.href({ id: p.id, aid: a.id })}?download=1`}
                    >
                      ⬇ Descargar
                    </a>
                  </span>
                ))}
                <a class="btn btn--excel" href={adminRoutes.word.href({ id: p.id })}>
                  ⬇ Descargar datos (.docx)
                </a>
              </div>
              {p.adjuntos.length === 0 ? (
                <p class="empty">Esta participación no tiene documento adjunto.</p>
              ) : (
                <VistaAdjunto participacionId={p.id} adjunto={p.adjuntos[0]} />
              )}
            </div>

            <PanelDictamen p={p} />
            <div class="panel">
              <h2 class="panel__title">📨 Enviar por correo</h2>
              <form
                method="post"
                action={adminRoutes.participacionEnviar.action.href({ id: p.id })}
                class="form-row"
              >
                <div class="form-field">
                  <label for="para">Enviar a (correo)</label>
                  <input
                    id="para"
                    name="para"
                    type="email"
                    placeholder="destinatario@ejemplo.com"
                    required
                  />
                </div>
                <Button buttonType="submit" variant="dark">
                  ✉ Enviar datos + PDF
                </Button>
              </form>
            </div>
          </>
        )}
      </AdminLayout>
    )
  }
}
