import type { Handle } from 'remix/ui'
import type { ThemeData } from './civic-horizon.ts'
import { urlEstatica } from '../utils/estaticos.ts'
import { etapaDeConsulta } from '../data/consulta.ts'

/** Actualiza también una página que quedó abierta al llegar al inicio o al cierre. */
export function ConsultaProgramada(handle: Handle<{ theme?: ThemeData }>) {
  return () => {
    const periodo = handle.props.theme?.programa?.consultaProgramacion
    if (!periodo) return null
    return (
      <>
        <span
          hidden
          data-consulta-inicio={periodo.inicio}
          data-consulta-cierre={periodo.cierre}
          data-consulta-etapa={etapaDeConsulta(handle.props.theme)}
        />
        <script src={urlEstatica('consulta-periodo.js')} defer />
      </>
    )
  }
}
