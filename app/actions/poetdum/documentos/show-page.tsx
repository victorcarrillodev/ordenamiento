import { Document } from '../../document.tsx'
import { NavBar } from '../../../ui/nav-bar.tsx'
import { css, type Handle } from 'remix/ui'
import { colors, FONT_STACK, type ThemeData } from '../../../ui/civic-horizon.ts'
import { routes } from '../../../routes.ts'

export const TIPOS_DOCUMENTOS = [
  'Convenios y anexos',
  'Acuerdos',
  'Actas y minutas',
  'Convocatorias',
  'Documentos técnicos',
  'Cartografía',
  'Avances y resultados',
  'Programa',
] as const

export const ETAPAS_DOCUMENTOS = ['En proceso', 'Dictaminada', 'Notificada'] as const

export interface DocumentosPageProps {
  theme?: ThemeData
  documentos: Array<{
    id: string
    titulo: string
    tipo: string
    etapa: string
    fecha: string
    descripcion: string
  }>
  tipo: string
  etapa: string
}

const pageWrap = css({
  maxWidth: '1100px',
  margin: '0 auto',
  padding: '120px 24px 64px',
  fontFamily: FONT_STACK,
})

const selectStyle = css({
  fontFamily: FONT_STACK,
  fontSize: '14px',
  padding: '8px 12px',
  borderRadius: '8px',
  border: `1px solid ${colors.gray300}`,
  background: colors.white,
})

const btnFiltrar = css({
  padding: '8px 20px',
  borderRadius: '8px',
  background: colors.burgundy900,
  color: colors.white,
  border: 'none',
  fontFamily: FONT_STACK,
  fontSize: '14px',
  fontWeight: 700,
  cursor: 'pointer',
})

export function DocumentosPage(handle: Handle<DocumentosPageProps>) {
  return () => {
    const { theme, documentos, tipo, etapa } = handle.props
    return (
      <Document title="Documentos – POETDUM">
        <NavBar theme={theme} />
        <main mix={pageWrap}>
          <h1
            mix={css({
              fontFamily: FONT_STACK,
              fontSize: '32px',
              fontWeight: 800,
              color: colors.gray900,
              margin: '0 0 8px',
            })}
          >
            Documentos POETDUM
          </h1>
          <p
            mix={css({
              fontFamily: FONT_STACK,
              fontSize: '16px',
              color: colors.gray500,
              margin: '0 0 24px',
            })}
          >
            Consulta y descarga la documentación oficial del proceso.
          </p>

          <form
            method="get"
            mix={css({
              display: 'flex',
              gap: '12px',
              flexWrap: 'wrap',
              alignItems: 'end',
              marginBottom: '32px',
              background: colors.gray50,
              padding: '16px',
              borderRadius: '12px',
              border: `1px solid ${colors.gray200}`,
            })}
          >
            <label mix={css({ display: 'flex', flexDirection: 'column', gap: '4px' })}>
              <span
                mix={css({
                  fontFamily: FONT_STACK,
                  fontSize: '13px',
                  fontWeight: 600,
                  color: colors.gray700,
                })}
              >
                Tipo
              </span>
              <select name="tipo" defaultValue={tipo} mix={selectStyle}>
                <option value="">Todos los tipos</option>
                {TIPOS_DOCUMENTOS.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </label>

            <label mix={css({ display: 'flex', flexDirection: 'column', gap: '4px' })}>
              <span
                mix={css({
                  fontFamily: FONT_STACK,
                  fontSize: '13px',
                  fontWeight: 600,
                  color: colors.gray700,
                })}
              >
                Etapa
              </span>
              <select name="etapa" defaultValue={etapa} mix={selectStyle}>
                <option value="">Todas las etapas</option>
                {ETAPAS_DOCUMENTOS.map((e) => (
                  <option key={e} value={e}>
                    {e}
                  </option>
                ))}
              </select>
            </label>

            <button type="submit" mix={btnFiltrar}>
              Filtrar
            </button>
            {(tipo || etapa) && (
              <a
                href="?tipo=&etapa="
                mix={css({
                  fontFamily: FONT_STACK,
                  fontSize: '14px',
                  color: colors.burgundy900,
                  textDecoration: 'underline',
                  padding: '8px',
                })}
              >
                Limpiar filtros
              </a>
            )}
          </form>

          {documentos.length === 0 ? (
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
              No hay documentos para los filtros seleccionados.
            </p>
          ) : (
            <div mix={css({ display: 'flex', flexDirection: 'column', gap: '16px' })}>
              {documentos.map((d) => (
                <article
                  key={d.id}
                  mix={css({
                    background: colors.white,
                    borderRadius: '12px',
                    border: `1px solid ${colors.gray200}`,
                    padding: '20px 24px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px',
                  })}
                >
                  <div
                    mix={css({
                      display: 'flex',
                      justifyContent: 'space-between',
                      gap: '12px',
                      flexWrap: 'wrap',
                      alignItems: 'start',
                    })}
                  >
                    <h2
                      mix={css({
                        fontFamily: FONT_STACK,
                        fontSize: '16px',
                        fontWeight: 700,
                        color: colors.gray900,
                        margin: 0,
                      })}
                    >
                      {d.titulo}
                    </h2>
                    <a
                      href={`${routes.poetdum.documentos.archivo.href({ id: d.id })}?download=1`}
                      mix={css({
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '6px 14px',
                        borderRadius: '8px',
                        background: colors.burgundy900,
                        color: colors.white,
                        fontFamily: FONT_STACK,
                        fontSize: '13px',
                        fontWeight: 700,
                        textDecoration: 'none',
                        whiteSpace: 'nowrap',
                      })}
                    >
                      ⬇ Descargar
                    </a>
                  </div>
                  <div
                    mix={css({
                      display: 'flex',
                      gap: '8px',
                      flexWrap: 'wrap',
                      alignItems: 'center',
                    })}
                  >
                    <span
                      mix={css({
                        display: 'inline-flex',
                        padding: '3px 10px',
                        borderRadius: '9999px',
                        background: colors.gray100,
                        border: `1px solid ${colors.gray200}`,
                        fontFamily: FONT_STACK,
                        fontSize: '12px',
                        fontWeight: 600,
                        color: colors.gray700,
                      })}
                    >
                      {d.tipo}
                    </span>
                    <span
                      mix={css({
                        display: 'inline-flex',
                        padding: '3px 10px',
                        borderRadius: '9999px',
                        background: d.etapa === 'Notificada' ? colors.green100 : colors.gold100,
                        color: d.etapa === 'Notificada' ? colors.green700 : '#92400e',
                        fontFamily: FONT_STACK,
                        fontSize: '12px',
                        fontWeight: 700,
                      })}
                    >
                      {d.etapa}
                    </span>
                    {d.fecha ? (
                      <span
                        mix={css({
                          fontFamily: FONT_STACK,
                          fontSize: '13px',
                          color: colors.gray500,
                        })}
                      >
                        {d.fecha}
                      </span>
                    ) : null}
                  </div>
                  {d.descripcion ? (
                    <p
                      mix={css({
                        fontFamily: FONT_STACK,
                        fontSize: '14px',
                        color: colors.gray700,
                        margin: 0,
                        lineHeight: 1.6,
                      })}
                    >
                      {d.descripcion}
                    </p>
                  ) : null}
                </article>
              ))}
            </div>
          )}
        </main>
      </Document>
    )
  }
}
