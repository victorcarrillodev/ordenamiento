import { createController } from 'remix/router'

import { backendFetch } from '../../../backend.ts'
import { routes } from '../../../routes.ts'
import { hubRedirect } from '../hub-redirect.ts'

export default createController(routes.poetdum.documentos, {
  actions: {
    async show(context) {
      return hubRedirect('documentos', context.request, ['tipo', 'etapa'])
    },
    /**
     * Proxy de descarga del archivo del documento: mismo patrón que el proxy
     * de adjuntos del admin; el backend ya calcula mime canónico, disposition
     * y cabeceras de seguridad.
     */
    async archivo(context) {
      const { id } = context.params
      const download = new URL(context.request.url).searchParams.get('download') === '1'
      const response = await backendFetch(
        context.request,
        `/api/documentos/${id}/archivo${download ? '?download=1' : ''}`,
      )
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
