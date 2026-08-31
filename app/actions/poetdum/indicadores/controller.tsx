import { createController } from 'remix/router'

import { routes } from '../../../routes.ts'
import { hubRedirect } from '../hub-redirect.ts'

export default createController(routes.poetdum.indicadores, {
  actions: {
    async show(context) {
      return hubRedirect('seguimiento', context.request)
    },
  },
})
