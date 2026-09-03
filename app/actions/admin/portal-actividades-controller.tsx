import { redirect } from 'remix/response/redirect'
import { createController } from 'remix/router'

import { backendFetch, fetchJsonOr, requireAdminUser } from '../../backend.ts'
import { adminRoutes } from '../../routes.ts'
import { PortalActividadesPage } from './portal-actividades-page.tsx'

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
  fotos: Array<{ id: string; nombre_original: string; mime: string }>
  documentos: Array<{ id: string; titulo: string }>
}

interface Documento {
  id: string
  titulo: string
}

export default createController(adminRoutes.actividades, {
  actions: {
    async index(context) {
      const user = await requireAdminUser(context.request)
      if (user instanceof Response) return user

      const [actividadesData, documentosData] = await Promise.all([
        fetchJsonOr<{ actividades: Actividad[] }>(
          context.request,
          '/api/actividades?estado=proximas',
          {
            actividades: [],
          },
        ),
        fetchJsonOr<{ documentos: Documento[] }>(context.request, '/api/documentos', {
          documentos: [],
        }),
      ])
      // También cargar realizadas y canceladas para tener listado completo en admin
      const [realizadasData, canceladasData] = await Promise.all([
        fetchJsonOr<{ actividades: Actividad[] }>(
          context.request,
          '/api/actividades?estado=realizadas',
          {
            actividades: [],
          },
        ),
        fetchJsonOr<{ actividades: Actividad[] }>(
          context.request,
          '/api/actividades?estado=canceladas',
          {
            actividades: [],
          },
        ),
      ])
      const todas = [
        ...(actividadesData.actividades ?? []),
        ...(realizadasData.actividades ?? []),
        ...(canceladasData.actividades ?? []),
      ]

      return context.render(
        <PortalActividadesPage
          user={user}
          actividades={todas}
          documentos={documentosData.documentos ?? []}
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
        const response = await backendFetch(context.request, `/api/actividades/${id}`, {
          method: 'DELETE',
        })
        if (!response.ok) {
          const actividadesData = await fetchJsonOr<{ actividades: Actividad[] }>(
            context.request,
            '/api/actividades?estado=proximas',
            { actividades: [] },
          )
          const documentosData = await fetchJsonOr<{ documentos: Documento[] }>(
            context.request,
            '/api/documentos',
            { documentos: [] },
          )
          return context.render(
            <PortalActividadesPage
              user={user}
              actividades={actividadesData.actividades ?? []}
              documentos={documentosData.documentos ?? []}
              error="No se pudo eliminar"
            />,
            { status: response.status },
          )
        }
        return redirect(adminRoutes.actividades.index.href())
      }

      if (intent === 'editar') {
        const id = String(formData.get('id') ?? '').trim()
        // Para editar reenviamos FormData como multipart (fotos opcionales)
        const fd = new FormData()
        for (const key of [
          'titulo',
          'fecha',
          'hora_inicio',
          'hora_fin',
          'lugar',
          'descripcion',
          'estado',
          'resultados',
        ]) {
          const v = formData.get(key)
          if (v != null) fd.set(key, String(v))
        }
        const docs = formData.getAll('documentos')
        for (const d of docs) fd.append('documentos', String(d))
        const fotos = formData.getAll('fotos') as File[]
        for (const f of fotos) {
          if (f instanceof File && f.size > 0) fd.append('fotos', f)
        }
        const response = await backendFetch(context.request, `/api/actividades/${id}`, {
          method: 'PUT',
          body: fd,
        })
        if (!response.ok) {
          const actividadesData = await fetchJsonOr<{ actividades: Actividad[] }>(
            context.request,
            '/api/actividades?estado=proximas',
            { actividades: [] },
          )
          const documentosData = await fetchJsonOr<{ documentos: Documento[] }>(
            context.request,
            '/api/documentos',
            { documentos: [] },
          )
          return context.render(
            <PortalActividadesPage
              user={user}
              actividades={actividadesData.actividades ?? []}
              documentos={documentosData.documentos ?? []}
              error="No se pudo actualizar"
            />,
            { status: response.status },
          )
        }
        return redirect(adminRoutes.actividades.index.href())
      }

      // crear (default)
      const fd = new FormData()
      for (const key of [
        'titulo',
        'fecha',
        'hora_inicio',
        'hora_fin',
        'lugar',
        'descripcion',
        'estado',
        'resultados',
      ]) {
        const v = formData.get(key)
        if (v != null) fd.set(key, String(v))
      }
      const docs = formData.getAll('documentos')
      for (const d of docs) fd.append('documentos', String(d))
      const fotos = formData.getAll('fotos') as File[]
      for (const f of fotos) {
        if (f instanceof File && f.size > 0) fd.append('fotos', f)
      }

      const response = await backendFetch(context.request, '/api/actividades', {
        method: 'POST',
        body: fd,
      })

      if (!response.ok) {
        const data = (await response.json().catch(() => ({}))) as { error?: string }
        const actividadesData = await fetchJsonOr<{ actividades: Actividad[] }>(
          context.request,
          '/api/actividades?estado=proximas',
          { actividades: [] },
        )
        const documentosData = await fetchJsonOr<{ documentos: Documento[] }>(
          context.request,
          '/api/documentos',
          { documentos: [] },
        )
        return context.render(
          <PortalActividadesPage
            user={user}
            actividades={actividadesData.actividades ?? []}
            documentos={documentosData.documentos ?? []}
            error={data.error ?? 'No se pudo crear la actividad'}
          />,
          { status: response.status },
        )
      }

      return redirect(adminRoutes.actividades.index.href())
    },
  },
})
