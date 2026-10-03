/**
 * Panel de la consulta pública para el Proyecto del Programa: el área responsable
 * carga varios PDF a cada sección, les da nombre, define su orden y los revisa.
 * Se puede preparar todo antes de iniciar la consulta; el portal muestra el
 * apartado solo cuando la consulta está abierta o concluida.
 */
import type { Handle } from 'remix/ui'

import { pesoLegible } from '../../data/participacion-documentos.ts'
import {
  ETIQUETA_SECCION,
  SECCIONES_PROYECTO,
  TEXTO_PROYECTO,
  TITULO_PROYECTO,
  type DocumentoProyecto,
  type SeccionProyecto,
} from '../../data/proyecto.ts'
import { adminRoutes } from '../../routes.ts'
import { Button } from '../../ui/button.tsx'

export interface PanelProyectoProps {
  /** ¿El portal está mostrando el apartado? Lo decide la etapa de la consulta. */
  visible: boolean
  tecnico: DocumentoProyecto[]
  grafico: DocumentoProyecto[]
}

const archivoHref = (id: string) => adminRoutes.proyectoArchivo.href({ id })

/** Un botón que envía una intención sobre un documento. */
function Intencion(
  handle: Handle<{
    intencion: string
    id: string
    texto: string
    titulo?: string
    confirmar?: string
    direccion?: 'arriba' | 'abajo'
    desactivado?: boolean
  }>,
) {
  return () => {
    const { intencion, id, texto, titulo, confirmar, direccion, desactivado } = handle.props
    return (
      <form
        method="post"
        action={adminRoutes.proyecto.action.href()}
        data-confirmar={confirmar}
        style="display:inline"
      >
        <input type="hidden" name="intencion" value={intencion} />
        <input type="hidden" name="id" value={id} />
        {direccion ? <input type="hidden" name="direccion" value={direccion} /> : null}
        <button
          type="submit"
          class="btn btn--white btn--sm"
          title={titulo}
          aria-label={titulo ?? texto}
          disabled={desactivado}
        >
          {texto}
        </button>
      </form>
    )
  }
}

function SeccionProyecto(
  handle: Handle<{ seccion: SeccionProyecto; documentos: DocumentoProyecto[] }>,
) {
  return () => {
    const { seccion, documentos } = handle.props
    const etiqueta = ETIQUETA_SECCION[seccion]
    return (
      <section class="doc-tarjeta" aria-labelledby={`proyecto-${seccion}`}>
        <div class="panel__head">
          <h3 id={`proyecto-${seccion}`} class="panel__title">
            {etiqueta}
          </h3>
          <span class="badge en-proceso">
            {documentos.length === 1 ? '1 documento' : `${documentos.length} documentos`}
          </span>
        </div>

        {documentos.length === 0 ? (
          <p class="empty">Todavía no hay documentos en esta sección.</p>
        ) : (
          <ol class="proyecto-lista">
            {documentos.map((d, i) => (
              <li key={d.id} class="proyecto-item">
                <form
                  method="post"
                  action={adminRoutes.proyecto.action.href()}
                  class="proyecto-nombre"
                >
                  <input type="hidden" name="intencion" value="renombrar" />
                  <input type="hidden" name="id" value={d.id} />
                  <div class="form-field">
                    <label for={`titulo-${d.id}`}>Nombre con que se presenta</label>
                    <input
                      id={`titulo-${d.id}`}
                      name="titulo"
                      value={d.titulo}
                      maxLength={150}
                      required
                    />
                  </div>
                  <Button buttonType="submit" variant="outlined" size="sm">
                    Guardar nombre
                  </Button>
                </form>
                <p class="breadcrumb">
                  {d.nombre_original} · {pesoLegible(d.size)}
                </p>
                <div class="proyecto-acciones">
                  <span
                    class="proyecto-orden"
                    aria-label={`Posición ${i + 1} de ${documentos.length}`}
                  >
                    {i + 1}
                  </span>
                  <Intencion
                    intencion="mover"
                    id={d.id}
                    direccion="arriba"
                    texto="↑ Subir"
                    titulo={`Subir «${d.titulo}»`}
                    desactivado={i === 0}
                  />
                  <Intencion
                    intencion="mover"
                    id={d.id}
                    direccion="abajo"
                    texto="↓ Bajar"
                    titulo={`Bajar «${d.titulo}»`}
                    desactivado={i === documentos.length - 1}
                  />
                  <a
                    class="btn btn--white btn--sm"
                    href={archivoHref(d.id)}
                    target="_blank"
                    rel="noopener"
                  >
                    Consultar
                  </a>
                  <a
                    class="btn btn--green btn--sm"
                    href={`${archivoHref(d.id)}?download=1`}
                    download={d.nombre_original}
                  >
                    ⬇ Descargar
                  </a>
                  <Intencion
                    intencion="eliminar"
                    id={d.id}
                    texto="Quitar"
                    titulo={`Quitar «${d.titulo}»`}
                    confirmar={`¿Quitar «${d.titulo}» del Proyecto del Programa?`}
                  />
                </div>
              </li>
            ))}
          </ol>
        )}

        <form
          method="post"
          action={adminRoutes.proyecto.action.href()}
          enctype="multipart/form-data"
          class="doc-subida"
        >
          <input type="hidden" name="intencion" value="subir" />
          <input type="hidden" name="seccion" value={seccion} />
          <div class="form-field">
            <label for={`archivos-${seccion}`}>
              Cargar PDF a «{etiqueta}» (puedes elegir varios)
            </label>
            <input
              id={`archivos-${seccion}`}
              name="archivo"
              type="file"
              accept=".pdf,application/pdf"
              multiple
              required
            />
            <span class="form-hint">
              Cada archivo se presenta con su nombre de archivo; después puedes darle el nombre que
              quieras.
            </span>
          </div>
          <Button buttonType="submit" variant="dark" size="sm">
            Cargar documentos
          </Button>
        </form>
      </section>
    )
  }
}

export function PanelProyecto(handle: Handle<PanelProyectoProps>) {
  return () => {
    const { visible, tecnico, grafico } = handle.props
    return (
      <section class="panel" id="proyecto">
        <div class="panel__head">
          <h2 class="panel__title">📄 {TITULO_PROYECTO}</h2>
          <span class={'badge ' + (visible ? 'procedente' : 'en-proceso')}>
            {visible ? 'Visible en el portal' : 'Oculto hasta iniciar la consulta'}
          </span>
        </div>
        <p class="breadcrumb">
          En el portal se presenta con el texto «{TEXTO_PROYECTO}» y las secciones «
          {ETIQUETA_SECCION.tecnico}» y «{ETIQUETA_SECCION.grafico}». Puedes cargar y ordenar los
          documentos desde ahora: el apartado se muestra cuando inicie la consulta pública.
        </p>
        <div class="doc-tarjetas">
          {SECCIONES_PROYECTO.map((seccion) => (
            <SeccionProyecto
              key={seccion}
              seccion={seccion}
              documentos={seccion === 'tecnico' ? tecnico : grafico}
            />
          ))}
        </div>
      </section>
    )
  }
}
