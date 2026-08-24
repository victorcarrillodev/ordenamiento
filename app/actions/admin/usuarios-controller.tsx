/**
 * Admin Usuarios Controller · ruta form()
 *   GET  /admin/usuarios → redirige a la vista general
 *   POST /admin/usuarios → crea un usuario (solo admin/root)
 */
import { redirect } from 'remix/response/redirect'
import { createController } from 'remix/router'

import { backendFetch, requireAdminUser } from '../../backend.ts'
import { adminRoutes } from '../../routes.ts'

export default createController(adminRoutes.usuarios, {
  actions: {
    async index(context) {
      return redirect(adminRoutes.index.href())
    },

    async action(context) {
      const user = await requireAdminUser(context.request)
      if (user instanceof Response) return user
      if (user.role !== 'admin') return redirect(adminRoutes.index.href())

      const formData = await context.request.formData()
      const name = String(formData.get('name') ?? '').trim()
      const email = String(formData.get('email') ?? '').trim()
      const password = String(formData.get('password') ?? '')
      const role = String(formData.get('role') ?? 'user')

      if (!name || !email || password.length < 8) {
        return redirect(adminRoutes.index.href())
      }

      await backendFetch(context.request, '/api/users', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ name, email, password, role: role === 'admin' ? 'admin' : 'user' }),
      })

      return redirect(adminRoutes.index.href())
    },
  },
})
