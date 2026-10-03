/**
 * Generar un formato de participación para llenar a mano — form()
 *   GET  /admin/participaciones/formatos → regresa al selector
 *   POST /admin/participaciones/formatos → reserva el folio y vuelve con la descarga lista
 */
import { createController } from 'remix/router'

import { adminRoutes } from '../../routes.ts'
import { formatoNuevoAction, formatoNuevoIndexAction } from './presencial-actions.tsx'

export default createController(adminRoutes.formatoNuevo, {
  actions: {
    index() {
      return formatoNuevoIndexAction()
    },
    action(context) {
      return formatoNuevoAction(context)
    },
  },
})
