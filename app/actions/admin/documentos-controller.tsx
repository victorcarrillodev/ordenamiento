/**
 * Documentos PDF de una participación — form()
 *   GET  /admin/participaciones/:id/documentos → regresa al detalle
 *   POST /admin/participaciones/:id/documentos → una acción con varias intenciones:
 *        subir · eliminar · publicar · retirar · datos · enviar
 *
 * El área responsable prepara y firma los PDF fuera del sistema; aquí los carga,
 * revisa su vista previa y decide qué se publica y cuándo se envía la respuesta.
 * Todo lo valida el backend; esta acción solo traduce el formulario y muestra el
 * resultado, sin enviar nada por su cuenta.
 */
import { MaxFileSizeExceededError, parseFormData } from 'remix/form-data-parser'
import { redirect } from 'remix/response/redirect'
import { createController } from 'remix/router'

import { backendFetch, requireAdminUser } from '../../backend.ts'
import { esTipoDocumento } from '../../data/participacion-documentos.ts'
import { adminRoutes } from '../../routes.ts'
import { MAX_FILE_BYTES, MAX_FILE_MB, UPLOAD_TIMEOUT_MS } from '../../utils/uploads.ts'
import { cargarDetalle } from './detalle-datos.ts'
import { DetallePage } from './detalle-page.tsx'

/** Qué intención produce qué confirmación en el detalle, y en qué sección se queda la persona. */
const CONFIRMACION = {
  subir: 'subido',
  eliminar: 'eliminado',
  publicar: 'publicado',
  retirar: 'retirado',
  datos: 'datos',
  enviar: 'enviado',
} as const

type Intencion = keyof typeof CONFIRMACION

const esIntencion = (valor: string): valor is Intencion => valor in CONFIRMACION

const ANCLA: Record<string, string> = { oficio: 'respuesta', formato_escaneado: 'documentos' }

const MULTIPART_OVERHEAD_BYTES = 64 * 1024

export default createController(adminRoutes.participacionDocumentos, {
  actions: {
    index(context) {
      return redirect(adminRoutes.participacionDetalle.href({ id: context.params.id }))
    },

    async action(context) {
      const user = await requireAdminUser(context.request)
      if (user instanceof Response) return user

      const { id } = context.params
      const detalle = adminRoutes.participacionDetalle.href({ id })
      const base = `/api/participations/${encodeURIComponent(id)}`

      /** Vuelve a dibujar el detalle con el motivo, sin perder lo que ya estaba cargado. */
      const conError = async (mensaje: string, status: number) => {
        const datos = await cargarDetalle(context.request, id)
        return context.render(<DetallePage user={user} {...datos} docError={mensaje} />, {
          status,
        })
      }

      let formData: FormData
      try {
        formData = await parseFormData(context.request, {
          maxFiles: 1,
          maxFileSize: MAX_FILE_BYTES,
          maxTotalSize: MAX_FILE_BYTES + MULTIPART_OVERHEAD_BYTES,
        })
      } catch (error) {
        if (error instanceof MaxFileSizeExceededError) {
          return conError(`El archivo puede pesar hasta ${MAX_FILE_MB} MB`, 413)
        }
        return conError('No se pudo leer el formulario. Vuelve a intentarlo.', 400)
      }

      const intencion = String(formData.get('intencion') ?? '')
      if (!esIntencion(intencion)) return conError('Acción no reconocida.', 400)
      const tipo = String(formData.get('tipo') ?? '')
      if (intencion !== 'enviar' && !esTipoDocumento(tipo)) {
        return conError('Tipo de documento no reconocido.', 400)
      }

      let response: Response
      const json = (cuerpo: unknown) => ({
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(cuerpo),
      })
      switch (intencion) {
        case 'subir': {
          const archivo = formData.get('archivo')
          const cuerpo = new FormData()
          if (archivo instanceof File && archivo.size > 0) {
            cuerpo.set('archivo', archivo, archivo.name)
          }
          cuerpo.set('numero_oficio', String(formData.get('numero_oficio') ?? ''))
          cuerpo.set('fecha_oficio', String(formData.get('fecha_oficio') ?? ''))
          response = await backendFetch(context.request, `${base}/documentos/${tipo}`, {
            method: 'PUT',
            body: cuerpo,
            signal: AbortSignal.timeout(UPLOAD_TIMEOUT_MS),
          })
          break
        }
        case 'eliminar':
          response = await backendFetch(context.request, `${base}/documentos/${tipo}`, {
            method: 'DELETE',
          })
          break
        case 'publicar':
        case 'retirar':
          response = await backendFetch(context.request, `${base}/documentos/${tipo}/publicacion`, {
            method: 'POST',
            ...json({ publicado: intencion === 'publicar' }),
          })
          break
        case 'datos':
          response = await backendFetch(context.request, `${base}/documentos/${tipo}`, {
            method: 'PATCH',
            ...json({
              numero_oficio: String(formData.get('numero_oficio') ?? ''),
              fecha_oficio: String(formData.get('fecha_oficio') ?? ''),
            }),
          })
          break
        case 'enviar':
          response = await backendFetch(context.request, `${base}/respuesta/enviar`, {
            method: 'POST',
          })
          break
      }

      if (!response.ok) {
        const data = (await response.json().catch(() => ({}))) as { error?: string }
        return conError(data.error ?? 'No se pudo completar la acción.', response.status)
      }
      const ancla = ANCLA[tipo] ?? (intencion === 'enviar' ? 'respuesta' : 'publicacion')
      return redirect(`${detalle}?doc=${CONFIRMACION[intencion]}#${ancla}`)
    },
  },
})
