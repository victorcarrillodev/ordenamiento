import { css, type Handle } from 'remix/ui'
import { colors, FONT_STACK } from '../../../ui/civic-horizon.ts'
import { routes } from '../../../routes.ts'
import type { Actividad } from '../types.ts'

export interface ActividadesSectionProps {
  actividades: Actividad[]
  estado: string
}

const tabBar = css({
  display: 'flex',
  gap: '8px',
  marginBottom: '32px',
  borderBottom: `1px solid ${colors.gray200}`,
  paddingBottom: '12px',
})

const tabActive = css({
  padding: '8px 18px',
  borderRadius: '9999px',
  background: colors.burgundy900,
  color: colors.white,
  fontFamily: FONT_STACK,
  fontSize: '14px',
  fontWeight: 700,
  textDecoration: 'none',
})

const tabInactive = css({
  padding: '8px 18px',
  borderRadius: '9999px',
  background: colors.gray100,
  color: colors.gray700,
  fontFamily: FONT_STACK,
  fontSize: '14px',
  fontWeight: 600,
  textDecoration: 'none',
  '&:hover': { background: colors.gray200 },
})

const card = css({
  background: colors.white,
  borderRadius: '12px',
  border: `1px solid ${colors.gray200}`,
  padding: '24px',
  display: 'flex',
  flexDirection: 'column',
  gap: '12px',
  boxShadow: '0 4px 16px rgba(0,0,0,0.04)',
})

const chip = css({
  display: 'inline-flex',
  alignItems: 'center',
  padding: '4px 10px',
  borderRadius: '9999px',
  fontSize: '12px',
  fontWeight: 700,
  letterSpacing: '0.04em',
  textTransform: 'uppercase',
})

const photoGrid = css({
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
  gap: '12px',
})

export function ActividadesSection(handle: Handle<ActividadesSectionProps>) {
  return () => {
    const { actividades, estado } = handle.props
    const isProximas = estado !== 'realizadas'
    return (
      <div>
        <h2
          mix={css({
            fontFamily: FONT_STACK,
            fontSize: '26px',
            fontWeight: 800,
            color: colors.gray900,
            margin: '0 0 8px',
          })}
        >
          Actividades POETDUM
        </h2>
        <p
          mix={css({
            fontFamily: FONT_STACK,
            fontSize: '16px',
            color: colors.gray500,
            margin: '0 0 24px',
          })}
        >
          Consulta las actividades programadas y realizadas del proceso de ordenamiento territorial.
        </p>

        <nav aria-label="Filtrar actividades" mix={tabBar}>
          <a
            href={`${routes.poetdum.show.href()}?estado=proximas#actividades`}
            mix={isProximas ? tabActive : tabInactive}
            aria-current={isProximas ? 'page' : undefined}
          >
            Próximas actividades
          </a>
          <a
            href={`${routes.poetdum.show.href()}?estado=realizadas#actividades`}
            mix={!isProximas ? tabActive : tabInactive}
            aria-current={!isProximas ? 'page' : undefined}
          >
            Actividades realizadas
          </a>
        </nav>

        {actividades.length === 0 ? (
          <p
            mix={css({
              fontFamily: FONT_STACK,
              fontSize: '15px',
              color: colors.gray500,
              textAlign: 'center',
              padding: '32px',
              background: colors.gray50,
              borderRadius: '12px',
            })}
          >
            No hay actividades {isProximas ? 'próximas' : 'realizadas'} por el momento.
          </p>
        ) : (
          <div mix={css({ display: 'flex', flexDirection: 'column', gap: '20px' })}>
            {actividades.map((a) => (
              <article key={a.id} mix={card}>
                <div
                  mix={css({ display: 'flex', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' })}
                >
                  <h3
                    mix={css({
                      fontFamily: FONT_STACK,
                      fontSize: '18px',
                      fontWeight: 700,
                      color: colors.gray900,
                      margin: 0,
                    })}
                  >
                    {a.titulo}
                  </h3>
                  <span
                    mix={[
                      chip,
                      css(
                        a.estado === 'realizada'
                          ? { background: colors.green100, color: colors.green700 }
                          : a.estado === 'cancelada'
                            ? { background: '#fef2f2', color: '#dc2626' }
                            : { background: colors.gold100, color: '#92400e' },
                      ),
                    ]}
                  >
                    {a.estado}
                  </span>
                </div>

                <p
                  mix={css({
                    fontFamily: FONT_STACK,
                    fontSize: '14px',
                    color: colors.gray500,
                    margin: 0,
                    display: 'flex',
                    gap: '16px',
                    flexWrap: 'wrap',
                  })}
                >
                  <span>
                    📅 {a.fecha}
                    {a.hora_inicio ? ` · ${a.hora_inicio}` : ''}
                    {a.hora_fin ? `–${a.hora_fin}` : ''}
                  </span>
                  {a.lugar ? <span>📍 {a.lugar}</span> : null}
                </p>

                {a.descripcion ? (
                  <p
                    mix={css({
                      fontFamily: FONT_STACK,
                      fontSize: '15px',
                      lineHeight: 1.6,
                      color: colors.gray700,
                      margin: 0,
                    })}
                  >
                    {a.descripcion}
                  </p>
                ) : null}

                {a.resultados ? (
                  <div
                    mix={css({
                      background: colors.gray50,
                      borderRadius: '8px',
                      padding: '12px 16px',
                    })}
                  >
                    <strong
                      mix={css({
                        fontFamily: FONT_STACK,
                        fontSize: '13px',
                        color: colors.gray900,
                      })}
                    >
                      Resultados / Reseña:
                    </strong>
                    <p
                      mix={css({
                        fontFamily: FONT_STACK,
                        fontSize: '14px',
                        color: colors.gray700,
                        margin: '4px 0 0',
                      })}
                    >
                      {a.resultados}
                    </p>
                  </div>
                ) : null}

                {a.fotos && a.fotos.length > 0 ? (
                  <div mix={photoGrid}>
                    {a.fotos.map((f) => (
                      <img
                        key={f.id}
                        src={routes.poetdum.actividades.foto.href({ id: a.id, fid: f.id })}
                        alt={f.nombre_original}
                        loading="lazy"
                        mix={css({
                          width: '100%',
                          height: '160px',
                          objectFit: 'cover',
                          borderRadius: '8px',
                          border: `1px solid ${colors.gray200}`,
                        })}
                      />
                    ))}
                  </div>
                ) : null}

                {a.documentos && a.documentos.length > 0 ? (
                  <div mix={css({ display: 'flex', flexWrap: 'wrap', gap: '8px' })}>
                    {a.documentos.map((d) => (
                      <a
                        key={d.id}
                        href={`${routes.poetdum.show.href()}#documentos`}
                        mix={css({
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          padding: '6px 12px',
                          borderRadius: '9999px',
                          background: colors.gray100,
                          border: `1px solid ${colors.gray200}`,
                          fontFamily: FONT_STACK,
                          fontSize: '13px',
                          color: colors.gray700,
                          textDecoration: 'none',
                          '&:hover': { background: colors.gray200 },
                        })}
                      >
                        📄 {d.titulo}
                      </a>
                    ))}
                  </div>
                ) : null}
              </article>
            ))}
          </div>
        )}
      </div>
    )
  }
}
