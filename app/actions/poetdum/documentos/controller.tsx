import { createController } from 'remix/router'

import { backendFetch, fetchJsonOr, getPublicTheme } from '../../../backend.ts'
import { routes } from '../../../routes.ts'
import { DocumentosPage } from './show-page.tsx'

interface Documento {
  id: string
  titulo: string
  tipo: string
  etapa: string
  fecha: string
  descripcion: string
}

export default createController(routes.poetdum.documentos, {
  actions: {
    async show(context) {
      const theme = await getPublicTheme(context.request)
      const url = new URL(context.request.url)
      const tipo = url.searchParams.get('tipo') ?? ''
      const etapa = url.searchParams.get('etapa') ?? ''
      const qp = new URLSearchParams()
      if (tipo) qp.set('tipo', tipo)
      if (etapa) qp.set('etapa', etapa)
      const qs = qp.toString() ? `?${qp.toString()}` : ''
      const data = await fetchJsonOr<{ documentos: Documento[] }>(
        context.request,
        `/api/documentos${qs}`,
        { documentos: [] },
      )
      return context.render(
        <DocumentosPage
          theme={theme}
          documentos={data.documentos ?? []}
          tipo={tipo}
          etapa={etapa}
        />,
      )
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
