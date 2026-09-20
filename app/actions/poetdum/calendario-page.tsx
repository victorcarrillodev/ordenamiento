/**
 * Calendario de actividades. Todo va por enlaces (`?mes=YYYY-MM`) y se dibuja
 * en el servidor: se puede navegar entre meses y abrir la ficha de cada
 * actividad sin JavaScript. Debajo de la cuadrícula, la agenda del mes repite
 * lo mismo en lista, que es la forma cómoda de leerlo en un teléfono.
 */
import { css, type Handle } from 'remix/ui'

import { ESTADOS_ACTIVIDAD, ETIQUETA_ESTADO, type ActividadPublica } from '../../data/programa.ts'
import { routes } from '../../routes.ts'
import { colors, FONT_STACK, type ThemeData } from '../../ui/civic-horizon.ts'
import { COLOR_ESTADO, EstadoInsignia } from '../../ui/programa/actividad-card.tsx'
import { IconoUbicacion } from '../../ui/programa/iconos.tsx'
import {
  agruparPorFecha,
  claveMes,
  claveMesVecino,
  construirGrilla,
  DIAS_CABECERA,
  fechaConDia,
  horario,
  MESES,
  nombreMes,
} from '../../utils/calendario.ts'
import { ProgramaLayout, seccionStyle, vacioStyle } from './programa-layout.tsx'

export interface CalendarioPageProps {
  theme?: ThemeData
  actividades: ActividadPublica[]
  anio: number
  /** 0-indexado. */
  mes: number
  hoy: string
}

const botonMesStyle = css({
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  minWidth: '40px',
  height: '40px',
  padding: '0 12px',
  borderRadius: '8px',
  border: `1px solid ${colors.gray300}`,
  background: colors.white,
  color: colors.gray900,
  fontFamily: FONT_STACK,
  fontSize: '14px',
  fontWeight: 700,
  textDecoration: 'none',
  '&:hover': { borderColor: colors.burgundy900, color: colors.burgundy900 },
})

/** El botón en los extremos del calendario, donde no hay mes al cual ir. */
const botonMesInactivoStyle = css({
  opacity: 0.4,
  '&:hover': { borderColor: colors.gray300, color: colors.gray900 },
})

const rejillaStyle = css({
  display: 'grid',
  gridTemplateColumns: 'repeat(7, minmax(0, 1fr))',
  border: `1px solid ${colors.gray200}`,
  borderRadius: '12px',
  overflow: 'hidden',
  background: colors.white,
})

const cabeceraDiaStyle = css({
  padding: '10px 0',
  textAlign: 'center',
  fontFamily: FONT_STACK,
  fontSize: '12px',
  fontWeight: 800,
  color: colors.gray500,
  background: colors.gray50,
  borderBottom: `1px solid ${colors.gray200}`,
})

const celdaStyle = css({
  minHeight: '104px',
  padding: '6px',
  borderRight: `1px solid ${colors.gray100}`,
  borderBottom: `1px solid ${colors.gray100}`,
  display: 'flex',
  flexDirection: 'column',
  gap: '4px',
  minWidth: 0,
  fontFamily: FONT_STACK,
  '@media (max-width: 640px)': { minHeight: '56px', padding: '4px', alignItems: 'center' },
})

const numeroStyle = css({
  fontSize: '13px',
  fontWeight: 700,
  color: colors.gray700,
  textDecoration: 'none',
  width: '26px',
  height: '26px',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  borderRadius: '50%',
})

const chipStyle = css({
  display: 'block',
  padding: '3px 6px',
  borderRadius: '5px',
  fontSize: '11px',
  fontWeight: 600,
  lineHeight: 1.3,
  textDecoration: 'none',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
  '&:hover': { filter: 'brightness(0.95)' },
  // En un teléfono no cabe el nombre: queda un punto de color por actividad
  // y la agenda de abajo da el detalle.
  '@media (max-width: 640px)': {
    width: '10px',
    height: '10px',
    padding: 0,
    borderRadius: '50%',
    fontSize: 0,
  },
})

export function CalendarioPage(handle: Handle<CalendarioPageProps>) {
  return () => {
    const { theme, actividades, anio, mes, hoy } = handle.props
    const base = routes.poetdum.calendario.href()
    const botonMes = (delta: number, simbolo: string, etiqueta: string) => {
      const clave = claveMesVecino(anio, mes, delta)
      return clave ? (
        <a href={`${base}?mes=${clave}`} mix={botonMesStyle} aria-label={etiqueta} rel="nofollow">
          {simbolo}
        </a>
      ) : (
        <span mix={[botonMesStyle, botonMesInactivoStyle]} aria-hidden="true">
          {simbolo}
        </span>
      )
    }
    const porDia = agruparPorFecha(actividades)
    const celdas = construirGrilla(anio, mes, porDia)
    const etiquetaMes = `${nombreMes(mes)} ${anio}`
    const esMesActual = hoy.startsWith(claveMes(anio, mes))

    return (
      <ProgramaLayout
        theme={theme}
        seccion="calendario"
        titulo="Calendario de actividades"
        descripcion="Consulta las actividades con su fecha, horario, lugar, ubicación y documentos disponibles. Selecciona una actividad para abrir su ficha completa."
      >
        <section mix={seccionStyle} aria-labelledby="mes-visible">
          <div
            mix={css({
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '12px',
              flexWrap: 'wrap',
              marginBottom: '16px',
            })}
          >
            <div mix={css({ display: 'flex', alignItems: 'center', gap: '10px' })}>
              {botonMes(-1, '‹', 'Mes anterior')}
              <h2
                id="mes-visible"
                mix={css({
                  fontFamily: FONT_STACK,
                  fontSize: '22px',
                  fontWeight: 800,
                  color: colors.gray900,
                  margin: 0,
                  minWidth: '190px',
                  textAlign: 'center',
                })}
              >
                {etiquetaMes}
              </h2>
              {botonMes(1, '›', 'Mes siguiente')}
              {esMesActual ? null : (
                <a href={base} mix={botonMesStyle}>
                  Hoy
                </a>
              )}
            </div>
            <ul
              aria-label="Estados"
              mix={css({
                display: 'flex',
                gap: '12px',
                flexWrap: 'wrap',
                listStyle: 'none',
                margin: 0,
                padding: 0,
                fontFamily: FONT_STACK,
                fontSize: '12px',
                color: colors.gray700,
              })}
            >
              {ESTADOS_ACTIVIDAD.map((e) => (
                <li key={e} mix={css({ display: 'inline-flex', alignItems: 'center', gap: '6px' })}>
                  <span
                    aria-hidden="true"
                    mix={css({
                      width: '10px',
                      height: '10px',
                      borderRadius: '50%',
                      background: COLOR_ESTADO[e].texto,
                    })}
                  />
                  {ETIQUETA_ESTADO[e]}
                </li>
              ))}
            </ul>
          </div>

          <div mix={rejillaStyle}>
            {DIAS_CABECERA.map((d) => (
              <div key={d} mix={cabeceraDiaStyle} aria-hidden="true">
                {d}
              </div>
            ))}
            {celdas.map((celda, i) => {
              if (!celda) {
                return (
                  <div key={`vacia-${i}`} mix={[celdaStyle, css({ background: colors.gray50 })]} />
                )
              }
              const esHoy = celda.fecha === hoy
              const tiene = celda.items.length > 0
              return (
                <div key={celda.fecha} mix={celdaStyle}>
                  {tiene ? (
                    <a
                      href={`#dia-${celda.fecha}`}
                      mix={[
                        numeroStyle,
                        css(
                          esHoy
                            ? { background: colors.burgundy900, color: colors.white }
                            : { color: colors.burgundy900, background: colors.burgundy50 },
                        ),
                      ]}
                      aria-label={`${celda.dia} de ${MESES[mes]}: ${celda.items.length} actividad${celda.items.length === 1 ? '' : 'es'}`}
                    >
                      {celda.dia}
                    </a>
                  ) : (
                    <span
                      mix={[
                        numeroStyle,
                        css(esHoy ? { background: colors.burgundy900, color: colors.white } : {}),
                      ]}
                    >
                      {celda.dia}
                    </span>
                  )}
                  <div
                    mix={css({
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '3px',
                      minWidth: 0,
                      '@media (max-width: 640px)': {
                        flexDirection: 'row',
                        flexWrap: 'wrap',
                        justifyContent: 'center',
                      },
                    })}
                  >
                    {celda.items.map((a) => (
                      <a
                        key={a.id}
                        href={routes.poetdum.actividades.detalle.href({ id: a.id })}
                        title={`${a.titulo} · ${ETIQUETA_ESTADO[a.estado]}`}
                        aria-label={`${a.titulo}, ${ETIQUETA_ESTADO[a.estado].toLowerCase()}`}
                        mix={[
                          chipStyle,
                          css({
                            background: COLOR_ESTADO[a.estado].fondo,
                            color: COLOR_ESTADO[a.estado].texto,
                            textDecoration: a.estado === 'cancelada' ? 'line-through' : 'none',
                            '@media (max-width: 640px)': {
                              background: COLOR_ESTADO[a.estado].texto,
                            },
                          }),
                        ]}
                      >
                        {a.titulo}
                      </a>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>

          <div mix={css({ marginTop: '36px' })}>
            <h2
              mix={css({
                fontFamily: FONT_STACK,
                fontSize: '20px',
                fontWeight: 800,
                color: colors.gray900,
                margin: '0 0 16px',
              })}
            >
              Actividades de {MESES[mes]} de {anio}
            </h2>
            {actividades.length === 0 ? (
              <p mix={vacioStyle}>
                No hay actividades registradas en {MESES[mes]}.{' '}
                <a
                  href={routes.poetdum.actividades.show.href()}
                  mix={css({ color: colors.burgundy900 })}
                >
                  Ver las próximas actividades
                </a>
              </p>
            ) : (
              <div mix={css({ display: 'grid', gap: '18px' })}>
                {[...porDia.entries()].map(([fecha, lista]) => (
                  <div key={fecha} id={`dia-${fecha}`}>
                    <h3
                      mix={css({
                        fontFamily: FONT_STACK,
                        fontSize: '15px',
                        fontWeight: 800,
                        color: colors.burgundy900,
                        margin: '0 0 8px',
                      })}
                    >
                      {fechaConDia(fecha)}
                    </h3>
                    <ul
                      mix={css({
                        listStyle: 'none',
                        margin: 0,
                        padding: 0,
                        display: 'grid',
                        gap: '8px',
                      })}
                    >
                      {lista.map((a) => (
                        <li
                          key={a.id}
                          mix={css({
                            display: 'flex',
                            gap: '14px',
                            alignItems: 'center',
                            flexWrap: 'wrap',
                            padding: '12px 16px',
                            borderRadius: '10px',
                            border: `1px solid ${colors.gray200}`,
                            borderLeft: `4px solid ${COLOR_ESTADO[a.estado].texto}`,
                            background: colors.white,
                            fontFamily: FONT_STACK,
                          })}
                        >
                          <span
                            mix={css({
                              fontSize: '14px',
                              fontWeight: 700,
                              color: colors.gray700,
                              minWidth: '96px',
                            })}
                          >
                            {horario(a.hora_inicio, a.hora_fin) || 'Todo el día'}
                          </span>
                          <span mix={css({ flex: '1 1 240px', minWidth: 0 })}>
                            <a
                              href={routes.poetdum.actividades.detalle.href({ id: a.id })}
                              mix={css({
                                fontSize: '16px',
                                fontWeight: 700,
                                color: colors.gray900,
                                textDecoration: a.estado === 'cancelada' ? 'line-through' : 'none',
                                '&:hover': { color: colors.burgundy900 },
                              })}
                            >
                              {a.titulo}
                            </a>
                            {a.lugar ? (
                              <span
                                mix={css({
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                  fontSize: '13px',
                                  color: colors.gray500,
                                  marginTop: '2px',
                                })}
                              >
                                <IconoUbicacion size={13} /> {a.lugar}
                              </span>
                            ) : null}
                          </span>
                          <EstadoInsignia estado={a.estado} />
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      </ProgramaLayout>
    )
  }
}
