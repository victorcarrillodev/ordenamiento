/**
 * Participation Controller
 * Handles GET (render form) and POST (validate + save) for /participation
 *
 * form() route produces:
 *   routes.participation.index  → GET  /participation
 *   routes.participation.action → POST /participation
 */
import { randomBytes } from 'node:crypto'
import { createFsFileStorage } from 'remix/file-storage/fs'
import * as s from 'remix/data-schema'
import { redirect } from 'remix/response/redirect'
import { createController } from 'remix/router'

import { BACKEND_URL } from '../../backend.ts'
import { routes } from '../../routes.ts'
import { MAX_FILE_BYTES, MAX_FILES, MAX_TOTAL_BYTES } from '../../utils/uploads.ts'
import { sanitizeFilename } from '../../../backend/src/services/upload-guard.ts'
import { ParticipationPage } from './page.tsx'
import {
  errorMap,
  participationSchema,
  toFormErrors,
  toFormValues,
  type FormErrors,
} from './schema.ts'
import { parseParticipationForm, type FileUpload } from './parse-with-values.ts'

const tmpStorage = createFsFileStorage('./tmp/uploads')

export default createController(routes.participation, {
  actions: {
    /** GET /participation — render empty form or success screen with official receipt (público) */
    index(context) {
      const url = new URL(context.request.url)
      const success = url.searchParams.get('success') === '1'
      const folio = url.searchParams.get('folio') ?? undefined
      return context.render(<ParticipationPage success={success} folio={folio} />)
    },

    /** POST /participation — streaming upload a tmp, validación y persistencia atómica */
    async action(context) {
      const storedKeys: string[] = []

      async function uploadHandler(fileUpload: FileUpload) {
        if (fileUpload.fieldName === 'archivos') {
          const safeName = sanitizeFilename(fileUpload.name)
          const key = `${Date.now()}-${randomBytes(4).toString('hex')}-${safeName}`
          storedKeys.push(key)
          const storageFile = await tmpStorage.put(key, fileUpload)
          return storageFile ? await storageFile.toFile() : undefined
        }
      }

      try {
        const parseResult = await parseParticipationForm(
          context.request,
          {
            maxFiles: MAX_FILES,
            maxFileSize: MAX_FILE_BYTES,
            maxTotalSize: MAX_TOTAL_BYTES,
          },
          uploadHandler,
        )
        const formData = parseResult.formData

        // Fix 1: 413 con repintado de campos de texto ya leídos
        if (parseResult.limitError === 'maxfiles') {
          return context.render(
            <ParticipationPage
              errors={{ archivos: `Máximo ${MAX_FILES} archivos por participación` }}
              values={toFormValues(formData)}
            />,
            { status: 413 },
          )
        }
        if (parseResult.limitError === 'maxfilesize') {
          return context.render(
            <ParticipationPage
              errors={{
                archivos: `Uno de los archivos excede el límite de ${Math.round(MAX_FILE_BYTES / (1024 * 1024))} MB`,
              }}
              values={toFormValues(formData)}
            />,
            { status: 413 },
          )
        }

        const parsed = s.parseSafe(participationSchema, formData, { errorMap })

        if (!parsed.success) {
          const errors: FormErrors = toFormErrors(parsed.issues)
          return context.render(
            <ParticipationPage errors={errors} values={toFormValues(formData)} />,
            { status: 422 },
          )
        }

        // Enviar al backend para persistir y vectorizar (origen digital, público)
        const body = new FormData()
        body.set('origen', 'digital')
        body.set('nombre', parsed.value.nombre)
        body.set('correo', parsed.value.email)
        body.set('calle', parsed.value.calle)
        body.set('colonia', parsed.value.colonia)
        body.set('municipio', parsed.value.municipio)
        body.set('codigo_postal', parsed.value.cp)
        body.set('direccion_origen', parsed.value.direccion_origen)
        body.set('institucion', parsed.value.institucion)
        body.set('observacion', parsed.value.observacion)
        body.set('consentimiento', '1')
        body.set('consentimiento_version', 'lgpdppso-2026-01')

        // Adjuntos: reenviar todos los archivos procesados
        const adjuntos = formData
          .getAll('archivos')
          .filter((entry): entry is File => entry instanceof File && entry.size > 0)
        for (const adjunto of adjuntos) {
          const fileToSend =
            typeof (adjunto as unknown as { toFile?: () => Promise<File> }).toFile === 'function'
              ? await (adjunto as unknown as { toFile: () => Promise<File> }).toFile()
              : adjunto
          body.append('archivos', fileToSend, fileToSend.name || adjunto.name)
        }

        let backendOk = false
        let backendError: string | undefined
        let backendStatus = 0
        let createdFolio = ''

        // Fix 3: Timeout con AbortController (30s para uploads de hasta 50MB)
        const abortCtrl = new AbortController()
        const timeout = setTimeout(() => abortCtrl.abort(), 30_000)

        try {
          const response = await fetch(`${BACKEND_URL}/api/participations`, {
            method: 'POST',
            body,
            signal: abortCtrl.signal,
          })
          clearTimeout(timeout)

          backendStatus = response.status
          backendOk = response.ok

          if (response.ok) {
            const data = (await response.json().catch(() => ({}))) as { folio?: string }
            createdFolio = data.folio ?? ''
          } else {
            const data = (await response.json().catch(() => ({}))) as { error?: string }
            backendError = data.error
          }
        } catch (error) {
          clearTimeout(timeout)

          // Fix 3: Detectar timeout (AbortError)
          if (error instanceof DOMException && error.name === 'AbortError') {
            return context.render(
              <ParticipationPage
                errors={{
                  archivos:
                    'Tu conexión está tardando demasiado. Verifica tu conexión a internet e inténtalo de nuevo.',
                }}
                values={toFormValues(formData)}
              />,
              { status: 504 },
            )
          }

          // Si la red falló, backendOk queda en false
          backendOk = false
        }

        // Fix 2: 429 con mensaje amigable en español
        if (backendStatus === 429) {
          return context.render(
            <ParticipationPage
              errors={{
                archivos:
                  'Estás enviando demasiadas solicitudes, espera un momento e inténtalo de nuevo.',
              }}
              values={toFormValues(formData)}
            />,
            { status: 502 },
          )
        }

        if (!backendOk) {
          return context.render(
            <ParticipationPage
              errors={{
                archivos: backendError,
                observacion: backendError
                  ? undefined
                  : 'No se pudo registrar. Verifica que el servicio esté activo e inténtalo de nuevo.',
              }}
              values={toFormValues(formData)}
            />,
            { status: 502 },
          )
        }

        // Redirect a GET con indicador de éxito y folio oficial
        const successUrl = new URL(routes.participation.index.href(), 'http://localhost')
        successUrl.searchParams.set('success', '1')
        if (createdFolio) successUrl.searchParams.set('folio', createdFolio)
        return redirect(successUrl.pathname + successUrl.search)
      } finally {
        // Limpieza de archivos temporales en disco
        await Promise.allSettled(storedKeys.map((k) => tmpStorage.remove(k)))
      }
    },
  },
})
