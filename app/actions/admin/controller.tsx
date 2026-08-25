/**
 * Admin Controller · rutas GET de la Bitácora Ambiental
 *   adminRoutes.index     → GET /admin            (vista general)
 *   adminRoutes.exportar  → GET /admin/exportar   (página o descarga .xlsx)
 * La ruta form() de reuniones se mapea por separado (reuniones-controller.tsx).
 */
import { createController } from 'remix/router'

import { backendFetch, requireAdminUser } from '../../backend.ts'
import { adminRoutes } from '../../routes.ts'
import { AdminPage } from './page.tsx'
import { ExportarPage } from './exportar-page.tsx'
import { ParticipacionesPage } from './participaciones-page.tsx'
import { EstadisticasPage } from './estadisticas-page.tsx'
import { CuentaPage } from './cuenta-page.tsx'
import { DetallePage } from './detalle-page.tsx'

const DIAS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']
const MESES = [
  'Enero',
  'Febrero',
  'Marzo',
  'Abril',
  'Mayo',
  'Junio',
  'Julio',
  'Agosto',
  'Septiembre',
  'Octubre',
  'Noviembre',
  'Diciembre',
]

interface Stats {
  usuarios: number
  digitales: number
  fisicas: number
  resultado: Array<{ estado: string; total: number }>
}

interface AdminUserRow {
  id: number
  email: string
  name: string
  role: string
  created_at: string
}

export default createController(adminRoutes, {
  actions: {
    async index(context) {
      const user = await requireAdminUser(context.request)
      if (user instanceof Response) return user

      const response = await backendFetch(context.request, '/api/stats')
      const stats: Stats = response.ok
        ? await response.json()
        : { usuarios: 0, digitales: 0, fisicas: 0, resultado: [] }

      let users: AdminUserRow[] = []
      if (user.role === 'admin') {
        const usersResponse = await backendFetch(context.request, '/api/users')
        const usersData = usersResponse.ok
          ? await usersResponse.json()
          : { users: [] as AdminUserRow[] }
        users = usersData.users
      }

      // Obtener hora y fecha real de México (America/Mexico_City)
      const parts = new Intl.DateTimeFormat('es-MX', {
        timeZone: 'America/Mexico_City',
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: 'numeric',
        minute: 'numeric',
        second: 'numeric',
        hour12: false,
      }).formatToParts(new Date())

      const getPart = (type: string) => parts.find((p) => p.type === type)?.value ?? ''
      const rawHour = parseInt(getPart('hour'), 10) || 0
      const rawMin = getPart('minute').padStart(2, '0')
      const ampm = rawHour < 12 ? 'am' : 'pm'
      const displayHour12 = rawHour % 12 === 0 ? 12 : rawHour % 12
      const formattedHour = `${String(displayHour12).padStart(2, '0')}:${rawMin} ${ampm}`

      let saludo = 'Buenos días'
      if (rawHour >= 12 && rawHour < 19) {
        saludo = 'Buenas tardes'
      } else if (rawHour >= 19 || rawHour < 5) {
        saludo = 'Buenas noches'
      }

      const rawWeekday = getPart('weekday')
      const diaCapitalizado = rawWeekday.charAt(0).toUpperCase() + rawWeekday.slice(1)
      const fechaTexto = `${getPart('day')} de ${getPart('month')} de ${getPart('year')}`

      return context.render(
        <AdminPage
          user={user}
          stats={stats}
          users={users}
          ahora={{
            dia: diaCapitalizado,
            saludo,
            fecha: fechaTexto,
            hora: formattedHour,
          }}
        />,
      )
    },

    async exportar(context) {
      const user = await requireAdminUser(context.request)
      if (user instanceof Response) return user

      const tabla = new URL(context.request.url).searchParams.get('tabla')
      if (!tabla) return context.render(<ExportarPage user={user} />)

      const response = await backendFetch(
        context.request,
        `/api/export/${encodeURIComponent(tabla)}`,
      )
      if (!response.ok) {
        return context.render(<ExportarPage user={user} />, { status: response.status })
      }

      return new Response(response.body, {
        headers: {
          'content-type':
            response.headers.get('content-type') ??
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'content-disposition':
            response.headers.get('content-disposition') ?? `attachment; filename="${tabla}.xlsx"`,
        },
      })
    },

    async participaciones(context) {
      const user = await requireAdminUser(context.request)
      if (user instanceof Response) return user

      const origenParam = new URL(context.request.url).searchParams.get('origen')
      const origen = origenParam === 'fisica' ? 'fisica' : 'digital'
      const response = await backendFetch(
        context.request,
        `/api/participations?origen=${origen}&limit=100&page=1`,
      )
      const data = response.ok ? await response.json() : { items: [] }

      return context.render(
        <ParticipacionesPage user={user} origen={origen} items={data.items ?? []} />,
      )
    },

    async adjunto(context) {
      const user = await requireAdminUser(context.request)
      if (user instanceof Response) return user

      const { id, aid } = context.params
      const download = new URL(context.request.url).searchParams.get('download') === '1'
      const response = await backendFetch(
        context.request,
        `/api/participations/${id}/attachments/${aid}${download ? '?download=1' : ''}`,
      )
      if (!response.ok) return new Response('Not Found', { status: response.status })

      return new Response(response.body, {
        headers: {
          'content-type': response.headers.get('content-type') ?? 'application/octet-stream',
          'content-disposition':
            response.headers.get('content-disposition') ?? (download ? 'attachment' : 'inline'),
        },
      })
    },

    async estadisticas(context) {
      const user = await requireAdminUser(context.request)
      if (user instanceof Response) return user
      const origen =
        new URL(context.request.url).searchParams.get('origen') === 'fisica' ? 'fisica' : 'digital'
      const response = await backendFetch(context.request, '/api/stats')
      const stats = response.ok ? await response.json() : null
      if (!stats) return new Response('Error', { status: 502 })
      return context.render(<EstadisticasPage user={user} origen={origen} stats={stats} />)
    },

    async cuenta(context) {
      const user = await requireAdminUser(context.request)
      if (user instanceof Response) return user
      return context.render(<CuentaPage user={user} />)
    },

    async participacionDetalle(context) {
      const user = await requireAdminUser(context.request)
      if (user instanceof Response) return user

      const response = await backendFetch(
        context.request,
        `/api/participations/${context.params.id}`,
      )
      const raw = response.ok ? await response.json() : null
      const p = raw
        ? {
            ...raw,
            fecha: raw.created_at as string,
            // getParticipation devuelve `attachments`; la página espera `adjuntos`
            adjuntos: (raw.attachments ?? []).map(
              (a: { id: number; nombre_original: string; mime: string; size: number }) => ({
                id: a.id,
                nombre_original: a.nombre_original,
                mime: a.mime,
                size: a.size,
              }),
            ),
          }
        : null
      const mailParam = new URL(context.request.url).searchParams.get('mail')
      const mail = mailParam === 'ok' ? 'ok' : mailParam === 'error' ? 'error' : null
      return context.render(<DetallePage user={user} p={p} mail={mail} />)
    },

    async word(context) {
      const user = await requireAdminUser(context.request)
      if (user instanceof Response) return user

      const response = await backendFetch(
        context.request,
        `/api/participations/${context.params.id}/word`,
      )
      if (!response.ok) return new Response('Not Found', { status: response.status })

      return new Response(response.body, {
        headers: {
          'content-type':
            response.headers.get('content-type') ??
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'content-disposition':
            response.headers.get('content-disposition') ??
            'attachment; filename="participacion.docx"',
        },
      })
    },
  },
})
