/**
 * Seguimiento y evaluación. Solo tiene sentido con el Programa aprobado y en
 * aplicación: mientras tanto se muestra el aviso que pide la propuesta.
 */
import { css, type Handle } from 'remix/ui'

import { routes } from '../../../routes.ts'
import { colors, FONT_STACK } from '../../../ui/civic-horizon.ts'
import { IconoDocumento } from '../../../ui/programa/iconos.tsx'
import { diaEnMexico, fechaLarga } from '../../../utils/calendario.ts'
import { vacioStyle } from '../programa-layout.tsx'
import type { Indicador } from '../types.ts'

export const MENSAJE_SEGUIMIENTO_PENDIENTE =
  'Esta sección estará disponible una vez aprobado el Programa. Aquí se publicarán los indicadores y resultados de su aplicación y evaluación.'

const tarjetaStyle = css({
  background: colors.white,
  borderRadius: '12px',
  border: `1px solid ${colors.gray200}`,
  padding: '24px',
  display: 'flex',
  flexDirection: 'column',
  gap: '12px',
  boxShadow: '0 4px 16px rgba(0,0,0,0.04)',
  fontFamily: FONT_STACK,
})

const metaStyle = css({
  display: 'flex',
  gap: '16px',
  flexWrap: 'wrap',
  fontSize: '13px',
  color: colors.gray500,
})

const pistaStyle = css({
  width: '100%',
  height: '12px',
  background: colors.gray200,
  borderRadius: '9999px',
  overflow: 'hidden',
})

function numero(valor: number | string | null | undefined): number | null {
  if (valor === null || valor === undefined || valor === '') return null
  const n = Number(valor)
  return Number.isFinite(n) ? n : null
}

export function SeguimientoPendiente() {
  return () => (
    <div
      role="status"
      mix={css({
        display: 'flex',
        gap: '16px',
        alignItems: 'flex-start',
        padding: '28px',
        borderRadius: '14px',
        background: colors.burgundy50,
        border: `1px solid ${colors.burgundy100}`,
        fontFamily: FONT_STACK,
      })}
    >
      <span aria-hidden="true" mix={css({ fontSize: '28px', lineHeight: 1, flexShrink: 0 })}>
        📈
      </span>
      <p mix={css({ margin: 0, fontSize: '17px', lineHeight: 1.6, color: colors.gray900 })}>
        {MENSAJE_SEGUIMIENTO_PENDIENTE}
      </p>
    </div>
  )
}

export function IndicadoresLista(handle: Handle<{ indicadores: Indicador[] }>) {
  return () => {
    const { indicadores } = handle.props
    if (indicadores.length === 0) {
      return <p mix={vacioStyle}>Todavía no hay indicadores publicados.</p>
    }
    return (
      <div mix={css({ display: 'flex', flexDirection: 'column', gap: '20px' })}>
        {indicadores.map((ind) => {
          const meta = numero(ind.meta)
          // `updated_at` es un instante (UTC): se muestra el día de México.
          const actualizado = ind.updated_at ? diaEnMexico(new Date(ind.updated_at)) : ''
          return (
            <article key={ind.id} mix={tarjetaStyle}>
              <h3
                mix={css({ fontSize: '18px', fontWeight: 700, color: colors.gray900, margin: 0 })}
              >
                {ind.nombre}
              </h3>
              {ind.descripcion ? (
                <p
                  mix={css({ fontSize: '14px', color: colors.gray700, margin: 0, lineHeight: 1.6 })}
                >
                  {ind.descripcion}
                </p>
              ) : null}
              <div mix={metaStyle}>
                {meta !== null ? (
                  <span>
                    Meta: {meta} {ind.unidad}
                  </span>
                ) : null}
                {ind.fecha_evaluacion ? <span>Evaluación: {ind.fecha_evaluacion}</span> : null}
                {actualizado ? <span>Actualizado: {fechaLarga(actualizado)}</span> : null}
              </div>
              {ind.resultado_texto ? (
                <p
                  mix={css({
                    fontSize: '14px',
                    color: colors.gray700,
                    background: colors.gray50,
                    padding: '10px 14px',
                    borderRadius: '8px',
                    margin: 0,
                  })}
                >
                  <strong>Resultado: </strong>
                  {ind.resultado_texto}
                </p>
              ) : null}
              {ind.mediciones.length > 0 ? (
                <div mix={css({ display: 'flex', flexDirection: 'column', gap: '10px' })}>
                  {ind.mediciones.map((m) => {
                    const valor = numero(m.valor) ?? 0
                    const pct =
                      meta !== null && meta > 0
                        ? Math.min(100, Math.round((valor / meta) * 100))
                        : 0
                    return (
                      <div
                        key={m.id}
                        mix={css({ display: 'flex', flexDirection: 'column', gap: '4px' })}
                      >
                        <div
                          mix={css({
                            display: 'flex',
                            justifyContent: 'space-between',
                            gap: '12px',
                            fontSize: '13px',
                            color: colors.gray700,
                          })}
                        >
                          <span>
                            {m.periodo}: {valor} {ind.unidad}
                          </span>
                          {meta !== null ? <span>{pct}% de la meta</span> : null}
                        </div>
                        {meta !== null ? (
                          <div mix={pistaStyle}>
                            <div
                              style={{ width: `${pct}%` }}
                              mix={css({
                                height: '100%',
                                background: colors.burgundy900,
                                borderRadius: '9999px',
                              })}
                            />
                          </div>
                        ) : null}
                      </div>
                    )
                  })}
                </div>
              ) : null}
              {ind.documento_respaldo ? (
                <a
                  href={routes.poetdum.archivo.href({ aid: ind.documento_respaldo.id })}
                  target="_blank"
                  rel="noopener"
                  mix={css({
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    fontSize: '13px',
                    fontWeight: 700,
                    color: colors.burgundy900,
                  })}
                >
                  <IconoDocumento size={15} /> Documento de respaldo:{' '}
                  {ind.documento_respaldo.titulo}
                </a>
              ) : null}
            </article>
          )
        })}
      </div>
    )
  }
}
