/**
 * Admin Avisos + POEL Controllers (rutas form()).
 */
import { redirect } from 'remix/response/redirect'
import { createController } from 'remix/router'

import { backendFetch, fetchJsonOr, requireAdminUser } from '../../backend.ts'
import { adminRoutes } from '../../routes.ts'
import { AvisosPage } from './avisos-page.tsx'
import { PoelPage } from './poel-page.tsx'
import { reunionesDe } from './_shared.ts'

interface SesionAvisos {
  id: number
  categoria: string
  titulo: string
  fecha?: string
  ubicacion?: string
}

interface SesionPoel {
  id: number
  categoria: string
  orden: number
  titulo: string
  descripcion: string
  fecha: string | null
  ubicacion: string
  activo: boolean
}

async function avisosDe(request: Request) {
  return (
    await fetchJsonOr<{
      avisos: { id: number; titulo: string; descripcion: string; activo: boolean; fecha?: string }[]
    }>(request, '/api/avisos', { avisos: [] })
  ).avisos
}

async function poelDeAvisos(request: Request): Promise<SesionAvisos[]> {
  const raw = await fetchJsonOr<{ sesiones: SesionPoel[] }>(request, '/api/poel', { sesiones: [] })
  return raw.sesiones.map((s) => ({ ...s, fecha: s.fecha ?? undefined }))
}

async function poelDe(request: Request): Promise<SesionPoel[]> {
  return (await fetchJsonOr<{ sesiones: SesionPoel[] }>(request, '/api/poel', { sesiones: [] }))
    .sesiones
}

export const avisosController = createController(adminRoutes.avisos, {
  actions: {
    async index(context) {
      const user = await requireAdminUser(context.request)
      if (user instanceof Response) return user

      const [avisos, reuniones, sesiones] = await Promise.all([
        avisosDe(context.request),
        reunionesDe(context.request),
        poelDeAvisos(context.request),
      ])

      return context.render(
        <AvisosPage user={user} avisos={avisos} reuniones={reuniones} sesiones={sesiones} />,
      )
    },

    async action(context) {
      const user = await requireAdminUser(context.request)
      if (user instanceof Response) return user

      const formData = await context.request.formData()
      const intent = String(formData.get('intent') ?? 'crear')

      if (intent === 'eliminar') {
        await backendFetch(context.request, `/api/avisos/${Number(formData.get('id'))}`, {
          method: 'DELETE',
        })
      } else if (intent === 'enviar_correo') {
        const id = Number(formData.get('id'))
        const para = String(formData.get('para') ?? '').trim()
        if (id && para) {
          await backendFetch(context.request, '/api/avisos/enviar', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ id, para }),
          })
        }
      } else {
        const titulo = formData.get('titulo')
        const descripcion = formData.get('descripcion')
        const correoDestino = String(formData.get('correo_destino') ?? '').trim()

        const res = await backendFetch(context.request, '/api/avisos', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ titulo, descripcion }),
        })

        if (res.ok && correoDestino) {
          const data = await res.json()
          if (data.aviso?.id) {
            await backendFetch(context.request, '/api/avisos/enviar', {
              method: 'POST',
              headers: { 'content-type': 'application/json' },
              body: JSON.stringify({ id: data.aviso.id, para: correoDestino }),
            })
          }
        }
      }
      return redirect(adminRoutes.avisos.index.href())
    },
  },
})

export const poelController = createController(adminRoutes.poel, {
  actions: {
    async index(context) {
      const user = await requireAdminUser(context.request)
      if (user instanceof Response) return user
      return context.render(<PoelPage user={user} sesiones={await poelDe(context.request)} />)
    },

    async action(context) {
      const user = await requireAdminUser(context.request)
      if (user instanceof Response) return user

      const formData = await context.request.formData()
      const intent = String(formData.get('intent') ?? 'crear')

      if (intent === 'eliminar') {
        await backendFetch(context.request, `/api/poel/${Number(formData.get('id'))}`, {
          method: 'DELETE',
        })
      } else {
        await backendFetch(context.request, '/api/poel', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            categoria: formData.get('categoria'),
            orden: Number(formData.get('orden') ?? 0),
            titulo: formData.get('titulo'),
            descripcion: formData.get('descripcion'),
            fecha: formData.get('fecha') || null,
            ubicacion: formData.get('ubicacion'),
          }),
        })
      }
      return redirect(adminRoutes.poel.index.href())
    },
  },
})
