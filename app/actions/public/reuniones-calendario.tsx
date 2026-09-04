/**
 * Calendario público de reuniones (portada).
 *
 * Isla `clientEntry`: el mes en vista y el día seleccionado son estado local;
 * elegir día o cambiar de mes re-renderiza vía `handle.update()` sin recargar
 * la página ni perder el scroll. Sin reuniones no renderiza nada.
 */
import { clientEntry, css, on, type Handle, type SerializableProps } from 'remix/ui'

import {
  bodyProps,
  cardProps,
  colors,
  eyebrowProps,
  FONT_STACK,
  headingLProps,
  sectionContainerProps,
  sectionPaddingProps,
} from '../../ui/civic-horizon.ts'

export type ReunionPublica = {
  id: string
  titulo: string
  /** Fecha ISO 'YYYY-MM-DD'. */
  fecha: string
  /** Hora 'HH:MM'; '' si no se indicó. */
  hora_inicio: string
  /** Hora 'HH:MM'; '' si no se indicó. */
  hora_fin: string
}

interface ReunionesCalendarioProps extends SerializableProps {
  reuniones: ReunionPublica[]
  textos: Record<string, string>
  /** Color de acento YA saneado por el servidor (isSafeCssColor). */
  accent: string
}

export const MESES = [
  'enero',
  'febrero',
  'marzo',
  'abril',
  'mayo',
  'junio',
  'julio',
  'agosto',
  'septiembre',
  'octubre',
  'noviembre',
  'diciembre',
] as const

export const DIAS_CABECERA = ['L', 'M', 'X', 'J', 'V', 'S', 'D'] as const

export interface DiaCelda {
  dia: number
  /** Fecha ISO 'YYYY-MM-DD'. */
  fecha: string
  reuniones: ReunionPublica[]
}

/**
 * Descompone 'YYYY-MM-DD' sin pasar por `Date` (la zona horaria del servidor
 * o del navegador movería el día). Devuelve el mes 0-indexado.
 */
export function parsearFecha(iso: string): { anio: number; mes: number; dia: number } {
  const [anio, mes, dia] = iso.split('-').map(Number)
  return { anio, mes: mes - 1, dia }
}

export function desplazarMes(
  anio: number,
  mes: number,
  delta: number,
): { anio: number; mes: number } {
  const total = anio * 12 + mes + delta
  return { anio: Math.floor(total / 12), mes: ((total % 12) + 12) % 12 }
}

export function agruparPorDia(reuniones: ReunionPublica[]): Map<string, ReunionPublica[]> {
  const porDia = new Map<string, ReunionPublica[]>()
  for (const reunion of reuniones) {
    const lista = porDia.get(reunion.fecha)
    if (lista) lista.push(reunion)
    else porDia.set(reunion.fecha, [reunion])
  }
  return porDia
}

function isoDeDia(anio: number, mes: number, dia: number): string {
  const mm = String(mes + 1).padStart(2, '0')
  const dd = String(dia).padStart(2, '0')
  return `${anio}-${mm}-${dd}`
}

/**
 * Grilla del mes en semanas L-D: `null` para los huecos antes del día 1 y
 * relleno al final hasta múltiplo de 7. `new Date(anio, mes, …)` aquí solo
 * cuenta días del calendario civil (no instantes), así que es determinista.
 */
export function construirGrilla(
  anio: number,
  mes: number,
  porDia: Map<string, ReunionPublica[]>,
): (DiaCelda | null)[] {
  const totalDias = new Date(anio, mes + 1, 0).getDate()
  const primerDia = new Date(anio, mes, 1).getDay()
  const huecosInicio = primerDia === 0 ? 6 : primerDia - 1
  const celdas: (DiaCelda | null)[] = []
  for (let i = 0; i < huecosInicio; i++) celdas.push(null)
  for (let dia = 1; dia <= totalDias; dia++) {
    const fecha = isoDeDia(anio, mes, dia)
    celdas.push({ dia, fecha, reuniones: porDia.get(fecha) ?? [] })
  }
  while (celdas.length % 7 !== 0) celdas.push(null)
  return celdas
}

/** '2026-09-20' → '20 de septiembre de 2026' (formato manual, determinista). */
export function fechaLarga(iso: string): string {
  const { anio, mes, dia } = parsearFecha(iso)
  return `${dia} de ${MESES[mes]} de ${anio}`
}

/** '10:00 – 12:00'; solo inicio si no hay fin; '' si no hay horas. */
export function horaTexto(reunion: ReunionPublica): string {
  const inicio = reunion.hora_inicio || ''
  const fin = reunion.hora_fin || ''
  if (inicio && fin) return `${inicio} – ${fin}`
  return inicio
}

function nombreMesCapitalizado(mes: number): string {
  const nombre = MESES[mes]
  return nombre.charAt(0).toUpperCase() + nombre.slice(1)
}

export const ReunionesCalendario = clientEntry(
  import.meta.url,
  function ReunionesCalendario(handle: Handle<ReunionesCalendarioProps>) {
    const { reuniones } = handle.props
    let anioVista = 0
    let mesVista = 0
    let diaSel = ''
    if (reuniones.length > 0) {
      const inicial = parsearFecha(reuniones[0].fecha)
      anioVista = inicial.anio
      mesVista = inicial.mes
      diaSel = reuniones[0].fecha
    }

    return () => {
      const { reuniones: lista, textos, accent } = handle.props
      if (lista.length === 0) return null
      const txt = textos || {}
      const eyebrow = txt.reunionesEyebrow || 'Próximas reuniones'
      const titulo = txt.reunionesTitulo || 'Reuniones del Comité Técnico'
      const panelVacio =
        txt.reunionesPanelVacio || 'Selecciona un día con reunión para ver los detalles'
      const porDia = agruparPorDia(lista)
      const grilla = construirGrilla(anioVista, mesVista, porDia)
      const seleccionadas = porDia.get(diaSel) ?? []
      const etiquetaMes = `${nombreMesCapitalizado(mesVista)} ${anioVista}`

      return (
        <section aria-labelledby="reuniones-heading" mix={css({ ...sectionPaddingProps })}>
          <div mix={css({ ...sectionContainerProps })}>
            <p mix={css({ ...eyebrowProps, color: accent })}>{eyebrow}</p>
            <h2 id="reuniones-heading" mix={css({ ...headingLProps })}>
              {titulo}
            </h2>
            <div mix={reunionesGridStyle}>
              {/* Izquierda: calendario */}
              <div mix={css({ ...cardProps })}>
                <div mix={mesHeaderStyle}>
                  <button
                    type="button"
                    aria-label="Mes anterior"
                    mix={[
                      mesBotonStyle,
                      on('click', () => {
                        const anterior = desplazarMes(anioVista, mesVista, -1)
                        anioVista = anterior.anio
                        mesVista = anterior.mes
                        handle.update()
                      }),
                    ]}
                  >
                    ‹
                  </button>
                  <p mix={mesEtiquetaStyle}>{etiquetaMes}</p>
                  <button
                    type="button"
                    aria-label="Mes siguiente"
                    mix={[
                      mesBotonStyle,
                      on('click', () => {
                        const siguiente = desplazarMes(anioVista, mesVista, 1)
                        anioVista = siguiente.anio
                        mesVista = siguiente.mes
                        handle.update()
                      }),
                    ]}
                  >
                    ›
                  </button>
                </div>
                <div mix={grillaStyle}>
                  {DIAS_CABECERA.map((letra) => (
                    <div key={letra} mix={cabeceraDiaStyle}>
                      {letra}
                    </div>
                  ))}
                  {grilla.map((celda, idx) => {
                    if (celda === null) return <div key={idx} aria-hidden="true" />
                    const tiene = celda.reuniones.length > 0
                    const seleccionado = celda.fecha === diaSel
                    if (!tiene) {
                      return (
                        <div key={celda.fecha} mix={css({ ...celdaBaseProps })}>
                          {celda.dia}
                        </div>
                      )
                    }
                    const etiqueta =
                      celda.reuniones.length === 1
                        ? `${celda.dia} de ${MESES[mesVista]} — 1 reunión`
                        : `${celda.dia} de ${MESES[mesVista]} — ${celda.reuniones.length} reuniones`
                    return (
                      <button
                        key={celda.fecha}
                        type="button"
                        aria-label={etiqueta}
                        mix={[
                          css({
                            ...celdaBaseProps,
                            ...(seleccionado
                              ? { background: accent, color: colors.white, fontWeight: 700 }
                              : {}),
                          }),
                          on('click', () => {
                            diaSel = celda.fecha
                            handle.update()
                          }),
                        ]}
                      >
                        {celda.dia}
                        <span
                          aria-hidden="true"
                          mix={css({
                            ...puntoProps,
                            background: seleccionado ? colors.white : accent,
                          })}
                        />
                      </button>
                    )
                  })}
                </div>
              </div>
              {/* Derecha: detalle del día */}
              <aside aria-live="polite" mix={css({ ...cardProps })}>
                {seleccionadas.length === 0 ? (
                  <p mix={css({ ...bodyProps })}>{panelVacio}</p>
                ) : (
                  <div mix={panelListaStyle}>
                    {seleccionadas.map((reunion) => (
                      <article key={reunion.id} mix={panelArticuloStyle}>
                        <h3 mix={panelTituloStyle}>{reunion.titulo}</h3>
                        <p mix={css({ ...bodyProps })}>{fechaLarga(reunion.fecha)}</p>
                        {horaTexto(reunion) ? (
                          <p mix={css({ ...bodyProps, color: accent })}>{horaTexto(reunion)}</p>
                        ) : null}
                      </article>
                    ))}
                  </div>
                )}
              </aside>
            </div>
          </div>
        </section>
      )
    }
  },
)

// ---------------------------------------------------------------------------
// Estilos: objetos crudos a nivel de módulo (patrón civic-horizon —
// plain CSSProps objects, css() en el punto de uso). El `accent` dinámico se
// inyecta con css({ ...base, … }) dentro del render.
// ---------------------------------------------------------------------------

const reunionesGridStyle = css({
  display: 'grid',
  gridTemplateColumns: '1fr',
  gap: '24px',
  marginTop: '32px',
  '@media (min-width: 900px)': {
    gridTemplateColumns: '3fr 2fr',
  },
})

const mesHeaderStyle = css({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: '16px',
})

const mesEtiquetaStyle = css({
  fontFamily: FONT_STACK,
  fontSize: '18px',
  fontWeight: 700,
  color: colors.gray900,
  margin: 0,
})

const mesBotonStyle = css({
  width: '32px',
  height: '32px',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: '20px',
  lineHeight: 1,
  color: colors.gray700,
  background: colors.white,
  border: `1px solid ${colors.gray200}`,
  borderRadius: '8px',
  cursor: 'pointer',
})

const grillaStyle = css({
  display: 'grid',
  gridTemplateColumns: 'repeat(7, 1fr)',
  gap: '4px',
})

const cabeceraDiaStyle = css({
  fontFamily: FONT_STACK,
  fontSize: '12px',
  fontWeight: 700,
  color: colors.gray500,
  textAlign: 'center',
  padding: '8px 0',
})

const celdaBaseProps = {
  fontFamily: FONT_STACK,
  fontSize: '14px',
  color: colors.gray700,
  minHeight: '44px',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '2px',
  borderRadius: '8px',
  border: 0,
  background: 'transparent',
  cursor: 'pointer',
}

const puntoProps = {
  width: '6px',
  height: '6px',
  borderRadius: '50%',
  display: 'block',
}

const panelListaStyle = css({
  display: 'flex',
  flexDirection: 'column',
  gap: '16px',
})

const panelArticuloStyle = css({
  display: 'flex',
  flexDirection: 'column',
  gap: '4px',
  paddingBottom: '16px',
  borderBottom: `1px solid ${colors.gray200}`,
  '&:last-child': {
    paddingBottom: 0,
    borderBottom: 'none',
  },
})

const panelTituloStyle = css({
  fontFamily: FONT_STACK,
  fontSize: '18px',
  fontWeight: 700,
  lineHeight: 1.3,
  color: colors.gray900,
  margin: 0,
})
