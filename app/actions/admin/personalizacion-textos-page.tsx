import type { Handle } from 'remix/ui'
import { AdminAlert } from '../../ui/admin/alert.tsx'
import { AdminLayout } from '../../ui/admin/admin-layout.tsx'
import { adminRoutes, routes } from '../../routes.ts'
import { Button } from '../../ui/button.tsx'
import { Icon } from '../../ui/admin/icon.tsx'
import type { ThemeData } from '../../ui/civic-horizon.ts'
import { GRUPOS_TEXTOS } from './personalizacion-textos-defs.ts'

export interface PersonalizacionTextosPageProps {
  user: { name: string; role: string }
  theme: ThemeData
  mensaje?: string
  error?: string
}

export function PersonalizacionTextosPage(handle: Handle<PersonalizacionTextosPageProps>) {
  return () => {
    const { user, theme, mensaje, error } = handle.props
    const txt = theme?.usuario?.textos || {}

    return (
      <AdminLayout
        user={user}
        active="personalizacion"
        title="Textos del portal"
        subtitle="Edita todos los textos visibles del portal ciudadano, agrupados por sección. Los campos vacíos muestran el texto por defecto. Los cambios tardan hasta 30 segundos en reflejarse (caché del tema)."
        theme={theme?.panel}
        actions={
          <>
            <Button
              href={routes.home.href()}
              target="_blank"
              rel="noreferrer"
              variant="secondary"
              icon={<Icon name="mdi:open-in-new" size={16} />}
            >
              Ver portal en vivo
            </Button>
            <Button
              href={adminRoutes.personalizacion.index.href()}
              variant="secondary"
              icon={<Icon name="mdi:arrow-left" size={16} />}
            >
              Volver a personalización
            </Button>
          </>
        }
      >
        <div class="textos">
          {mensaje && <AdminAlert type="success" message={mensaje} />}
          {error && <AdminAlert type="error" message={error} />}

          <form method="post" action={adminRoutes.personalizacionTextos.index.href()}>
            <input type="hidden" name="section" value="usuario" />

            {GRUPOS_TEXTOS.map((g) => (
              <div class="panel" key={g.id}>
                <h3 class="panel__title">{g.titulo}</h3>
                <div class="textos__grid">
                  {g.campos.map((c) => (
                    <div
                      class="form-field"
                      key={c.name}
                      style={c.full ? 'grid-column: 1 / -1;' : undefined}
                    >
                      <label style="font-weight: 700; font-size: 12px; color: #475569;">
                        {c.label}
                      </label>
                      <textarea
                        name={c.name}
                        rows={c.rows}
                        value={txt[c.key] || ''}
                        style="border: 1px solid #cbd5e1; border-radius: 6px; padding: 8px 10px; font-size: 13px; width: 100%;"
                      />
                    </div>
                  ))}
                </div>
              </div>
            ))}

            <div class="panel panel--destacado">
              <div style="display: flex; flex-direction: column; gap: 12px;">
                <div>
                  <label style="font-weight: 800; font-size: 14px; color: #1e293b; display: flex; align-items: center; gap: 6px;">
                    <span>📝</span> Motivo del Cambio{' '}
                    <span style="color: #dc2626; font-size: 12px;">
                      (Obligatorio para la Bitácora de Seguridad)
                    </span>
                  </label>
                  <p style="font-size: 12px; color: #64748b; margin: 4px 0 8px;">
                    Indica brevemente por qué realizas este cambio (se guardará tu nombre, fecha y
                    hora).
                  </p>
                  <input
                    type="text"
                    id="motivo-input-textos"
                    name="motivo"
                    required
                    placeholder="Ej. Actualización de textos del portal / corrección de redacción"
                    style="width: 100%; border: 1.5px solid #cbd5e1; border-radius: 8px; padding: 10px 14px; font-size: 14px;"
                  />
                </div>

                <div style="display: flex; gap: 8px; flex-wrap: wrap;">
                  <span style="font-size: 12px; color: #64748b; align-self: center;">
                    Sugerencias rápidas:
                  </span>
                  <button
                    type="button"
                    class="btn motivo-suggest"
                    data-motivo="Actualización de textos del portal"
                    style="background: #e2e8f0; color: #334155; padding: 4px 10px; font-size: 11px; border-radius: 999px;"
                  >
                    Actualización de textos
                  </button>
                  <button
                    type="button"
                    class="btn motivo-suggest"
                    data-motivo="Corrección de redacción"
                    style="background: #e2e8f0; color: #334155; padding: 4px 10px; font-size: 11px; border-radius: 999px;"
                  >
                    Corrección de redacción
                  </button>
                  <button
                    type="button"
                    class="btn motivo-suggest"
                    data-motivo="Alineación con el Programa publicado"
                    style="background: #e2e8f0; color: #334155; padding: 4px 10px; font-size: 11px; border-radius: 999px;"
                  >
                    Alineación con el Programa
                  </button>
                </div>

                <div style="display: flex; justify-content: flex-end; gap: 12px; margin-top: 10px;">
                  <Button buttonType="submit" variant="primary" size="lg">
                    💾 Guardar textos del portal
                  </Button>
                </div>
              </div>
            </div>
          </form>
        </div>
      </AdminLayout>
    )
  }
}
