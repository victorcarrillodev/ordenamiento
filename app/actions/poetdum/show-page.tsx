import { css, type Handle } from 'remix/ui'

import type { ActividadPublica, DocumentoPublico } from '../../data/programa.ts'
import { routes } from '../../routes.ts'
import {
  colors,
  FONT_STACK,
  sectionContainerProps,
  type ThemeData,
} from '../../ui/civic-horizon.ts'
import { ActividadCard } from '../../ui/programa/actividad-card.tsx'
import { IconoFlecha } from '../../ui/programa/iconos.tsx'
import {
  introSeccionStyle,
  ProgramaLayout,
  seccionStyle,
  tituloSeccionStyle,
  vacioStyle,
} from './programa-layout.tsx'
import { Mapa } from './public/mapa.tsx'
import { AvanceItem } from './sections/avances.tsx'
import { DescargasSection } from './sections/descargas.tsx'
import { DocumentosSection } from './sections/documentos.tsx'
import { IndicadoresLista, SeguimientoPendiente } from './sections/seguimiento.tsx'
import type { Indicador } from './types.ts'

export interface PoetdumPageProps {
  theme?: ThemeData
  proximas: ActividadPublica[]
  /** Los avances más recientes, del último hacia atrás. */
  avancesRecientes: ActividadPublica[]
  documentos: DocumentoPublico[]
  tipo: string
  fase: string
  programaAprobado: boolean
  indicadores: Indicador[]
}

const chipBase = css({
  display: 'inline-flex',
  alignItems: 'center',
  gap: '8px',
  padding: '6px 14px',
  borderRadius: '9999px',
  fontFamily: FONT_STACK,
  fontSize: '13px',
  fontWeight: 600,
  border: '1px solid',
})

const SIMBOLOGIA = [
  { texto: 'Protección', fondo: '#dcfce7', borde: '#86efac', tinta: '#166534', punto: '#22c55e' },
  { texto: 'Conservación', fondo: '#fef3c7', borde: '#fcd34d', tinta: '#92400e', punto: '#f59e0b' },
  { texto: 'Restauración', fondo: '#dbeafe', borde: '#93c5fd', tinta: '#1e40af', punto: '#3b82f6' },
  {
    texto: 'Aprovechamiento sustentable',
    fondo: '#fee2e2',
    borde: '#fca5a5',
    tinta: '#991b1b',
    punto: '#ef4444',
  },
]

const enlaceMasStyle = css({
  display: 'inline-flex',
  alignItems: 'center',
  gap: '6px',
  fontFamily: FONT_STACK,
  fontSize: '14px',
  fontWeight: 700,
  color: colors.burgundy900,
  textDecoration: 'underline',
  textUnderlineOffset: '3px',
})

const cabeceraSeccionStyle = css({
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'flex-end',
  gap: '16px',
  flexWrap: 'wrap',
  marginBottom: '24px',
  '& p': { margin: 0 },
})

function EnlaceMas(handle: Handle<{ href: string; texto: string }>) {
  return () => (
    <a href={handle.props.href} mix={enlaceMasStyle}>
      {handle.props.texto}
      <IconoFlecha size={14} />
    </a>
  )
}

export function PoetdumPage(handle: Handle<PoetdumPageProps>) {
  return () => {
    const {
      theme,
      proximas,
      avancesRecientes,
      documentos,
      tipo,
      fase,
      programaAprobado,
      indicadores,
    } = handle.props
    return (
      <ProgramaLayout
        theme={theme}
        seccion="inicio"
        titulo="Elaboración del POETDUM"
        tituloDocumento="Elaboración del POETDUM"
        eyebrow="Bitácora Ambiental · Tlaquepaque"
        descripcion="Sigue el avance del Programa de Ordenamiento Ecológico Territorial y de Desarrollo Urbano: actividades programadas, avances, documentos y seguimiento, en un solo lugar."
        head={<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />}
      >
        <section
          aria-labelledby="mapa-heading"
          mix={css({ background: colors.gray50, padding: '48px 0' })}
        >
          <div mix={css(sectionContainerProps)}>
            <h2
              id="mapa-heading"
              mix={css({
                fontFamily: FONT_STACK,
                fontSize: '22px',
                fontWeight: 700,
                color: colors.gray900,
                margin: '0 0 24px',
                textAlign: 'center',
              })}
            >
              Mapa del territorio
            </h2>
            <div
              mix={css({
                display: 'grid',
                gridTemplateColumns: 'minmax(0, 1fr) 320px',
                gap: '32px',
                alignItems: 'start',
                '@media (max-width: 900px)': { gridTemplateColumns: 'minmax(0, 1fr)' },
              })}
            >
              <Mapa />
              <div mix={css({ display: 'flex', flexDirection: 'column', gap: '12px' })}>
                <h3
                  mix={css({
                    fontFamily: FONT_STACK,
                    fontSize: '14px',
                    fontWeight: 700,
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                    color: colors.gray700,
                    margin: 0,
                  })}
                >
                  Simbología
                </h3>
                <div mix={css({ display: 'flex', flexDirection: 'column', gap: '8px' })}>
                  {SIMBOLOGIA.map((s) => (
                    <span
                      key={s.texto}
                      mix={[
                        chipBase,
                        css({ background: s.fondo, borderColor: s.borde, color: s.tinta }),
                      ]}
                    >
                      <span
                        mix={css({
                          width: '12px',
                          height: '12px',
                          borderRadius: '50%',
                          background: s.punto,
                          display: 'inline-block',
                        })}
                      />
                      {s.texto}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="proximas" aria-labelledby="proximas-titulo" mix={seccionStyle}>
          <div mix={cabeceraSeccionStyle}>
            <div>
              <h2 id="proximas-titulo" mix={tituloSeccionStyle}>
                Próximas actividades
              </h2>
              <p mix={introSeccionStyle}>
                Sesiones, foros, talleres y demás actividades programadas.
              </p>
            </div>
            <div mix={css({ display: 'flex', gap: '20px', flexWrap: 'wrap' })}>
              <EnlaceMas href={routes.poetdum.actividades.show.href()} texto="Ver todas" />
              <EnlaceMas href={routes.poetdum.calendario.href()} texto="Ver calendario" />
            </div>
          </div>
          {proximas.length === 0 ? (
            <p mix={vacioStyle}>
              Por el momento no hay actividades programadas. Consulta el historial para conocer las
              actividades realizadas.
            </p>
          ) : (
            <div
              mix={css({
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(min(300px, 100%), 1fr))',
                gap: '16px',
              })}
            >
              {proximas.map((a) => (
                <ActividadCard key={a.id} actividad={a} />
              ))}
            </div>
          )}
        </section>

        <section
          id="avances"
          aria-labelledby="avances-titulo"
          mix={css({ background: colors.gray50 })}
        >
          <div mix={seccionStyle}>
            <div mix={cabeceraSeccionStyle}>
              <div>
                <h2 id="avances-titulo" mix={tituloSeccionStyle}>
                  Avances recientes
                </h2>
                <p mix={introSeccionStyle}>Lo último que se ha realizado en el Programa.</p>
              </div>
              <EnlaceMas href={routes.poetdum.avances.href()} texto="Ver todos los avances" />
            </div>
            {avancesRecientes.length === 0 ? (
              <p mix={vacioStyle}>Aún no hay avances publicados.</p>
            ) : (
              <div mix={css({ display: 'grid', gap: '16px' })}>
                {avancesRecientes.map((a) => (
                  <AvanceItem key={a.id} actividad={a} compacto />
                ))}
              </div>
            )}
          </div>
        </section>

        <section
          id="descargas"
          mix={css({ maxWidth: '1100px', margin: '0 auto', padding: '48px 24px 0' })}
        >
          <DescargasSection />
        </section>

        <section id="documentos" mix={seccionStyle}>
          <DocumentosSection documentos={documentos} tipo={tipo} fase={fase} />
        </section>

        <section
          id="seguimiento"
          aria-labelledby="seguimiento-titulo"
          mix={css({ background: colors.gray50 })}
        >
          <div mix={seccionStyle}>
            <div mix={cabeceraSeccionStyle}>
              <div>
                <h2 id="seguimiento-titulo" mix={tituloSeccionStyle}>
                  Seguimiento y evaluación
                </h2>
                <p mix={introSeccionStyle}>
                  Indicadores, metas y resultados de la aplicación del Programa.
                </p>
              </div>
              {programaAprobado ? (
                <EnlaceMas href={routes.poetdum.seguimiento.href()} texto="Ver el seguimiento" />
              ) : null}
            </div>
            {programaAprobado ? (
              <IndicadoresLista indicadores={indicadores} />
            ) : (
              <SeguimientoPendiente />
            )}
          </div>
        </section>
      </ProgramaLayout>
    )
  }
}
