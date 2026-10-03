/**
 * «Proyecto del Programa»: el documento técnico y los documentos gráficos de la
 * consulta pública, cada uno para consultar en el visor o descargar. Solo se
 * muestra cuando la consulta está abierta o concluida; antes, el área
 * responsable lo prepara sin que se vea.
 */
import { css, type Handle } from 'remix/ui'

import { pesoLegible } from '../../../data/participacion-documentos.ts'
import {
  ETIQUETA_SECCION,
  SECCIONES_PROYECTO,
  TEXTO_PROYECTO,
  TITULO_PROYECTO,
  type DocumentoProyecto,
  type ProyectoPublico,
} from '../../../data/proyecto.ts'
import { routes } from '../../../routes.ts'
import { colors, FONT_STACK } from '../../../ui/civic-horizon.ts'
import { AccionesDocumento } from '../../../ui/programa/acciones-documento.tsx'
import { IconoDocumento } from '../../../ui/programa/iconos.tsx'
import { introSeccionStyle, seccionStyle, vacioStyle } from '../programa-layout.tsx'

/** Rojo institucional para los encabezados de estos apartados. */
export const tituloRojoStyle = css({
  fontFamily: FONT_STACK,
  fontSize: 'clamp(22px, 3vw, 28px)',
  fontWeight: 800,
  color: colors.burgundy900,
  margin: '0 0 8px',
})

const subtituloStyle = css({
  fontFamily: FONT_STACK,
  fontSize: '17px',
  fontWeight: 700,
  color: colors.gray900,
  margin: '0 0 10px',
})

const itemStyle = css({
  display: 'flex',
  alignItems: 'center',
  gap: '12px',
  flexWrap: 'wrap',
  padding: '12px 16px',
  borderRadius: '10px',
  border: `1px solid ${colors.gray200}`,
  background: colors.white,
  fontFamily: FONT_STACK,
})

function Documento(handle: Handle<{ documento: DocumentoProyecto }>) {
  return () => {
    const { documento: d } = handle.props
    return (
      <li mix={itemStyle}>
        <span mix={css({ color: colors.burgundy900, display: 'flex' })}>
          <IconoDocumento size={22} />
        </span>
        <span mix={css({ flex: '1 1 240px', minWidth: 0 })}>
          <strong mix={css({ display: 'block', fontSize: '15px', color: colors.gray900 })}>
            {d.titulo}
          </strong>
          <small mix={css({ fontSize: '12px', color: colors.gray500 })}>
            PDF · {pesoLegible(d.size)}
          </small>
        </span>
        <AccionesDocumento
          href={routes.poetdum.proyectoArchivo.href({ id: d.id })}
          nombre={d.titulo}
          nombreArchivo={d.nombre_original}
        />
      </li>
    )
  }
}

export function ProyectoSection(handle: Handle<{ proyecto: ProyectoPublico }>) {
  return () => {
    const { proyecto } = handle.props
    // Antes de iniciar la consulta el apartado no existe para el público.
    if (!proyecto.visible) return null
    return (
      <section id="proyecto" aria-labelledby="proyecto-titulo" mix={seccionStyle}>
        <h2 id="proyecto-titulo" mix={tituloRojoStyle}>
          {TITULO_PROYECTO}
        </h2>
        <p mix={introSeccionStyle}>{TEXTO_PROYECTO}</p>
        <div mix={css({ display: 'grid', gap: '28px' })}>
          {SECCIONES_PROYECTO.map((seccion) => {
            const documentos = proyecto[seccion]
            return (
              <div key={seccion}>
                <h3 mix={subtituloStyle}>{ETIQUETA_SECCION[seccion]}</h3>
                {documentos.length === 0 ? (
                  <p mix={vacioStyle}>Aún no hay documentos en esta sección.</p>
                ) : (
                  <ul
                    mix={css({
                      listStyle: 'none',
                      margin: 0,
                      padding: 0,
                      display: 'grid',
                      gap: '10px',
                    })}
                  >
                    {documentos.map((d) => (
                      <Documento key={d.id} documento={d} />
                    ))}
                  </ul>
                )}
              </div>
            )
          })}
        </div>
      </section>
    )
  }
}
