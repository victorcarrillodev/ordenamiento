import { css } from 'remix/ui'
import { routes } from '../../../routes.ts'
import { btnGoldProps, btnSecondaryProps, colors, FONT_STACK } from '../../../ui/civic-horizon.ts'

/**
 * Los dos botones llevan al repositorio público de documentos, ya filtrado por
 * el tipo que anuncia cada uno. Antes apuntaban a `#`: prometían una descarga
 * y no hacían nada, que es peor que no ofrecerla.
 */
const HREF_PROGRAMA = `${routes.poetdum.documentos.show.href()}?tipo=${encodeURIComponent('Programa')}`
const HREF_FICHAS = `${routes.poetdum.documentos.show.href()}?tipo=${encodeURIComponent('Documentos técnicos')}`

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
          Descarga aquí el documento completo del Plan de Ordenamiento Ecológico Local (POETDUM) y
          las Fichas de las unidades de gestión ambiental
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
          <a href={HREF_PROGRAMA} mix={css(btnGoldProps)}>
            POETDUM
          </a>
          <a href={HREF_FICHAS} mix={css(btnSecondaryProps)}>
            FICHAS
          </a>
        </div>
      </div>
    )
  }
}
