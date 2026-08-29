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
  id: string
  categoria: string
  titulo: string
  fecha?: string
  ubicacion?: string
}

interface SesionPoel {
  id: string
  categoria: string
  orden: number
  titulo: string
  descripcion: string
  fecha: string | null
  ubicacion: string
  activo: boolean
  latitud: string
  longitud: string
  imagen_nombre: string
}

async function avisosDe(request: Request) {
  return (
    await fetchJsonOr<{
      avisos: { id: string; titulo: string; descripcion: string; activo: boolean; fecha?: string }[]
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

      // Mes visible del calendario (YYYY-MM). La página valida el formato y cae
      // al mes actual si no cuadra, así que aquí solo se transporta.
      const params = new URL(context.request.url).searchParams
      const mes = params.get('mes') ?? undefined
      const dia = params.get('dia') ?? undefined

      return context.render(
        <AvisosPage
          user={user}
          avisos={avisos}
          reuniones={reuniones}
          sesiones={sesiones}
          mes={mes}
          dia={dia}
        />,
      )
    },

    async action(context) {
      const user = await requireAdminUser(context.request)
      if (user instanceof Response) return user

      const formData = await context.request.formData()
      const intent = String(formData.get('intent') ?? 'crear')

      if (intent === 'eliminar') {
        await backendFetch(context.request, `/api/avisos/${String(formData.get('id') ?? '')}`, {
          method: 'DELETE',
        })
      } else if (intent === 'enviar_correo') {
        const id = String(formData.get('id') ?? '').trim()
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

      const fb = new URL(context.request.url).searchParams.get('ok')
      const feedback = (['creada', 'editada', 'imagen', 'estado', 'error'] as const).find(
        (v) => v === fb,
      )

      return context.render(
        <PoelPage user={user} sesiones={await poelDe(context.request)} feedback={feedback} />,
      )
    },

    async action(context) {
      const user = await requireAdminUser(context.request)
      if (user instanceof Response) return user

      const formData = await context.request.formData()
      const intent = String(formData.get('intent') ?? 'crear')
      const id = String(formData.get('id') ?? '')
      const texto = (k: string) => String(formData.get(k) ?? '')
      const volver = (ok: string) => redirect(`${adminRoutes.poel.index.href()}?ok=${ok}`)

      if (intent === 'eliminar') {
        const res = await backendFetch(context.request, `/api/poel/${id}`, { method: 'DELETE' })
        return volver(res.ok ? 'editada' : 'error')
      }

      if (intent === 'activo') {
        // Update parcial: solo viaja `activo`, para no pisar una edición que
        // otro admin pueda tener a medias en el formulario.
        const res = await backendFetch(context.request, `/api/poel/${id}`, {
          method: 'PATCH',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ activo: texto('activo') === '1' }),
        })
        return volver(res.ok ? 'estado' : 'error')
      }

      if (intent === 'imagen') {
        const archivo = formData.get('imagen')
        if (!(archivo instanceof File) || archivo.size === 0) return volver('error')

        const cuerpo = new FormData()
        cuerpo.append('imagen', archivo, archivo.name)
        const res = await backendFetch(context.request, `/api/poel/${id}/imagen`, {
          method: 'POST',
          body: cuerpo,
        })
        return volver(res.ok ? 'imagen' : 'error')
      }

      if (intent === 'editar') {
        const res = await backendFetch(context.request, `/api/poel/${id}`, {
          method: 'PATCH',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            categoria: texto('categoria'),
            orden: Number(formData.get('orden') ?? 0),
            titulo: texto('titulo'),
            descripcion: texto('descripcion'),
            ubicacion: texto('ubicacion'),
            latitud: texto('latitud'),
            longitud: texto('longitud'),
            // Vacío significa quitar la fecha: por eso se manda null en vez
            // de omitir la clave, que el backend interpreta como "no tocar".
            fecha: texto('fecha') || null,
          }),
        })
        return volver(res.ok ? 'editada' : 'error')
      }

      const res = await backendFetch(context.request, '/api/poel', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          categoria: texto('categoria'),
          orden: Number(formData.get('orden') ?? 0),
          titulo: texto('titulo'),
          descripcion: texto('descripcion'),
          fecha: texto('fecha') || null,
          ubicacion: texto('ubicacion'),
          latitud: texto('latitud'),
          longitud: texto('longitud'),
        }),
      })
      return volver(res.ok ? 'creada' : 'error')
    },
  },
})
