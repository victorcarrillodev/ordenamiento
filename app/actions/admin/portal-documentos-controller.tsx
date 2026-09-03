import { redirect } from 'remix/response/redirect'
import { createController } from 'remix/router'

import { backendFetch, fetchJsonOr, requireAdminUser } from '../../backend.ts'
import { adminRoutes } from '../../routes.ts'
import { PortalDocumentosPage } from './portal-documentos-page.tsx'

interface Documento {
  id: string
  titulo: string
  tipo: string
  etapa: string
  fecha: string
  descripcion: string
}

export default createController(adminRoutes.documentos, {
  actions: {
    async index(context) {
      const user = await requireAdminUser(context.request)
      if (user instanceof Response) return user

      const data = await fetchJsonOr<{ documentos: Documento[] }>(
        context.request,
        '/api/documentos',
        {
          documentos: [],
        },
      )

      return context.render(<PortalDocumentosPage user={user} documentos={data.documentos ?? []} />)
    },

    async action(context) {
      const user = await requireAdminUser(context.request)
      if (user instanceof Response) return user

      const formData = await context.request.formData()
      const intent = String(formData.get('intent') ?? 'crear')

      if (intent === 'eliminar') {
        const id = String(formData.get('id') ?? '').trim()
        const response = await backendFetch(context.request, `/api/documentos/${id}`, {
          method: 'DELETE',
        })
        if (!response.ok) {
          const data = await fetchJsonOr<{ documentos: Documento[] }>(
            context.request,
            '/api/documentos',
            {
              documentos: [],
            },
          )
          return context.render(
            <PortalDocumentosPage
              user={user}
              documentos={data.documentos ?? []}
              error="No se pudo eliminar"
            />,
            { status: response.status },
          )
        }
        return redirect(adminRoutes.documentos.index.href())
      }

      // crear
      const fd = new FormData()
      for (const key of ['titulo', 'tipo', 'etapa', 'fecha', 'descripcion']) {
        const v = formData.get(key)
        if (v != null) fd.set(key, String(v))
      }
      const archivo = formData.get('archivo') as File | null
      if (archivo instanceof File && archivo.size > 0) fd.set('archivo', archivo)

      const response = await backendFetch(context.request, '/api/documentos', {
        method: 'POST',
        body: fd,
      })

      if (!response.ok) {
        const errData = (await response.json().catch(() => ({}))) as { error?: string }
        const data = await fetchJsonOr<{ documentos: Documento[] }>(
          context.request,
          '/api/documentos',
          {
            documentos: [],
          },
        )
        return context.render(
          <PortalDocumentosPage
            user={user}
            documentos={data.documentos ?? []}
            error={errData.error ?? 'No se pudo guardar el documento'}
          />,
          { status: response.status },
        )
      }

      return redirect(adminRoutes.documentos.index.href())
    },
  },
})
