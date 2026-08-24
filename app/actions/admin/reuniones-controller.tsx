/**
 * Admin Reuniones Controller · ruta form() de reuniones
 *   GET  /admin/reuniones — lista
 *   POST /admin/reuniones — crear o eliminar
 */
import { redirect } from 'remix/response/redirect'
import { createController } from 'remix/router'

import { backendFetch, requireAdminUser } from '../../backend.ts'
import { adminRoutes } from '../../routes.ts'
import { ReunionesPage } from './reuniones-page.tsx'

interface Reunion {
  id: number
  titulo: string
  fecha: string
  hora_inicio: string
  hora_fin: string
}

async function reunionesDe(request: Request): Promise<Reunion[]> {
  const response = await backendFetch(request, '/api/reuniones')
  const data = response.ok ? await response.json() : { reuniones: [] as Reunion[] }
  return data.reuniones
}

export default createController(adminRoutes.reuniones, {
  actions: {
    async index(context) {
      const user = await requireAdminUser(context.request)
      if (user instanceof Response) return user
      return context.render(<ReunionesPage user={user} reuniones={await reunionesDe(context.request)} />)
    },

    async action(context) {
      const user = await requireAdminUser(context.request)
      if (user instanceof Response) return user

      const formData = await context.request.formData()
      const intent = String(formData.get('intent') ?? 'crear')

      if (intent === 'eliminar') {
        const id = Number(formData.get('id'))
        const response = await backendFetch(context.request, `/api/reuniones/${id}`, {
          method: 'DELETE',
        })
        if (!response.ok) {
          const data = (await response.json().catch(() => ({}))) as { error?: string }
          return context.render(
            <ReunionesPage user={user} reuniones={await reunionesDe(context.request)} error={data.error ?? 'No se pudo eliminar'} />,
            { status: response.status },
          )
        }
        return redirect(adminRoutes.reuniones.index.href())
      }

      const titulo = String(formData.get('titulo') ?? '').trim()
      const fecha = String(formData.get('fecha') ?? '').trim()
      const horaInicio = String(formData.get('hora_inicio') ?? '').trim()
      const horaFin = String(formData.get('hora_fin') ?? '').trim()

      if (!titulo || !fecha) {
        return context.render(
          <ReunionesPage user={user} reuniones={await reunionesDe(context.request)} error="Título y fecha son obligatorios" />,
          { status: 422 },
        )
      }

      const response = await backendFetch(context.request, '/api/reuniones', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ titulo, fecha, horaInicio, horaFin }),
      })

      if (!response.ok) {
        const data = (await response.json().catch(() => ({}))) as { error?: string }
        return context.render(
          <ReunionesPage user={user} reuniones={await reunionesDe(context.request)} error={data.error ?? 'No se pudo agendar'} />,
          { status: response.status },
        )
      }

      return redirect(adminRoutes.reuniones.index.href())
    },
  },
})
