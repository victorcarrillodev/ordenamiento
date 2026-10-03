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

import { backendFetch, fetchJsonOr, requireAdminUser } from '../../backend.ts'
import { avisoSinRecepcion, esEtapaConsulta } from '../../data/consulta.ts'
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

/** El formato pendiente con ese id, si existe y todavía no regresa. */
async function formatoPendiente(request: Request, id: string | null | undefined) {
  if (!id) return undefined
  const { formatos } = await fetchJsonOr<{ formatos: Array<{ id: string; folio: string }> }>(
    request,
    '/api/formatos?estado=pendiente',
    { formatos: [] },
  )
  const formato = (formatos ?? []).find((f) => f.id === id)
  return formato ? { id: formato.id, folio: formato.folio } : undefined
}

/** Qué se muestra si la consulta no recibe participaciones nuevas (null si sí las recibe). */
async function avisoDeEtapa(request: Request) {
  const { etapa } = await fetchJsonOr<{ etapa: string }>(request, '/api/consulta', {
    etapa: 'pendiente',
  })
  return esEtapaConsulta(etapa) ? avisoSinRecepcion(etapa) : null
}

export default createController(adminRoutes.participacionNueva, {
  actions: {
    async index(context) {
      const user = await requireAdminUser(context.request)
      if (user instanceof Response) return user
      const url = new URL(context.request.url)
      const registrado = url.searchParams.get('registrado') ?? undefined
      const participacionId = url.searchParams.get('id') ?? undefined
      const formatoId = url.searchParams.get('formato')
      const formato = await formatoPendiente(context.request, formatoId)
      if (formatoId && !formato && !registrado) {
        return context.render(
          <NuevaPage
            user={user}
            error="Ese formato no existe o ya se registró como participación."
            aviso={{
              titulo: 'Formato no disponible',
              texto: 'Elige otro en la lista de formatos pendientes.',
            }}
          />,
          { status: 404 },
        )
      }
      const aviso = registrado ? null : await avisoDeEtapa(context.request)
      return context.render(
        <NuevaPage
          user={user}
          folioRegistrado={registrado}
          participacionId={participacionId}
          formato={formato}
          aviso={aviso ?? undefined}
        />,
      )
    },

    async action(context) {
      const user = await requireAdminUser(context.request)
      if (user instanceof Response) return user

      let formData: FormData
      try {
        formData = await parseFormData(context.request, {
          // Los anexos y, si viene de un formato, el escaneado.
          maxFiles: MAX_FILES + 1,
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
      const anexos = formData
        .getAll('archivos')
        .filter((a): a is File => a instanceof File && a.size > 0)
      if (anexos.length > MAX_FILES) {
        return context.render(
          <NuevaPage
            user={user}
            error={`Máximo ${MAX_FILES} archivos por participación`}
            values={valores}
          />,
          { status: 413 },
        )
      }
      for (const anexo of anexos) body.append('archivos', anexo, anexo.name)

      // Lo que regresó de un formato llenado a mano: mismo folio, con su escaneado.
      const formatoId = String(formData.get('formato_id') ?? '').trim()
      if (formatoId) {
        body.set('formato_id', formatoId)
        const escaneado = formData.get('escaneado')
        if (escaneado instanceof File && escaneado.size > 0) {
          body.set('escaneado', escaneado, escaneado.name)
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
            formato={await formatoPendiente(context.request, formatoId)}
          />,
          { status: response.status },
        )
      }

      const created = (await response.json().catch(() => ({}))) as { folio?: string; id?: string }
      const destino = new URLSearchParams()
      if (created.folio) destino.set('registrado', created.folio)
      if (created.id) destino.set('id', created.id)
      return redirect(`${adminRoutes.participacionNueva.index.href()}?${destino}`)
    },
  },
})
