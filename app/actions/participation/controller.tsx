/**
 * Participation Controller
 * Handles GET (render form) and POST (validate + save) for /participation
 *
 * form() route produces:
 *   routes.participation.index  → GET  /participation
 *   routes.participation.action → POST /participation
 */
import { email, minLength } from 'remix/data-schema/checks'
import * as s from 'remix/data-schema'
import * as f from 'remix/data-schema/form-data'
import { redirect } from 'remix/response/redirect'
import { createController } from 'remix/router'

import { BACKEND_URL } from '../../backend.ts'
import { routes } from '../../routes.ts'
import { ParticipationPage, type FormErrors } from './page.tsx'

// ---------------------------------------------------------------------------
// Validation schema
// ---------------------------------------------------------------------------

const participationSchema = f.object({
  nombre: f.field(s.string().pipe(minLength(2))),
  email: f.field(s.string().pipe(email())),
  domicilio: f.field(s.defaulted(s.string(), '')),
  municipio: f.field(s.string().pipe(minLength(2))),
  institucion: f.field(s.defaulted(s.string(), '')),
  observacion: f.field(s.string().pipe(minLength(10))),
  consentimiento: f.field(s.defaulted(s.string(), '')),
})

// ---------------------------------------------------------------------------
// Controller
// ---------------------------------------------------------------------------

export default createController(routes.participation, {
  actions: {
    /** GET /participation — render empty form or success screen (público) */
    index(context) {
      const url = new URL(context.request.url)
      const success = url.searchParams.get('success') === '1'
      return context.render(<ParticipationPage success={success} />)
    },

    /** POST /participation — validate, persist al backend, y redirige o re-renderiza con errores */
    async action(context) {
      const formData = await context.request.formData()

      const parsed = s.parseSafe(participationSchema, formData, {
        errorMap(ctx) {
          const field = ctx.path?.[0]
          if (ctx.code === 'string.min_length') {
            if (field === 'nombre') return 'El nombre debe tener al menos 2 caracteres'
            if (field === 'municipio') return 'Indica tu colonia o municipio'
            if (field === 'observacion') return 'La observación debe tener al menos 10 caracteres'
          }
          if (ctx.code === 'string.email' || ctx.code === 'string.format') {
            return 'Ingresa un correo electrónico válido'
          }
          if (ctx.code === 'type.string') {
            return 'Este campo es obligatorio'
          }
        },
      })

      if (!parsed.success) {
        // Build a flat errors map from schema issues
        const errors: FormErrors = {}
        for (const issue of parsed.issues ?? []) {
          const key = issue.path?.[0] as keyof FormErrors | undefined
          if (key && !errors[key]) {
            errors[key] = issue.message
          }
        }
        return context.render(<ParticipationPage errors={errors} />, { status: 422 })
      }

      // Enviar al backend para persistir y vectorizar (origen digital, público)
      const body = new FormData()
      body.set('origen', 'digital')
      body.set('nombre', parsed.value.nombre)
      body.set('correo', parsed.value.email)
      body.set('municipio', parsed.value.municipio)
      body.set('colonia', parsed.value.municipio)
      body.set('institucion', parsed.value.institucion)
      body.set('observacion', parsed.value.observacion)

      const pdf = formData.get('archivos')
      if (pdf instanceof File && pdf.size > 0) {
        body.set('pdf', pdf, pdf.name)
      }

      let backendOk = false
      try {
        const response = await fetch(`${BACKEND_URL}/api/participations`, {
          method: 'POST',
          body,
        })
        backendOk = response.ok
      } catch {
        // Si la red falló, backendOk queda en false
      }

      if (!backendOk) {
        return context.render(
          <ParticipationPage
            errors={{
              observacion:
                'No se pudo registrar. Verifica que el servicio esté activo e inténtalo de nuevo.',
            }}
          />,
          { status: 502 },
        )
      }

      // Redirect a GET con indicador de éxito
      return redirect(routes.participation.index.href() + '?success=1')
    },
  },
})
