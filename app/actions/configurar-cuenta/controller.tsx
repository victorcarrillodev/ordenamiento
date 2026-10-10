/**
 * Configurar cuenta Controller — GET/POST de /configurar-cuenta
 *
 * El GET comprueba el enlace ANTES de pintar el formulario (sin gastarlo: los
 * previsualizadores de enlaces de los clientes de correo también lo abren). El
 * POST manda al backend nombre(s), apellidos, contraseña con su confirmación y la
 * foto opcional; si todo es válido el backend abre la sesión y de aquí se pasa
 * directo al panel (o al portal, si la cuenta es de ciudadanía).
 *
 * Quien decide qué datos sirven es el backend (auth/configuracion-cuenta.ts):
 * aquí solo se traducen sus errores por campo a mensajes en el formulario, que
 * se vuelve a pintar con lo escrito para corregirlo sin perderlo.
 */
import { redirect } from 'remix/response/redirect'
import { createController } from 'remix/router'

import { configurarCuenta, validarEnlaceDeConfiguracion } from '../../backend.ts'
import { adminRoutes, routes } from '../../routes.ts'
import { puedeEntrarAlPanel } from '../../ui/admin/roles.ts'
import { ConfigurarCuentaPage, type ConfigurarCuentaErrors } from './page.tsx'

const MENSAJE_ENLACE_MUERTO =
  'El enlace de configuración no es válido o ya venció. Pide que te reenvíen la invitación.'

/** Campos del formulario de los que el backend puede devolver un error. */
const CAMPOS = ['nombres', 'apellidos', 'password', 'confirmacion', 'avatar'] as const

function erroresDe(campos?: Record<string, string>): ConfigurarCuentaErrors {
  const errores: ConfigurarCuentaErrors = {}
  for (const campo of CAMPOS) {
    const mensaje = campos?.[campo]
    if (typeof mensaje === 'string') errores[campo] = mensaje
  }
  return errores
}

export default createController(routes.configurarCuenta, {
  actions: {
    async index(context) {
      const token = new URL(context.request.url).searchParams.get('token') ?? ''
      if (!token) {
        return context.render(<ConfigurarCuentaPage invalido />, { status: 400 })
      }

      const estado = await validarEnlaceDeConfiguracion(token)
      if (!estado.valido) {
        return context.render(
          <ConfigurarCuentaPage
            invalido
            alert={{
              type: 'warning',
              message:
                estado.motivo === 'expirado'
                  ? 'Este enlace venció. Pide que te reenvíen la invitación para continuar.'
                  : MENSAJE_ENLACE_MUERTO,
            }}
          />,
          { status: 410 },
        )
      }

      return context.render(<ConfigurarCuentaPage token={token} cuenta={estado.usuario} />)
    },

    async action(context) {
      const formData = await context.request.formData()
      const token = String(formData.get('token') ?? '')
      if (!token) {
        return context.render(<ConfigurarCuentaPage invalido />, { status: 400 })
      }

      const valores = {
        nombres: String(formData.get('nombres') ?? ''),
        apellidos: String(formData.get('apellidos') ?? ''),
      }

      // Al backend va solo lo que sirve: la foto únicamente si se eligió una.
      const envio = new FormData()
      envio.set('token', token)
      envio.set('nombres', valores.nombres)
      envio.set('apellidos', valores.apellidos)
      envio.set('password', String(formData.get('password') ?? ''))
      envio.set('confirmacion', String(formData.get('confirmacion') ?? ''))
      const foto = formData.get('avatar')
      if (foto instanceof File && foto.size > 0) envio.set('avatar', foto, foto.name)

      const resultado = await configurarCuenta(envio, context.request)

      if (resultado.ok) {
        const destino = puedeEntrarAlPanel(resultado.user?.role)
          ? adminRoutes.index.href()
          : routes.participation.index.href()
        return redirect(destino, {
          headers: resultado.setCookie ? { 'set-cookie': resultado.setCookie } : undefined,
        })
      }

      // 410 = el enlace ya no sirve; reintentar aquí no tiene sentido.
      if (resultado.status === 410) {
        return context.render(
          <ConfigurarCuentaPage
            invalido
            alert={{ type: 'warning', message: resultado.error ?? MENSAJE_ENLACE_MUERTO }}
          />,
          { status: 410 },
        )
      }

      // Todo lo demás se corrige con el mismo enlace: se repone el formulario con lo escrito.
      const errors = erroresDe(resultado.campos)
      const hayErroresDeCampo = Object.keys(errors).length > 0
      const estado = await validarEnlaceDeConfiguracion(token)
      return context.render(
        <ConfigurarCuentaPage
          token={token}
          cuenta={estado.valido ? estado.usuario : undefined}
          valores={valores}
          errors={errors}
          alert={
            hayErroresDeCampo
              ? { type: 'error', message: 'Revisa los datos marcados e inténtalo de nuevo.' }
              : {
                  type: resultado.status === 429 ? 'warning' : 'error',
                  message:
                    resultado.error ?? 'No se pudo guardar la configuración. Intenta de nuevo.',
                }
          }
        />,
        { status: [413, 415, 422, 429, 503].includes(resultado.status) ? resultado.status : 400 },
      )
    },
  },
})
