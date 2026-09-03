/**
 * Login Controller
 * Handles GET (render form) and POST (validate) for /login
 *
 * form() route produces:
 *   routes.login.index  → GET  /login
 *   routes.login.action → POST /login
 */
import { email, maxLength, minLength } from 'remix/data-schema/checks'
import * as s from 'remix/data-schema'
import * as f from 'remix/data-schema/form-data'
import { redirect } from 'remix/response/redirect'
import { createController } from 'remix/router'

import { loginBackend } from '../../backend.ts'
import { puedeEntrarAlPanel } from '../../ui/admin/roles.ts'
import { adminRoutes, routes } from '../../routes.ts'
import { LoginPage } from './page.tsx'
import { PASSWORD_MAX, PASSWORD_MIN, type LoginErrors } from '../../ui/login/types.ts'

const loginSchema = f.object({
  email: f.field(s.string().pipe(email())),
  password: f.field(s.string().pipe(minLength(PASSWORD_MIN), maxLength(PASSWORD_MAX))),
})

export default createController(routes.login, {
  actions: {
    index(context) {
      // `?reset=ok` lo pone /restablecer al terminar: el cambio de contraseña
      // no inicia sesión, así que el acuse tiene que darse aquí.
      const reset = new URL(context.request.url).searchParams.get('reset') === 'ok'
      return context.render(
        reset ? (
          <LoginPage
            alert={{
              type: 'success',
              message: 'Tu contraseña se actualizó. Inicia sesión con la nueva.',
            }}
          />
        ) : (
          <LoginPage />
        ),
      )
    },

    async action(context) {
      const formData = await context.request.formData()

      const parsed = s.parseSafe(loginSchema, formData, {
        errorMap(ctx) {
          const field = ctx.path?.[0]
          if (ctx.code === 'string.email' || ctx.code === 'string.format') {
            return 'Ingresa un correo electrónico válido'
          }
          if (ctx.code === 'string.min_length') {
            return `La contraseña debe tener al menos ${PASSWORD_MIN} caracteres`
          }
          if (ctx.code === 'string.max_length') {
            return `La contraseña no puede pasar de ${PASSWORD_MAX} caracteres`
          }
          if (ctx.code === 'type.string') {
            return field === 'email' ? 'Ingresa tu correo electrónico' : 'Ingresa tu contraseña'
          }
        },
      })

      if (!parsed.success) {
        const errors: LoginErrors = {}
        for (const issue of parsed.issues ?? []) {
          const key = issue.path?.[0] as keyof LoginErrors | undefined
          if (key && !errors[key]) {
            errors[key] = issue.message
          }
        }
        const emailEnviado = String(formData.get('email') ?? '').trim()
        return context.render(<LoginPage errors={errors} email={emailEnviado} />, { status: 422 })
      }

      // Autenticar contra el backend (Spring de usuario/admin)
      const result = await loginBackend(parsed.value.email, parsed.value.password, context.request)

      if (!result.ok) {
        // El status se propaga tal cual (503 backend caído, 429 demasiados
        // intentos, 409 conflicto). Aplanarlo todo a 401 hacía que "el backend
        // no responde" fuera indistinguible de "la contraseña está mal", que es
        // justo el caso en el que uno pierde media hora probando contraseñas.
        const status = [401, 409, 429, 503].includes(result.status) ? result.status : 401

        // Mensaje descriptivo según el tipo de error
        let alertMessage = result.error ?? 'Credenciales inválidas'
        let alertType: 'error' | 'warning' | 'info' = 'error'

        if (result.status === 429) {
          alertMessage = 'Demasiados intentos fallidos. Intenta de nuevo en 15 minutos.'
          alertType = 'warning'
        } else if (result.status === 503) {
          alertMessage = 'El servicio de autenticación no está disponible. Intenta más tarde.'
          alertType = 'warning'
        } else if (result.status === 401) {
          alertMessage = 'Correo o contraseña incorrectos. Verifica tus credenciales.'
        }

        return context.render(
          <LoginPage
            alert={{ type: alertType, message: alertMessage }}
            email={parsed.value.email}
          />,
          { status },
        )
      }

      // Redirigir por rol: admin → dashboard, ciudadano → participación
      const dest = puedeEntrarAlPanel(result.user?.role)
        ? adminRoutes.index.href()
        : routes.participation.index.href()
      return redirect(dest, {
        headers: result.setCookie ? { 'set-cookie': result.setCookie } : undefined,
      })
    },
  },
})
