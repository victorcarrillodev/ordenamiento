import { redirect } from 'remix/response/redirect'
import { createController } from 'remix/router'

import { backendFetch, fetchJsonOr, requireAdminUser } from '../../backend.ts'
import { adminRoutes } from '../../routes.ts'
import { UsuariosPage } from './usuarios-page.tsx'

export default createController(adminRoutes.usuarios, {
  actions: {
    async index(context) {
      const user = await requireAdminUser(context.request)
      if (user instanceof Response) return user
      const data = await fetchJsonOr<{ users: Array<{ id: string; email: string; name: string; role: string; created_at: string }> }>(
        context.request,
        '/api/users',
        { users: [] },
      )
      return context.render(<UsuariosPage user={user} users={data.users} />)
    },

    async action(context) {
      const user = await requireAdminUser(context.request)
      if (user instanceof Response) return user

      const formData = await context.request.formData()
      const name = String(formData.get('name') ?? '').trim()
      const email = String(formData.get('email') ?? '').trim()
      const password = String(formData.get('password') ?? '')
      const role = String(formData.get('role') ?? 'user')

      if (!name || !email || password.length < 8) {
        return redirect(adminRoutes.usuarios.index.href())
      }

      await backendFetch(context.request, '/api/users', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ name, email, password, role: role === 'admin' ? 'admin' : 'user' }),
      })

      return redirect(adminRoutes.usuarios.index.href())
    },
  },
})
