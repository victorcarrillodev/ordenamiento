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

export const router = createRouter<AppContext>({
  middleware: [staticFiles('./public', { index: false }), render()],
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
