import type { Handle } from 'remix/ui'

import { adminRoutes } from '../../routes.ts'
import { AdminLayout } from '../../ui/admin/admin-layout.tsx'
import { Button } from '../../ui/button.tsx'

export interface PortalActividadesPageProps {
  user: { name: string; role: string }
  actividades: Array<{
    id: string
    titulo: string
    fecha: string
    hora_inicio: string | null
    hora_fin: string | null
    lugar: string
    descripcion: string
    estado: string
    resultados: string | null
  }>
  documentos: Array<{ id: string; titulo: string }>
  error?: string
}

export function PortalActividadesPage(handle: Handle<PortalActividadesPageProps>) {
  return () => {
    const { user, actividades, documentos, error } = handle.props
    return (
      <AdminLayout user={user} active="actividades" title="Actividades POETDUM">
        <h1 class="page-title">Actividades POETDUM</h1>
        <p class="breadcrumb">
          <a href={adminRoutes.index.href()}>Vista general</a> / Actividades
        </p>

        {error ? <p class="form-error">{error}</p> : null}

        <div class="panel">
          <h2 class="panel__title">Nueva actividad</h2>
          <form method="post" encType="multipart/form-data" class="form-row" style="flex-wrap:wrap;">
            <input type="hidden" name="intent" value="crear" />
            <div class="form-field">
              <label for="titulo">Título</label>
              <input id="titulo" name="titulo" required placeholder="Taller participativo…" />
            </div>
            <div class="form-field">
              <label for="fecha">Fecha</label>
              <input id="fecha" name="fecha" type="date" required />
            </div>
            <div class="form-field">
              <label for="hora_inicio">Hora inicio</label>
              <input id="hora_inicio" name="hora_inicio" type="time" />
            </div>
            <div class="form-field">
              <label for="hora_fin">Hora fin</label>
              <input id="hora_fin" name="hora_fin" type="time" />
            </div>
            <div class="form-field">
              <label for="lugar">Lugar</label>
              <input id="lugar" name="lugar" placeholder="Casa de la cultura…" />
            </div>
            <div class="form-field">
              <label for="descripcion">Descripción</label>
              <textarea id="descripcion" name="descripcion" rows={2} />
            </div>
            <div class="form-field">
              <label for="estado">Estado</label>
              <select id="estado" name="estado">
                <option value="proxima">próxima</option>
                <option value="realizada">realizada</option>
                <option value="cancelada">cancelada</option>
              </select>
            </div>
            <div class="form-field">
              <label for="resultados">Resultados / reseña</label>
              <textarea id="resultados" name="resultados" rows={2} />
            </div>
            <div class="form-field">
              <label for="fotos">Fotos</label>
              <input id="fotos" name="fotos" type="file" multiple accept="image/*" />
            </div>
            <div class="form-field">
              <label for="documentos">Documentos relacionados</label>
              <select id="documentos" name="documentos" multiple size={4}>
                {documentos.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.titulo}
                  </option>
                ))}
              </select>
            </div>
            <Button buttonType="submit" variant="dark">
              ＋ Crear actividad
            </Button>
          </form>
        </div>

        <div class="panel">
          <h2 class="panel__title" style="margin:0;">Actividades registradas</h2>
          <div class="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Título</th>
                  <th>Fecha</th>
                  <th>Lugar</th>
                  <th>Estado</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {actividades.length === 0 ? (
                  <tr>
                    <td colspan={5} class="empty">
                      No hay actividades registradas
                    </td>
                  </tr>
                ) : (
                  actividades.map((a) => (
                    <tr key={a.id}>
                      <td>{a.titulo}</td>
                      <td>
                        {a.fecha} {a.hora_inicio ?? ''} {a.hora_fin ? `– ${a.hora_fin}` : ''}
                      </td>
                      <td>{a.lugar || '—'}</td>
                      <td>{a.estado}</td>
                      <td>
                        <form method="post" style="margin:0;">
                          <input type="hidden" name="intent" value="eliminar" />
                          <input type="hidden" name="id" value={String(a.id)} />
                          <Button buttonType="submit" variant="danger" size="sm" title="Eliminar">
                            🗑
                          </Button>
                        </form>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </AdminLayout>
    )
  }
}
