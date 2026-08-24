/**
 * Admin Enviar por correo Controller · ruta form()
 *   POST /admin/participaciones/:id/enviar → envía la participación + PDF
 */
import { redirect } from 'remix/response/redirect'
import { createController } from 'remix/router'

import { backendFetch, requireAdminUser } from '../../backend.ts'
import { adminRoutes } from '../../routes.ts'

export default createController(adminRoutes.participacionEnviar, {
  actions: {
    async index(context) {
      return redirect(`/admin/participaciones/${context.params.id}`)
    },

    async action(context) {
      const user = await requireAdminUser(context.request)
      if (user instanceof Response) return user

      const formData = await context.request.formData()
      const para = String(formData.get('para') ?? '').trim()
      const base = `/admin/participaciones/${context.params.id}`

      if (!para || !para.includes('@')) {
        return redirect(base + '?mail=error')
      }

      const response = await backendFetch(context.request, '/api/participations/enviar', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ id: Number(context.params.id), para }),
      })

      return redirect(base + (response.ok ? '?mail=ok' : '?mail=error'))
    },
  },
})
