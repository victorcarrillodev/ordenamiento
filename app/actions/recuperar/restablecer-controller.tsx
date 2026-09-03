/**
 * Restablecer Controller — GET/POST de /restablecer
 *
 * El GET valida el token ANTES de pintar el formulario, para no pedir una
 * contraseña que el POST va a rechazar de todos modos. El POST canjea el
 * enlace y manda a /login: restablecer la contraseña no inicia sesión.
 */
import { redirect } from 'remix/response/redirect'
import { createController } from 'remix/router'

import { restablecerPassword, validarTokenRecuperacion } from '../../backend.ts'
import { routes } from '../../routes.ts'
import { PASSWORD_MAX, PASSWORD_MIN } from '../../ui/login/types.ts'
import { RestablecerPage } from './restablecer-page.tsx'

const MENSAJE_ENLACE_MUERTO =
  'El enlace de recuperación no es válido o ya venció. Solicita uno nuevo.'

export default createController(routes.restablecer, {
  actions: {
    async index(context) {
      const token = new URL(context.request.url).searchParams.get('token') ?? ''
      if (!token) {
        return context.render(<RestablecerPage invalido />, { status: 400 })
      }

      const estado = await validarTokenRecuperacion(token)
      if (!estado.valido) {
        return context.render(
          <RestablecerPage
            invalido
            alert={{
              type: 'warning',
              message:
                estado.motivo === 'expirado'
                  ? 'Este enlace venció. Solicita uno nuevo para continuar.'
                  : MENSAJE_ENLACE_MUERTO,
            }}
          />,
          { status: 410 },
        )
      }

      return context.render(<RestablecerPage token={token} />)
    },

    async action(context) {
      const formData = await context.request.formData()
      const token = String(formData.get('token') ?? '')
      const password = String(formData.get('password') ?? '')
      const confirmacion = String(formData.get('confirmacion') ?? '')

      if (!token) {
        return context.render(<RestablecerPage invalido />, { status: 400 })
      }

      // El máximo no es cosmético: sin él, una contraseña de megabytes obliga
      // al backend a un hash argon2id de coste arbitrario.
      if (password.length < PASSWORD_MIN || password.length > PASSWORD_MAX) {
        return context.render(
          <RestablecerPage
            token={token}
            errors={{
              password: `La contraseña debe tener entre ${PASSWORD_MIN} y ${PASSWORD_MAX} caracteres`,
            }}
          />,
          { status: 422 },
        )
      }

      if (password !== confirmacion) {
        return context.render(
          <RestablecerPage
            token={token}
            errors={{ confirmacion: 'Las contraseñas no coinciden' }}
          />,
          { status: 422 },
        )
      }

      const resultado = await restablecerPassword(token, password)

      if (!resultado.ok) {
        // 410 = el enlace ya no sirve; no tiene sentido reintentar aquí.
        if (resultado.status === 410) {
          return context.render(
            <RestablecerPage
              invalido
              alert={{ type: 'warning', message: resultado.error ?? MENSAJE_ENLACE_MUERTO }}
            />,
            { status: 410 },
          )
        }

        return context.render(
          <RestablecerPage
            token={token}
            alert={{
              type: resultado.status === 429 ? 'warning' : 'error',
              message: resultado.error ?? 'No se pudo cambiar la contraseña. Intenta de nuevo.',
            }}
          />,
          { status: resultado.status },
        )
      }

      return redirect(`${routes.login.index.href()}?reset=ok`)
    },
  },
})
