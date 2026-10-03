/**
 * Aviso de que la consulta pública concluyó: gracias, el periodo para recibir
 * observaciones ya cerró y dónde consultar las participaciones y las respuestas.
 */
import { css, type Handle } from 'remix/ui'

import { TEXTO_CONSULTA_CONCLUIDA, TITULO_CONSULTA_CONCLUIDA } from '../../../data/consulta.ts'
import { colors, FONT_STACK } from '../../../ui/civic-horizon.ts'

export function ConsultaConcluidaAviso(handle: Handle<{ visible: boolean }>) {
  return () => {
    if (!handle.props.visible) return null
    return (
      <section
        id="consulta-concluida"
        role="status"
        aria-labelledby="consulta-concluida-titulo"
        mix={css({
          maxWidth: '1100px',
          margin: '40px auto 0',
          padding: '0 24px',
          '@media (max-width: 480px)': { padding: '0 16px' },
        })}
      >
        <div
          mix={css({
            border: `1px solid ${colors.burgundy100}`,
            borderLeft: `5px solid ${colors.burgundy900}`,
            borderRadius: '12px',
            background: colors.burgundy50,
            padding: '24px 26px',
          })}
        >
          <h2
            id="consulta-concluida-titulo"
            mix={css({
              fontFamily: FONT_STACK,
              fontSize: 'clamp(20px, 2.6vw, 26px)',
              fontWeight: 800,
              color: colors.burgundy900,
              margin: '0 0 10px',
            })}
          >
            {TITULO_CONSULTA_CONCLUIDA}
          </h2>
          <p
            mix={css({
              fontFamily: FONT_STACK,
              fontSize: '15.5px',
              lineHeight: 1.65,
              color: colors.gray700,
              margin: 0,
              textAlign: 'justify',
            })}
          >
            {TEXTO_CONSULTA_CONCLUIDA}
          </p>
        </div>
      </section>
    )
  }
}
