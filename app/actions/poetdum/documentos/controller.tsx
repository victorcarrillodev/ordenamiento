import { redirect } from 'remix/response/redirect'
import { createController } from 'remix/router'

import { routes } from '../../../routes.ts'
import { hubRedirect } from '../hub-redirect.ts'

export default createController(routes.poetdum.documentos, {
  actions: {
    async show(context) {
      return hubRedirect('documentos', context.request, ['tipo', 'fase'])
    },
    /**
     * Enlace de descarga de la versión anterior. Al migrar, cada documento del
     * repositorio pasó a ser un archivo de su actividad con el mismo id, así
     * que el enlace viejo lleva al mismo archivo.
     */
    archivo(context) {
      const destino = routes.poetdum.archivo.href({ aid: context.params.id })
      const descarga = new URL(context.request.url).searchParams.get('download') === '1'
      return redirect(descarga ? `${destino}?download=1` : destino, 301)
    },
  },
})
