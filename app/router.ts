import { createRouter, type MiddlewareContext } from 'remix/router'
import { staticFiles } from 'remix/middleware/static'

import controller from './actions/controller.tsx'
import loginController from './actions/login/controller.tsx'
import participationController from './actions/participation/controller.tsx'
import poetdumController from "./actions/poetdum/controller.tsx"
import adminController from './actions/admin/controller.tsx'
import adminReunionesController from './actions/admin/reuniones-controller.tsx'
import adminUsuariosController from './actions/admin/usuarios-controller.tsx'
import { avisosController, poelController } from './actions/admin/avisos-poel-controller.tsx'
import nuevaController from './actions/admin/nueva-controller.tsx'
import enviarController from './actions/admin/enviar-controller.tsx'
import { render } from './middleware/render.tsx'
import { adminRoutes, routes } from './routes.ts'

type AppContext = MiddlewareContext<[ReturnType<typeof render>]>

declare module 'remix/router' {
  interface RouterTypes {
    context: AppContext
  }
}

const basePath = (process.env.BASE_PATH ?? '/ordena').replace(/\/$/, '')
const publicStatic = staticFiles('./public', { index: false })

function staticWithPrefix() {
  return async (context: any, next: () => Promise<Response>) => {
    const url = new URL(context.request.url)
    if (url.pathname === '/' || url.pathname === '') {
      return Response.redirect(new URL(basePath ? `${basePath}/` : '/', context.request.url), 302)
    }
    if (basePath && url.pathname.startsWith(basePath + '/')) {
      const strippedUrl = new URL(context.request.url)
      strippedUrl.pathname = url.pathname.slice(basePath.length) || '/'
      const res = await publicStatic(
        { ...context, request: new Request(strippedUrl, context.request), url: strippedUrl },
        async () => null as any,
      )
      if (res) return res
    } else {
      const res = await publicStatic(context, async () => null as any)
      if (res) return res
    }
    return next()
  }
}

export const router = createRouter<AppContext>({
  middleware: [staticWithPrefix(), render()],
})

router.map(routes, controller)
router.map(routes.login, loginController)
router.map(routes.participation, participationController)
router.map(routes.poetdum,poetdumController)
router.map(adminRoutes, adminController)
router.map(adminRoutes.reuniones, adminReunionesController)
router.map(adminRoutes.usuarios, adminUsuariosController)
router.map(adminRoutes.avisos, avisosController)
router.map(adminRoutes.poel, poelController)
router.map(adminRoutes.participacionNueva, nuevaController)
router.map(adminRoutes.participacionEnviar, enviarController)
