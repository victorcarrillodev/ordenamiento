/**
 * Ficha completa de una actividad: la abre «Ver detalles» desde la portada,
 * el calendario o los avances, y «Ver aviso» desde la franja de avisos. El
 * mismo registro muestra la convocatoria mientras está programada y sus
 * resultados, acuerdos y evidencias una vez realizada.
 */
import { css, type Handle } from 'remix/ui'

import { enlaceUbicacion, separarArchivos, type ActividadPublica } from '../../../data/programa.ts'
import { routes } from '../../../routes.ts'
import { colors, FONT_STACK, type ThemeData } from '../../../ui/civic-horizon.ts'
import { EstadoInsignia } from '../../../ui/programa/actividad-card.tsx'
import {
  IconoCalendario,
  IconoFlecha,
  IconoMegafono,
  IconoReloj,
  IconoUbicacion,
} from '../../../ui/programa/iconos.tsx'
import { fechaConDia, fechaLarga, horario } from '../../../utils/calendario.ts'
import { ProgramaLayout, seccionStyle } from '../programa-layout.tsx'
import { Mapa } from '../public/mapa.tsx'
import { GaleriaFotos, ListaDocumentos } from '../sections/archivos.tsx'

export interface DetallePageProps {
  theme?: ThemeData
  actividad: ActividadPublica
}

const subtituloStyle = css({
  fontFamily: FONT_STACK,
  fontSize: '18px',
  fontWeight: 800,
  color: colors.gray900,
  margin: '8px 0 12px',
})

const textoStyle = css({
  fontFamily: FONT_STACK,
  fontSize: '16px',
  lineHeight: 1.7,
  color: colors.gray700,
  margin: 0,
  whiteSpace: 'pre-line',
})

const datoStyle = css({
  display: 'flex',
  gap: '10px',
  alignItems: 'flex-start',
  fontFamily: FONT_STACK,
  fontSize: '15px',
  lineHeight: 1.5,
  color: colors.gray700,
  '& svg': { flexShrink: 0, marginTop: '2px', color: colors.burgundy900 },
  '& strong': { display: 'block', color: colors.gray900, fontSize: '13px' },
})

const enlaceVolverStyle = css({
  display: 'inline-flex',
  alignItems: 'center',
  gap: '6px',
  fontFamily: FONT_STACK,
  fontSize: '14px',
  fontWeight: 700,
  color: colors.burgundy900,
})

export function DetallePage(handle: Handle<DetallePageProps>) {
  return () => {
    const { theme, actividad: a } = handle.props
    const { fotos, documentos } = separarArchivos(a.archivos)
    const hora = horario(a.hora_inicio, a.hora_fin)
    const comoLlegar = enlaceUbicacion(a)
    const lat = Number(a.latitud)
    const lng = Number(a.longitud)
    const conMapa = Boolean(a.latitud && a.longitud) && Number.isFinite(lat) && Number.isFinite(lng)
    const direccionEsEnlace = /^https?:\/\//i.test(a.direccion)

    return (
      <ProgramaLayout
        theme={theme}
        seccion="ficha"
        titulo={a.titulo}
        eyebrow={`${a.tipo} · Fase de ${a.fase}`}
        head={
          conMapa ? (
            <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
          ) : undefined
        }
      >
        <section mix={seccionStyle} aria-label="Ficha de la actividad">
          {a.aviso ? (
            <div
              role="note"
              mix={css({
                display: 'flex',
                gap: '14px',
                alignItems: 'flex-start',
                padding: '18px 20px',
                marginBottom: '28px',
                borderRadius: '12px',
                background: colors.gold100,
                border: `1px solid ${colors.gold300}`,
                fontFamily: FONT_STACK,
              })}
            >
              <span mix={css({ color: colors.burgundy900, display: 'flex' })}>
                <IconoMegafono size={24} />
              </span>
              <div>
                <strong
                  mix={css({ display: 'block', fontSize: '16px', color: colors.burgundy900 })}
                >
                  Aviso: {a.aviso.titulo}
                </strong>
                {a.aviso.descripcion ? (
                  <p mix={[textoStyle, css({ fontSize: '15px', marginTop: '4px' })]}>
                    {a.aviso.descripcion}
                  </p>
                ) : null}
              </div>
            </div>
          ) : null}

          <div
            mix={css({
              display: 'grid',
              gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 340px)',
              gap: '32px',
              alignItems: 'start',
              '@media (max-width: 900px)': { gridTemplateColumns: 'minmax(0, 1fr)' },
            })}
          >
            <div mix={css({ display: 'flex', flexDirection: 'column', gap: '20px' })}>
              <div>
                <EstadoInsignia estado={a.estado} />
              </div>

              {a.descripcion ? (
                <div>
                  <h2 mix={subtituloStyle}>Descripción</h2>
                  <p mix={textoStyle}>{a.descripcion}</p>
                </div>
              ) : null}

              {a.resultados ? (
                <div>
                  <h2 mix={subtituloStyle}>Resultado</h2>
                  <p mix={textoStyle}>{a.resultados}</p>
                </div>
              ) : null}

              {a.acuerdos ? (
                <div>
                  <h2 mix={subtituloStyle}>Principales acuerdos</h2>
                  <p mix={textoStyle}>{a.acuerdos}</p>
                </div>
              ) : null}

              {documentos.length > 0 ? (
                <div>
                  <h2 mix={subtituloStyle}>Documentos</h2>
                  <ListaDocumentos documentos={documentos} />
                </div>
              ) : null}

              {fotos.length > 0 ? (
                <div>
                  <h2 mix={subtituloStyle}>Fotografías</h2>
                  <GaleriaFotos fotos={fotos} titulo={a.titulo} />
                </div>
              ) : null}
            </div>

            <aside
              aria-label="Fecha y lugar"
              mix={css({
                display: 'flex',
                flexDirection: 'column',
                gap: '16px',
                padding: '22px',
                borderRadius: '14px',
                border: `1px solid ${colors.gray200}`,
                background: colors.gray50,
              })}
            >
              <div mix={datoStyle}>
                <IconoCalendario size={18} />
                <span>
                  <strong>Fecha</strong>
                  {fechaConDia(a.fecha)}
                </span>
              </div>
              {hora ? (
                <div mix={datoStyle}>
                  <IconoReloj size={18} />
                  <span>
                    <strong>Horario</strong>
                    {hora}
                  </span>
                </div>
              ) : null}
              {a.lugar || (a.direccion && !direccionEsEnlace) ? (
                <div mix={datoStyle}>
                  <IconoUbicacion size={18} />
                  <span>
                    <strong>Lugar</strong>
                    {a.lugar}
                    {a.lugar && a.direccion && !direccionEsEnlace ? <br /> : null}
                    {direccionEsEnlace ? null : a.direccion}
                  </span>
                </div>
              ) : null}
              {conMapa ? (
                <Mapa latitud={lat} longitud={lng} etiqueta={a.lugar || a.titulo} alto="240px" />
              ) : null}
              {comoLlegar ? (
                <a
                  href={comoLlegar}
                  target="_blank"
                  rel="noopener noreferrer"
                  mix={css({
                    display: 'inline-flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '10px 16px',
                    borderRadius: '8px',
                    background: colors.burgundy900,
                    color: colors.white,
                    fontFamily: FONT_STACK,
                    fontSize: '14px',
                    fontWeight: 700,
                    textDecoration: 'none',
                  })}
                >
                  Cómo llegar
                  <IconoFlecha size={14} />
                </a>
              ) : null}
              {a.aviso ? (
                <p
                  mix={css({
                    margin: 0,
                    fontFamily: FONT_STACK,
                    fontSize: '13px',
                    color: colors.gray500,
                  })}
                >
                  Aviso vigente hasta el {fechaLarga(a.aviso.fin)}.
                </p>
              ) : null}
            </aside>
          </div>

          <nav
            aria-label="Seguir consultando"
            mix={css({
              display: 'flex',
              gap: '24px',
              flexWrap: 'wrap',
              marginTop: '40px',
              paddingTop: '20px',
              borderTop: `1px solid ${colors.gray200}`,
            })}
          >
            <a href={routes.poetdum.calendario.href()} mix={enlaceVolverStyle}>
              Calendario de actividades
            </a>
            <a href={routes.poetdum.avances.href()} mix={enlaceVolverStyle}>
              Avances del Programa
            </a>
            <a href={routes.poetdum.actividades.show.href()} mix={enlaceVolverStyle}>
              Próximas actividades
            </a>
          </nav>
        </section>
      </ProgramaLayout>
    )
  }
}
