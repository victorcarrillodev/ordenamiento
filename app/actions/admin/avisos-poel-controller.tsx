/**
 * Admin Avisos + POEL Controllers (rutas form()).
 */
import { redirect } from 'remix/response/redirect'
import { createController } from 'remix/router'

import { backendFetch, backendUser } from '../../backend.ts'
import { adminRoutes, routes } from '../../routes.ts'
import { AvisosPage } from './avisos-page.tsx'
import { PoelPage } from './poel-page.tsx'

async function avisosDe(request: Request) {
  const response = await backendFetch(request, '/api/avisos')
  return response.ok ? (await response.json()).avisos : []
}

async function poelDe(request: Request) {
  const response = await backendFetch(request, '/api/poel')
  return response.ok ? (await response.json()).sesiones : []
}

export const avisosController = createController(adminRoutes.avisos, {
  actions: {
    async index(context) {
      const user = await backendUser(context.request)
      if (!user) return redirect(routes.login.index.href())
      return context.render(<AvisosPage user={user} avisos={await avisosDe(context.request)} />)
    },

    async action(context) {
      const user = await backendUser(context.request)
      if (!user) return redirect(routes.login.index.href())

      const formData = await context.request.formData()
      const intent = String(formData.get('intent') ?? 'crear')

      if (intent === 'eliminar') {
        await backendFetch(context.request, `/api/avisos/${Number(formData.get('id'))}`, { method: 'DELETE' })
      } else {
        await backendFetch(context.request, '/api/avisos', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ titulo: formData.get('titulo'), descripcion: formData.get('descripcion') }),
        })
      }
      return redirect(adminRoutes.avisos.index.href())
    },
  },
})

export const poelController = createController(adminRoutes.poel, {
  actions: {
    async index(context) {
      const user = await backendUser(context.request)
      if (!user) return redirect(routes.login.index.href())
      return context.render(<PoelPage user={user} sesiones={await poelDe(context.request)} />)
    },

    async action(context) {
      const user = await backendUser(context.request)
      if (!user) return redirect(routes.login.index.href())

      const formData = await context.request.formData()
      const intent = String(formData.get('intent') ?? 'crear')

      if (intent === 'eliminar') {
        await backendFetch(context.request, `/api/poel/${Number(formData.get('id'))}`, { method: 'DELETE' })
      } else {
        await backendFetch(context.request, '/api/poel', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            categoria: formData.get('categoria'),
            orden: Number(formData.get('orden') ?? 0),
            titulo: formData.get('titulo'),
            descripcion: formData.get('descripcion'),
            fecha: formData.get('fecha') || null,
            ubicacion: formData.get('ubicacion'),
          }),
        })
      }
      return redirect(adminRoutes.poel.index.href())
    },
  },
})
