import { redirect } from 'remix/response/redirect'
import { createController } from 'remix/router'

import { fetchJsonOr, getPublicTheme } from '../../../backend.ts'
import type { ActividadPublica } from '../../../data/programa.ts'
import { routes } from '../../../routes.ts'
import { DetallePage } from './detalle-page.tsx'
import { ListaPage } from './lista-page.tsx'

export default createController(routes.poetdum.actividades, {
  actions: {
    /** Todas las próximas actividades. `?estado=realizadas` venía de la versión anterior. */
    async show(context) {
      const estado = new URL(context.request.url).searchParams.get('estado')
      if (estado === 'realizadas') return redirect(routes.poetdum.avances.href(), 301)

      const [theme, data] = await Promise.all([
        getPublicTheme(context.request),
        fetchJsonOr<{ actividades: ActividadPublica[] }>(
          context.request,
          '/api/actividades?vista=proximas',
          { actividades: [] },
        ),
      ])
      return context.render(<ListaPage theme={theme} actividades={data.actividades ?? []} />)
    },

    /** Ficha pública. Una actividad sin publicar (o inexistente) es un 404. */
    async detalle(context) {
      const [theme, data] = await Promise.all([
        getPublicTheme(context.request),
        fetchJsonOr<{ actividad: ActividadPublica | null }>(
          context.request,
          `/api/actividades/${encodeURIComponent(context.params.id)}`,
          { actividad: null },
        ),
      ])
      if (!data.actividad) return new Response('Not Found', { status: 404 })
      return context.render(<DetallePage theme={theme} actividad={data.actividad} />)
    },

    /** Enlace de versiones anteriores: la foto conservó su id al migrar. */
    foto(context) {
      return redirect(routes.poetdum.archivo.href({ aid: context.params.fid }), 301)
    },
  },
})
