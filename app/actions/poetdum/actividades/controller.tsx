import { createController } from 'remix/router'

import { backendFetch } from '../../../backend.ts'
import { routes } from '../../../routes.ts'
import { hubRedirect } from '../hub-redirect.ts'

export default createController(routes.poetdum.actividades, {
  actions: {
    async show(context) {
      return hubRedirect('actividades', context.request, ['estado'])
    },
    /**
     * Proxy de la foto hacia el backend: el navegador no llega al backend
     * directamente, así que reenviamos la Response con las cabeceras de
     * seguridad que ya calcula el backend (mime canónico, disposition, etc.).
     */
    async foto(context) {
      const { id, fid } = context.params
      const response = await backendFetch(context.request, `/api/actividades/${id}/fotos/${fid}`)
      if (!response.ok) return new Response('Not Found', { status: response.status })

      const headers = new Headers()
      for (const h of [
        'content-type',
        'content-disposition',
        'x-content-type-options',
        'cross-origin-resource-policy',
        'content-length',
      ]) {
        const v = response.headers.get(h)
        if (v) headers.set(h, v)
      }
      headers.set('content-security-policy', "default-src 'none'; frame-ancestors 'self'")
      return new Response(response.body, { headers })
    },
  },
})
