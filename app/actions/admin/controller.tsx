/**
 * Admin Controller Â· rutas GET de la BitÃ¡cora Ambiental
 *   adminRoutes.index     â†’ GET /admin            (vista general)
 *   adminRoutes.exportar  â†’ GET /admin/exportar   (pÃ¡gina o descarga .xlsx)
 * La ruta form() de reuniones se mapea por separado (reuniones-controller.tsx).
 */
import { createController } from 'remix/router'

import { backendFetch, fetchJsonOr, requireAdminUser } from '../../backend.ts'
import { adminRoutes } from '../../routes.ts'
import { AdminPage } from './page.tsx'
import { ExportarPage } from './exportar-page.tsx'
import { ParticipacionesPage } from './participaciones-page.tsx'
import { EstadisticasPage } from './estadisticas-page.tsx'
import { DetallePage } from './detalle-page.tsx'
import { ETAPAS } from './etapa.ts'

interface Stats {
  usuarios: number
  digitales: number
  fisicas: number
  resultado: Array<{ estado: string; total: number }>
  fuente: Array<[string, number]>
  genero: Array<[string, number]>
  tematica: Array<[string, number]>
  contenido?: {
    actividades: number
    documentos: number
    indicadores: number
    poelSesiones: number
    reuniones: number
    avisos: number
  }
  participacionesPorMes?: Array<{ mes: string; total: number }>
  proximaReunion?: {
    id: string
    titulo: string
    fecha: string
    hora_inicio: string
    hora_fin: string
  } | null
  ultimosAvisos?: Array<{
    id: string
    titulo: string
    descripcion: string
    activo: boolean
    fecha?: string
  }>
}

interface AdminUserRow {
  id: string
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

      const stats = await fetchJsonOr<Stats>(context.request, '/api/stats', {
        usuarios: 0,
        digitales: 0,
        fisicas: 0,
        resultado: [],
        fuente: [],
        genero: [],
        tematica: [],
        contenido: {
          actividades: 0,
          documentos: 0,
          indicadores: 0,
          poelSesiones: 0,
          reuniones: 0,
          avisos: 0,
        },
        participacionesPorMes: [],
        proximaReunion: null,
        ultimosAvisos: [],
      })

      let users: AdminUserRow[] = []
      if (user.role === 'admin') {
        const usersData = await fetchJsonOr<{ users: AdminUserRow[] }>(
          context.request,
          '/api/users',
          { users: [] },
        )
        users = usersData.users
      }

      // Obtener hora y fecha real de MÃ©xico (America/Mexico_City)
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

      let saludo = 'Buenos dÃ­as'
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

      const params = new URL(context.request.url).searchParams
      const origen = params.get('origen') === 'fisica' ? 'fisica' : 'digital'
      const etapaParam = params.get('etapa')
      const etapa = ETAPAS.find((e) => e === etapaParam)
      const rawPage = params.get('page')
      const rawLimit = params.get('limit')
      const page = Number.isInteger(Number(rawPage)) && Number(rawPage) > 0 ? Number(rawPage) : 1
      const limit =
        Number.isInteger(Number(rawLimit)) && Number(rawLimit) > 0 ? Number(rawLimit) : 10
      const data = await fetchJsonOr<{
        items: Array<{
          id: string
          folio: string
          origen: string
          nombre: string
          estado: string
          fecha: string
          notificado_en: string | null
          adjuntos: Array<{ id: string; nombre_original: string; mime: string; size: number }>
        }>
        total: number
        page: number
        limit: number
      }>(
        context.request,
        `/api/participations?origen=${origen}&limit=${limit}&page=${page}` +
          (etapa ? `&etapa=${encodeURIComponent(etapa)}` : ''),
        { items: [], total: 0, page, limit },
      )

      return context.render(
        <ParticipacionesPage
          user={user}
          origen={origen}
          items={data.items ?? []}
          etapa={etapa}
          page={data.page ?? page}
          limit={data.limit ?? limit}
          total={typeof data.total === 'number' ? data.total : (data.items?.length ?? 0)}
        />,
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

      const headers = new Headers()
      for (const h of [
        'content-type',
        'content-disposition',
        'x-content-type-options',
        'cross-origin-resource-policy',
        // El visor de PDF del navegador necesita el tamaño para paginar.
        'content-length',
      ]) {
        const v = response.headers.get(h)
        if (v) headers.set(h, v)
      }
      if (!headers.has('content-disposition')) headers.set('content-disposition', 'attachment')

      // NO se reenvía la CSP del backend (`sandbox; frame-ancestors 'none'`):
      // esa cabecera impide que el propio panel incruste el PDF en el detalle.
      // Se sustituye por una equivalente que sí permite incrustarlo en el mismo
      // origen, manteniendo el recurso sin permiso para cargar nada más.
      headers.set('content-security-policy', "default-src 'none'; frame-ancestors 'self'")

      return new Response(response.body, { headers })
    },

    /** Sirve un archivo de una sesión POEL a través del panel. */
    async poelArchivo(context) {
      const user = await requireAdminUser(context.request)
      if (user instanceof Response) return user

      const descarga = new URL(context.request.url).searchParams.get('download') === '1'
      const response = await backendFetch(
        context.request,
        `/api/poel/archivos/${context.params.aid}${descarga ? '?download=1' : ''}`,
      )
      if (!response.ok) return new Response('Not Found', { status: response.status })

      const headers = new Headers()
      for (const h of ['content-type', 'content-disposition', 'content-length']) {
        const v = response.headers.get(h)
        if (v) headers.set(h, v)
      }
      headers.set('x-content-type-options', 'nosniff')
      // Igual que con los adjuntos: la CSP del backend no dejaría incrustarlo
      // en el propio panel; se emite una que sí lo permite en mismo origen.
      headers.set('content-security-policy', "default-src 'none'; frame-ancestors 'self'")

      return new Response(response.body, { headers })
    },
    /** Sirve la imagen de una sesión POEL a través del panel. */
    async poelImagen(context) {
      const user = await requireAdminUser(context.request)
      if (user instanceof Response) return user

      const response = await backendFetch(context.request, `/api/poel/${context.params.id}/imagen`)
      if (!response.ok) return new Response('Not Found', { status: response.status })

      const headers = new Headers()
      for (const h of ['content-type', 'content-disposition', 'content-length']) {
        const v = response.headers.get(h)
        if (v) headers.set(h, v)
      }
      headers.set('x-content-type-options', 'nosniff')
      // Igual que con los adjuntos: la CSP del backend impediría incrustarla en
      // el propio panel, así que se emite una que sí lo permite en mismo origen.
      headers.set('content-security-policy', "default-src 'none'; frame-ancestors 'self'")

      return new Response(response.body, { headers })
    },

    async estadisticas(context) {
      const user = await requireAdminUser(context.request)
      if (user instanceof Response) return user
      const origen =
        new URL(context.request.url).searchParams.get('origen') === 'fisica' ? 'fisica' : 'digital'
      const stats = await fetchJsonOr(context.request, '/api/stats', {
        usuarios: 0,
        digitales: 0,
        fisicas: 0,
        resultado: [],
        fuente: [],
        genero: [],
        tematica: [],
      })
      return context.render(<EstadisticasPage user={user} origen={origen} stats={stats} />)
    },

    async cuentaAvatar(context) {
      const user = await requireAdminUser(context.request)
      if (user instanceof Response) return user
      const response = await backendFetch(context.request, '/api/users/me/avatar')
      if (!response.ok) return new Response('Not Found', { status: response.status })
      const headers = new Headers()
      for (const h of ['content-type', 'content-disposition', 'content-length']) {
        const v = response.headers.get(h)
        if (v) headers.set(h, v)
      }
      headers.set('x-content-type-options', 'nosniff')
      headers.set('content-security-policy', "default-src 'none'; frame-ancestors 'self'")
      return new Response(response.body, { headers })
    },

    async participacionDetalle(context) {
      const user = await requireAdminUser(context.request)
      if (user instanceof Response) return user

      const raw = await fetchJsonOr<Record<string, unknown> | null>(
        context.request,
        `/api/participations/${context.params.id}`,
        null,
      )
      const p = raw
        ? {
            id: raw.id as string,
            folio: raw.folio as string,
            origen: raw.origen as string,
            nombre: raw.nombre as string,
            correo: raw.correo as string,
            colonia: raw.colonia as string,
            municipio: raw.municipio as string,
            domicilio: raw.domicilio as string,
            municipio_participante: raw.municipio_participante as string,
            institucion: raw.institucion as string,
            ocupacion: raw.ocupacion as string,
            observacion: raw.observacion as string,
            estado: raw.estado as string,
            fuente: raw.fuente as string,
            genero: raw.genero as string,
            tematica: raw.tematica as string,
            fecha: raw.created_at as string,
            resolucion_motivo: (raw.resolucion_motivo as string) ?? '',
            resolucion_direccion: (raw.resolucion_direccion as string) ?? '',
            resolucion_cita: (raw.resolucion_cita as string) ?? '',
            resolucion_en: (raw.resolucion_en as string) ?? null,
            notificado_en: (raw.notificado_en as string) ?? null,
            notificado_a: (raw.notificado_a as string) ?? '',
            adjuntos: (
              (raw.attachments ?? []) as Array<{
                id: string
                nombre_original: string
                mime: string
                size: number
              }>
            ).map((a) => ({
              id: a.id,
              nombre_original: a.nombre_original,
              mime: a.mime,
              size: a.size,
            })),
          }
        : null
      const params = new URL(context.request.url).searchParams
      const mailParam = params.get('mail')
      const mail = mailParam === 'ok' ? 'ok' : mailParam === 'error' ? 'error' : null

      const dictamenParam = params.get('dictamen')
      const dictamen = (['notificado', 'guardado', 'error', 'estado'] as const).find(
        (v) => v === dictamenParam,
      )

      return context.render(<DetallePage user={user} p={p} mail={mail} dictamen={dictamen} />)
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
