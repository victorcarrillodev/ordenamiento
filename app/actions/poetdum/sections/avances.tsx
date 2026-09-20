/**
 * Un avance del Programa: una actividad realizada con su fecha, fase y tipo,
 * descripción, resultado, principales acuerdos, fotografías y documentos.
 */
import { css, type Handle } from 'remix/ui'

import { separarArchivos, type ActividadPublica } from '../../../data/programa.ts'
import { routes } from '../../../routes.ts'
import { colors, FONT_STACK } from '../../../ui/civic-horizon.ts'
import { IconoFlecha } from '../../../ui/programa/iconos.tsx'
import { fechaLarga } from '../../../utils/calendario.ts'
import { GaleriaFotos, ListaDocumentos } from './archivos.tsx'

export const chipStyle = css({
  display: 'inline-flex',
  alignItems: 'center',
  padding: '3px 10px',
  borderRadius: '9999px',
  fontFamily: FONT_STACK,
  fontSize: '12px',
  fontWeight: 700,
  background: colors.gray100,
  color: colors.gray700,
  border: `1px solid ${colors.gray200}`,
})

const bloqueStyle = css({
  borderRadius: '10px',
  padding: '12px 16px',
  background: colors.gray50,
  borderLeft: `3px solid ${colors.green700}`,
})

const etiquetaBloqueStyle = css({
  display: 'block',
  fontSize: '12px',
  fontWeight: 800,
  letterSpacing: '0.06em',
  textTransform: 'uppercase',
  color: colors.green700,
  marginBottom: '4px',
})

const parrafoStyle = css({
  fontSize: '15px',
  lineHeight: 1.65,
  color: colors.gray700,
  margin: 0,
  whiteSpace: 'pre-line',
})

const verDetallesStyle = css({
  display: 'inline-flex',
  alignItems: 'center',
  gap: '6px',
  alignSelf: 'flex-start',
  fontSize: '14px',
  fontWeight: 700,
  color: colors.burgundy900,
  textDecoration: 'underline',
  textUnderlineOffset: '3px',
})

/** Máximo de fotografías que se asoman en la lista; el resto, en la ficha. */
const FOTOS_EN_LISTA = 4

export function AvanceItem(handle: Handle<{ actividad: ActividadPublica; compacto?: boolean }>) {
  return () => {
    const { actividad: a, compacto } = handle.props
    const ficha = routes.poetdum.actividades.detalle.href({ id: a.id })
    const { fotos, documentos } = separarArchivos(a.archivos)
    return (
      <article
        mix={css({
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
          padding: '22px 24px',
          borderRadius: '14px',
          background: colors.white,
          border: `1px solid ${colors.gray200}`,
          boxShadow: '0 4px 16px rgba(15,17,23,0.04)',
          fontFamily: FONT_STACK,
          '@media (max-width: 480px)': { padding: '18px 16px' },
        })}
      >
        <div mix={css({ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' })}>
          <time
            datetime={a.fecha}
            mix={css({
              fontSize: '14px',
              fontWeight: 800,
              color: colors.green700,
              marginRight: '4px',
            })}
          >
            {fechaLarga(a.fecha)}
          </time>
          <span mix={chipStyle}>{a.fase}</span>
          <span mix={chipStyle}>{a.tipo}</span>
        </div>
        <h3 mix={css({ fontSize: '19px', fontWeight: 800, color: colors.gray900, margin: 0 })}>
          {a.titulo}
        </h3>
        {a.descripcion ? (
          <p
            mix={[
              parrafoStyle,
              compacto
                ? css({
                    display: '-webkit-box',
                    WebkitLineClamp: 3,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden',
                    whiteSpace: 'normal',
                  })
                : css({}),
            ]}
          >
            {a.descripcion}
          </p>
        ) : null}
        {!compacto && a.resultados ? (
          <div mix={bloqueStyle}>
            <span mix={etiquetaBloqueStyle}>Resultado</span>
            <p mix={parrafoStyle}>{a.resultados}</p>
          </div>
        ) : null}
        {!compacto && a.acuerdos ? (
          <div mix={bloqueStyle}>
            <span mix={etiquetaBloqueStyle}>Principales acuerdos</span>
            <p mix={parrafoStyle}>{a.acuerdos}</p>
          </div>
        ) : null}
        {!compacto && fotos.length > 0 ? (
          <GaleriaFotos fotos={fotos} titulo={a.titulo} maximo={FOTOS_EN_LISTA} masHref={ficha} />
        ) : null}
        {!compacto && documentos.length > 0 ? <ListaDocumentos documentos={documentos} /> : null}
        <a href={ficha} mix={verDetallesStyle} aria-label={`Ver detalles de «${a.titulo}»`}>
          Ver detalles
          <IconoFlecha size={14} />
        </a>
      </article>
    )
  }
}
