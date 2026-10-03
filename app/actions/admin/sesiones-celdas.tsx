import type { Handle } from 'remix/ui'

import { formatearDuracion, formatearFechaHora } from '../../ui/admin/formato.ts'
import type { SesionRegistrada } from './sesiones-tipos.ts'

/**
 * Las dos celdas que cuentan lo que de verdad pasó con una sesión, compartidas
 * por la bitácora y por «Mi cuenta» para que las dos lo digan igual.
 */

/** Cómo se dice, bajo la fecha, por qué terminó (o dejó de usarse) una sesión. */
export const DETALLE_DE_ESTADO = {
  cerrada: 'Cerró sesión',
  inactiva: 'Sin cerrar: dejó de usarla',
  expirada: 'Sin cerrar: la sesión expiró',
  revocada: 'Cerrada al cambiar la contraseña',
} as const

/**
 * Tiempo de uso real. Una sesión anterior a la medición no tiene dato: se dice
 * «Sin medir», no «—» ni «0», que serían afirmaciones.
 */
export function TiempoDeUso(handle: Handle<{ segundos: number | null }>) {
  return () => {
    const { segundos } = handle.props
    if (segundos === null) {
      return (
        <span
          class="user-cell__meta"
          title="Esta sesión es anterior a la medición del uso real: no se sabe cuánto se usó."
        >
          Sin medir
        </span>
      )
    }
    return <strong>{segundos === 0 ? '0 s' : formatearDuracion(segundos)}</strong>
  }
}

/**
 * Cuándo terminó la sesión, o «En línea» si alguien la está usando. Una sesión
 * que nadie cerró NO se da por activa: se muestra desde su último movimiento.
 */
export function FinDeSesion(handle: Handle<{ sesion: SesionRegistrada }>) {
  return () => {
    const { sesion } = handle.props
    if (sesion.estado === 'en_linea') {
      return <span class="badge procedente">● En línea</span>
    }
    const momento = sesion.estado === 'cerrada' ? sesion.fin : sesion.ultima_actividad
    return (
      <>
        {formatearFechaHora(momento)}
        <span class="user-cell__meta">{DETALLE_DE_ESTADO[sesion.estado]}</span>
      </>
    )
  }
}
