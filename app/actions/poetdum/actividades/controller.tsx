import { createController } from 'remix/router'

import { backendFetch, fetchJsonOr, getPublicTheme } from '../../../backend.ts'
import { routes } from '../../../routes.ts'
import { ActividadesPage } from './show-page.tsx'

interface Foto {
  id: string
  nombre_original: string
  mime: string
}

interface DocumentoRef {
  id: string
  titulo: string
  tipo: string
}

interface Actividad {
  id: string
  titulo: string
  fecha: string
  hora_inicio: string | null
  hora_fin: string | null
  lugar: string
  descripcion: string
  estado: string
  resultados: string | null
  fotos: Foto[]
  documentos: DocumentoRef[]
}

export default createController(routes.poetdum.actividades, {
  actions: {
    async show(context) {
      const theme = await getPublicTheme(context.request)
      const url = new URL(context.request.url)
      const rawEstado = url.searchParams.get('estado')
      const estado = rawEstado === 'realizadas' ? 'realizadas' : 'proximas'
      const data = await fetchJsonOr<{ actividades: Actividad[] }>(
        context.request,
        `/api/actividades?estado=${estado}`,
        { actividades: [] },
      )
      return context.render(
        <ActividadesPage theme={theme} actividades={data.actividades ?? []} estado={estado} />,
      )
    },
    /**
     * Proxy de la foto hacia el backend: el navegador no llega al backend
     * directamente, así que reenviamos la Response con las cabeceras de
     * seguridad que ya calcula el backend (mime canónico, disposition, etc.).
     */
    async foto(context) {
      const { id, fid } = context.params
      const response = await backendFetch(
        context.request,
        `/api/actividades/${id}/fotos/${fid}`,
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
