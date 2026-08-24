import { createController } from 'remix/router'

import { assetServer } from '../assets.ts'
import { getPublicTheme } from '../backend.ts'
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
  },
})
