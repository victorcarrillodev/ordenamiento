import { createController } from 'remix/router'

import { fetchJsonOr, getPublicTheme } from '../../../backend.ts'
import { routes } from '../../../routes.ts'
import { IndicadoresPage } from './show-page.tsx'

export interface Medicion {
  id: string
  periodo: string
  valor: number
}

export interface Indicador {
  id: string
  nombre: string
  descripcion: string
  unidad: string
  meta: number | null
  fecha_evaluacion: string | null
  resultado_texto: string | null
  documento_respaldo: { id: string; titulo: string } | null
  mediciones: Medicion[]
}

export default createController(routes.poetdum.indicadores, {
  actions: {
    async show(context) {
      const theme = await getPublicTheme(context.request)
      const data = await fetchJsonOr<{ indicadores: Indicador[] }>(
        context.request,
        '/api/indicadores',
        { indicadores: [] },
      )
      return context.render(
        <IndicadoresPage theme={theme} indicadores={data.indicadores ?? []} />,
      )
    },
  },
})
