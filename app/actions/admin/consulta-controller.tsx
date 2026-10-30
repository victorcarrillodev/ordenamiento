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

import { backendFetch, olvidarTemaPublico, requireAdminUser } from '../../backend.ts'
import { esEtapaConsulta, type EtapaConsulta } from '../../data/consulta.ts'
import { adminRoutes } from '../../routes.ts'
import { datosDeConsulta } from './consulta-datos.ts'
import { ConsultaPage } from './consulta-page.tsx'
import { instanteDeConsulta } from '../../utils/periodo-consulta.ts'

export default createController(adminRoutes.consulta, {
  actions: {
    async index(context) {
      const user = await requireAdminUser(context.request)
      if (user instanceof Response) return user
      const params = new URL(context.request.url).searchParams
      const cambio = params.get('cambio')
      return context.render(
        <ConsultaPage
          user={user}
          {...await datosDeConsulta(context.request)}
          cambio={esEtapaConsulta(cambio) ? (cambio as EtapaConsulta) : undefined}
          proyectoCambio={params.get('proyecto') ?? undefined}
          programada={params.get('programada') === '1'}
        />,
      )
    },

    async action(context) {
      const user = await requireAdminUser(context.request)
      if (user instanceof Response) return user

      const formData = await context.request.formData()
      const accion = String(formData.get('accion') ?? '')
      if (accion === 'revisar' || accion === 'programar') {
        const inicio = instanteDeConsulta(String(formData.get('inicio') ?? ''))
        const cierre = instanteDeConsulta(String(formData.get('cierre') ?? ''))
        if (!inicio || !cierre || Date.parse(cierre) <= Date.parse(inicio)) {
          return context.render(
            <ConsultaPage
              user={user}
              {...await datosDeConsulta(context.request)}
              error="Indica inicio y término válidos; el término debe ser posterior al inicio."
            />,
            { status: 400 },
          )
        }
        if (accion === 'revisar') {
          return context.render(
            <ConsultaPage
              user={user}
              {...await datosDeConsulta(context.request)}
              revision={{ inicio, cierre }}
            />,
          )
        }
        const respuesta = await backendFetch(context.request, '/api/consulta', {
          method: 'PUT',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ accion: 'programar', inicio, cierre }),
        })
        if (!respuesta.ok) {
          const datos = (await respuesta.json().catch(() => ({}))) as { error?: string }
          return context.render(
            <ConsultaPage
              user={user}
              {...await datosDeConsulta(context.request)}
              revision={{ inicio, cierre }}
              error={datos.error ?? 'No se pudo guardar el periodo.'}
            />,
            { status: respuesta.status },
          )
        }
        olvidarTemaPublico()
        return redirect(`${adminRoutes.consulta.index.href()}?programada=1`)
      }
      const etapa = String(formData.get('etapa') ?? '')
      if (!esEtapaConsulta(etapa)) {
        return context.render(
          <ConsultaPage
            user={user}
            {...await datosDeConsulta(context.request)}
            error="Elige una etapa válida."
          />,
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
            {...await datosDeConsulta(context.request)}
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
