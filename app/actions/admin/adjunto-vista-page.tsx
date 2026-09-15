import type { Handle } from 'remix/ui'
import { adminRoutes } from '../../routes.ts'
import { AdminLayout } from '../../ui/admin/admin-layout.tsx'

export function AdjuntoVistaPage(
  handle: Handle<{
    user: { name: string; role: string }
    id: string
    aid: string
    origen?: string
    nombre?: string
    texto?: string
    error?: string
  }>,
) {
  return () => {
    const { user, id, aid, nombre, texto, error, origen } = handle.props
    return (
      <AdminLayout
        user={user}
        active={origen === 'fisica' ? 'participaciones-fisica' : 'participaciones-digital'}
        title={nombre || 'Vista previa del documento'}
      >
        <div class="panel">
          <p>
            <a href={adminRoutes.participacionDetalle.href({ id })}>Volver a la participación</a>
          </p>
          <h2 class="panel__title">Vista de texto</h2>
          <p class="breadcrumb">
            Esta vista muestra el texto del Word. Descarga el original para consultar imágenes,
            tablas y formato completo.
          </p>
          {error ? (
            <p role="alert">{error}</p>
          ) : (
            <div style="white-space: pre-wrap; overflow-wrap: anywhere; line-height: 1.7;">
              {texto ||
                'Este documento no contiene texto; puede incluir imágenes o páginas escaneadas.'}
            </div>
          )}
          <p>
            <a
              class="btn btn--green"
              href={`${adminRoutes.adjunto.href({ id, aid })}?download=1`}
              download
            >
              Descargar original
            </a>
          </p>
        </div>
      </AdminLayout>
    )
  }
}
