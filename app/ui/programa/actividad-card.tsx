/**
 * Tarjeta de una actividad del Programa: bloque con día y mes, nombre, sede y
 * horario, y «Ver detalles». La usan la portada (próximas actividades) y las
 * páginas del Programa, por eso vive en app/ui.
 */
import { css, type Handle } from 'remix/ui'

import {
  ETIQUETA_ESTADO,
  type ActividadPublica,
  type EstadoActividad,
} from '../../data/programa.ts'
import { routes } from '../../routes.ts'
import { diaYMes, horario } from '../../utils/calendario.ts'
import { colors, FONT_STACK } from '../civic-horizon.ts'
import { IconoFlecha, IconoUbicacion } from './iconos.tsx'

/** Colores por estado, compartidos por la insignia y el calendario público. */
export const COLOR_ESTADO: Record<EstadoActividad, { fondo: string; texto: string }> = {
  programada: { fondo: colors.burgundy100, texto: colors.burgundy900 },
  reprogramada: { fondo: colors.gold100, texto: '#8a5a00' },
  realizada: { fondo: colors.green100, texto: colors.green700 },
  cancelada: { fondo: '#fdecec', texto: '#b42318' },
}

const insigniaStyle = css({
  display: 'inline-flex',
  alignItems: 'center',
  padding: '3px 10px',
  borderRadius: '9999px',
  fontFamily: FONT_STACK,
  fontSize: '11px',
  fontWeight: 700,
  letterSpacing: '0.04em',
  textTransform: 'uppercase',
  whiteSpace: 'nowrap',
})

export function EstadoInsignia(handle: Handle<{ estado: EstadoActividad }>) {
  return () => {
    const { estado } = handle.props
    const color = COLOR_ESTADO[estado]
    return (
      <span mix={[insigniaStyle, css({ background: color.fondo, color: color.texto })]}>
        {ETIQUETA_ESTADO[estado]}
      </span>
    )
  }
}

const tarjetaStyle = css({
  display: 'flex',
  gap: '16px',
  alignItems: 'flex-start',
  background: colors.white,
  border: `1px solid ${colors.gray200}`,
  borderRadius: '12px',
  padding: '16px',
  height: '100%',
  boxShadow: '0 2px 10px rgba(15,17,23,0.04)',
  transition: 'box-shadow 200ms ease, border-color 200ms ease',
  '&:hover': {
    boxShadow: '0 10px 30px rgba(140,29,61,0.10)',
    borderColor: colors.burgundy100,
  },
})

const fechaStyle = css({
  flexShrink: 0,
  width: '72px',
  minHeight: '76px',
  borderRadius: '10px',
  background: colors.burgundy50,
  border: `1px solid ${colors.burgundy100}`,
  color: colors.burgundy900,
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  fontFamily: FONT_STACK,
  lineHeight: 1,
})

const cuerpoStyle = css({
  display: 'flex',
  flexDirection: 'column',
  gap: '8px',
  minWidth: 0,
  flex: 1,
})

const tituloStyle = css({
  fontFamily: FONT_STACK,
  fontSize: '17px',
  fontWeight: 700,
  lineHeight: 1.3,
  color: colors.burgundy900,
  margin: 0,
})

const metaStyle = css({
  display: 'flex',
  alignItems: 'flex-start',
  gap: '6px',
  fontFamily: FONT_STACK,
  fontSize: '14px',
  lineHeight: 1.45,
  color: colors.gray700,
  margin: 0,
  '& svg': { flexShrink: 0, marginTop: '2px', color: colors.burgundy900 },
})

const enlaceStyle = css({
  display: 'inline-flex',
  alignItems: 'center',
  gap: '6px',
  marginTop: 'auto',
  fontFamily: FONT_STACK,
  fontSize: '14px',
  fontWeight: 700,
  color: colors.burgundy900,
  textDecoration: 'underline',
  textUnderlineOffset: '3px',
  '&:hover': { color: colors.burgundy700 },
})

export type ActividadResumen = Pick<
  ActividadPublica,
  'id' | 'titulo' | 'fecha' | 'hora_inicio' | 'hora_fin' | 'lugar' | 'estado'
>

export function ActividadCard(handle: Handle<{ actividad: ActividadResumen }>) {
  return () => {
    const { actividad } = handle.props
    const { dia, mes } = diaYMes(actividad.fecha)
    const hora = horario(actividad.hora_inicio, actividad.hora_fin)
    const lugarYHora = [actividad.lugar, hora].filter(Boolean).join(' · ')
    return (
      <article mix={tarjetaStyle}>
        <div mix={fechaStyle}>
          <span mix={css({ fontSize: '28px', fontWeight: 800 })}>{dia}</span>
          <span
            mix={css({
              fontSize: '12px',
              fontWeight: 700,
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              marginTop: '4px',
            })}
          >
            {mes}
          </span>
        </div>
        <div mix={cuerpoStyle}>
          {actividad.estado === 'reprogramada' || actividad.estado === 'cancelada' ? (
            <span>
              <EstadoInsignia estado={actividad.estado} />
            </span>
          ) : null}
          <h3 mix={tituloStyle}>{actividad.titulo}</h3>
          {lugarYHora ? (
            <p mix={metaStyle}>
              <IconoUbicacion size={15} />
              <span>{lugarYHora}</span>
            </p>
          ) : null}
          <a
            href={routes.poetdum.actividades.detalle.href({ id: actividad.id })}
            aria-label={`Ver detalles de «${actividad.titulo}»`}
            mix={enlaceStyle}
          >
            Ver detalles
            <IconoFlecha size={14} />
          </a>
        </div>
      </article>
    )
  }
}
