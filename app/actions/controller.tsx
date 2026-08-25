import { redirect } from 'remix/response/redirect'
import { createController } from 'remix/router'

import { assetServer } from '../assets.ts'
import { getPublicTheme, logoutBackend } from '../backend.ts'
import { routes } from '../routes.ts'
import { HomePage } from './home-page.tsx'

export default createController(routes, {
  actions: {
    async assets(context) {
      return (
        (await assetServer.fetch(context.request)) ?? new Response('Not Found', { status: 404 })
      )
    },
    async home(context) {
      const theme = await getPublicTheme(context.request)
      return context.render(<HomePage theme={theme} />)
    },
    async homeSlash(context) {
      const theme = await getPublicTheme(context.request)
      return context.render(<HomePage theme={theme} />)
    },
    /**
     * El botón "Cerrar sesión" del panel admin solo enlazaba a /login sin
     * llamar nunca a esta ruta: la cookie de sesión seguía siendo válida y
     * volver a entrar a /admin/* funcionaba igual que antes de "salir".
     */
    async logout(context) {
      const setCookie = await logoutBackend(context.request)
      return redirect(routes.login.index.href(), {
        headers: setCookie ? { 'set-cookie': setCookie } : undefined,
      })
    },
  },
})
