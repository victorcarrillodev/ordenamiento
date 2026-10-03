import type { Handle } from 'remix/ui'
import { css } from 'remix/ui'

import { routes } from '../../routes.ts'
import { colors, FONT_STACK } from '../../ui/civic-horizon.ts'

export interface ConsultaAvisoProps {
  titulo: string
  texto: string
}

const enlaceStyle = css({
  display: 'inline-flex',
  alignItems: 'center',
  fontFamily: FONT_STACK,
  fontSize: '14px',
  fontWeight: 700,
  color: colors.burgundy900,
  textDecoration: 'underline',
  textUnderlineOffset: '3px',
})

/**
 * Se muestra en lugar del formulario cuando la consulta no recibe
 * participaciones: antes de iniciar o ya concluida. Dice por qué y a dónde ir,
 * en vez de dejar un formulario que el servidor rechazaría al enviarlo.
 */
export function ConsultaAviso(handle: Handle<ConsultaAvisoProps>) {
  return () => {
    const { titulo, texto } = handle.props
    return (
      <section
        role="status"
        aria-labelledby="consulta-aviso-titulo"
        mix={css({
          border: `1px solid ${colors.burgundy100}`,
          borderLeft: `5px solid ${colors.burgundy900}`,
          borderRadius: '12px',
          background: colors.burgundy50,
          padding: '28px 28px 24px',
        })}
      >
        <h1
          id="consulta-aviso-titulo"
          mix={css({
            fontFamily: FONT_STACK,
            fontSize: 'clamp(22px, 2.4vw, 28px)',
            fontWeight: 800,
            color: colors.burgundy900,
            margin: '0 0 12px',
          })}
        >
          {titulo}
        </h1>
        <p
          mix={css({
            fontFamily: FONT_STACK,
            fontSize: '15px',
            lineHeight: 1.65,
            color: '#334155',
            margin: '0 0 18px',
            textAlign: 'justify',
          })}
        >
          {texto}
        </p>
        <a href={routes.poetdum.show.href()} mix={enlaceStyle}>
          Ir a la elaboración del POETDUM
        </a>
      </section>
    )
  }
}
