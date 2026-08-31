import { css, type Handle } from 'remix/ui'
import { colors, FONT_STACK } from '../../../ui/civic-horizon.ts'
import { routes } from '../../../routes.ts'
import type { Indicador } from '../types.ts'

export interface SeguimientoSectionProps {
  indicadores: Indicador[]
}

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

const barTrack = css({
  width: '100%',
  height: '1.25rem',
  background: '#e5e7eb',
  borderRadius: '9999px',
  overflow: 'hidden',
})

export function SeguimientoSection(handle: Handle<SeguimientoSectionProps>) {
  return () => {
    const { indicadores } = handle.props
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
          Seguimiento de indicadores
        </h2>
        <p
          mix={css({
            fontFamily: FONT_STACK,
            fontSize: '16px',
            color: colors.gray500,
            margin: '0 0 32px',
          })}
        >
          Monitoreo del avance del POETDUM respecto a las metas establecidas.
        </p>

        {indicadores.length === 0 ? (
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
            No hay indicadores registrados por el momento.
          </p>
        ) : (
          <div mix={css({ display: 'flex', flexDirection: 'column', gap: '20px' })}>
            {indicadores.map((ind) => (
              <article key={ind.id} mix={card}>
                <h3
                  mix={css({
                    fontFamily: FONT_STACK,
                    fontSize: '18px',
                    fontWeight: 700,
                    color: colors.gray900,
                    margin: 0,
                  })}
                >
                  {ind.nombre}
                </h3>

                {ind.descripcion ? (
                  <p
                    mix={css({
                      fontFamily: FONT_STACK,
                      fontSize: '14px',
                      color: colors.gray700,
                      margin: 0,
                      lineHeight: 1.6,
                    })}
                  >
                    {ind.descripcion}
                  </p>
                ) : null}

                <div
                  mix={css({
                    display: 'flex',
                    gap: '16px',
                    flexWrap: 'wrap',
                    fontFamily: FONT_STACK,
                    fontSize: '13px',
                    color: colors.gray500,
                  })}
                >
                  {ind.unidad ? <span>Unidad: {ind.unidad}</span> : null}
                  {ind.fecha_evaluacion ? <span>Evaluación: {ind.fecha_evaluacion}</span> : null}
                  {ind.meta != null ? (
                    <span>
                      Meta: {ind.meta} {ind.unidad ?? ''}
                    </span>
                  ) : null}
                </div>

                {ind.resultado_texto ? (
                  <p
                    mix={css({
                      fontFamily: FONT_STACK,
                      fontSize: '14px',
                      color: colors.gray700,
                      background: colors.gray50,
                      padding: '10px 14px',
                      borderRadius: '8px',
                      margin: 0,
                    })}
                  >
                    {ind.resultado_texto}
                  </p>
                ) : null}

                {ind.documento_respaldo ? (
                  <a
                    href={`${routes.poetdum.documentos.archivo.href({ id: ind.documento_respaldo.id })}?download=1`}
                    mix={css({
                      fontFamily: FONT_STACK,
                      fontSize: '13px',
                      fontWeight: 600,
                      color: colors.burgundy900,
                      textDecoration: 'underline',
                    })}
                  >
                    📄 Documento respaldo: {ind.documento_respaldo.titulo}
                  </a>
                ) : null}

                {ind.mediciones && ind.mediciones.length > 0 ? (
                  <div mix={css({ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '8px' })}>
                    {ind.mediciones.map((m) => {
                      const pct =
                        ind.meta != null && ind.meta > 0 ? Math.min(100, Math.round((m.valor / ind.meta) * 100)) : 0
                      return (
                        <div key={m.id} mix={css({ display: 'flex', flexDirection: 'column', gap: '4px' })}>
                          <div
                            mix={css({
                              display: 'flex',
                              justifyContent: 'space-between',
                              fontFamily: FONT_STACK,
                              fontSize: '13px',
                              color: colors.gray700,
                            })}
                          >
                            <span>
                              {m.periodo}: {m.valor} {ind.unidad ?? ''}
                            </span>
                            {ind.meta != null ? <span>meta: {ind.meta} ({pct}%)</span> : null}
                          </div>
                          <div mix={barTrack}>
                            <div
                              style={{ width: pct + '%' }}
                              mix={css({
                                height: '100%',
                                background: colors.burgundy900,
                                borderRadius: '9999px',
                                transition: 'width 300ms ease',
                              })}
                            />
                          </div>
                        </div>
                      )
                    })}
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
