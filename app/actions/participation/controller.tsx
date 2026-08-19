/**
 * Participation Controller
 * Handles GET (render form) and POST (validate + save) for /participation
 *
 * form() route produces:
 *   routes.participation.index  → GET  /participation
 *   routes.participation.action → POST /participation
 */
import { mkdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

import { email, minLength } from 'remix/data-schema/checks'
import * as s from 'remix/data-schema'
import * as f from 'remix/data-schema/form-data'
import { redirect } from 'remix/response/redirect'
import { createController } from 'remix/router'

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
    /** GET /participation — render empty form or success screen */
    index(context) {
      const url = new URL(context.request.url)
      const success = url.searchParams.get('success') === '1'
      return context.render(<ParticipationPage success={success} />)
    },

    /** POST /participation — validate, persist, and redirect or re-render with errors */
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

      // Persist submission to tmp/submissions/
      try {
        const submissionsDir = join(process.cwd(), 'tmp', 'submissions')
        await mkdir(submissionsDir, { recursive: true })

        const submission = {
          timestamp: new Date().toISOString(),
          nombre: parsed.value.nombre,
          email: parsed.value.email,
          domicilio: parsed.value.domicilio,
          municipio: parsed.value.municipio,
          institucion: parsed.value.institucion,
          observacion: parsed.value.observacion,
        }

        const filename = `${Date.now()}-${submission.email.replace(/[^a-z0-9]/gi, '_')}.json`
        await writeFile(join(submissionsDir, filename), JSON.stringify(submission, null, 2), 'utf8')
      } catch {
        // Non-fatal: log but don't crash the user flow
        console.error('[participation] Failed to persist submission')
      }

      // Redirect to GET with success indicator
      return redirect(routes.participation.index.href() + '?success=1')
    },
  },
})
