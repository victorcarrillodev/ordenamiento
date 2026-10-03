/**
 * Admin Nueva Participación Controller · ruta form()
 *   GET  /admin/participaciones/nueva → render del formulario (admin)
 *   POST /admin/participaciones/nueva → crea participación física con PDF
 */
import {
  parseFormData,
  MaxFileSizeExceededError,
  MaxFilesExceededError,
  MaxTotalSizeExceededError,
} from 'remix/form-data-parser'
import { redirect } from 'remix/response/redirect'
import { createController } from 'remix/router'

import { backendFetch, requireAdminUser } from '../../backend.ts'
import { cuerpoParaBackend, primerError, validarParticipacion } from '../../data/participacion.ts'
import { adminRoutes } from '../../routes.ts'
import {
  MAX_FILE_BYTES,
  MAX_FILE_MB,
  MAX_FILES,
  MAX_TOTAL_BYTES,
  UPLOAD_TIMEOUT_MS,
} from '../../utils/uploads.ts'
import { NuevaPage } from './nueva-page.tsx'

/**
 * Margen para lo que el propio multipart añade al cuerpo: delimitadores,
 * cabeceras por parte y los ~20 campos de texto del formulario. Sin él, un
 * lote exactamente al tope supera el total y se rechaza.
 */
const MULTIPART_OVERHEAD_BYTES = 64 * 1024

export default createController(adminRoutes.participacionNueva, {
  actions: {
    async index(context) {
      const user = await requireAdminUser(context.request)
      if (user instanceof Response) return user
      const url = new URL(context.request.url)
      const registrado = url.searchParams.get('registrado') ?? undefined
      return context.render(<NuevaPage user={user} folioRegistrado={registrado} />)
    },

    async action(context) {
      const user = await requireAdminUser(context.request)
      if (user instanceof Response) return user

      let formData: FormData
      try {
        formData = await parseFormData(context.request, {
          maxFiles: MAX_FILES,
          maxFileSize: MAX_FILE_BYTES,
          maxTotalSize: MAX_TOTAL_BYTES + MULTIPART_OVERHEAD_BYTES,
        })
      } catch (error) {
        if (error instanceof MaxFilesExceededError) {
          return context.render(
            <NuevaPage user={user} error={`Máximo ${MAX_FILES} archivos por participación`} />,
            { status: 413 },
          )
        }
        if (
          error instanceof MaxFileSizeExceededError ||
          error instanceof MaxTotalSizeExceededError
        ) {
          return context.render(
            <NuevaPage user={user} error={`Cada archivo puede pesar hasta ${MAX_FILE_MB} MB`} />,
            { status: 413 },
          )
        }
        throw error
      }

      // Mismas reglas que el formulario ciudadano; solo cambia que aquí no hay
      // aviso de privacidad que aceptar: la persona está en ventanilla.
      const { valores, errores } = validarParticipacion(formData)
      if (Object.keys(errores).length > 0) {
        return context.render(
          <NuevaPage
            user={user}
            error={primerError(errores) ?? 'Revisa los campos marcados'}
            values={valores}
            errors={errores}
          />,
          { status: 422 },
        )
      }

      const body = cuerpoParaBackend(valores)
      body.set('origen', 'fisica')
      for (const archivo of formData.getAll('archivos')) {
        if (archivo instanceof File && archivo.size > 0) {
          body.append('archivos', archivo, archivo.name)
        }
      }

      const response = await backendFetch(context.request, '/api/participations', {
        method: 'POST',
        body,
        signal: AbortSignal.timeout(UPLOAD_TIMEOUT_MS),
      })
      if (!response.ok) {
        const data = (await response.json().catch(() => ({}))) as { error?: string }
        return context.render(
          <NuevaPage
            user={user}
            error={data.error ?? 'No se pudo guardar la participación'}
            values={valores}
          />,
          { status: response.status },
        )
      }

      const created = (await response.json().catch(() => ({}))) as { folio?: string }
      return redirect(
        adminRoutes.participacionNueva.index.href() +
          (created.folio ? `?registrado=${encodeURIComponent(created.folio)}` : ''),
      )
    },
  },
})
