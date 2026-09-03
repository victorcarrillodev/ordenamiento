/**
 * Mi cuenta — GET/POST de /admin/cuenta.
 *
 * Tres acciones sobre el propio perfil, distinguidas por `intent`: foto,
 * nombre y correo. El correo es el único que no se aplica al vuelto: sale una
 * verificación a la dirección nueva y hasta que se confirme no cambia nada.
 */
import { redirect } from 'remix/response/redirect'
import { createController } from 'remix/router'

import { backendFetch, fetchJsonOr, requireAdminUser } from '../../backend.ts'
import { adminRoutes } from '../../routes.ts'
import { PASSWORD_MAX } from '../../ui/login/types.ts'
import { CuentaPage, type CuentaFeedback, type UserProfile } from './cuenta-page.tsx'
import type { SesionRegistrada } from './sesiones-page.tsx'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/** Cuántas sesiones propias se muestran en la pantalla. */
const SESIONES_VISIBLES = 5

const FEEDBACK: Record<string, CuentaFeedback> = {
  'avatar-ok': { type: 'success', message: 'Tu foto de perfil se actualizó.' },
  'avatar-vacio': { type: 'error', message: 'Elige una imagen antes de subirla.' },
  'avatar-error': {
    type: 'error',
    message: 'No se pudo guardar la foto. Debe ser JPG, PNG, WEBP o GIF y pesar menos de 5 MB.',
  },
  'nombre-ok': { type: 'success', message: 'Tu nombre se actualizó.' },
  'nombre-corto': { type: 'error', message: 'El nombre debe tener al menos 2 caracteres.' },
  'nombre-error': { type: 'error', message: 'No se pudo guardar el nombre. Intenta de nuevo.' },
  'correo-invalido': { type: 'error', message: 'Escribe un correo electrónico válido.' },
  'correo-igual': { type: 'error', message: 'Ese ya es el correo de tu cuenta.' },
  'correo-ocupado': { type: 'error', message: 'Ese correo ya está registrado por otra cuenta.' },
  'correo-password': {
    type: 'error',
    message: 'La contraseña actual no es correcta. El correo no se cambió.',
  },
  'correo-sinmail': {
    type: 'error',
    message:
      'El servidor no tiene configurado el envío de correo, así que no se puede verificar la dirección nueva.',
  },
  'correo-limite': {
    type: 'error',
    message: 'Ya se pidieron varios cambios seguidos. Espera unos minutos.',
  },
  'correo-error': {
    type: 'error',
    message: 'No se pudo enviar la verificación. Intenta de nuevo en un momento.',
  },
}

/** Traduce el motivo que devuelve el backend a la clave del acuse. */
function claveCorreo(status: number, motivo?: string): string {
  if (status === 429) return 'correo-limite'
  if (status === 503) return 'correo-sinmail'
  if (motivo === 'email_invalido') return 'correo-invalido'
  if (motivo === 'email_igual') return 'correo-igual'
  if (motivo === 'email_ocupado') return 'correo-ocupado'
  if (motivo === 'password_incorrecta') return 'correo-password'
  return 'correo-error'
}

export default createController(adminRoutes.cuenta, {
  actions: {
    async index(context) {
      const user = await requireAdminUser(context.request)
      if (user instanceof Response) return user

      const [perfil, sesiones] = await Promise.all([
        fetchJsonOr<{ user: UserProfile | null }>(context.request, '/api/users/me', { user: null }),
        fetchJsonOr<{ items: SesionRegistrada[] }>(
          context.request,
          `/api/sessions?limit=${SESIONES_VISIBLES}`,
          { items: [] },
        ),
      ])

      const params = new URL(context.request.url).searchParams
      const estado = params.get('estado') ?? ''
      // El correo pendiente se refleja para que se detecte un dedazo. Se
      // muestra solo si tiene forma de correo: es un valor que viene de la URL.
      const pendienteParam = params.get('a') ?? ''
      const pendiente = EMAIL_RE.test(pendienteParam) ? pendienteParam : undefined

      // La bitácora completa es solo para administradores; aquí cada quien ve
      // únicamente sus propias sesiones.
      const mias = (sesiones.items ?? []).filter((s) => s.user_id === user.id)

      return context.render(
        <CuentaPage
          user={user}
          profile={perfil.user}
          feedback={FEEDBACK[estado]}
          correoPendiente={estado === 'correo-enviado' ? pendiente : undefined}
          sesiones={mias}
        />,
      )
    },

    async action(context) {
      const user = await requireAdminUser(context.request)
      if (user instanceof Response) return user

      const formData = await context.request.formData()
      const intent = String(formData.get('intent') ?? '')
      const volver = (estado: string, extra = '') =>
        redirect(`${adminRoutes.cuenta.index.href()}?estado=${estado}${extra}`)

      if (intent === 'nombre') {
        const name = String(formData.get('name') ?? '').trim()
        if (name.length < 2) return volver('nombre-corto')

        const res = await backendFetch(context.request, '/api/users/me', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ name }),
        })
        return volver(res.ok ? 'nombre-ok' : 'nombre-error')
      }

      if (intent === 'correo') {
        const email = String(formData.get('email') ?? '').trim()
        const password = String(formData.get('password') ?? '')
        if (!EMAIL_RE.test(email)) return volver('correo-invalido')
        // El tope evita mandar al backend una contraseña de tamaño arbitrario
        // solo para que la rechace tras haberla procesado.
        if (!password || password.length > PASSWORD_MAX) return volver('correo-password')

        const res = await backendFetch(context.request, '/api/users/me/email', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ email, password }),
        })
        if (res.ok) return volver('correo-enviado', `&a=${encodeURIComponent(email)}`)

        const data = (await res.json().catch(() => ({}))) as { motivo?: string }
        return volver(claveCorreo(res.status, data.motivo))
      }

      // Por omisión, la foto de perfil.
      const file = formData.get('avatar') as unknown as File | null
      if (!(file instanceof File) || file.size === 0) return volver('avatar-vacio')

      const fd = new FormData()
      fd.append('avatar', file, file.name)
      const res = await backendFetch(context.request, '/api/users/me/avatar', {
        method: 'POST',
        body: fd,
      })
      return volver(res.ok ? 'avatar-ok' : 'avatar-error')
    },
  },
})
