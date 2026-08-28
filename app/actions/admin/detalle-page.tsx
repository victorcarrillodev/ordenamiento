import type { Handle } from 'remix/ui'

import { adminRoutes } from '../../routes.ts'
import { AdminLayout } from '../../ui/admin/admin-layout.tsx'
import { Button } from '../../ui/button.tsx'

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
  adjuntos: Adjunto[]
}

export interface DetallePageProps {
  user: { name: string; role: string }
  p: Detalle | null
  mail?: 'ok' | 'error' | null
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

export function DetallePage(handle: Handle<DetallePageProps>) {
  return () => {
    const { user, p, mail } = handle.props
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
