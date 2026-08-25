import { createController } from 'remix/router'
import { getPublicTheme } from '../../backend.ts'
import { routes } from '../../routes.ts'
import { PoetdumPage } from './show-page.tsx'

export default createController(routes.poetdum, {
  actions: {
    async show(context) {
      const theme = await getPublicTheme(context.request)
      return context.render(<PoetdumPage theme={theme} />)
    },
  },
})
