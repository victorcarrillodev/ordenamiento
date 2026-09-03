import { redirect } from 'remix/response/redirect'
import { createController } from 'remix/router'

import { backendFetch, fetchJsonOr, requireAdminUser } from '../../backend.ts'
import { adminRoutes } from '../../routes.ts'
import { PortalIndicadoresPage } from './portal-indicadores-page.tsx'

interface Indicador {
  id: string
  nombre: string
  descripcion: string
  unidad: string
  meta: number | null
  fecha_evaluacion: string | null
  resultado_texto: string | null
  documento_respaldo: { id: string; titulo: string } | null
  mediciones: Array<{ id: string; periodo: string; valor: number }>
}

interface Documento {
  id: string
  titulo: string
}

export default createController(adminRoutes.indicadores, {
  actions: {
    async index(context) {
      const user = await requireAdminUser(context.request)
      if (user instanceof Response) return user

      const [indData, docsData] = await Promise.all([
        fetchJsonOr<{ indicadores: Indicador[] }>(context.request, '/api/indicadores', {
          indicadores: [],
        }),
        fetchJsonOr<{ documentos: Documento[] }>(context.request, '/api/documentos', {
          documentos: [],
        }),
      ])

      return context.render(
        <PortalIndicadoresPage
          user={user}
          indicadores={indData.indicadores ?? []}
          documentos={docsData.documentos ?? []}
        />,
      )
    },

    async action(context) {
      const user = await requireAdminUser(context.request)
      if (user instanceof Response) return user

      const formData = await context.request.formData()
      const intent = String(formData.get('intent') ?? 'crear')

      if (intent === 'eliminar') {
        const id = String(formData.get('id') ?? '').trim()
        const response = await backendFetch(context.request, `/api/indicadores/${id}`, {
          method: 'DELETE',
        })
        if (!response.ok) {
          const indData = await fetchJsonOr<{ indicadores: Indicador[] }>(
            context.request,
            '/api/indicadores',
            { indicadores: [] },
          )
          const docsData = await fetchJsonOr<{ documentos: Documento[] }>(
            context.request,
            '/api/documentos',
            { documentos: [] },
          )
          return context.render(
            <PortalIndicadoresPage
              user={user}
              indicadores={indData.indicadores ?? []}
              documentos={docsData.documentos ?? []}
              error="No se pudo eliminar"
            />,
            { status: response.status },
          )
        }
        return redirect(adminRoutes.indicadores.index.href())
      }

      // crear (editar se hace vía PUT pero formulario solo hace crear por ahora)
      const nombre = String(formData.get('nombre') ?? '').trim()
      const descripcion = String(formData.get('descripcion') ?? '').trim()
      const unidad = String(formData.get('unidad') ?? '').trim()
      const metaRaw = String(formData.get('meta') ?? '').trim()
      // Un texto no numérico no debe llegar al backend como NaN: se trata como sin meta.
      const meta = metaRaw !== '' && Number.isFinite(Number(metaRaw)) ? Number(metaRaw) : null
      const fecha_evaluacion = String(formData.get('fecha_evaluacion') ?? '').trim() || null
      const resultado_texto = String(formData.get('resultado_texto') ?? '').trim() || null
      const documento_respaldo_id = String(formData.get('documento_respaldo') ?? '').trim() || null

      const mediciones: Array<{ periodo: string; valor: number }> = []
      for (let i = 1; i <= 3; i++) {
        const periodo = String(formData.get(`periodo_${i}`) ?? '').trim()
        const valorRaw = String(formData.get(`valor_${i}`) ?? '').trim()
        if (periodo && valorRaw !== '') {
          const valor = Number(valorRaw)
          if (Number.isFinite(valor)) mediciones.push({ periodo, valor })
        }
      }

      const body: Record<string, unknown> = {
        nombre,
        descripcion,
        unidad,
        meta,
        fecha_evaluacion,
        resultado_texto,
        documento_respaldo_id,
        mediciones,
      }
      // si es edición, usar PUT
      const editarId = String(formData.get('editar_id') ?? '').trim()
      const path = editarId ? `/api/indicadores/${editarId}` : '/api/indicadores'
      const method = editarId ? 'PUT' : 'POST'

      const response = await backendFetch(context.request, path, {
        method,
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
      })

      if (!response.ok) {
        const errData = (await response.json().catch(() => ({}))) as { error?: string }
        const indData = await fetchJsonOr<{ indicadores: Indicador[] }>(
          context.request,
          '/api/indicadores',
          {
            indicadores: [],
          },
        )
        const docsData = await fetchJsonOr<{ documentos: Documento[] }>(
          context.request,
          '/api/documentos',
          {
            documentos: [],
          },
        )
        return context.render(
          <PortalIndicadoresPage
            user={user}
            indicadores={indData.indicadores ?? []}
            documentos={docsData.documentos ?? []}
            error={errData.error ?? 'No se pudo guardar el indicador'}
          />,
          { status: response.status },
        )
      }

      return redirect(adminRoutes.indicadores.index.href())
    },
  },
})
