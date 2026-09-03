/**
 * Confirmar correo Controller — GET/POST de /confirmar-correo.
 *
 * El GET solo pinta el botón; el POST es el que consume el token contra el
 * backend. Ver el comentario de la página para el porqué.
 */
import { createController } from 'remix/router'

import { confirmarCorreoNuevo } from '../../backend.ts'
import { routes } from '../../routes.ts'
import { ConfirmarCorreoPage } from './confirmar-correo-page.tsx'

const MENSAJE_ENLACE_MUERTO =
  'El enlace de confirmación no es válido o ya se usó. Pide el cambio otra vez desde Mi cuenta.'

export default createController(routes.confirmarCorreo, {
  actions: {
    index(context) {
      const token = new URL(context.request.url).searchParams.get('token') ?? ''
      if (!token) {
        return context.render(<ConfirmarCorreoPage invalido />, { status: 400 })
      }
      return context.render(<ConfirmarCorreoPage token={token} />)
    },

    async action(context) {
      const formData = await context.request.formData()
      const token = String(formData.get('token') ?? '')
      if (!token) {
        return context.render(<ConfirmarCorreoPage invalido />, { status: 400 })
      }

      const resultado = await confirmarCorreoNuevo(token)

      if (!resultado.ok) {
        // 409 = alguien registró esa dirección entre la solicitud y ahora; no
        // es un enlace muerto, pero tampoco se puede aplicar.
        const invalido = resultado.status === 410 || resultado.status === 400
        return context.render(
          <ConfirmarCorreoPage
            token={invalido ? undefined : token}
            invalido={invalido}
            alert={{
              type: 'warning',
              message: resultado.error ?? MENSAJE_ENLACE_MUERTO,
            }}
          />,
          { status: resultado.status },
        )
      }

      return context.render(
        <ConfirmarCorreoPage
          confirmado={resultado.email}
          alert={{ type: 'success', message: 'Tu correo de acceso quedó actualizado.' }}
        />,
      )
    },
  },
})
