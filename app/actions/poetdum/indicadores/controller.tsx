import { redirect } from 'remix/response/redirect'
import { createController } from 'remix/router'

import { routes } from '../../../routes.ts'

export default createController(routes.poetdum.indicadores, {
  actions: {
    show() {
      return redirect(routes.poetdum.seguimiento.href(), 301)
    },
  },
})
