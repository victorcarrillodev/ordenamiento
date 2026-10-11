import type { Handle } from 'remix/ui'

import { Icon } from './icon.tsx'

/**
 * Botón de una acción que no se deshace (borrar una actividad, quitar un archivo).
 *
 * Antes era un cuadrito rojo con solo un bote de basura: nadie sabía qué hacía sin
 * pasar el cursor encima, y en una pantalla táctil ni eso. Ahora lleva su palabra
 * visible («Eliminar», «Quitar»), un nombre accesible que dice QUÉ se borra
 * («Eliminar «Foro de consulta»») y es de contorno rojo, no un bloque sólido: avisa
 * del riesgo sin ser lo más llamativo de cada fila.
 *
 * Pregunta antes de enviar: `data-confirmar` lo atiende `public/admin.js` (la CSP no
 * admite manejadores en línea).
 */
export interface BotonEliminarProps {
  /** Lo que hace, en una palabra: «Eliminar» (por omisión) o «Quitar». */
  etiqueta?: string
  /** Qué se borra: sale en el tooltip y en el nombre accesible. */
  nombre: string
  /** La pregunta de confirmación. Debe decir qué se pierde y que no se puede deshacer. */
  confirmacion: string
  /** Campos ocultos del formulario (`intent`, `id`…). */
  campos: Record<string, string>
}

export function BotonEliminar(handle: Handle<BotonEliminarProps>) {
  return () => {
    const { etiqueta = 'Eliminar', nombre, confirmacion, campos } = handle.props
    const accion = `${etiqueta} «${nombre}»`
    return (
      <form method="post" class="form-en-linea" data-confirmar={confirmacion}>
        {Object.entries(campos).map(([clave, valor]) => (
          <input key={clave} type="hidden" name={clave} value={valor} />
        ))}
        <button type="submit" class="btn btn--peligro btn--sm" title={accion} aria-label={accion}>
          <Icon name="mdi:trash-can-outline" size={15} /> {etiqueta}
        </button>
      </form>
    )
  }
}
