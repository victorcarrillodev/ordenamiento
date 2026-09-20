/**
 * Panel · «Actividades y avances del Programa».
 *
 * Un solo módulo sustituye a Avisos, Reuniones, POEL–Sesiones, Actividades y
 * Documentos: cada actividad se registra una vez y se edita el MISMO registro
 * cuando se realiza. El backend decide dónde aparece en el portal.
 *
 *   GET  /admin/actividades             lista o calendario (?vista=calendario)
 *   POST /admin/actividades             eliminar desde la lista
 *   GET  /admin/actividades/nueva       formulario de alta
 *   POST /admin/actividades/nueva       alta
 *   GET  /admin/actividades/:id         edición + archivos + aviso por correo
 *   POST /admin/actividades/:id         guardar | archivo_editar | archivo_quitar
 *                                       | enviar_aviso | eliminar
 */
import { redirect } from 'remix/response/redirect'
import { createController } from 'remix/router'

import { backendFetch, fetchJsonOr, requireAdminUser } from '../../backend.ts'
import {
  esEstadoActividad,
  esEstadoPublicacion,
  esFasePrograma,
  esTipoArchivo,
  type ActividadGestion,
} from '../../data/programa.ts'
import { adminRoutes } from '../../routes.ts'
import { claveMes, hoyEnMexico, parsearFecha, parsearMes } from '../../utils/calendario.ts'
import {
  acuseDe,
  cuerpoParaBackend,
  valoresDeActividad,
  valoresDeFormulario,
  type ValoresActividad,
} from './actividad-datos.ts'
import { ActividadPage } from './actividad-page.tsx'
import { ActividadesPage, type FiltrosLista, type ResumenGestion } from './actividades-page.tsx'

const RESUMEN_VACIO: ResumenGestion = {
  total: 0,
  proximas: 0,
  realizadas: 0,
  borradores: 0,
  avisosVigentes: 0,
  avisos: [],
}

/**
 * Errores que llegan por `?error=` tras redirigir. Van por código y no como
 * texto libre: un mensaje tomado de la URL permitiría a cualquiera escribir lo
 * que quisiera dentro del panel con solo mandar un enlace.
 */
const ERRORES = {
  eliminar: 'No se pudo eliminar la actividad. Inténtalo de nuevo.',
  archivo: 'No se pudo actualizar el archivo. Inténtalo de nuevo.',
  foto: 'Solo las imágenes JPG, PNG, WEBP o GIF pueden marcarse como fotografía.',
  correo: 'No se pudo enviar el correo. Inténtalo más tarde.',
  correo_config: 'El envío de correo no está configurado en el servidor (SMTP).',
  correo_destino: 'Escribe un correo destino válido.',
  no_encontrada: 'La actividad que buscabas ya no existe.',
} as const

function errorDe(valor: string | null): string | undefined {
  return valor && Object.hasOwn(ERRORES, valor) ? ERRORES[valor as keyof typeof ERRORES] : undefined
}

/** Mensaje del backend para mostrarlo tal cual (las validaciones ya vienen redactadas). */
async function errorDelBackend(res: Response, respaldo: string): Promise<string> {
  const data = (await res.json().catch(() => ({}))) as { error?: unknown }
  return typeof data.error === 'string' && data.error ? data.error : respaldo
}

const ruta = (id: string) => `/api/actividades/${encodeURIComponent(id)}`
const rutaArchivo = (aid: string) => `/api/actividades/archivos/${encodeURIComponent(aid)}`

async function actividadDe(request: Request, id: string): Promise<ActividadGestion | null> {
  const data = await fetchJsonOr<{ actividad: ActividadGestion | null }>(
    request,
    `/api/actividades/gestion/${encodeURIComponent(id)}`,
    { actividad: null },
  )
  return data.actividad ?? null
}

/** Valores del formulario de alta: lo más común ya elegido. */
const VALORES_NUEVA: ValoresActividad = {
  fase: 'Formulación',
  estado: 'programada',
  publicacion: 'publicado',
}

export const actividadesController = createController(adminRoutes.actividades, {
  actions: {
    async index(context) {
      const user = await requireAdminUser(context.request)
      if (user instanceof Response) return user

      const params = new URL(context.request.url).searchParams
      const hoy = hoyEnMexico()
      const vista = params.get('vista') === 'calendario' ? 'calendario' : 'lista'
      const consulta = new URLSearchParams()
      const filtros: FiltrosLista = {}
      const hoyPartes = parsearFecha(hoy)
      let calendario: { anio: number; mes: number; dia?: string } = {
        anio: hoyPartes.anio,
        mes: hoyPartes.mes,
      }

      if (vista === 'lista') {
        const estado = params.get('estado')
        const publicacion = params.get('publicacion')
        const fase = params.get('fase')
        if (esEstadoActividad(estado)) filtros.estado = estado
        if (esEstadoPublicacion(publicacion)) filtros.publicacion = publicacion
        if (esFasePrograma(fase)) filtros.fase = fase
        for (const [clave, valor] of Object.entries(filtros)) consulta.set(clave, valor)
      } else {
        const mes = parsearMes(params.get('mes')) ?? calendario
        const clave = claveMes(mes.anio, mes.mes)
        const dia = params.get('dia')
        calendario = { ...mes, dia: dia && dia.startsWith(`${clave}-`) ? dia : undefined }
        consulta.set('mes', clave)
      }

      const data = await fetchJsonOr<{ actividades: ActividadGestion[]; resumen: ResumenGestion }>(
        context.request,
        `/api/actividades/gestion${consulta.size ? `?${consulta}` : ''}`,
        { actividades: [], resumen: RESUMEN_VACIO },
      )

      return context.render(
        <ActividadesPage
          user={user}
          vista={vista}
          actividades={data.actividades ?? []}
          resumen={data.resumen ?? RESUMEN_VACIO}
          filtros={filtros}
          calendario={calendario}
          hoy={hoy}
          acuse={acuseDe(params.get('ok'))}
          error={errorDe(params.get('error'))}
        />,
      )
    },

    async action(context) {
      const user = await requireAdminUser(context.request)
      if (user instanceof Response) return user

      const formData = await context.request.formData()
      const lista = adminRoutes.actividades.index.href()
      if (formData.get('intent') !== 'eliminar') return redirect(lista)

      const id = String(formData.get('id') ?? '')
      const res = await backendFetch(context.request, ruta(id), { method: 'DELETE' })
      return redirect(`${lista}?${res.ok ? 'ok=eliminada' : 'error=eliminar'}`)
    },
  },
})

export const actividadNuevaController = createController(adminRoutes.actividadNueva, {
  actions: {
    async index(context) {
      const user = await requireAdminUser(context.request)
      if (user instanceof Response) return user
      return context.render(<ActividadPage user={user} valores={VALORES_NUEVA} />)
    },

    async action(context) {
      const user = await requireAdminUser(context.request)
      if (user instanceof Response) return user

      const formData = await context.request.formData()
      // Si algo falla, el formulario vuelve con lo capturado: perderlo todo por
      // una hora mal escrita obligaría a teclear de nuevo la actividad entera.
      const conError = (error: string, status: number) =>
        context.render(
          <ActividadPage user={user} valores={valoresDeFormulario(formData)} error={error} />,
          { status },
        )

      const armado = cuerpoParaBackend(formData)
      if (!armado.ok) return conError(armado.error, 400)

      const res = await backendFetch(context.request, '/api/actividades', {
        method: 'POST',
        body: armado.cuerpo,
      })
      if (!res.ok) {
        return conError(await errorDelBackend(res, 'No se pudo guardar la actividad.'), res.status)
      }
      const { id } = (await res.json()) as { id: string }
      return redirect(`${adminRoutes.actividadEditar.index.href({ id })}?ok=creada`)
    },
  },
})

export const actividadEditarController = createController(adminRoutes.actividadEditar, {
  actions: {
    async index(context) {
      const user = await requireAdminUser(context.request)
      if (user instanceof Response) return user

      const actividad = await actividadDe(context.request, context.params.id)
      if (!actividad) {
        return redirect(`${adminRoutes.actividades.index.href()}?error=no_encontrada`)
      }
      const params = new URL(context.request.url).searchParams
      return context.render(
        <ActividadPage
          user={user}
          valores={valoresDeActividad(actividad)}
          actividad={actividad}
          acuse={acuseDe(params.get('ok'))}
          error={errorDe(params.get('error'))}
        />,
      )
    },

    async action(context) {
      const user = await requireAdminUser(context.request)
      if (user instanceof Response) return user

      const { id } = context.params
      const formData = await context.request.formData()
      const intent = String(formData.get('intent') ?? 'guardar')
      const volver = (resultado: string) =>
        redirect(`${adminRoutes.actividadEditar.index.href({ id })}?${resultado}`)

      if (intent === 'eliminar') {
        const res = await backendFetch(context.request, ruta(id), { method: 'DELETE' })
        return res.ok
          ? redirect(`${adminRoutes.actividades.index.href()}?ok=eliminada`)
          : volver('error=eliminar')
      }

      if (intent === 'archivo_quitar') {
        const aid = String(formData.get('aid') ?? '')
        const res = await backendFetch(context.request, rutaArchivo(aid), { method: 'DELETE' })
        return volver(res.ok ? 'ok=archivo_quitado' : 'error=archivo')
      }

      if (intent === 'archivo_editar') {
        const aid = String(formData.get('aid') ?? '')
        const tipo = formData.get('tipo')
        if (!esTipoArchivo(tipo)) return volver('error=archivo')
        const res = await backendFetch(context.request, rutaArchivo(aid), {
          method: 'PATCH',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ tipo, titulo: String(formData.get('titulo') ?? '') }),
        })
        if (res.ok) return volver('ok=archivo')
        return volver(res.status === 415 ? 'error=foto' : 'error=archivo')
      }

      if (intent === 'enviar_aviso') {
        const res = await backendFetch(context.request, `${ruta(id)}/aviso/enviar`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ para: String(formData.get('para') ?? '') }),
        })
        if (res.ok) return volver('ok=correo')
        if (res.status === 503) return volver('error=correo_config')
        return volver(res.status === 400 ? 'error=correo_destino' : 'error=correo')
      }

      // guardar: se edita el mismo registro (estado, resultados, archivos…).
      const conError = async (error: string, status: number) => {
        const actividad = await actividadDe(context.request, id)
        if (!actividad) {
          return redirect(`${adminRoutes.actividades.index.href()}?error=no_encontrada`)
        }
        return context.render(
          <ActividadPage
            user={user}
            valores={valoresDeFormulario(formData)}
            actividad={actividad}
            error={error}
          />,
          { status },
        )
      }

      const armado = cuerpoParaBackend(formData)
      if (!armado.ok) return conError(armado.error, 400)

      const res = await backendFetch(context.request, ruta(id), {
        method: 'PUT',
        body: armado.cuerpo,
      })
      if (!res.ok) {
        return conError(
          await errorDelBackend(res, 'No se pudieron guardar los cambios.'),
          res.status,
        )
      }
      return volver('ok=guardada')
    },
  },
})
