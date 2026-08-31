import { redirect } from 'remix/response/redirect'
import { createController } from 'remix/router'

import { backendFetch, fetchJsonOr, requireAdminUser } from '../../backend.ts'
import { adminRoutes } from '../../routes.ts'
import { CuentaPage } from './cuenta-page.tsx'

interface UserProfile {
  id: string
  email: string
  name: string
  role: string
  created_at: string
  avatar_ruta: string
}

export default createController(adminRoutes.cuenta, {
  actions: {
    async index(context) {
      const user = await requireAdminUser(context.request)
      if (user instanceof Response) return user
      const data = await fetchJsonOr<{ user: UserProfile | null }>(context.request, '/api/users/me', {
        user: null,
      })
      const params = new URL(context.request.url).searchParams
      const ok = params.get('ok')
      const error = params.get('error')
      return context.render(<CuentaPage user={user} profile={data.user} ok={ok} error={error} />)
    },

    async action(context) {
      const user = await requireAdminUser(context.request)
      if (user instanceof Response) return user
      const formData = await context.request.formData()
      const file = formData.get('avatar') as unknown as File | null
      if (!(file instanceof File) || file.size === 0) {
        return redirect(`${adminRoutes.cuenta.index.href()}?error=avatar`)
      }
      const fd = new FormData()
      fd.append('avatar', file, file.name)
      const res = await backendFetch(context.request, '/api/users/me/avatar', {
        method: 'POST',
        body: fd,
      })
      if (res.ok) return redirect(`${adminRoutes.cuenta.index.href()}?ok=avatar`)
      return redirect(`${adminRoutes.cuenta.index.href()}?error=avatar`)
    },
  },
})
