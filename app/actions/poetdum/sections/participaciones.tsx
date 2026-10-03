/**
 * «Participaciones y respuestas»: las versiones públicas de las participaciones
 * recibidas y de sus oficios de respuesta, identificadas solo por folio y fecha
 * de recepción, con un buscador por folio.
 *
 * Los registros aparecen a medida que el área responsable publica sus
 * versiones públicas; mientras un oficio no esté publicado, el registro dice
 * «Respuesta pendiente de publicación».
 */
import { css, type Handle } from 'remix/ui'

import {
  INDICACION_BUSCADOR,
  paginasVisibles,
  RESPUESTA_PENDIENTE,
  TEXTO_PARTICIPACIONES,
  TITULO_PARTICIPACIONES,
  type PaginaPublica,
  type RegistroPublico,
} from '../../../data/participaciones-publicas.ts'
import { routes } from '../../../routes.ts'
import { colors, FONT_STACK } from '../../../ui/civic-horizon.ts'
import { AccionesDocumento } from '../../../ui/programa/acciones-documento.tsx'
import { fechaLarga } from '../../../utils/calendario.ts'
import { introSeccionStyle, seccionStyle, vacioStyle } from '../programa-layout.tsx'
import { tituloRojoStyle } from './proyecto.tsx'

export interface ParticipacionesSectionProps {
  pagina: PaginaPublica
  /** Folio buscado, para repintar el buscador y conservarlo al paginar. */
  busqueda: string
}

const ANCLA = '#participaciones'

const registroStyle = css({
  display: 'grid',
  gap: '12px',
  padding: '16px 18px',
  borderRadius: '12px',
  border: `1px solid ${colors.gray200}`,
  background: colors.white,
  fontFamily: FONT_STACK,
})

const filaStyle = css({
  display: 'flex',
  alignItems: 'center',
  gap: '12px',
  flexWrap: 'wrap',
  justifyContent: 'space-between',
})

const pendienteStyle = css({
  margin: 0,
  fontSize: '14px',
  fontWeight: 600,
  color: colors.gray500,
})

function Registro(handle: Handle<{ registro: RegistroPublico }>) {
  return () => {
    const { registro: r } = handle.props
    const archivo = (documento: 'participacion' | 'oficio') =>
      routes.poetdum.participacionArchivo.href({ folio: r.folio, documento })
    return (
      <li mix={registroStyle}>
        <div mix={filaStyle}>
          <div>
            <strong mix={css({ display: 'block', fontSize: '16px', color: colors.gray900 })}>
              {r.folio}
            </strong>
            <small mix={css({ fontSize: '13px', color: colors.gray500 })}>
              Recibida el {fechaLarga(r.fecha)}
            </small>
          </div>
          <AccionesDocumento
            href={archivo('participacion')}
            nombre={`participación ${r.folio}`}
            nombreArchivo={`Participación ${r.folio}.pdf`}
            etiquetaVer="Consultar participación"
            etiquetaDescargar="Descargar participación"
          />
        </div>
        <div
          mix={[filaStyle, css({ borderTop: `1px dashed ${colors.gray200}`, paddingTop: '12px' })]}
        >
          {r.oficio ? (
            <>
              <div>
                <strong mix={css({ display: 'block', fontSize: '14px', color: colors.gray900 })}>
                  Oficio de respuesta {r.oficio.numero}
                </strong>
                {r.oficio.fecha ? (
                  <small mix={css({ fontSize: '13px', color: colors.gray500 })}>
                    Fecha del oficio: {fechaLarga(r.oficio.fecha)}
                  </small>
                ) : null}
              </div>
              <AccionesDocumento
                href={archivo('oficio')}
                nombre={`oficio de respuesta ${r.folio}`}
                nombreArchivo={`Oficio de respuesta ${r.folio}.pdf`}
                etiquetaVer="Consultar oficio de respuesta"
                etiquetaDescargar="Descargar oficio"
              />
            </>
          ) : (
            <p mix={pendienteStyle}>{RESPUESTA_PENDIENTE}</p>
          )}
        </div>
      </li>
    )
  }
}

const enlacePaginaStyle = css({
  minWidth: '38px',
  padding: '8px 12px',
  borderRadius: '8px',
  border: `1px solid ${colors.gray300}`,
  background: colors.white,
  color: colors.gray700,
  fontFamily: FONT_STACK,
  fontSize: '14px',
  fontWeight: 600,
  textAlign: 'center',
  textDecoration: 'none',
  '&[aria-current="page"]': {
    background: colors.burgundy900,
    borderColor: colors.burgundy900,
    color: colors.white,
  },
})

export function ParticipacionesSection(handle: Handle<ParticipacionesSectionProps>) {
  return () => {
    const { pagina, busqueda } = handle.props
    const totalPaginas = Math.max(1, Math.ceil(pagina.total / pagina.limit))
    const href = (p: number) => {
      const params = new URLSearchParams()
      if (busqueda) params.set('folio', busqueda)
      if (p > 1) params.set('pagina', String(p))
      const consulta = params.toString()
      return `${routes.poetdum.show.href()}${consulta ? `?${consulta}` : ''}${ANCLA}`
    }
    return (
      <section id="participaciones" aria-labelledby="participaciones-titulo" mix={seccionStyle}>
        <h2 id="participaciones-titulo" mix={tituloRojoStyle}>
          {TITULO_PARTICIPACIONES}
        </h2>
        <p mix={introSeccionStyle}>{TEXTO_PARTICIPACIONES}</p>

        <form
          method="get"
          action={`${routes.poetdum.show.href()}${ANCLA}`}
          role="search"
          mix={css({
            display: 'flex',
            gap: '10px',
            flexWrap: 'wrap',
            marginBottom: '20px',
          })}
        >
          <input
            type="search"
            name="folio"
            value={busqueda}
            maxLength={40}
            placeholder={INDICACION_BUSCADOR}
            aria-label={INDICACION_BUSCADOR}
            autoComplete="off"
            mix={css({
              flex: '1 1 280px',
              minWidth: 0,
              padding: '12px 16px',
              borderRadius: '8px',
              border: `1.5px solid ${colors.gray300}`,
              fontFamily: FONT_STACK,
              fontSize: '15px',
              '&:focus': { outline: 'none', borderColor: colors.burgundy900 },
            })}
          />
          <button
            type="submit"
            mix={css({
              padding: '12px 28px',
              borderRadius: '8px',
              border: 'none',
              background: colors.burgundy900,
              color: colors.white,
              fontFamily: FONT_STACK,
              fontSize: '15px',
              fontWeight: 700,
              cursor: 'pointer',
              '&:hover': { background: colors.burgundy800 },
            })}
          >
            Buscar
          </button>
          {busqueda ? (
            <a
              href={`${routes.poetdum.show.href()}${ANCLA}`}
              mix={css({
                alignSelf: 'center',
                fontFamily: FONT_STACK,
                fontSize: '14px',
                color: colors.burgundy900,
              })}
            >
              Limpiar búsqueda
            </a>
          ) : null}
        </form>

        {pagina.items.length === 0 ? (
          <p mix={vacioStyle}>
            {busqueda
              ? `No se encontró ninguna participación publicada con el folio «${busqueda}».`
              : 'Todavía no hay participaciones publicadas.'}
          </p>
        ) : (
          <>
            <ul
              mix={css({ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: '12px' })}
            >
              {pagina.items.map((r) => (
                <Registro key={r.folio} registro={r} />
              ))}
            </ul>
            {totalPaginas > 1 ? (
              <nav
                aria-label="Páginas de participaciones"
                mix={css({
                  display: 'flex',
                  gap: '6px',
                  flexWrap: 'wrap',
                  justifyContent: 'center',
                  marginTop: '22px',
                })}
              >
                {pagina.page > 1 ? (
                  <a href={href(pagina.page - 1)} mix={enlacePaginaStyle}>
                    ← Anterior
                  </a>
                ) : null}
                {paginasVisibles(pagina.page, totalPaginas).map((p, i) =>
                  p === '…' ? (
                    <span key={`e${i}`} mix={css({ padding: '8px 4px', color: colors.gray500 })}>
                      …
                    </span>
                  ) : (
                    <a
                      key={p}
                      href={href(p)}
                      mix={enlacePaginaStyle}
                      aria-current={p === pagina.page ? 'page' : undefined}
                    >
                      {p}
                    </a>
                  ),
                )}
                {pagina.page < totalPaginas ? (
                  <a href={href(pagina.page + 1)} mix={enlacePaginaStyle}>
                    Siguiente →
                  </a>
                ) : null}
              </nav>
            ) : null}
          </>
        )}
      </section>
    )
  }
}
