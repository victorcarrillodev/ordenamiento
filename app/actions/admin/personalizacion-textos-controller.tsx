import { redirect } from 'remix/response/redirect'
import { createController } from 'remix/router'

import { backendFetch, requireAdminUser } from '../../backend.ts'
import { adminRoutes } from '../../routes.ts'
import { PersonalizacionTextosPage } from './personalizacion-textos-page.tsx'
import { textosDeFormData } from './personalizacion-textos-defs.ts'

export default createController(adminRoutes.personalizacionTextos, {
  actions: {
    async index(context) {
      const user = await requireAdminUser(context.request)
      if (user instanceof Response) return user

      const url = new URL(context.request.url)
      const msg = url.searchParams.get('msg') || undefined
      const err = url.searchParams.get('err') || undefined

      const themeRes = await backendFetch(context.request, '/api/settings/theme')
      const themeData = themeRes.ok ? await themeRes.json() : { theme: {} }

      return context.render(
        <PersonalizacionTextosPage
          user={user}
          theme={themeData.theme}
          mensaje={msg}
          error={err}
        />,
      )
    },

    async action(context) {
      const user = await requireAdminUser(context.request)
      if (user instanceof Response) return user

      const formData = await context.request.formData()
      const motivo = String(formData.get('motivo') ?? '').trim()
      if (!motivo) {
        return redirect(
          `${adminRoutes.personalizacionTextos.index.href()}?err=El+motivo+del+cambio+es+obligatorio+por+seguridad`,
        )
      }

      const config = { usuario: { textos: textosDeFormData(formData) } }

      const res = await backendFetch(context.request, '/api/settings/theme', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ config, motivo, section: 'usuario' }),
      })

      if (!res.ok) {
        const errData = (await res.json().catch(() => ({}))) as { error?: string }
        return redirect(
          `${adminRoutes.personalizacionTextos.index.href()}?err=${encodeURIComponent(errData.error || 'Error al guardar')}`,
        )
      }

      return redirect(
        `${adminRoutes.personalizacionTextos.index.href()}?msg=Textos+del+portal+guardados+correctamente`,
      )
    },
  },
})
