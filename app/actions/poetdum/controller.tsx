import { createController } from 'remix/router'
import { backendFetch, fetchJsonOr, getPublicTheme } from '../../backend.ts'
import { routes } from '../../routes.ts'
import { PoetdumPage } from './show-page.tsx'
import type { Actividad, Documento, Indicador, PublicPoelSesion } from './types.ts'

export default createController(routes.poetdum, {
  actions: {
    async show(context) {
      const url = new URL(context.request.url)
      const rawEstado = url.searchParams.get('estado')
      const estado = rawEstado === 'realizadas' ? 'realizadas' : 'proximas'
      const tipo = url.searchParams.get('tipo') ?? ''
      const etapa = url.searchParams.get('etapa') ?? ''
      const qp = new URLSearchParams()
      if (tipo) qp.set('tipo', tipo)
      if (etapa) qp.set('etapa', etapa)
      const qs = qp.toString() ? `?${qp.toString()}` : ''

      const [theme, sesionesData, actividadesData, documentosData, indicadoresData] = await Promise.all([
        getPublicTheme(context.request),
        fetchJsonOr<{ sesiones: PublicPoelSesion[] }>(context.request, '/api/poel/sesiones', {
          sesiones: [],
        }),
        fetchJsonOr<{ actividades: Actividad[] }>(context.request, `/api/actividades?estado=${estado}`, {
          actividades: [],
        }),
        fetchJsonOr<{ documentos: Documento[] }>(context.request, `/api/documentos${qs}`, {
          documentos: [],
        }),
        fetchJsonOr<{ indicadores: Indicador[] }>(context.request, '/api/indicadores', {
          indicadores: [],
        }),
      ])

      return context.render(
        <PoetdumPage
          theme={theme}
          sesiones={sesionesData.sesiones ?? []}
          actividades={actividadesData.actividades ?? []}
          estado={estado}
          documentos={documentosData.documentos ?? []}
          tipo={tipo}
          etapa={etapa}
          indicadores={indicadoresData.indicadores ?? []}
        />,
      )
    },
    async sesionImagen(context) {
      const { id } = context.params
      const response = await backendFetch(context.request, `/api/poel/${id}/imagen`)
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
