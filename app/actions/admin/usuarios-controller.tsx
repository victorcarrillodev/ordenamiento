/**
 * Usuarios Controller — GET/POST de /admin/usuarios.
 *
 * Alta, baja, cambio de rango, restablecimiento de contraseña y reenvío de la
 * invitación. Quién puede hacer qué sobre quién lo decide el backend
 * (backend/src/auth/roles.ts); aquí solo se traducen sus respuestas a acuses en
 * pantalla. El alta es solo de root: crea la cuenta «por configurar» con la
 * contraseña provisional que escribe quien da de alta y manda el correo con el
 * enlace al panel de configuración de la cuenta.
 */
import { redirect } from 'remix/response/redirect'
import { createController } from 'remix/router'

import { backendFetch, fetchJsonOr, requireAdminUser } from '../../backend.ts'
import { adminRoutes } from '../../routes.ts'
import { comoRol } from '../../ui/admin/roles.ts'
import { PASSWORD_MAX, PASSWORD_MIN } from '../../ui/login/types.ts'
import { UsuariosPage, type UsuarioFeedback, type UsuarioRow } from './usuarios-page.tsx'

/**
 * Acuses de las acciones sobre cuentas. Viajan como clave corta en la URL
 * (redirect POST → GET) para que recargar no reenvíe el formulario.
 */
const FEEDBACK: Record<string, UsuarioFeedback> = {
  ok: {
    type: 'success',
    message:
      'La cuenta se creó y se le envió el correo de bienvenida. Entrégale por otro medio la contraseña provisional: no viaja en el correo.',
  },
  'ok-sin-smtp': {
    type: 'warning',
    message:
      'La cuenta se creó, pero el correo no está configurado en el servidor, así que no se envió la bienvenida. Entrega la contraseña provisional por otro medio (con ella entra directo a configurar su cuenta) y usa «Reenviar invitación» cuando el correo funcione.',
  },
  'ok-envio-fallido': {
    type: 'warning',
    message:
      'La cuenta se creó, pero no se pudo enviar el correo de bienvenida. Entrega la contraseña provisional por otro medio y usa «Reenviar invitación» para volver a intentarlo.',
  },
  'invitacion-ok': {
    type: 'success',
    message:
      'Se reenvió la invitación con un enlace nuevo; el anterior ya no sirve. La contraseña provisional vale otros 7 días.',
  },
  'invitacion-no-pendiente': {
    type: 'error',
    message: 'Esa cuenta ya está configurada: no hay ninguna invitación pendiente.',
  },
  'invitacion-sin-smtp': {
    type: 'error',
    message:
      'El correo no está configurado en el servidor: no se pudo enviar la invitación. No se cambió nada.',
  },
  'invitacion-error': {
    type: 'error',
    message: 'No se pudo enviar el correo de la invitación. Intenta de nuevo.',
  },
  'solo-root-crea': {
    type: 'error',
    message: 'Solo una cuenta root puede dar de alta cuentas.',
  },
  'password-ok': {
    type: 'success',
    message:
      'Contraseña restablecida. Sus sesiones abiertas se cerraron; entrégasela por un medio seguro.',
  },
  'rol-ok': { type: 'success', message: 'El rango de la cuenta se actualizó.' },
  'eliminada-ok': { type: 'success', message: 'La cuenta se eliminó.' },
  datos: {
    type: 'error',
    message: `Faltan datos: nombre, correo y una contraseña provisional de entre ${PASSWORD_MIN} y ${PASSWORD_MAX} caracteres.`,
  },
  'password-corta': {
    type: 'error',
    message: `La contraseña debe tener entre ${PASSWORD_MIN} y ${PASSWORD_MAX} caracteres.`,
  },
  duplicado: { type: 'error', message: 'Ese correo ya tiene una cuenta en el portal.' },
  permiso: {
    type: 'error',
    message: 'No tienes rango suficiente para esa operación sobre esa cuenta.',
  },
  'ultimo-root': {
    type: 'error',
    message: 'No se puede dejar el sistema sin ninguna cuenta root.',
  },
  backend: {
    type: 'error',
    message: 'El servicio no respondió. No se hizo ningún cambio; vuelve a intentarlo.',
  },
  error: { type: 'error', message: 'No se pudo completar la operación. Intenta de nuevo.' },
}

/** Traduce el motivo que devuelve el backend a la clave del acuse. */
function claveDeRespuesta(status: number, motivo?: string): string {
  if (motivo === 'solo_root_crea_cuentas') return 'solo-root-crea'
  if (motivo === 'ultimo_root' || motivo === 'no_puede_autodegradarse') return 'ultimo-root'
  if (motivo === 'solo_root_sobre_root' || motivo === 'solo_root_asigna_root') return 'permiso'
  if (motivo === 'sin_permiso' || status === 403) return 'permiso'
  if (status === 409) return 'duplicado'
  if (status === 422) return 'password-corta'
  if (status === 503) return 'backend'
  return 'error'
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export default createController(adminRoutes.usuarios, {
  actions: {
    async index(context) {
      const user = await requireAdminUser(context.request)
      if (user instanceof Response) return user

      const data = await fetchJsonOr<{ users: UsuarioRow[] }>(context.request, '/api/users', {
        users: [],
      })

      const clave = new URL(context.request.url).searchParams.get('estado') ?? ''
      return context.render(
        <UsuariosPage user={user} users={data.users ?? []} feedback={FEEDBACK[clave]} />,
      )
    },

    async action(context) {
      const user = await requireAdminUser(context.request)
      if (user instanceof Response) return user

      const formData = await context.request.formData()
      const intent = String(formData.get('intent') ?? 'crear')
      const volver = (estado: string) =>
        redirect(`${adminRoutes.usuarios.index.href()}?estado=${estado}`)

      /** Traduce la respuesta del backend a un acuse. */
      const acusar = async (res: Response, exito: string) => {
        if (res.ok) return volver(exito)
        const data = (await res.json().catch(() => ({}))) as { motivo?: string }
        return volver(claveDeRespuesta(res.status, data.motivo))
      }

      // Las acciones sobre una cuenta concreta necesitan un id con forma de
      // UUID; sin esto el backend respondería 400 y el acuse sería confuso.
      const id = String(formData.get('id') ?? '')
      const sobreCuenta = intent !== 'crear'
      if (sobreCuenta && !UUID_RE.test(id)) return volver('error')

      if (intent === 'password') {
        const password = String(formData.get('password') ?? '')
        if (password.length < PASSWORD_MIN || password.length > PASSWORD_MAX) {
          return volver('password-corta')
        }
        return acusar(
          await backendFetch(context.request, `/api/users/${id}/password`, {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ password }),
          }),
          'password-ok',
        )
      }

      if (intent === 'rol') {
        return acusar(
          await backendFetch(context.request, `/api/users/${id}`, {
            method: 'PATCH',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ role: comoRol(formData.get('role')) }),
          }),
          'rol-ok',
        )
      }

      if (intent === 'invitacion') {
        const res = await backendFetch(context.request, `/api/users/${id}/invitation`, {
          method: 'POST',
        })
        if (res.ok) return volver('invitacion-ok')
        const data = (await res.json().catch(() => ({}))) as { motivo?: string }
        if (data.motivo === 'no_pendiente') return volver('invitacion-no-pendiente')
        if (res.status === 503) return volver('invitacion-sin-smtp')
        if (res.status === 502) return volver('invitacion-error')
        return volver(claveDeRespuesta(res.status, data.motivo))
      }

      if (intent === 'eliminar') {
        return acusar(
          await backendFetch(context.request, `/api/users/${id}`, { method: 'DELETE' }),
          'eliminada-ok',
        )
      }

      // Alta de cuenta.
      const name = String(formData.get('name') ?? '').trim()
      const email = String(formData.get('email') ?? '').trim()
      const password = String(formData.get('password') ?? '')

      if (!name || !email || password.length < PASSWORD_MIN || password.length > PASSWORD_MAX) {
        return volver('datos')
      }

      const alta = await backendFetch(context.request, '/api/users', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          name,
          email,
          password,
          role: comoRol(formData.get('role')),
        }),
      })
      if (!alta.ok) {
        const data = (await alta.json().catch(() => ({}))) as { motivo?: string }
        return volver(claveDeRespuesta(alta.status, data.motivo))
      }
      // La cuenta se creó; el acuse depende de si le llegó el correo de bienvenida.
      const cuerpo = (await alta.json().catch(() => ({}))) as {
        correo?: { enviado?: boolean; motivo?: string }
      }
      if (cuerpo.correo?.enviado === false) {
        return volver(
          cuerpo.correo.motivo === 'smtp_no_configurado' ? 'ok-sin-smtp' : 'ok-envio-fallido',
        )
      }
      return volver('ok')
    },
  },
})
