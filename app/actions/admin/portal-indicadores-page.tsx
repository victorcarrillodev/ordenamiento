import type { Handle } from 'remix/ui'

import { AdminLayout } from '../../ui/admin/admin-layout.tsx'
import { Button } from '../../ui/button.tsx'

export interface PortalIndicadoresPageProps {
  user: { name: string; role: string }
  indicadores: Array<{
    id: string
    nombre: string
    descripcion: string
    unidad: string
    meta: number | null
    fecha_evaluacion: string | null
    resultado_texto: string | null
    documento_respaldo: { id: string; titulo: string } | null
  }>
  documentos: Array<{ id: string; titulo: string }>
  error?: string
}

export function PortalIndicadoresPage(handle: Handle<PortalIndicadoresPageProps>) {
  return () => {
    const { user, indicadores, documentos, error } = handle.props
    return (
      <AdminLayout user={user} active="indicadores" title="Indicadores POETDUM">
        {error ? <p class="form-error">{error}</p> : null}

        <div class="panel">
          <h2 class="panel__title">Nuevo indicador</h2>
          <form method="post" class="form-row" style="flex-wrap:wrap;">
            <input type="hidden" name="intent" value="crear" />
            <div class="form-field">
              <label for="nombre">Nombre</label>
              <input id="nombre" name="nombre" required placeholder="Indicador de cobertura…" />
            </div>
            <div class="form-field">
              <label for="descripcion">Descripción</label>
              <textarea id="descripcion" name="descripcion" rows={2} />
            </div>
            <div class="form-field">
              <label for="unidad">Unidad</label>
              <input id="unidad" name="unidad" placeholder="%, ha, km…" />
            </div>
            <div class="form-field">
              <label for="meta">Meta</label>
              <input id="meta" name="meta" type="number" step="any" placeholder="100" />
            </div>
            <div class="form-field">
              <label for="fecha_evaluacion">Fecha evaluación</label>
              <input
                id="fecha_evaluacion"
                name="fecha_evaluacion"
                placeholder="2026-06-01 o texto"
              />
            </div>
            <div class="form-field">
              <label for="resultado_texto">Resultado texto</label>
              <textarea id="resultado_texto" name="resultado_texto" rows={2} />
            </div>
            <div class="form-field">
              <label for="documento_respaldo">Documento respaldo</label>
              <select id="documento_respaldo" name="documento_respaldo">
                <option value="">— Sin documento —</option>
                {documentos.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.titulo}
                  </option>
                ))}
              </select>
            </div>

            <fieldset style="display:flex; gap:12px; flex-wrap:wrap; border:1px solid #e5e7eb; padding:12px; border-radius:8px; width:100%;">
              <legend style="font-size:13px; font-weight:700;">Mediciones (hasta 3)</legend>
              <div class="form-field">
                <label for="periodo_1">Periodo 1</label>
                <input id="periodo_1" name="periodo_1" placeholder="2024" />
              </div>
              <div class="form-field">
                <label for="valor_1">Valor 1</label>
                <input id="valor_1" name="valor_1" type="number" step="any" />
              </div>
              <div class="form-field">
                <label for="periodo_2">Periodo 2</label>
                <input id="periodo_2" name="periodo_2" placeholder="2025" />
              </div>
              <div class="form-field">
                <label for="valor_2">Valor 2</label>
                <input id="valor_2" name="valor_2" type="number" step="any" />
              </div>
              <div class="form-field">
                <label for="periodo_3">Periodo 3</label>
                <input id="periodo_3" name="periodo_3" placeholder="2026" />
              </div>
              <div class="form-field">
                <label for="valor_3">Valor 3</label>
                <input id="valor_3" name="valor_3" type="number" step="any" />
              </div>
            </fieldset>

            <Button buttonType="submit" variant="dark">
              ＋ Guardar indicador
            </Button>
          </form>
        </div>

        <div class="panel">
          <h2 class="panel__title" style="margin:0;">
            Indicadores registrados
          </h2>
          <div class="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Nombre</th>
                  <th>Unidad</th>
                  <th>Meta</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {indicadores.length === 0 ? (
                  <tr>
                    <td colspan={4} class="empty">
                      No hay indicadores registrados
                    </td>
                  </tr>
                ) : (
                  indicadores.map((ind) => (
                    <tr key={ind.id}>
                      <td>{ind.nombre}</td>
                      <td>{ind.unidad || '—'}</td>
                      <td>{ind.meta ?? '—'}</td>
                      <td>
                        <form method="post" style="margin:0;">
                          <input type="hidden" name="intent" value="eliminar" />
                          <input type="hidden" name="id" value={String(ind.id)} />
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
