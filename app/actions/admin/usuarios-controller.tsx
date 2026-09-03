/**
 * Usuarios Controller — GET/POST de /admin/usuarios.
 *
 * La ruta es independiente de la vista general (`/admin`): esta pantalla es la
 * única que administra cuentas, y el dashboard solo enlaza a ella.
 */
import { redirect } from 'remix/response/redirect'
import { createController } from 'remix/router'

import { backendFetch, fetchJsonOr, requireAdminUser } from '../../backend.ts'
import { adminRoutes } from '../../routes.ts'
import { UsuariosPage, type UsuarioFeedback, type UsuarioRow } from './usuarios-page.tsx'

/**
 * Acuses del alta de usuario. Viajan como clave corta en la URL (redirect
 * POST → GET) para que recargar la página no reenvíe el formulario.
 */
const FEEDBACK: Record<string, UsuarioFeedback> = {
  ok: { type: 'success', message: 'La cuenta se creó correctamente.' },
  datos: {
    type: 'error',
    message: 'Faltan datos: nombre, correo y una contraseña de al menos 8 caracteres.',
  },
  duplicado: { type: 'error', message: 'Ese correo ya tiene una cuenta en el portal.' },
  backend: {
    type: 'error',
    message: 'El servicio no respondió. La cuenta no se creó; vuelve a intentarlo.',
  },
  error: {
    type: 'error',
    message: 'No se pudo crear la cuenta. Revisa los datos e intenta de nuevo.',
  },
}

function claveDeStatus(status: number): string {
  if (status === 409) return 'duplicado'
  if (status === 503) return 'backend'
  return 'error'
}

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
      const name = String(formData.get('name') ?? '').trim()
      const email = String(formData.get('email') ?? '').trim()
      const password = String(formData.get('password') ?? '')
      const role = String(formData.get('role') ?? 'user')

      const volver = (estado: string) =>
        redirect(`${adminRoutes.usuarios.index.href()}?estado=${estado}`)

      if (!name || !email || password.length < 8) {
        return volver('datos')
      }

      // Antes se ignoraba la respuesta del backend y siempre se redirigía como
      // si hubiera funcionado: un correo repetido o el backend caído dejaban al
      // administrador mirando una lista sin su usuario y sin ninguna explicación.
      const response = await backendFetch(context.request, '/api/users', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ name, email, password, role: role === 'admin' ? 'admin' : 'user' }),
      })

      return volver(response.ok ? 'ok' : claveDeStatus(response.status))
    },
  },
})
