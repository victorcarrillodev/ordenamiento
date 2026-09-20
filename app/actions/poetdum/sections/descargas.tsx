import { css } from 'remix/ui'
import { routes } from '../../../routes.ts'
import { btnGoldProps, btnSecondaryProps, colors, FONT_STACK } from '../../../ui/civic-horizon.ts'

/**
 * Los botones llevan al repositorio de documentos (los archivos de las
 * actividades), ya filtrado por lo que anuncia cada uno. Los documentos
 * oficiales son los que se marcan como «Documento aprobado» en su actividad.
 */
const HREF_APROBADOS = `${routes.poetdum.show.href()}?tipo=${encodeURIComponent('Documento aprobado')}#documentos`
const HREF_TODOS = `${routes.poetdum.show.href()}#documentos`

export function DescargasSection() {
  return () => {
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
          OBTÉN LOS DOCUMENTOS OFICIALES
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
          Consulta y descarga los documentos del Programa: convocatorias, actas, acuerdos,
          dictámenes y documentos aprobados, cada uno con la actividad en que se generó.
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
          <a href={HREF_APROBADOS} mix={css(btnGoldProps)}>
            Documentos aprobados
          </a>
          <a href={HREF_TODOS} mix={css(btnSecondaryProps)}>
            Todos los documentos
          </a>
        </div>
      </div>
    )
  }
}
