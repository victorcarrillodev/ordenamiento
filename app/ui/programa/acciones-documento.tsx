/**
 * Los dos botones con que el portal ofrece un documento: uno para consultarlo
 * en el visor del navegador y otro para descargarlo. Los usan los documentos de
 * las actividades, los del Proyecto del Programa y las versiones públicas de las
 * participaciones y sus oficios, para que todos se comporten igual.
 */
import { css, type Handle } from 'remix/ui'

import { colors } from '../civic-horizon.ts'
import { IconoDescarga, IconoVer } from './iconos.tsx'

export interface AccionesDocumentoProps {
  /** Dirección que sirve el documento para verlo en el navegador. */
  href: string
  /** Nombre con el que se identifica el documento ante un lector de pantalla. */
  nombre: string
  /** Nombre del archivo que se guarda al descargarlo. */
  nombreArchivo: string
  etiquetaVer?: string
  etiquetaDescargar?: string
}

const accionStyle = css({
  display: 'inline-flex',
  alignItems: 'center',
  gap: '6px',
  padding: '6px 12px',
  borderRadius: '6px',
  fontSize: '13px',
  fontWeight: 700,
  textDecoration: 'none',
  whiteSpace: 'nowrap',
})

/** La misma dirección con `download=1`, que pide al servidor entregarla como descarga. */
export function hrefDeDescarga(href: string): string {
  return `${href}${href.includes('?') ? '&' : '?'}download=1`
}

/**
 * «Consultar» abre el documento en otra pestaña; «Descargar» lo guarda directo.
 *
 * El enlace de descarga lleva el atributo `download` además de pedir
 * `?download=1`: el servidor responde con `Content-Disposition: attachment`,
 * pero un proxy intermedio puede reescribir o quitar esa cabecera y entonces el
 * navegador abriría el PDF en su visor en vez de guardarlo. Con `download` la
 * descarga no depende de lo que haga la cabecera por el camino.
 */
export function AccionesDocumento(handle: Handle<AccionesDocumentoProps>) {
  return () => {
    const {
      href,
      nombre,
      nombreArchivo,
      etiquetaVer = 'Consultar',
      etiquetaDescargar = 'Descargar',
    } = handle.props
    return (
      <span mix={css({ display: 'flex', gap: '8px', flexWrap: 'wrap' })}>
        <a
          href={href}
          target="_blank"
          rel="noopener"
          aria-label={`${etiquetaVer}: ${nombre}`}
          mix={[
            accionStyle,
            css({ color: colors.burgundy900, border: `1px solid ${colors.burgundy100}` }),
          ]}
        >
          <IconoVer size={15} /> {etiquetaVer}
        </a>
        <a
          href={hrefDeDescarga(href)}
          download={nombreArchivo}
          aria-label={`${etiquetaDescargar}: ${nombre}`}
          mix={[accionStyle, css({ color: colors.white, background: colors.burgundy900 })]}
        >
          <IconoDescarga size={15} /> {etiquetaDescargar}
        </a>
      </span>
    )
  }
}
