/** «Ver todas las actividades»: todas las programadas de hoy en adelante. */
import { css, type Handle } from 'remix/ui'

import type { ActividadPublica } from '../../../data/programa.ts'
import { routes } from '../../../routes.ts'
import { colors, type ThemeData } from '../../../ui/civic-horizon.ts'
import { ActividadCard } from '../../../ui/programa/actividad-card.tsx'
import { ProgramaLayout, seccionStyle, vacioStyle } from '../programa-layout.tsx'

export interface ListaPageProps {
  theme?: ThemeData
  actividades: ActividadPublica[]
}

export function ListaPage(handle: Handle<ListaPageProps>) {
  return () => {
    const { theme, actividades } = handle.props
    return (
      <ProgramaLayout
        theme={theme}
        seccion="proximas"
        titulo="Próximas actividades"
        descripcion="Sesiones del Comité y del Consejo, foros, talleres, mesas de trabajo, consultas públicas y demás actividades programadas, de la más cercana a la más lejana."
      >
        <section mix={seccionStyle} aria-label="Próximas actividades">
          {actividades.length === 0 ? (
            <p mix={vacioStyle}>
              Por el momento no hay actividades programadas.{' '}
              <a href={routes.poetdum.avances.href()} mix={css({ color: colors.burgundy900 })}>
                Consulta el historial
              </a>{' '}
              para conocer las actividades realizadas.
            </p>
          ) : (
            <ul
              mix={css({
                listStyle: 'none',
                margin: 0,
                padding: 0,
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(min(320px, 100%), 1fr))',
                gap: '16px',
              })}
            >
              {actividades.map((a) => (
                <li key={a.id}>
                  <ActividadCard actividad={a} />
                </li>
              ))}
            </ul>
          )}
        </section>
      </ProgramaLayout>
    )
  }
}
