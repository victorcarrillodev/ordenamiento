/**
 * Consulta pública — GET/POST /admin/consulta
 *
 * Aquí el área responsable inicia y concluye el periodo en que se reciben
 * observaciones y propuestas. El backend es quien valida el cambio de etapa y lo
 * deja en la bitácora de cambios; esta pantalla solo lo pide y muestra el
 * resultado.
 */
import { redirect } from 'remix/response/redirect'
import { createController } from 'remix/router'

import { backendFetch, fetchJsonOr, olvidarTemaPublico, requireAdminUser } from '../../backend.ts'
import { esEtapaConsulta, type EtapaConsulta } from '../../data/consulta.ts'
import { adminRoutes } from '../../routes.ts'
import { ConsultaPage, type EstadoConsultaAdmin } from './consulta-page.tsx'

const ESTADO_VACIO: EstadoConsultaAdmin = { etapa: 'pendiente', inicio: null, cierre: null }

export default createController(adminRoutes.consulta, {
  actions: {
    async index(context) {
      const user = await requireAdminUser(context.request)
      if (user instanceof Response) return user
      const cambio = new URL(context.request.url).searchParams.get('cambio')
      const estado = await fetchJsonOr<EstadoConsultaAdmin>(
        context.request,
        '/api/consulta',
        ESTADO_VACIO,
      )
      return context.render(
        <ConsultaPage
          user={user}
          estado={estado}
          cambio={esEtapaConsulta(cambio) ? (cambio as EtapaConsulta) : undefined}
        />,
      )
    },

    async action(context) {
      const user = await requireAdminUser(context.request)
      if (user instanceof Response) return user

      const formData = await context.request.formData()
      const etapa = String(formData.get('etapa') ?? '')
      const estado = await fetchJsonOr<EstadoConsultaAdmin>(
        context.request,
        '/api/consulta',
        ESTADO_VACIO,
      )
      if (!esEtapaConsulta(etapa)) {
        return context.render(
          <ConsultaPage user={user} estado={estado} error="Elige una etapa válida." />,
          { status: 400 },
        )
      }

      const response = await backendFetch(context.request, '/api/consulta', {
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ etapa }),
      })
      if (!response.ok) {
        const data = (await response.json().catch(() => ({}))) as { error?: string }
        return context.render(
          <ConsultaPage
            user={user}
            estado={estado}
            error={data.error ?? 'No se pudo cambiar la etapa de la consulta.'}
          />,
          { status: response.status },
        )
      }

      // El portal guarda el tema 30 s: quien acaba de cambiar la etapa va a ir a verla.
      olvidarTemaPublico()
      return redirect(`${adminRoutes.consulta.index.href()}?cambio=${encodeURIComponent(etapa)}`)
    },
  },
})
