import type { Handle } from 'remix/ui'

import type { ThemeData } from '../../ui/civic-horizon.ts'
import { ProgramaLayout, seccionStyle } from './programa-layout.tsx'
import { IndicadoresLista, SeguimientoPendiente } from './sections/seguimiento.tsx'
import type { Indicador } from './types.ts'

export interface SeguimientoPageProps {
  theme?: ThemeData
  programaAprobado: boolean
  indicadores: Indicador[]
}

export function SeguimientoPage(handle: Handle<SeguimientoPageProps>) {
  return () => {
    const { theme, programaAprobado, indicadores } = handle.props
    return (
      <ProgramaLayout
        theme={theme}
        seccion="seguimiento"
        titulo="Seguimiento y evaluación"
        descripcion="Indicadores, metas y mediciones, resultados, fechas de actualización y documentos de respaldo de la aplicación del Programa."
      >
        <section mix={seccionStyle} aria-label="Seguimiento y evaluación">
          {programaAprobado ? (
            <IndicadoresLista indicadores={indicadores} />
          ) : (
            <SeguimientoPendiente />
          )}
        </section>
      </ProgramaLayout>
    )
  }
}
