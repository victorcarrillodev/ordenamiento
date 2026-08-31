/**
 * Admin Dictamen Controller · ruta form()
 *   POST /admin/participaciones/:id/resolucion
 *     → guarda el dictamen (Procedente / No procedente + motivo + dónde acudir)
 *       y, si el admin lo pidió, envía el correo formal al ciudadano.
 */
import { redirect } from 'remix/response/redirect'
import { createController } from 'remix/router'

import { backendFetch, requireAdminUser } from '../../backend.ts'
import { adminRoutes } from '../../routes.ts'

export default createController(adminRoutes.participacionResolver, {
  actions: {
    async index(context) {
      const user = await requireAdminUser(context.request)
      if (user instanceof Response) return user
      return redirect(adminRoutes.participacionDetalle.href({ id: context.params.id }))
    },

    async action(context) {
      const user = await requireAdminUser(context.request)
      if (user instanceof Response) return user

      const formData = await context.request.formData()
      const base = adminRoutes.participacionDetalle.href({ id: context.params.id })

      const estado = String(formData.get('estado') ?? '')
      if (estado !== 'Procedente' && estado !== 'No procedente') {
        return redirect(`${base}?dictamen=estado`)
      }

      const motivo = String(formData.get('motivo') ?? '').trim()
      if (!motivo) {
        return redirect(`${base}?dictamen=motivo`)
      }

      const response = await backendFetch(
        context.request,
        `/api/participations/${context.params.id}/resolucion`,
        {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            estado,
            motivo,
            direccion: String(formData.get('direccion') ?? ''),
            cita: String(formData.get('cita') ?? ''),
            notificar: formData.get('notificar') === '1',
            para: String(formData.get('para') ?? ''),
          }),
        },
      )

      if (!response.ok) return redirect(`${base}?dictamen=error`)

      // El dictamen se guarda aunque el correo falle: hay que distinguir los
      // dos casos o el admin creería que ya notificó al ciudadano.
      const data = (await response.json().catch(() => ({}))) as { notificado?: boolean }
      return redirect(`${base}?dictamen=${data.notificado ? 'notificado' : 'guardado'}`)
    },
  },
})
