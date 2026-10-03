/**
 * Paneles del detalle de una participación para sus documentos PDF: la respuesta
 * (cargar el oficio, revisar su vista previa y enviarlo), la publicación en el
 * portal (versión pública de la participación y del oficio) y los documentos
 * internos.
 */
import type { Handle, RemixNode } from 'remix/ui'

import {
  documentoDeTipo,
  fechaHoraMx,
  pesoLegible,
  type DocumentoParticipacion,
  type EnvioParticipacion,
  type TipoDocumento,
} from '../../data/participacion-documentos.ts'
import { adminRoutes } from '../../routes.ts'
import { AdminAlert } from '../../ui/admin/alert.tsx'
import { Button } from '../../ui/button.tsx'
import type { DetalleParticipacion } from './detalle-datos.ts'

const MENSAJES: Record<string, string> = {
  subido: 'Documento cargado. Revisa su vista previa antes de enviarlo o publicarlo.',
  eliminado: 'Documento quitado.',
  publicado: 'Publicado en el portal.',
  retirado: 'Retirado del portal. Sigue en el registro interno.',
  datos: 'Número y fecha del oficio actualizados.',
  enviado: 'Respuesta enviada al correo registrado.',
}

export interface PanelesDocumentosProps {
  p: DetalleParticipacion
  documentos: DocumentoParticipacion[]
  envios: EnvioParticipacion[]
  /** Confirmación de la última acción (ver MENSAJES). */
  doc?: string | null
  docError?: string
}

const archivoHref = (p: DetalleParticipacion, tipo: TipoDocumento) =>
  adminRoutes.participacionDocumento.href({ id: p.id, tipo })

/** Formulario de una intención sobre un documento: lleva el tipo y la intención ocultos. */
function Accion(
  handle: Handle<{
    p: DetalleParticipacion
    tipo: TipoDocumento
    intencion: string
    texto: string
    confirmar?: string
    variante?: 'dark' | 'outlined' | 'primary' | 'secondary'
    children?: RemixNode
  }>,
) {
  return () => {
    const { p, tipo, intencion, texto, confirmar, variante = 'outlined', children } = handle.props
    return (
      <form
        method="post"
        action={adminRoutes.participacionDocumentos.action.href({ id: p.id })}
        data-confirmar={confirmar}
        class="doc-accion"
      >
        <input type="hidden" name="intencion" value={intencion} />
        <input type="hidden" name="tipo" value={tipo} />
        {children}
        <Button buttonType="submit" variant={variante} size="sm">
          {texto}
        </Button>
      </form>
    )
  }
}

/** Cargar o sustituir un PDF; con `oficio`, también su número y su fecha. */
function FormularioSubida(
  handle: Handle<{
    p: DetalleParticipacion
    tipo: TipoDocumento
    documento?: DocumentoParticipacion
    texto: string
    conOficio?: boolean
  }>,
) {
  return () => {
    const { p, tipo, documento, texto, conOficio = false } = handle.props
    const campo = `archivo-${tipo}`
    return (
      <form
        method="post"
        action={adminRoutes.participacionDocumentos.action.href({ id: p.id })}
        enctype="multipart/form-data"
        class="doc-subida"
      >
        <input type="hidden" name="intencion" value="subir" />
        <input type="hidden" name="tipo" value={tipo} />
        <div class="form-field">
          <label for={campo}>{documento ? 'Sustituir el archivo (PDF)' : 'Archivo PDF'}</label>
          <input id={campo} name="archivo" type="file" accept=".pdf,application/pdf" required />
        </div>
        {conOficio ? (
          <div class="form-grid">
            <div class="form-field">
              <label for={`numero-${tipo}`}>Número de oficio</label>
              <input
                id={`numero-${tipo}`}
                name="numero_oficio"
                value={documento?.numero_oficio ?? ''}
                maxLength={60}
                placeholder="Ej. DGTPU/0123/2026"
              />
            </div>
            <div class="form-field">
              <label for={`fecha-${tipo}`}>Fecha del oficio</label>
              <input
                id={`fecha-${tipo}`}
                name="fecha_oficio"
                type="date"
                value={documento?.fecha_oficio ?? ''}
              />
            </div>
          </div>
        ) : null}
        <Button buttonType="submit" variant={documento ? 'outlined' : 'dark'} size="sm">
          {texto}
        </Button>
      </form>
    )
  }
}

/** La vista previa del PDF, desplegable, y los enlaces para abrirlo o descargarlo. */
function VistaPrevia(
  handle: Handle<{ p: DetalleParticipacion; tipo: TipoDocumento; etiqueta: string }>,
) {
  return () => {
    const { p, tipo, etiqueta } = handle.props
    const href = archivoHref(p, tipo)
    return (
      <div class="doc-vista">
        <details>
          <summary class="btn btn--white btn--sm">{etiqueta}</summary>
          <object class="pdf-frame" type="application/pdf" data={href}>
            <p class="empty">
              Tu navegador no puede mostrar el PDF aquí.{' '}
              <a href={`${href}?download=1`}>Descárgalo</a> para verlo.
            </p>
          </object>
        </details>
        <a class="btn btn--white btn--sm" href={href} target="_blank" rel="noopener">
          Abrir en otra pestaña
        </a>
        <a class="btn btn--green btn--sm" href={`${href}?download=1`} download>
          ⬇ Descargar
        </a>
      </div>
    )
  }
}

function Estado(handle: Handle<{ documento?: DocumentoParticipacion; publicable: boolean }>) {
  return () => {
    const { documento, publicable } = handle.props
    if (!documento) return <span class="badge no-procedente">Sin cargar</span>
    if (!publicable) return <span class="badge en-proceso">Cargado</span>
    return documento.publicado ? (
      <span class="badge procedente">Publicado</span>
    ) : (
      <span class="badge en-proceso">Cargado · sin publicar</span>
    )
  }
}

function DatosDelArchivo(handle: Handle<{ documento: DocumentoParticipacion }>) {
  return () => {
    const { documento } = handle.props
    return (
      <p class="breadcrumb">
        <strong>{documento.nombre_original}</strong> · {pesoLegible(documento.size)} · cargado el{' '}
        {fechaHoraMx(documento.created_at)}
        {documento.publicado && documento.publicado_en
          ? ` · publicado el ${fechaHoraMx(documento.publicado_en)}`
          : ''}
      </p>
    )
  }
}

function Avisos(handle: Handle<{ doc?: string | null; docError?: string }>) {
  return () => {
    const { doc, docError } = handle.props
    return (
      <>
        {docError ? <AdminAlert type="error" message={docError} /> : null}
        {doc && MENSAJES[doc] && !docError ? (
          <AdminAlert type="success" message={MENSAJES[doc]} />
        ) : null}
      </>
    )
  }
}

/** Respuesta a la participación: oficio firmado, vista previa y envío al correo registrado. */
export function PanelRespuesta(handle: Handle<PanelesDocumentosProps>) {
  return () => {
    const { p, documentos, envios, doc, docError } = handle.props
    const oficio = documentoDeTipo(documentos, 'oficio')
    const respuestas = envios.filter((e) => e.tipo === 'respuesta')
    const ultimo = respuestas[0]

    return (
      <div class="panel" id="respuesta">
        <div class="panel__head">
          <h2 class="panel__title">✉ Respuesta a la participación</h2>
          <Estado documento={oficio} publicable={false} />
        </div>
        <Avisos doc={doc} docError={docError} />
        <p class="breadcrumb">
          El oficio lo elabora y firma el área responsable; aquí se carga escaneado en PDF, se
          revisa y se envía al correo registrado (<strong>{p.correo}</strong>). Cargar el archivo no
          lo envía.
        </p>

        {oficio ? (
          <>
            <DatosDelArchivo documento={oficio} />
            <VistaPrevia p={p} tipo="oficio" etiqueta="Vista previa de la respuesta" />
            <div class="doc-bloque">
              <h3 class="meta-label">Sustituir el archivo, si hace falta, antes de enviarlo</h3>
              <FormularioSubida p={p} tipo="oficio" documento={oficio} texto="Sustituir archivo" />
            </div>
            <div class="doc-bloque doc-envio">
              <Accion
                p={p}
                tipo="oficio"
                intencion="enviar"
                texto="Enviar respuesta"
                variante="dark"
                confirmar={`¿Enviar el oficio de respuesta a ${p.correo}? Se notificará que la respuesta está disponible para recoger en las oficinas de la Dirección de Gestión Territorial y Planeación Urbana.`}
              />
              <Accion
                p={p}
                tipo="oficio"
                intencion="eliminar"
                texto="Quitar oficio"
                confirmar="¿Quitar el oficio de respuesta cargado?"
              />
            </div>
          </>
        ) : (
          <div class="doc-bloque">
            <h3 class="meta-label">Cargar el oficio de respuesta (PDF firmado)</h3>
            <FormularioSubida p={p} tipo="oficio" texto="Cargar oficio de respuesta" />
          </div>
        )}

        {ultimo ? (
          ultimo.resultado === 'enviado' ? (
            <AdminAlert type="success">
              Última respuesta enviada correctamente el{' '}
              <strong>{fechaHoraMx(ultimo.created_at)}</strong> a {ultimo.para}.
            </AdminAlert>
          ) : (
            <AdminAlert type="error">
              El último envío falló el <strong>{fechaHoraMx(ultimo.created_at)}</strong>:{' '}
              {ultimo.detalle || 'ocurrió un error'}. Puedes volver a intentarlo.
            </AdminAlert>
          )
        ) : null}

        <h3 class="meta-label">Correos enviados</h3>
        {envios.length === 0 ? (
          <p class="empty">Todavía no se ha enviado ningún correo a esta persona.</p>
        ) : (
          <div class="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Fecha y hora</th>
                  <th>Correo</th>
                  <th>Destino</th>
                  <th>Resultado</th>
                </tr>
              </thead>
              <tbody>
                {envios.map((e) => (
                  <tr key={e.id}>
                    <td>{fechaHoraMx(e.created_at)}</td>
                    <td>{e.tipo === 'acuse' ? 'Acuse de recepción' : 'Respuesta'}</td>
                    <td>{e.para}</td>
                    <td>
                      {e.resultado === 'enviado' ? (
                        <span class="badge procedente">✔ Enviado correctamente</span>
                      ) : (
                        <>
                          <span class="badge no-procedente">✖ Error</span>
                          {e.detalle ? <small class="breadcrumb"> {e.detalle}</small> : null}
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    )
  }
}

function TarjetaPublicable(
  handle: Handle<{
    p: DetalleParticipacion
    tipo: 'version_publica' | 'oficio_publico'
    documentos: DocumentoParticipacion[]
    titulo: string
    ayuda: string
    conOficio?: boolean
  }>,
) {
  return () => {
    const { p, tipo, documentos, titulo, ayuda, conOficio = false } = handle.props
    const documento = documentoDeTipo(documentos, tipo)
    return (
      <section class="doc-tarjeta" aria-labelledby={`titulo-${tipo}`}>
        <div class="panel__head">
          <h3 id={`titulo-${tipo}`} class="panel__title">
            {titulo}
          </h3>
          <Estado documento={documento} publicable />
        </div>
        <p class="breadcrumb">{ayuda}</p>
        {documento ? (
          <>
            <DatosDelArchivo documento={documento} />
            {conOficio ? (
              <p class="breadcrumb">
                Número: <strong>{documento.numero_oficio || '—'}</strong> · Fecha:{' '}
                <strong>{documento.fecha_oficio ?? '—'}</strong>
              </p>
            ) : null}
            <VistaPrevia p={p} tipo={tipo} etiqueta="Vista previa" />
            <div class="doc-envio">
              {documento.publicado ? (
                <Accion
                  p={p}
                  tipo={tipo}
                  intencion="retirar"
                  texto="Retirar del portal"
                  confirmar="¿Retirar este documento del portal? Dejará de verse de inmediato; sigue en el registro interno."
                />
              ) : (
                <Accion
                  p={p}
                  tipo={tipo}
                  intencion="publicar"
                  texto="Publicar en el portal"
                  variante="dark"
                  confirmar="¿Publicar este documento en el portal? Cualquier persona podrá consultarlo: confirma que ya revisaste que los datos personales están testados."
                />
              )}
              <Accion
                p={p}
                tipo={tipo}
                intencion="eliminar"
                texto="Quitar"
                confirmar="¿Quitar este documento? Si estaba publicado, deja de verse en el portal."
              />
            </div>
            {conOficio ? (
              <Accion p={p} tipo={tipo} intencion="datos" texto="Guardar número y fecha">
                <div class="form-grid">
                  <div class="form-field">
                    <label for={`datos-numero-${tipo}`}>Número de oficio</label>
                    <input
                      id={`datos-numero-${tipo}`}
                      name="numero_oficio"
                      value={documento.numero_oficio}
                      maxLength={60}
                    />
                  </div>
                  <div class="form-field">
                    <label for={`datos-fecha-${tipo}`}>Fecha del oficio</label>
                    <input
                      id={`datos-fecha-${tipo}`}
                      name="fecha_oficio"
                      type="date"
                      value={documento.fecha_oficio ?? ''}
                    />
                  </div>
                </div>
              </Accion>
            ) : null}
            <div class="doc-bloque">
              <FormularioSubida
                p={p}
                tipo={tipo}
                documento={documento}
                texto="Sustituir archivo"
                conOficio={conOficio}
              />
              <p class="form-hint">
                Al sustituir el archivo el documento deja de estar publicado: hay que revisarlo otra
                vez.
              </p>
            </div>
          </>
        ) : (
          <FormularioSubida
            p={p}
            tipo={tipo}
            texto={conOficio ? 'Cargar versión pública del oficio' : 'Cargar versión pública'}
            conOficio={conOficio}
          />
        )}
      </section>
    )
  }
}

/** Publicación en «Participaciones y respuestas» del portal. */
export function PanelPublicacion(handle: Handle<PanelesDocumentosProps>) {
  return () => {
    const { p, documentos, doc, docError } = handle.props
    return (
      <div class="panel" id="publicacion">
        <div class="panel__head">
          <h2 class="panel__title">🌐 Publicación en el portal</h2>
        </div>
        {/* Los avisos de una acción sobre los documentos de esta sección salen aquí. */}
        {doc && doc !== 'enviado' && !docError ? <Avisos doc={doc} /> : null}
        <p class="breadcrumb">
          En «Participaciones y respuestas» el portal muestra esta participación, solo por su folio
          y fecha de recepción, cuando su versión pública está publicada; y su oficio de respuesta,
          cuando también lo está. Mientras no se publique el oficio, el portal muestra «Respuesta
          pendiente de publicación». Lo interno —los datos de quien participa, los anexos y el
          oficio íntegro— nunca sale en el portal.
        </p>
        <div class="doc-tarjetas">
          <TarjetaPublicable
            p={p}
            tipo="version_publica"
            documentos={documentos}
            titulo="Versión pública de la participación"
            ayuda="El formato o escrito de participación, digital o presencial, con la observación o propuesta y los datos personales previamente testados, sin incluir los anexos."
          />
          <TarjetaPublicable
            p={p}
            tipo="oficio_publico"
            documentos={documentos}
            titulo="Versión pública del oficio de respuesta"
            ayuda="El oficio de respuesta con los datos personales testados. Se muestra con su número y su fecha, y no se puede publicar sin ellos."
            conOficio
          />
        </div>
      </div>
    )
  }
}

/** Documentos que nunca salen en el portal: el formato escaneado de un llenado a mano. */
export function PanelDocumentosInternos(handle: Handle<PanelesDocumentosProps>) {
  return () => {
    const { p, documentos } = handle.props
    const formato = documentoDeTipo(documentos, 'formato_escaneado')
    if (!formato && p.captura !== 'manuscrita') return null
    return (
      <div class="panel" id="documentos">
        <div class="panel__head">
          <h2 class="panel__title">📎 Documentos internos</h2>
        </div>
        <section class="doc-tarjeta" aria-labelledby="titulo-formato">
          <div class="panel__head">
            <h3 id="titulo-formato" class="panel__title">
              Formato escaneado
            </h3>
            <Estado documento={formato} publicable={false} />
          </div>
          <p class="breadcrumb">
            El formato llenado de puño y letra, escaneado. Está ligado al folio {p.folio} y es solo
            para el expediente interno: no se publica.
          </p>
          {formato ? (
            <>
              <DatosDelArchivo documento={formato} />
              <VistaPrevia p={p} tipo="formato_escaneado" etiqueta="Vista previa" />
              <div class="doc-bloque">
                <FormularioSubida
                  p={p}
                  tipo="formato_escaneado"
                  documento={formato}
                  texto="Sustituir archivo"
                />
              </div>
            </>
          ) : (
            <FormularioSubida p={p} tipo="formato_escaneado" texto="Cargar formato escaneado" />
          )}
        </section>
      </div>
    )
  }
}
