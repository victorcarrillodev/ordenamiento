import { css, type Handle } from 'remix/ui'
import { routes } from '../../../routes.ts'
import { TEXTOS_CONSULTA_PORTAL as originales } from '../../../data/consulta.ts'
import { btnGoldProps, colors, FONT_STACK, type ThemeData } from '../../../ui/civic-horizon.ts'

/**
 * Un único acceso al listado de documentos y sus filtros.
 */
const HREF_TODOS = `${routes.poetdum.show.href()}#documentos`

export function DescargasSection(handle: Handle<{ theme?: ThemeData }>) {
  return () => {
    const textos = handle.props.theme?.usuario?.textos ?? {}
    return (
      <div
        mix={css({
          background: colors.burgundy900,
          borderRadius: '16px',
          padding: '48px 32px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '16px',
          textAlign: 'center',
          '@media (max-width: 480px)': { padding: '36px 20px' },
        })}
      >
        <h2
          mix={css({
            fontFamily: FONT_STACK,
            fontSize: 'clamp(24px, 4vw, 35px)',
            fontWeight: 800,
            color: colors.white,
            margin: 0,
            lineHeight: 1.1,
          })}
        >
          {textos.documentosTitulo || originales.documentosTitulo}
        </h2>
        <p
          mix={css({
            fontFamily: FONT_STACK,
            fontSize: '18px',
            color: 'rgba(255,255,255,0.85)',
            margin: 0,
            maxWidth: '640px',
          })}
        >
          {textos.documentosTexto || originales.documentosTexto}
        </p>
        <div
          mix={css({
            display: 'flex',
            gap: '16px',
            flexWrap: 'wrap',
            justifyContent: 'center',
            marginTop: '12px',
          })}
        >
          <a href={HREF_TODOS} mix={css(btnGoldProps)}>
            {textos.documentosBoton || originales.documentosBoton}
          </a>
        </div>
      </div>
    )
  }
}
