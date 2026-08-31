import { css, type Handle } from 'remix/ui'
import { colors, FONT_STACK } from '../../../ui/civic-horizon.ts'
import { CATEGORIAS_POEL } from '../../../data/poetdum.ts'
import type { PublicPoelSesion } from '../types.ts'

export interface SesionesSectionProps {
  sesiones: PublicPoelSesion[]
}

const accentPorCategoria: Record<string, string> = {
  [CATEGORIAS_POEL[0]]: colors.burgundy900,
  [CATEGORIAS_POEL[1]]: colors.green700,
  [CATEGORIAS_POEL[2]]: colors.gold500,
}

function formatearFecha(fecha: string | null): string | null {
  if (!fecha) return null
  // fecha viene como YYYY-MM-DD desde el backend
  const d = new Date(fecha + 'T00:00:00')
  if (Number.isNaN(d.getTime())) return fecha
  return new Intl.DateTimeFormat('es-MX', { day: 'numeric', month: 'long', year: 'numeric' }).format(d)
}

export function SesionesSection(handle: Handle<SesionesSectionProps>) {
  return () => {
    const { sesiones } = handle.props
    if (!sesiones || sesiones.length === 0) {
      return (
        <div
          mix={css({
            textAlign: 'center',
            padding: '32px',
            background: colors.gray50,
            borderRadius: '12px',
            fontFamily: FONT_STACK,
            fontSize: '15px',
            color: colors.gray500,
          })}
        >
          No hay sesiones registradas por el momento.
        </div>
      )
    }

    return (
      <div mix={css({ display: 'flex', flexDirection: 'column', gap: '40px' })}>
        {CATEGORIAS_POEL.map((cat) => {
          const grupo = sesiones.filter((s) => s.categoria === cat)
          if (grupo.length === 0) return null
          const accent = accentPorCategoria[cat] ?? colors.burgundy900
          return (
            <div key={cat}>
              <h3
                mix={css({
                  fontFamily: FONT_STACK,
                  fontSize: '20px',
                  fontWeight: 700,
                  color: colors.gray900,
                  margin: '0 0 20px',
                  paddingLeft: '12px',
                  borderLeft: `4px solid ${accent}`,
                })}
              >
                {cat}
              </h3>
              <div
                mix={css({
                  position: 'relative',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '20px',
                  paddingLeft: '28px',
                  borderLeft: `2px solid ${colors.gray200}`,
                  marginLeft: '20px',
                })}
              >
                {grupo.map((s, idx) => (
                  <div key={s.id} mix={css({ position: 'relative', display: 'flex', gap: '16px' })}>
                    {/* Dot numerado */}
                    <div
                      mix={css({
                        position: 'absolute',
                        left: '-48px',
                        top: '4px',
                        width: '40px',
                        height: '40px',
                        borderRadius: '50%',
                        background: accent,
                        color: colors.white,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontFamily: FONT_STACK,
                        fontSize: '14px',
                        fontWeight: 800,
                        flexShrink: 0,
                        border: `3px solid ${colors.white}`,
                        boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
                      })}
                    >
                      {idx + 1}
                    </div>
                    <article
                      mix={css({
                        flex: 1,
                        background: colors.white,
                        borderRadius: '12px',
                        border: `1px solid ${colors.gray200}`,
                        borderLeft: `4px solid ${accent}`,
                        padding: '20px 24px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '8px',
                        boxShadow: '0 2px 12px rgba(0,0,0,0.04)',
                      })}
                    >
                      <h4
                        mix={css({
                          fontFamily: FONT_STACK,
                          fontSize: '16px',
                          fontWeight: 700,
                          color: colors.gray900,
                          margin: 0,
                        })}
                      >
                        {s.titulo}
                      </h4>
                      {s.descripcion ? (
                        <p
                          mix={css({
                            fontFamily: FONT_STACK,
                            fontSize: '14px',
                            color: colors.gray700,
                            margin: 0,
                            lineHeight: 1.6,
                          })}
                        >
                          {s.descripcion}
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
                        {s.fecha ? <span>📅 {formatearFecha(s.fecha)}</span> : null}
                        {s.ubicacion ? <span>📍 {s.ubicacion}</span> : null}
                      </div>
                    </article>
                  </div>
                ))}
              </div>
            </div>
          )
        })}
      </div>
    )
  }
}
