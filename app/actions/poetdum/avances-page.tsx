import { css, type Handle } from 'remix/ui'

import { FASES_PROGRAMA, type ActividadPublica } from '../../data/programa.ts'
import { routes } from '../../routes.ts'
import { colors, FONT_STACK, type ThemeData } from '../../ui/civic-horizon.ts'
import { ProgramaLayout, seccionStyle, vacioStyle } from './programa-layout.tsx'
import { AvanceItem } from './sections/avances.tsx'

export interface AvancesPageProps {
  theme?: ThemeData
  /** Actividades realizadas en orden cronológico. */
  avances: ActividadPublica[]
  fase: string
}

const filtroStyle = css({
  display: 'inline-flex',
  padding: '7px 14px',
  borderRadius: '9999px',
  fontFamily: FONT_STACK,
  fontSize: '13px',
  fontWeight: 700,
  textDecoration: 'none',
  border: `1px solid ${colors.gray300}`,
  color: colors.gray700,
  background: colors.white,
  '&:hover': { borderColor: colors.burgundy900, color: colors.burgundy900 },
  '&[aria-current="page"]': {
    background: colors.burgundy900,
    borderColor: colors.burgundy900,
    color: colors.white,
  },
})

/** Línea vertical con un punto por avance: se lee como la historia del Programa. */
const lineaTiempoStyle = css({
  listStyle: 'none',
  margin: 0,
  padding: '0 0 0 28px',
  position: 'relative',
  display: 'grid',
  gap: '20px',
  '&::before': {
    content: '""',
    position: 'absolute',
    left: '8px',
    top: '8px',
    bottom: '8px',
    width: '2px',
    background: colors.green100,
  },
  '& > li': { position: 'relative' },
  '& > li::before': {
    content: '""',
    position: 'absolute',
    left: '-26px',
    top: '26px',
    width: '14px',
    height: '14px',
    borderRadius: '50%',
    background: colors.green700,
    border: `3px solid ${colors.white}`,
    boxShadow: `0 0 0 2px ${colors.green100}`,
  },
  '@media (max-width: 480px)': { paddingLeft: '20px', '& > li::before': { left: '-19px' } },
})

export function AvancesPage(handle: Handle<AvancesPageProps>) {
  return () => {
    const { theme, avances, fase } = handle.props
    const base = routes.poetdum.avances.href()
    return (
      <ProgramaLayout
        theme={theme}
        seccion="avances"
        titulo="Avances del Programa"
        descripcion="Las actividades ya realizadas, en orden cronológico, con sus resultados, acuerdos, documentos, fotografías y evidencias."
      >
        <section mix={seccionStyle} aria-label="Avances del Programa">
          <nav
            aria-label="Filtrar por fase del Programa"
            mix={css({ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '28px' })}
          >
            <a href={base} mix={filtroStyle} aria-current={fase ? undefined : 'page'}>
              Todas las fases
            </a>
            {FASES_PROGRAMA.map((f) => (
              <a
                key={f}
                href={`${base}?fase=${encodeURIComponent(f)}`}
                mix={filtroStyle}
                aria-current={f === fase ? 'page' : undefined}
              >
                {f}
              </a>
            ))}
          </nav>

          {avances.length === 0 ? (
            <p mix={vacioStyle}>
              {fase
                ? `Aún no hay avances publicados en la fase de ${fase}.`
                : 'Aún no hay avances publicados.'}
            </p>
          ) : (
            <ol mix={lineaTiempoStyle}>
              {avances.map((a) => (
                <li key={a.id}>
                  <AvanceItem actividad={a} />
                </li>
              ))}
            </ol>
          )}
        </section>
      </ProgramaLayout>
    )
  }
}
