/**
 * Login Controller
 * Handles GET (render form) and POST (validate) for /login
 *
 * form() route produces:
 *   routes.login.index  → GET  /login
 *   routes.login.action → POST /login
 */
import { email, minLength } from 'remix/data-schema/checks'
import * as s from 'remix/data-schema'
import * as f from 'remix/data-schema/form-data'
import { redirect } from 'remix/response/redirect'
import { createController } from 'remix/router'

import { BACKEND_URL, loginBackend } from '../../backend.ts'
import { adminRoutes, routes } from '../../routes.ts'
import { LoginPage } from './page.tsx'
import type { LoginErrors } from '../../ui/login/types.ts'

const loginSchema = f.object({
  email: f.field(s.string().pipe(email())),
  password: f.field(s.string().pipe(minLength(8))),
})

export default createController(routes.login, {
  actions: {
    index(context) {
      return context.render(<LoginPage />)
    },

    async action(context) {
      // Añadir nombre al manejo de registro admin + campos
      const formData = await context.request.formData()
      const intent = String(formData.get('intent') ?? 'login')

      // ── Registro de nuevo administrador (por si se olvida la cuenta) ──
      if (intent === 'registro') {
        const name = String(formData.get('name') ?? '').trim()
        const email = String(formData.get('email') ?? '').trim()
        const password = String(formData.get('password') ?? '')

        if (!name || !email || password.length < 8) {
          return context.render(
            <LoginPage errors={{ name: 'Completa nombre, correo y contraseña (mín. 8)' }} />,
            { status: 422 },
          )
        }

        const regResponse = await fetch(`${BACKEND_URL}/api/auth/register`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ email, name, password, role: 'user' }),
        })

        if (!regResponse.ok) {
          const data = (await regResponse.json().catch(() => ({}))) as { error?: string }
          return context.render(
            <LoginPage errors={{ email: data.error ?? 'No se pudo crear la cuenta' }} />,
            { status: regResponse.status },
          )
        }

        const token = regResponse.headers.get('set-cookie')
        // Usuario creado: entra como ciudadano a "haz tu participación"
        return redirect(routes.participation.index.href() + '?success=1', {
          headers: token ? { 'set-cookie': token } : undefined,
        })
      }

      const parsed = s.parseSafe(loginSchema, formData, {
        errorMap(ctx) {
          const field = ctx.path?.[0]
          if (ctx.code === 'string.email' || ctx.code === 'string.format') {
            return 'Ingresa un correo electrónico válido'
          }
          if (ctx.code === 'string.min_length') {
            return 'La contraseña debe tener al menos 8 caracteres'
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
        return context.render(<LoginPage errors={errors} />, { status: 422 })
      }

      // Autenticar contra el backend (Spring de usuario/admin)
      const result = await loginBackend(parsed.value.email, parsed.value.password)

      if (!result.ok) {
        return context.render(
          <LoginPage errors={{ email: result.error ?? 'Credenciales inválidas' }} />,
          { status: result.status === 409 ? 409 : 401 },
        )
      }

      // Redirigir por rol: admin → dashboard, ciudadano → participación
      const dest = result.user?.role === 'admin' ? adminRoutes.index.href() : routes.participation.index.href()
      return redirect(dest, {
        headers: result.setCookie ? { 'set-cookie': result.setCookie } : undefined,
      })
    },
  },
})
