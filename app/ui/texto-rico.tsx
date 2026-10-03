import type { Handle, RemixNode } from 'remix/ui'

import { CSS_ALINEACION, parsearTextoRico, type Parrafo } from '../utils/texto-rico.ts'

/** Separación entre los párrafos de un mismo texto, en el tamaño de la letra de ese texto. */
const SEPARACION_ENTRE_PARRAFOS = '0.75em'

/** Texto, negritas y saltos de línea de un párrafo. */
function tramos(parrafo: Parrafo): RemixNode[] {
  return parrafo.partes.map((parte, i) =>
    'salto' in parte ? (
      <br key={i} />
    ) : parte.negrita ? (
      <strong key={i}>{parte.texto}</strong>
    ) : (
      parte.texto
    ),
  )
}

const alineacionCss = (parrafo: Parrafo) =>
  parrafo.alineacion ? `text-align:${CSS_ALINEACION[parrafo.alineacion]}` : ''

export interface TextoRicoProps {
  /** El texto guardado: HTML canónico o texto plano. */
  valor?: string | null
}

/**
 * Dibuja un texto del portal con su formato (negritas, saltos de línea y
 * alineación por párrafo) DENTRO del elemento de la página que lo contiene: ese
 * elemento (un `<p>`, un `<h3>`…) conserva su tipografía, color y márgenes.
 *
 * Un texto de un solo párrafo y sin alineación propia se dibuja directo, tal
 * como se dibujaba el texto plano. Si hay varios párrafos o se eligió una
 * alineación, cada párrafo es un bloque (`span` con `display:block`, válido
 * dentro de un `<p>`) y los que siguen al primero llevan un margen arriba.
 *
 * El valor nunca se inserta como HTML: se lee a párrafos y se dibujan elementos
 * propios, así que solo pueden aparecer texto, `<strong>` y `<br>`.
 */
export function TextoRico(handle: Handle<TextoRicoProps>) {
  return () => {
    const parrafos = parsearTextoRico(handle.props.valor)
    if (parrafos.length === 1 && parrafos[0].alineacion === '') return <>{tramos(parrafos[0])}</>
    return (
      <>
        {parrafos.map((parrafo, i) => (
          <span
            key={i}
            style={`display:block;${alineacionCss(parrafo)};${i > 0 ? `margin-top:${SEPARACION_ENTRE_PARRAFOS}` : ''}`}
          >
            {tramos(parrafo)}
          </span>
        ))}
      </>
    )
  }
}

/**
 * Los párrafos del texto como `<p>`, para el editor del panel. Un texto vacío
 * deja un párrafo en blanco: el cursor necesita un renglón donde escribir.
 */
export function ParrafosRicos(handle: Handle<TextoRicoProps>) {
  return () => {
    const parrafos = parsearTextoRico(handle.props.valor)
    if (parrafos.length === 0) {
      return (
        <p>
          <br />
        </p>
      )
    }
    return (
      <>
        {parrafos.map((parrafo, i) => (
          <p key={i} style={alineacionCss(parrafo) || undefined}>
            {tramos(parrafo)}
          </p>
        ))}
      </>
    )
  }
}
