/**
 * Secciones de la portada que salen de «Actividades y avances del Programa»:
 * la franja de avisos (bajo el menú, antes de la portada), las próximas
 * actividades (justo después de la portada) y los cuatro accesos de «Sobre el
 * Programa». Todo se alimenta del mismo registro de cada actividad.
 */
import { css, type Handle } from 'remix/ui'

import type { ActividadPublica, AvisoPortada } from '../data/programa.ts'
import { routes } from '../routes.ts'
import { ActividadCard } from '../ui/programa/actividad-card.tsx'
import { IconoFlecha, IconoMegafono } from '../ui/programa/iconos.tsx'
import {
  colors,
  eyebrowProps,
  FONT_STACK,
  headingLProps,
  isSafeCssColor,
  sectionContainerProps,
  sectionPaddingProps,
  type ThemeData,
} from '../ui/civic-horizon.ts'
import { NAVBAR_ALTURA, NAVBAR_ALTURA_MOVIL, NAVBAR_CORTE_MOVIL } from '../ui/nav-bar.tsx'

/** Textos configurables en Personalización › Textos del portal. */
function textosDe(theme?: ThemeData): Record<string, string> {
  return (theme?.usuario?.textos ?? {}) as Record<string, string>
}

function colorDelTema(valor: unknown, respaldo: string): string {
  return isSafeCssColor(valor) ? valor : respaldo
}

// ---------------------------------------------------------------------------
// Franja de avisos
// ---------------------------------------------------------------------------

const franjaStyle = css({
  // La barra de navegación es fija: la franja empieza justo debajo de ella.
  marginTop: NAVBAR_ALTURA,
  [`@media (max-width: ${NAVBAR_CORTE_MOVIL})`]: { marginTop: NAVBAR_ALTURA_MOVIL },
  background: colors.gold100,
  borderBottom: `1px solid ${colors.gray200}`,
  fontFamily: FONT_STACK,
})

const franjaInteriorStyle = css({
  display: 'grid',
  gridTemplateColumns: 'auto 1fr auto',
  alignItems: 'stretch',
  '@media (max-width: 760px)': { gridTemplateColumns: '1fr' },
})

const franjaTextoStyle = css({
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'center',
  gap: '2px',
  padding: '12px 24px',
  minWidth: 0,
  '@media (max-width: 760px)': { padding: '12px 16px 4px' },
})

const franjaBotonStyle = css({
  alignSelf: 'center',
  margin: '10px 24px',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '8px',
  padding: '10px 22px',
  borderRadius: '6px',
  color: colors.white,
  fontSize: '14px',
  fontWeight: 700,
  textDecoration: 'none',
  whiteSpace: 'nowrap',
  '&:hover': { filter: 'brightness(1.1)' },
  '@media (max-width: 760px)': { margin: '8px 16px 14px', justifySelf: 'stretch' },
})

export function AvisoFranja(handle: Handle<{ aviso: AvisoPortada; theme?: ThemeData }>) {
  return () => {
    const { aviso, theme } = handle.props
    const txt = textosDe(theme)
    const primario = colorDelTema(theme?.usuario?.colores?.primario, colors.burgundy900)
    const etiqueta = txt.avisoEtiqueta || 'Aviso importante'
    return (
      <section aria-label={etiqueta} mix={franjaStyle}>
        <div mix={franjaInteriorStyle}>
          <div
            mix={css({
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: '12px 40px 12px 24px',
              background: primario,
              color: colors.white,
              fontSize: '13px',
              fontWeight: 800,
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              // Corte en diagonal hacia el texto, como en la propuesta.
              clipPath: 'polygon(0 0, 100% 0, calc(100% - 22px) 100%, 0 100%)',
              '@media (max-width: 760px)': { clipPath: 'none', padding: '10px 16px' },
            })}
          >
            <IconoMegafono size={20} />
            <span>{etiqueta}</span>
          </div>
          <div mix={franjaTextoStyle}>
            <strong
              mix={css({ fontSize: '16px', fontWeight: 800, color: primario, lineHeight: 1.3 })}
            >
              {aviso.titulo}
            </strong>
            {aviso.descripcion ? (
              <span mix={css({ fontSize: '14px', color: colors.gray700, lineHeight: 1.45 })}>
                {aviso.descripcion}
              </span>
            ) : null}
          </div>
          <a
            href={routes.poetdum.actividades.detalle.href({ id: aviso.actividad_id })}
            aria-label={`Ver aviso: ${aviso.titulo}`}
            mix={[franjaBotonStyle, css({ background: primario })]}
          >
            {txt.avisoBoton || 'Ver aviso'}
          </a>
        </div>
      </section>
    )
  }
}

// ---------------------------------------------------------------------------
// Próximas actividades
// ---------------------------------------------------------------------------

const lineaDoradaStyle = css({
  width: '40px',
  height: '3px',
  borderRadius: '2px',
  background: colors.gold400,
  flexShrink: 0,
})

const rejillaTarjetasStyle = css({
  display: 'grid',
  gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
  gap: '20px',
  '@media (max-width: 1000px)': { gridTemplateColumns: 'repeat(2, minmax(0, 1fr))' },
  '@media (max-width: 640px)': { gridTemplateColumns: 'minmax(0, 1fr)' },
})

const botonContornoStyle = css({
  display: 'inline-flex',
  alignItems: 'center',
  gap: '8px',
  padding: '12px 26px',
  borderRadius: '6px',
  border: `2px solid ${colors.burgundy900}`,
  color: colors.burgundy900,
  fontFamily: FONT_STACK,
  fontSize: '14px',
  fontWeight: 700,
  textDecoration: 'none',
  '&:hover': { background: colors.burgundy900, color: colors.white },
})

export function ProximasActividades(
  handle: Handle<{ actividades: ActividadPublica[]; theme?: ThemeData }>,
) {
  return () => {
    const { actividades, theme } = handle.props
    const txt = textosDe(theme)
    return (
      <section
        id="proximas-actividades"
        aria-labelledby="proximas-heading"
        mix={css({ padding: '64px 0', background: colors.white })}
      >
        <div mix={css({ ...sectionContainerProps, display: 'flex', flexDirection: 'column' })}>
          <div
            mix={css({
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '10px',
              textAlign: 'center',
              marginBottom: '36px',
            })}
          >
            <div mix={css({ display: 'flex', alignItems: 'center', gap: '16px' })}>
              <span mix={lineaDoradaStyle} aria-hidden="true" />
              <h2
                id="proximas-heading"
                mix={css({
                  fontFamily: FONT_STACK,
                  fontSize: 'clamp(22px, 3.2vw, 32px)',
                  fontWeight: 800,
                  letterSpacing: '0.04em',
                  textTransform: 'uppercase',
                  color: colors.burgundy900,
                  margin: 0,
                })}
              >
                {txt.proximasTitulo || 'Próximas actividades'}
              </h2>
              <span mix={lineaDoradaStyle} aria-hidden="true" />
            </div>
            <p
              mix={css({
                fontFamily: FONT_STACK,
                fontSize: '17px',
                color: colors.gray500,
                margin: 0,
              })}
            >
              {txt.proximasSubtitulo ||
                'Consulta las fechas, horarios y lugares de las actividades programadas.'}
            </p>
          </div>

          {actividades.length === 0 ? (
            <div
              mix={css({
                textAlign: 'center',
                padding: '28px 24px',
                borderRadius: '12px',
                background: colors.gray50,
                border: `1px dashed ${colors.gray300}`,
                fontFamily: FONT_STACK,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '12px',
              })}
            >
              <p mix={css({ margin: 0, fontSize: '16px', color: colors.gray700, lineHeight: 1.6 })}>
                {txt.proximasVacio ||
                  'Por el momento no hay actividades programadas. Consulta el historial para conocer las actividades realizadas.'}
              </p>
              <a href={routes.poetdum.avances.href()} mix={botonContornoStyle}>
                Ver avances del Programa
                <IconoFlecha size={14} />
              </a>
            </div>
          ) : (
            <>
              <div mix={rejillaTarjetasStyle}>
                {actividades.map((actividad) => (
                  <ActividadCard key={actividad.id} actividad={actividad} />
                ))}
              </div>
              <div mix={css({ display: 'flex', justifyContent: 'center', marginTop: '32px' })}>
                <a href={routes.poetdum.actividades.show.href()} mix={botonContornoStyle}>
                  {txt.proximasBoton || 'Ver todas las actividades'}
                  <IconoFlecha size={14} />
                </a>
              </div>
            </>
          )}
        </div>
      </section>
    )
  }
}

// ---------------------------------------------------------------------------
// Sobre el Programa · Información y avances del Programa
// ---------------------------------------------------------------------------

interface Acceso {
  id: string
  icono: string
  eyebrow: string
  titulo: string
  descripcion: string
  href: string
  cta: string
  /** false: la sección todavía no está disponible (sin flecha de «ir»). */
  disponible: boolean
  acento: string
}

export function InformacionPrograma(handle: Handle<{ theme?: ThemeData }>) {
  return () => {
    const { theme } = handle.props
    const u = theme?.usuario ?? {}
    const c = u.colores ?? {}
    const ico = u.iconos ?? {}
    const txt = textosDe(theme)
    const primario = colorDelTema(c.primario, colors.burgundy900)
    const secundario = colorDelTema(c.secundario, colors.green700)
    const acento = colorDelTema(c.acento, colors.gold500)
    const aprobado = theme?.programa?.aprobado === true

    const accesos: Acceso[] = [
      {
        id: 'acceso-fases',
        icono: ico.cardPrograma || '🧭',
        eyebrow: txt.fasesEyebrow || 'Proceso del Programa',
        titulo: txt.fasesTitulo || 'Conoce las fases',
        descripcion:
          txt.fasesDesc ||
          'Conoce las cinco fases del Programa: Formulación, Expedición, Ejecución, Evaluación y Modificación.',
        href: '#proceso',
        cta: txt.fasesCta || 'Ver fases',
        disponible: true,
        acento: primario,
      },
      {
        id: 'acceso-avances',
        icono: ico.cardProceso || '📊',
        eyebrow: txt.avancesEyebrow || 'Avances del Programa',
        titulo: txt.avancesTitulo || 'Avances del Programa',
        descripcion:
          txt.avancesDesc ||
          'Consulta las actividades realizadas, sus resultados, acuerdos, documentos, fotografías y evidencias.',
        href: routes.poetdum.avances.href(),
        cta: txt.avancesCta || 'Ver avances',
        disponible: true,
        acento: secundario,
      },
      {
        id: 'acceso-calendario',
        icono: ico.cardCalendario || '📅',
        eyebrow: txt.calendarioEyebrow || 'Actividades',
        titulo: txt.calendarioTitulo || 'Calendario de actividades',
        descripcion:
          txt.calendarioDesc ||
          'Consulta las actividades programadas, con su fecha, horario, lugar, ubicación y documentos disponibles.',
        href: routes.poetdum.calendario.href(),
        cta: txt.calendarioCta || 'Ver calendario',
        disponible: true,
        acento: acento,
      },
      {
        id: 'acceso-seguimiento',
        icono: ico.cardDocumentos || '📈',
        eyebrow: txt.seguimientoEyebrow || 'Seguimiento y evaluación',
        titulo: txt.seguimientoTitulo || 'Seguimiento y evaluación',
        descripcion: aprobado
          ? txt.seguimientoDesc ||
            'Consulta los indicadores, las metas y mediciones y los resultados de la aplicación y evaluación del Programa.'
          : txt.seguimientoDescPendiente ||
            'Aquí se publicarán los indicadores y resultados de la aplicación y evaluación del Programa.',
        href: routes.poetdum.seguimiento.href(),
        cta: aprobado
          ? txt.seguimientoCta || 'Ver seguimiento'
          : txt.seguimientoCtaPendiente || 'Disponible una vez aprobado',
        disponible: aprobado,
        acento: colors.burgundy700,
      },
    ]

    return (
      <section
        id="sobre-el-programa"
        aria-labelledby="sobre-el-programa-heading"
        mix={css({ ...sectionPaddingProps, background: colors.white })}
      >
        <div mix={css(sectionContainerProps)}>
          <div
            mix={css({
              textAlign: 'center',
              marginBottom: '56px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '16px',
            })}
          >
            <span mix={css({ ...eyebrowProps, color: primario })}>
              {txt.infoEyebrow || 'Sobre el Programa'}
            </span>
            <h2
              id="sobre-el-programa-heading"
              mix={css({ ...headingLProps, margin: 0, maxWidth: '760px' })}
            >
              {txt.infoTitulo || 'Información y avances del Programa'}
            </h2>
            <p
              mix={css({
                fontFamily: FONT_STACK,
                fontSize: '18px',
                lineHeight: 1.6,
                color: colors.gray500,
                margin: 0,
                maxWidth: '720px',
              })}
            >
              {txt.infoDescripcion ||
                'Consulta las fases del Programa, las actividades realizadas, el calendario de actividades programadas y los resultados de su aplicación.'}
            </p>
          </div>

          <div
            mix={css({
              display: 'grid',
              gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
              gap: '24px',
              '@media (max-width: 1024px)': {
                gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
              },
              '@media (max-width: 600px)': { gridTemplateColumns: 'minmax(0, 1fr)' },
            })}
          >
            {accesos.map((acceso) => (
              <AccesoPrograma key={acceso.id} acceso={acceso} />
            ))}
          </div>
        </div>
      </section>
    )
  }
}

function AccesoPrograma(handle: Handle<{ acceso: Acceso }>) {
  return () => {
    const { acceso } = handle.props
    return (
      <a
        id={acceso.id}
        href={acceso.href}
        mix={css({
          background: colors.white,
          borderRadius: '12px',
          border: `1px solid ${colors.gray200}`,
          padding: '28px 24px',
          display: 'flex',
          flexDirection: 'column',
          gap: '14px',
          textDecoration: 'none',
          color: 'inherit',
          transition: 'box-shadow 250ms ease, transform 250ms ease, border-color 250ms ease',
          '&:hover': {
            boxShadow: '0 12px 40px rgba(140,29,61,0.12)',
            transform: 'translateY(-4px)',
            borderColor: acceso.acento,
          },
        })}
      >
        <div
          aria-hidden="true"
          mix={css({
            width: '56px',
            height: '56px',
            borderRadius: '14px',
            background: `${acceso.acento}18`,
            border: `1px solid ${colors.gray700}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '26px',
          })}
        >
          {acceso.icono}
        </div>
        <span
          mix={css({
            fontFamily: FONT_STACK,
            fontSize: '11px',
            fontWeight: 700,
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            color: acceso.acento,
          })}
        >
          {acceso.eyebrow}
        </span>
        <h3
          mix={css({
            fontFamily: FONT_STACK,
            fontSize: '18px',
            fontWeight: 700,
            lineHeight: 1.3,
            color: colors.gray900,
            margin: 0,
          })}
        >
          {acceso.titulo}
        </h3>
        <p
          mix={css({
            fontFamily: FONT_STACK,
            fontSize: '14px',
            lineHeight: 1.6,
            color: colors.gray500,
            margin: 0,
            flex: 1,
          })}
        >
          {acceso.descripcion}
        </p>
        <span
          mix={css({
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            fontFamily: FONT_STACK,
            fontSize: '14px',
            fontWeight: 700,
            color: acceso.acento,
          })}
        >
          {acceso.cta}
          {acceso.disponible ? <IconoFlecha size={14} /> : null}
        </span>
      </a>
    )
  }
}
