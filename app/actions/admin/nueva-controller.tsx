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
import { adminRoutes } from '../../routes.ts'
import { MAX_FILE_BYTES, MAX_FILE_MB } from '../../utils/uploads.ts'
import { NuevaPage, type NuevaValues } from './nueva-page.tsx'

/** La captura física adjunta un solo expediente escaneado, a diferencia del formulario ciudadano. */
const MAX_ADMIN_FILES = 1

/**
 * Margen para lo que el propio multipart añade al cuerpo: delimitadores,
 * cabeceras por parte y los ~16 campos de texto del formulario. Sin él, un
 * archivo de exactamente MAX_FILE_BYTES supera el total y se rechaza.
 */
const MULTIPART_OVERHEAD_BYTES = 64 * 1024

/**
 * Campos que viajan tal cual al backend.
 *
 * `numero` no está: el formulario captura "Calle y número" en un solo campo (ver
 * DireccionFields), así que enviarlo siempre vacío sólo daba a entender que se
 * recogía por separado.
 */
const CAMPOS_DIRECTOS = [
  'colonia',
  'calle',
  'cp',
  'latitud',
  'longitud',
  'fuente',
  'genero',
  'tematica',
  'institucion',
  'ocupacion',
  'observacion',
] as const

/** Todo lo que se repinta si el alta falla, incluidos los de tratamiento propio. */
const CAMPOS_DEL_FORMULARIO = [
  ...CAMPOS_DIRECTOS,
  'nombre',
  'correo',
  'domicilio',
  'municipio_participante',
  'municipio',
  'direccion_origen',
] as const satisfies ReadonlyArray<keyof NuevaValues>

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
          maxFiles: MAX_ADMIN_FILES,
          maxFileSize: MAX_FILE_BYTES,
          maxTotalSize: MAX_FILE_BYTES * MAX_ADMIN_FILES + MULTIPART_OVERHEAD_BYTES,
        })
      } catch (error) {
        if (error instanceof MaxFilesExceededError) {
          return context.render(
            <NuevaPage user={user} error={`Solo se puede adjuntar ${MAX_ADMIN_FILES} archivo`} />,
            { status: 413 },
          )
        }
        // El total se rebasa por el mismo motivo que el tamaño individual —un
        // solo adjunto—, así que el capturista recibe el mismo mensaje.
        if (
          error instanceof MaxFileSizeExceededError ||
          error instanceof MaxTotalSizeExceededError
        ) {
          return context.render(
            <NuevaPage user={user} error={`El archivo excede el límite de ${MAX_FILE_MB} MB`} />,
            { status: 413 },
          )
        }
        throw error
      }

      // `campo()` colapsa ausente y vacío en un solo caso: los inputs siempre se
      // envían, así que `formData.get()` devuelve '' —nunca null— para un campo
      // que el capturista dejó en blanco.
      const campo = (nombre: string) => String(formData.get(nombre) ?? '').trim()

      // Lo que el capturista escribió, por si hay que repintar el formulario.
      const values: NuevaValues = {}
      for (const nombre of CAMPOS_DEL_FORMULARIO) {
        const valor = campo(nombre)
        if (valor) values[nombre] = valor
      }

      const body = new FormData()
      body.set('origen', 'fisica')
      body.set('nombre', campo('nombre'))
      body.set('correo', campo('correo'))

      // El formulario captura dos domicilios distintos: el de quien participa y el
      // del aporte que se reporta. Se envían por separado; colapsarlos perdía el
      // municipio del participante.
      body.set('domicilio', campo('domicilio'))
      const municipioParticipante = campo('municipio_participante')
      if (municipioParticipante) body.set('municipio_participante', municipioParticipante)

      body.set('municipio', campo('municipio') || 'San Pedro Tlaquepaque')
      for (const nombre of CAMPOS_DIRECTOS) {
        body.set(nombre, campo(nombre))
      }

      const pdf = formData.get('pdf')
      if (pdf instanceof File && pdf.size > 0) {
        body.set('pdf', pdf, pdf.name)
      }

      const response = await backendFetch(context.request, '/api/participations', {
        method: 'POST',
        body,
      })
      if (!response.ok) {
        const data = (await response.json().catch(() => ({}))) as { error?: string }
        return context.render(
          <NuevaPage
            user={user}
            error={data.error ?? 'No se pudo guardar la participación'}
            values={values}
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
