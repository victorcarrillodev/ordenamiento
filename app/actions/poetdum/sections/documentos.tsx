/**
 * Repositorio de documentos del Programa. No se captura aparte: son los
 * archivos que cada actividad publicada ya tiene, así que un acta subida a su
 * sesión aparece aquí sin volver a cargarla.
 */
import { css, type Handle } from 'remix/ui'

import {
  FASES_PROGRAMA,
  nombreDeArchivo,
  pesoLegible,
  TIPOS_DOCUMENTO,
  type DocumentoPublico,
} from '../../../data/programa.ts'
import { routes } from '../../../routes.ts'
import { colors, FONT_STACK } from '../../../ui/civic-horizon.ts'
import { IconoDocumento } from '../../../ui/programa/iconos.tsx'
import { fechaLarga } from '../../../utils/calendario.ts'
import { introSeccionStyle, tituloSeccionStyle, vacioStyle } from '../programa-layout.tsx'
import { AccionesArchivo } from './archivos.tsx'
import { chipStyle } from './avances.tsx'

export interface DocumentosSectionProps {
  documentos: DocumentoPublico[]
  tipo: string
  fase: string
}

const selectStyle = css({
  fontFamily: FONT_STACK,
  fontSize: '14px',
  padding: '8px 12px',
  borderRadius: '8px',
  border: `1px solid ${colors.gray300}`,
  background: colors.white,
  minWidth: 0,
})

const etiquetaStyle = css({
  display: 'flex',
  flexDirection: 'column',
  gap: '4px',
  fontFamily: FONT_STACK,
  fontSize: '13px',
  fontWeight: 600,
  color: colors.gray700,
})

export function DocumentosSection(handle: Handle<DocumentosSectionProps>) {
  return () => {
    const { documentos, tipo, fase } = handle.props
    const accion = `${routes.poetdum.show.href()}#documentos`
    return (
      <div>
        <h2 mix={tituloSeccionStyle}>Documentos del Programa</h2>
        <p mix={introSeccionStyle}>
          Convocatorias, actas, acuerdos, dictámenes y demás documentos de las actividades del
          Programa. Cada uno está ligado a la actividad en la que se generó.
        </p>

        <form
          method="get"
          action={accion}
          mix={css({
            display: 'flex',
            gap: '12px',
            flexWrap: 'wrap',
            alignItems: 'flex-end',
            marginBottom: '24px',
            background: colors.gray50,
            padding: '16px',
            borderRadius: '12px',
            border: `1px solid ${colors.gray200}`,
          })}
        >
          <label mix={etiquetaStyle}>
            Tipo de documento
            <select name="tipo" mix={selectStyle}>
              <option value="">Todos</option>
              {TIPOS_DOCUMENTO.map((t) => (
                <option key={t} value={t} selected={t === tipo}>
                  {t}
                </option>
              ))}
            </select>
          </label>
          <label mix={etiquetaStyle}>
            Fase del Programa
            <select name="fase" mix={selectStyle}>
              <option value="">Todas</option>
              {FASES_PROGRAMA.map((f) => (
                <option key={f} value={f} selected={f === fase}>
                  {f}
                </option>
              ))}
            </select>
          </label>
          <button
            type="submit"
            mix={css({
              padding: '9px 20px',
              borderRadius: '8px',
              background: colors.burgundy900,
              color: colors.white,
              border: 'none',
              fontFamily: FONT_STACK,
              fontSize: '14px',
              fontWeight: 700,
              cursor: 'pointer',
            })}
          >
            Filtrar
          </button>
          {tipo || fase ? (
            <a
              href={accion}
              mix={css({
                fontFamily: FONT_STACK,
                fontSize: '14px',
                color: colors.burgundy900,
                padding: '8px',
              })}
            >
              Limpiar filtros
            </a>
          ) : null}
        </form>

        {documentos.length === 0 ? (
          <p mix={vacioStyle}>
            {tipo || fase
              ? 'No hay documentos para los filtros seleccionados.'
              : 'Todavía no hay documentos publicados.'}
          </p>
        ) : (
          <ul mix={css({ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: '12px' })}>
            {documentos.map((d) => {
              const nombre = nombreDeArchivo(d)
              const peso = pesoLegible(d.size)
              return (
                <li
                  key={d.id}
                  mix={css({
                    display: 'flex',
                    gap: '14px',
                    alignItems: 'flex-start',
                    flexWrap: 'wrap',
                    padding: '16px 18px',
                    borderRadius: '12px',
                    border: `1px solid ${colors.gray200}`,
                    background: colors.white,
                    fontFamily: FONT_STACK,
                  })}
                >
                  <span
                    mix={css({ color: colors.burgundy900, display: 'flex', paddingTop: '2px' })}
                  >
                    <IconoDocumento size={22} />
                  </span>
                  <div
                    mix={css({
                      flex: '1 1 260px',
                      minWidth: 0,
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '6px',
                    })}
                  >
                    <strong
                      mix={css({ fontSize: '16px', color: colors.gray900 })}
                      title={d.nombre_original}
                    >
                      {nombre}
                    </strong>
                    <span mix={css({ display: 'flex', gap: '6px', flexWrap: 'wrap' })}>
                      <span mix={chipStyle}>{d.tipo}</span>
                      <span mix={chipStyle}>{d.actividad_fase}</span>
                      {peso ? <span mix={chipStyle}>{peso}</span> : null}
                    </span>
                    <a
                      href={routes.poetdum.actividades.detalle.href({ id: d.actividad_id })}
                      mix={css({ fontSize: '13px', color: colors.gray500 })}
                    >
                      {d.actividad_titulo} · {fechaLarga(d.actividad_fecha)}
                    </a>
                  </div>
                  <AccionesArchivo archivo={d} />
                </li>
              )
            })}
          </ul>
        )}
      </div>
    )
  }
}
