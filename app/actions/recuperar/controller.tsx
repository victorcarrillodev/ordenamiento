/**
 * Recuperar Controller — GET/POST de /recuperar
 *
 * Pide al backend que envíe el enlace de restablecimiento. La respuesta que ve
 * el visitante es la MISMA exista o no la cuenta: si el acuse solo apareciera
 * para correos registrados, el formulario serviría para averiguar qué correos
 * tienen cuenta en el portal.
 */
import { createController } from 'remix/router'

import { solicitarRecuperacion } from '../../backend.ts'
import { routes } from '../../routes.ts'
import { RecuperarPage } from './recuperar-page.tsx'

/** Validación de forma, no de existencia: el backend vuelve a comprobarla. */
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export default createController(routes.recuperar, {
  actions: {
    index(context) {
      return context.render(<RecuperarPage />)
    },

    async action(context) {
      const formData = await context.request.formData()
      const email = String(formData.get('email') ?? '').trim()

      if (!email || !EMAIL_RE.test(email)) {
        return context.render(
          <RecuperarPage email={email} error="Ingresa un correo electrónico válido" />,
          { status: 422 },
        )
      }

      const resultado = await solicitarRecuperacion(email)

      if (resultado.status === 429) {
        return context.render(
          <RecuperarPage
            email={email}
            alert={{
              type: 'warning',
              message: 'Ya se enviaron varios enlaces a este correo. Espera unos minutos.',
            }}
          />,
          { status: 429 },
        )
      }

      if (resultado.status === 503) {
        return context.render(
          <RecuperarPage
            email={email}
            alert={{
              type: 'warning',
              message:
                'El envío de correo no está disponible en este momento. Comunícate con el administrador del portal.',
            }}
          />,
          { status: 503 },
        )
      }

      if (resultado.status >= 400) {
        return context.render(
          <RecuperarPage
            email={email}
            alert={{
              type: 'error',
              message: resultado.error ?? 'No se pudo procesar la solicitud. Intenta de nuevo.',
            }}
          />,
          { status: resultado.status },
        )
      }

      return context.render(
        <RecuperarPage enviado email={email} expiraMinutos={resultado.expiraMinutos} />,
      )
    },
  },
})
