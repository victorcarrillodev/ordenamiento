/**
 * Admin Nueva Participación Controller · ruta form()
 *   GET  /admin/participaciones/nueva → render del formulario (admin)
 *   POST /admin/participaciones/nueva → crea participación física con PDF
 */
import { redirect } from 'remix/response/redirect'
import { createController } from 'remix/router'

import { backendFetch, requireAdminUser } from '../../backend.ts'
import { adminRoutes } from '../../routes.ts'
import { NuevaPage } from './nueva-page.tsx'

export default createController(adminRoutes.participacionNueva, {
  actions: {
    async index(context) {
      const user = await requireAdminUser(context.request)
      if (user instanceof Response) return user
      return context.render(<NuevaPage user={user} />)
    },

    async action(context) {
      const user = await requireAdminUser(context.request)
      if (user instanceof Response) return user

      const formData = await context.request.formData()

      const body = new FormData()
      body.set('origen', 'fisica')
      body.set('nombre', String(formData.get('nombre') ?? ''))
      body.set('correo', String(formData.get('correo') ?? ''))
      body.set(
        'municipio',
        String(formData.get('municipio') ?? formData.get('municipio_aporte') ?? ''),
      )
      body.set('colonia', String(formData.get('colonia') ?? ''))
      body.set('calle', String(formData.get('calle') ?? ''))
      body.set('numero', String(formData.get('numero') ?? ''))
      body.set('latitud', String(formData.get('latitud') ?? ''))
      body.set('longitud', String(formData.get('longitud') ?? ''))
      body.set('fuente', String(formData.get('fuente') ?? ''))
      body.set('genero', String(formData.get('genero') ?? ''))
      body.set('tematica', String(formData.get('tematica') ?? ''))
      body.set('institucion', String(formData.get('institucion') ?? ''))
      body.set('ocupacion', String(formData.get('ocupacion') ?? ''))
      body.set('observacion', String(formData.get('observacion') ?? ''))

      const pdf = formData.get('pdf')
      if (pdf instanceof File && pdf.size > 0) {
        body.set('pdf', pdf, pdf.name)
      }

      const response = await backendFetch(context.request, '/api/participations', {
        method: 'POST',
        body,
      })
      if (!response.ok) {
        const data = (await response.json().catch(() => ({}))) as { error?: string }
        return context.render(
          <NuevaPage user={user} error={data.error ?? 'No se pudo guardar la participación'} />,
          { status: response.status },
        )
      }

      return redirect(adminRoutes.participaciones.href() + '?origen=fisica')
    },
  },
})
