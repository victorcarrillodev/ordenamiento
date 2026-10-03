/**
 * Documentos del Proyecto del Programa — form()
 *   GET  /admin/consulta/proyecto → regresa a «Consulta pública»
 *   POST /admin/consulta/proyecto → una acción con varias intenciones:
 *        subir (varios PDF a una sección) · renombrar · mover · eliminar
 *
 * El backend valida todo (PDF de verdad, tamaño, tope por sección); aquí solo se
 * traduce el formulario y se muestra el resultado.
 */
import {
  MaxFileSizeExceededError,
  MaxFilesExceededError,
  parseFormData,
} from 'remix/form-data-parser'
import { redirect } from 'remix/response/redirect'
import { createController } from 'remix/router'

import { backendFetch, requireAdminUser } from '../../backend.ts'
import { esSeccionProyecto } from '../../data/proyecto.ts'
import { adminRoutes } from '../../routes.ts'
import { MAX_FILE_BYTES, MAX_FILE_MB, UPLOAD_TIMEOUT_MS } from '../../utils/uploads.ts'
import { ConsultaPage } from './consulta-page.tsx'
import { datosDeConsulta } from './consulta-datos.ts'

const INTENCIONES = ['subir', 'renombrar', 'mover', 'eliminar'] as const
type Intencion = (typeof INTENCIONES)[number]
const esIntencion = (valor: string): valor is Intencion =>
  (INTENCIONES as readonly string[]).includes(valor)

/** Documentos que se cargan en un envío; el backend aplica el mismo tope. */
const MAX_POR_ENVIO = 10
const MULTIPART_OVERHEAD_BYTES = 64 * 1024

export default createController(adminRoutes.proyecto, {
  actions: {
    index() {
      return redirect(`${adminRoutes.consulta.index.href()}#proyecto`)
    },

    async action(context) {
      const user = await requireAdminUser(context.request)
      if (user instanceof Response) return user

      const conError = async (mensaje: string, status: number) =>
        context.render(
          <ConsultaPage user={user} {...await datosDeConsulta(context.request)} error={mensaje} />,
          { status },
        )

      let formData: FormData
      try {
        formData = await parseFormData(context.request, {
          maxFiles: MAX_POR_ENVIO,
          maxFileSize: MAX_FILE_BYTES,
          maxTotalSize: MAX_FILE_BYTES * MAX_POR_ENVIO + MULTIPART_OVERHEAD_BYTES,
        })
      } catch (error) {
        if (error instanceof MaxFilesExceededError) {
          return conError(`Máximo ${MAX_POR_ENVIO} archivos por envío.`, 413)
        }
        if (error instanceof MaxFileSizeExceededError) {
          return conError(`Cada archivo puede pesar hasta ${MAX_FILE_MB} MB.`, 413)
        }
        return conError('No se pudo leer el formulario. Vuelve a intentarlo.', 400)
      }

      const intencion = String(formData.get('intencion') ?? '')
      if (!esIntencion(intencion)) return conError('Acción no reconocida.', 400)
      const id = encodeURIComponent(String(formData.get('id') ?? ''))
      const json = (cuerpo: unknown) => ({
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(cuerpo),
      })

      let response: Response
      switch (intencion) {
        case 'subir': {
          const seccion = String(formData.get('seccion') ?? '')
          if (!esSeccionProyecto(seccion)) return conError('Elige la sección del documento.', 400)
          const cuerpo = new FormData()
          cuerpo.set('seccion', seccion)
          for (const archivo of formData.getAll('archivo')) {
            if (archivo instanceof File && archivo.size > 0)
              cuerpo.append('archivo', archivo, archivo.name)
          }
          response = await backendFetch(context.request, '/api/proyecto/documentos', {
            method: 'POST',
            body: cuerpo,
            signal: AbortSignal.timeout(UPLOAD_TIMEOUT_MS),
          })
          break
        }
        case 'renombrar':
          response = await backendFetch(context.request, `/api/proyecto/documentos/${id}`, {
            method: 'PATCH',
            ...json({ titulo: String(formData.get('titulo') ?? '') }),
          })
          break
        case 'mover':
          response = await backendFetch(context.request, `/api/proyecto/documentos/${id}/mover`, {
            method: 'POST',
            ...json({ direccion: String(formData.get('direccion') ?? '') }),
          })
          break
        case 'eliminar':
          response = await backendFetch(context.request, `/api/proyecto/documentos/${id}`, {
            method: 'DELETE',
          })
          break
      }

      if (!response.ok) {
        const data = (await response.json().catch(() => ({}))) as { error?: string }
        return conError(data.error ?? 'No se pudo completar la acción.', response.status)
      }
      return redirect(`${adminRoutes.consulta.index.href()}?proyecto=${intencion}#proyecto`)
    },
  },
})
