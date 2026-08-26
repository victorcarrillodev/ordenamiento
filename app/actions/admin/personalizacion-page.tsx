import type { Handle } from 'remix/ui'
import { AdminLayout } from '../../ui/admin/admin-layout.tsx'
import { adminRoutes, routes } from '../../routes.ts'
import { Button } from '../../ui/button.tsx'
import type { ThemeData } from '../../ui/civic-horizon.ts'

export interface AuditLogEntry {
  id: number
  user_name: string
  user_email: string
  motivo: string
  section: string
  created_at: string
}

export interface PersonalizacionPageProps {
  user: { name: string; role: string }
  theme: ThemeData
  auditLogs: AuditLogEntry[]
  mensaje?: string
  error?: string
  tabActiva?: 'usuario' | 'panel' | 'historial'
}

/**
 * Este framework tipa los elementos host de forma estricta y no modela
 * atributos de evento inline (onclick/onchange/onerror) — la vía tipada
 * para interactividad es el mixin `on()` sobre un componente hidratado con
 * `clientEntry` (ver .agents/skills/remix/references/mixins-styling-events.md
 * y hydration-frames-navigation.md). Esta página se sirve como HTML
 * estático (no hidrata), así que usa esos atributos tal cual: el renderer
 * SSR los escribe igual que cualquier atributo no reconocido, escapados
 * con `escapeHtml()` (ver
 * node_modules/@remix-run/ui/dist/server/stream.js, función
 * `renderAttributes`), por lo que funcionan en el navegador exactamente
 * igual que en HTML plano. Este helper documenta esa única excepción en un
 * solo lugar en vez de repetir `as any` en cada botón/input.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function domEvents(attrs: Partial<Record<'onclick' | 'onchange' | 'onerror', string>>): any {
  return attrs
}

export function PersonalizacionPage(handle: Handle<PersonalizacionPageProps>) {
  return () => {
    const { user, theme, auditLogs, mensaje, error, tabActiva = 'usuario' } = handle.props
    const u = theme?.usuario || {}
    const p = theme?.panel || {}
    const c = u.colores || {}
    const img = u.imagenes || {}
    const ico = u.iconos || {}
    const txt = u.textos || {}
    const heroImgs: string[] =
      Array.isArray(img.heroImagenes) && img.heroImagenes.length > 0
        ? img.heroImagenes
        : [
            'https://imgs.search.brave.com/8f1SgJygGgIrQH2BcZXess4TRcaOtm3FXVfawE9VxRE/rs:fit:860:0:0:0/g:ce/aHR0cHM6Ly9tZWRp/YS5pc3RvY2twaG90/by5jb20vaWQvMTEy/NTUyNzc3Mi9lcy9m/b3RvL3RsYXF1ZXBh/cXVlLmpwZz9zPTYx/Mng2MTImdz0wJms9/MjAmYz1VU3FwdjNw/OEJxbG9LY0JaY01q/YUdPNkpQWW1Va0xl/N1FYUGx5YVREM1Zz/PQ',
          ]

    return (
      <AdminLayout
        user={user}
        active="personalizacion"
        title="Personalización y Marca"
        theme={theme?.panel}
      >
        <div style="max-width: 1200px; margin: 0 auto;">
          {/* Header */}
          <div style="display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 16px; margin-bottom: 24px;">
            <div>
              <h1
                class="page-title"
                style="font-size: 24px; font-weight: 800; color: #1e293b; margin: 0 0 6px;"
              >
                🎨 Personalización y Marca
              </h1>
              <p style="color: #64748b; font-size: 14px; margin: 0;">
                Cambia fácilmente colores, logotipos, carrusel de fotos, íconos y textos del portal
                y del panel administrativo.
              </p>
            </div>

            <div style="display: flex; gap: 10px; align-items: center;">
              <Button
                href={routes.home.href()}
                target="_blank"
                rel="noreferrer"
                variant="dark"
                icon={<span>🌐</span>}
              >
                Ver Portal en Vivo
              </Button>
              <Button
                buttonType="button"
                id="btn-open-preview"
                variant="primary"
                icon={<span>👁️</span>}
                {...domEvents({
                  onclick: "document.getElementById('mini-preview-modal').style.display='flex';",
                })}
              >
                Previsualizar (Mini Página)
              </Button>
            </div>
          </div>

          {/* Feedback messages */}
          {mensaje && (
            <div style="background: #dcfce7; border: 1px solid #86efac; color: #166534; padding: 14px 18px; border-radius: 10px; margin-bottom: 20px; font-size: 14px; font-weight: 600; display: flex; align-items: center; gap: 10px;">
              <span>✅</span> {mensaje}
            </div>
          )}
          {error && (
            <div style="background: #fee2e2; border: 1px solid #fca5a5; color: #991b1b; padding: 14px 18px; border-radius: 10px; margin-bottom: 20px; font-size: 14px; font-weight: 600; display: flex; align-items: center; gap: 10px;">
              <span>⚠️</span> {error}
            </div>
          )}

          {/* Tabs Navigation */}
          <div style="display: flex; gap: 8px; border-bottom: 2px solid #e2e8f0; margin-bottom: 24px; overflow-x: auto;">
            <button
              type="button"
              class="tab-btn"
              style={`padding: 12px 20px; font-size: 14px; font-weight: 700; border: none; background: transparent; cursor: pointer; border-bottom: 3px solid ${tabActiva === 'usuario' ? '#2563eb' : 'transparent'}; color: ${tabActiva === 'usuario' ? '#2563eb' : '#64748b'}; display: flex; align-items: center; gap: 8px;`}
              {...domEvents({ onclick: "window.location.search = '?tab=usuario'" })}
            >
              <span>👤</span> Vista de Usuario (Portal Ciudadano)
            </button>
            <button
              type="button"
              class="tab-btn"
              style={`padding: 12px 20px; font-size: 14px; font-weight: 700; border: none; background: transparent; cursor: pointer; border-bottom: 3px solid ${tabActiva === 'panel' ? '#2563eb' : 'transparent'}; color: ${tabActiva === 'panel' ? '#2563eb' : '#64748b'}; display: flex; align-items: center; gap: 8px;`}
              {...domEvents({ onclick: "window.location.search = '?tab=panel'" })}
            >
              <span>⚙️</span> Vista de Panel (Admin)
            </button>
            <button
              type="button"
              class="tab-btn"
              style={`padding: 12px 20px; font-size: 14px; font-weight: 700; border: none; background: transparent; cursor: pointer; border-bottom: 3px solid ${tabActiva === 'historial' ? '#2563eb' : 'transparent'}; color: ${tabActiva === 'historial' ? '#2563eb' : '#64748b'}; display: flex; align-items: center; gap: 8px;`}
              {...domEvents({ onclick: "window.location.search = '?tab=historial'" })}
            >
              <span>📜</span> Historial y Auditoría ({auditLogs.length})
            </button>
          </div>

          {/* TAB 1: VISTA DE USUARIO */}
          {tabActiva === 'usuario' && (
            <form
              method="post"
              action={adminRoutes.personalizacion.index.href()}
              enctype="multipart/form-data"
              style="display: flex; flex-direction: column; gap: 24px;"
            >
              <input type="hidden" name="section" value="usuario" />
              <input type="hidden" name="tab" value="usuario" />

              {/* PALETAS PREDEFINIDAS */}
              <div
                class="panel"
                style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px;"
              >
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; flex-wrap: wrap; gap: 8px;">
                  <div>
                    <h3 style="font-size: 16px; font-weight: 800; color: #1e293b; margin: 0 0 4px;">
                      🎨 Paletas Rápidas en 1 Clic (Para Dummies)
                    </h3>
                    <p style="font-size: 13px; color: #64748b; margin: 0;">
                      Haz clic en un estilo para aplicar automáticamente colores armoniosos y
                      profesionales.
                    </p>
                  </div>
                </div>

                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 12px;">
                  <button
                    type="button"
                    style="padding: 12px; border: 1.5px solid #cbd5e1; border-radius: 10px; background: #ffffff; cursor: pointer; text-align: left; display: flex; flex-direction: column; gap: 8px; transition: transform 150ms ease;"
                    {...domEvents({
                      onclick: `
                      document.getElementById('c-primario').value = '#8c1d3d';
                      document.getElementById('c-acento').value = '#e0b84a';
                      document.getElementById('c-secundario').value = '#2d6a4f';
                      document.getElementById('c-nav-bg').value = '#ffffff';
                      document.getElementById('c-nav-text').value = '#1a1d26';
                      document.getElementById('c-footer-bg').value = '#0f1117';
                      document.getElementById('c-footer-text').value = '#ffffff';
                    `,
                    })}
                  >
                    <div style="display: flex; gap: 6px;">
                      <span style="width: 24px; height: 24px; border-radius: 6px; background: #8c1d3d;"></span>
                      <span style="width: 24px; height: 24px; border-radius: 6px; background: #e0b84a;"></span>
                      <span style="width: 24px; height: 24px; border-radius: 6px; background: #2d6a4f;"></span>
                      <span style="width: 24px; height: 24px; border-radius: 6px; background: #0f1117;"></span>
                    </div>
                    <div>
                      <strong style="font-size: 13px; color: #1e293b;">Tlaquepaque Oficial</strong>
                      <div style="font-size: 11px; color: #64748b;">
                        Vino institucional, oro y verde
                      </div>
                    </div>
                  </button>

                  <button
                    type="button"
                    style="padding: 12px; border: 1.5px solid #cbd5e1; border-radius: 10px; background: #ffffff; cursor: pointer; text-align: left; display: flex; flex-direction: column; gap: 8px; transition: transform 150ms ease;"
                    {...domEvents({
                      onclick: `
                      document.getElementById('c-primario').value = '#1b4332';
                      document.getElementById('c-acento').value = '#52b788';
                      document.getElementById('c-secundario').value = '#2d6a4f';
                      document.getElementById('c-nav-bg').value = '#ffffff';
                      document.getElementById('c-nav-text').value = '#081c15';
                      document.getElementById('c-footer-bg').value = '#081c15';
                      document.getElementById('c-footer-text').value = '#d8f3dc';
                    `,
                    })}
                  >
                    <div style="display: flex; gap: 6px;">
                      <span style="width: 24px; height: 24px; border-radius: 6px; background: #1b4332;"></span>
                      <span style="width: 24px; height: 24px; border-radius: 6px; background: #52b788;"></span>
                      <span style="width: 24px; height: 24px; border-radius: 6px; background: #2d6a4f;"></span>
                      <span style="width: 24px; height: 24px; border-radius: 6px; background: #081c15;"></span>
                    </div>
                    <div>
                      <strong style="font-size: 13px; color: #1e293b;">Bosque Ecológico</strong>
                      <div style="font-size: 11px; color: #64748b;">
                        Verde esmeralda y menta natural
                      </div>
                    </div>
                  </button>

                  <button
                    type="button"
                    style="padding: 12px; border: 1.5px solid #cbd5e1; border-radius: 10px; background: #ffffff; cursor: pointer; text-align: left; display: flex; flex-direction: column; gap: 8px; transition: transform 150ms ease;"
                    {...domEvents({
                      onclick: `
                      document.getElementById('c-primario').value = '#1e3a8a';
                      document.getElementById('c-acento').value = '#38bdf8';
                      document.getElementById('c-secundario').value = '#0d9488';
                      document.getElementById('c-nav-bg').value = '#ffffff';
                      document.getElementById('c-nav-text').value = '#0f172a';
                      document.getElementById('c-footer-bg').value = '#0f172a';
                      document.getElementById('c-footer-text').value = '#e2e8f0';
                    `,
                    })}
                  >
                    <div style="display: flex; gap: 6px;">
                      <span style="width: 24px; height: 24px; border-radius: 6px; background: #1e3a8a;"></span>
                      <span style="width: 24px; height: 24px; border-radius: 6px; background: #38bdf8;"></span>
                      <span style="width: 24px; height: 24px; border-radius: 6px; background: #0d9488;"></span>
                      <span style="width: 24px; height: 24px; border-radius: 6px; background: #0f172a;"></span>
                    </div>
                    <div>
                      <strong style="font-size: 13px; color: #1e293b;">Azul Metropolitano</strong>
                      <div style="font-size: 11px; color: #64748b;">
                        Azul marino, zafiro y celeste
                      </div>
                    </div>
                  </button>

                  <button
                    type="button"
                    style="padding: 12px; border: 1.5px solid #cbd5e1; border-radius: 10px; background: #ffffff; cursor: pointer; text-align: left; display: flex; flex-direction: column; gap: 8px; transition: transform 150ms ease;"
                    {...domEvents({
                      onclick: `
                      document.getElementById('c-primario').value = '#4c0519';
                      document.getElementById('c-acento').value = '#fbbf24';
                      document.getElementById('c-secundario').value = '#b45309';
                      document.getElementById('c-nav-bg').value = '#18181b';
                      document.getElementById('c-nav-text').value = '#ffffff';
                      document.getElementById('c-footer-bg').value = '#09090b';
                      document.getElementById('c-footer-text').value = '#fafafa';
                    `,
                    })}
                  >
                    <div style="display: flex; gap: 6px;">
                      <span style="width: 24px; height: 24px; border-radius: 6px; background: #4c0519;"></span>
                      <span style="width: 24px; height: 24px; border-radius: 6px; background: #fbbf24;"></span>
                      <span style="width: 24px; height: 24px; border-radius: 6px; background: #18181b;"></span>
                      <span style="width: 24px; height: 24px; border-radius: 6px; background: #09090b;"></span>
                    </div>
                    <div>
                      <strong style="font-size: 13px; color: #1e293b;">Noche Elegante</strong>
                      <div style="font-size: 11px; color: #64748b;">
                        Oscuro profundo y destellos oro
                      </div>
                    </div>
                  </button>
                </div>
              </div>

              {/* SECCION COLORES DEL PORTAL */}
              <div
                class="panel"
                style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px;"
              >
                <h3 style="font-size: 16px; font-weight: 800; color: #1e293b; margin: 0 0 16px;">
                  1. Colores del Portal Ciudadano
                </h3>
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 16px;">
                  <div class="form-field">
                    <label style="font-weight: 700; font-size: 12px; color: #475569;">
                      Color Primario (Botones / Encabezados)
                    </label>
                    <div style="display: flex; gap: 8px; align-items: center;">
                      <input
                        type="color"
                        id="c-primario"
                        name="color_primario"
                        value={c.primario || '#8c1d3d'}
                        style="width: 44px; height: 38px; border: 1px solid #cbd5e1; border-radius: 6px; padding: 2px; cursor: pointer;"
                      />
                      <input
                        type="text"
                        value={c.primario || '#8c1d3d'}
                        {...domEvents({
                          onchange: "document.getElementById('c-primario').value = this.value;",
                        })}
                        style="flex: 1; border: 1px solid #cbd5e1; border-radius: 6px; padding: 8px 10px; font-family: monospace; font-size: 13px;"
                      />
                    </div>
                  </div>

                  <div class="form-field">
                    <label style="font-weight: 700; font-size: 12px; color: #475569;">
                      Color de Acento (Dorado / Resaltados)
                    </label>
                    <div style="display: flex; gap: 8px; align-items: center;">
                      <input
                        type="color"
                        id="c-acento"
                        name="color_acento"
                        value={c.acento || '#e0b84a'}
                        style="width: 44px; height: 38px; border: 1px solid #cbd5e1; border-radius: 6px; padding: 2px; cursor: pointer;"
                      />
                      <input
                        type="text"
                        value={c.acento || '#e0b84a'}
                        {...domEvents({
                          onchange: "document.getElementById('c-acento').value = this.value;",
                        })}
                        style="flex: 1; border: 1px solid #cbd5e1; border-radius: 6px; padding: 8px 10px; font-family: monospace; font-size: 13px;"
                      />
                    </div>
                  </div>

                  <div class="form-field">
                    <label style="font-weight: 700; font-size: 12px; color: #475569;">
                      Color Secundario (Ecología)
                    </label>
                    <div style="display: flex; gap: 8px; align-items: center;">
                      <input
                        type="color"
                        id="c-secundario"
                        name="color_secundario"
                        value={c.secundario || '#2d6a4f'}
                        style="width: 44px; height: 38px; border: 1px solid #cbd5e1; border-radius: 6px; padding: 2px; cursor: pointer;"
                      />
                      <input
                        type="text"
                        value={c.secundario || '#2d6a4f'}
                        {...domEvents({
                          onchange: "document.getElementById('c-secundario').value = this.value;",
                        })}
                        style="flex: 1; border: 1px solid #cbd5e1; border-radius: 6px; padding: 8px 10px; font-family: monospace; font-size: 13px;"
                      />
                    </div>
                  </div>

                  <div class="form-field">
                    <label style="font-weight: 700; font-size: 12px; color: #475569;">
                      Fondo del Navbar
                    </label>
                    <div style="display: flex; gap: 8px; align-items: center;">
                      <input
                        type="color"
                        id="c-nav-bg"
                        name="color_navbar_fondo"
                        value={c.navbarFondo || '#ffffff'}
                        style="width: 44px; height: 38px; border: 1px solid #cbd5e1; border-radius: 6px; padding: 2px; cursor: pointer;"
                      />
                      <input
                        type="text"
                        value={c.navbarFondo || '#ffffff'}
                        {...domEvents({
                          onchange: "document.getElementById('c-nav-bg').value = this.value;",
                        })}
                        style="flex: 1; border: 1px solid #cbd5e1; border-radius: 6px; padding: 8px 10px; font-family: monospace; font-size: 13px;"
                      />
                    </div>
                  </div>

                  <div class="form-field">
                    <label style="font-weight: 700; font-size: 12px; color: #475569;">
                      Texto del Navbar
                    </label>
                    <div style="display: flex; gap: 8px; align-items: center;">
                      <input
                        type="color"
                        id="c-nav-text"
                        name="color_navbar_texto"
                        value={c.navbarTexto || '#1a1d26'}
                        style="width: 44px; height: 38px; border: 1px solid #cbd5e1; border-radius: 6px; padding: 2px; cursor: pointer;"
                      />
                      <input
                        type="text"
                        value={c.navbarTexto || '#1a1d26'}
                        {...domEvents({
                          onchange: "document.getElementById('c-nav-text').value = this.value;",
                        })}
                        style="flex: 1; border: 1px solid #cbd5e1; border-radius: 6px; padding: 8px 10px; font-family: monospace; font-size: 13px;"
                      />
                    </div>
                  </div>

                  <div class="form-field">
                    <label style="font-weight: 700; font-size: 12px; color: #475569;">
                      Fondo del Footer
                    </label>
                    <div style="display: flex; gap: 8px; align-items: center;">
                      <input
                        type="color"
                        id="c-footer-bg"
                        name="color_footer_fondo"
                        value={c.footerFondo || '#0f1117'}
                        style="width: 44px; height: 38px; border: 1px solid #cbd5e1; border-radius: 6px; padding: 2px; cursor: pointer;"
                      />
                      <input
                        type="text"
                        value={c.footerFondo || '#0f1117'}
                        {...domEvents({
                          onchange: "document.getElementById('c-footer-bg').value = this.value;",
                        })}
                        style="flex: 1; border: 1px solid #cbd5e1; border-radius: 6px; padding: 8px 10px; font-family: monospace; font-size: 13px;"
                      />
                    </div>
                  </div>

                  <div class="form-field">
                    <label style="font-weight: 700; font-size: 12px; color: #475569;">
                      Texto del Footer
                    </label>
                    <div style="display: flex; gap: 8px; align-items: center;">
                      <input
                        type="color"
                        id="c-footer-text"
                        name="color_footer_texto"
                        value={c.footerTexto || '#ffffff'}
                        style="width: 44px; height: 38px; border: 1px solid #cbd5e1; border-radius: 6px; padding: 2px; cursor: pointer;"
                      />
                      <input
                        type="text"
                        value={c.footerTexto || '#ffffff'}
                        {...domEvents({
                          onchange: "document.getElementById('c-footer-text').value = this.value;",
                        })}
                        style="flex: 1; border: 1px solid #cbd5e1; border-radius: 6px; padding: 8px 10px; font-family: monospace; font-size: 13px;"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* SECCION HERO CAROUSEL Y FOTOS */}
              <div
                class="panel"
                style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px;"
              >
                <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 14px; flex-wrap: wrap; gap: 10px;">
                  <div>
                    <h3 style="font-size: 16px; font-weight: 800; color: #1e293b; margin: 0 0 4px;">
                      2. Fotos del Hero (Fondo Principal con Carrusel Automático)
                    </h3>
                    <p style="font-size: 13px; color: #64748b; margin: 0;">
                      💡 <strong>Super poder:</strong> Si agregas 1 foto se muestra fija. Si agregas{' '}
                      <strong>2 o más fotos</strong>, el fondo del Hero se convierte en un{' '}
                      <strong>Carrusel interactivo</strong> automático con transiciones suaves.
                    </p>
                  </div>
                  <button
                    type="button"
                    style="background: #e0f2fe; color: #0284c7; border: 1px solid #bae6fd; padding: 8px 14px; border-radius: 8px; font-size: 12px; font-weight: 700; cursor: pointer;"
                    {...domEvents({ onclick: 'addHeroImageInput()' })}
                  >
                    ➕ Agregar otra foto al carrusel
                  </button>
                </div>

                <div
                  id="hero-images-container"
                  style="display: flex; flex-direction: column; gap: 12px; margin-bottom: 16px;"
                >
                  {heroImgs.map((imgUrl, idx) => (
                    <div
                      class="hero-image-row"
                      style="display: flex; gap: 10px; align-items: center; background: #f8fafc; padding: 10px; border-radius: 8px; border: 1px solid #e2e8f0;"
                    >
                      <span style="font-size: 12px; font-weight: 800; color: #64748b; width: 60px;">
                        Foto #{idx + 1}
                      </span>
                      <img
                        src={imgUrl}
                        alt={`Foto ${idx + 1}`}
                        style="width: 50px; height: 35px; object-fit: cover; border-radius: 4px; border: 1px solid #cbd5e1;"
                        {...domEvents({ onerror: "this.style.display='none'" })}
                      />
                      <input
                        type="text"
                        name="hero_imagenes[]"
                        value={imgUrl}
                        placeholder="https://ejemplo.com/foto.jpg o /ordena/images/foto.jpg"
                        style="flex: 1; border: 1px solid #cbd5e1; border-radius: 6px; padding: 8px 10px; font-size: 13px;"
                      />
                      {idx > 0 && (
                        <button
                          type="button"
                          style="background: #fee2e2; color: #b91c1c; border: none; border-radius: 6px; padding: 8px 12px; font-size: 12px; font-weight: 700; cursor: pointer;"
                          {...domEvents({ onclick: 'this.parentElement.remove();' })}
                        >
                          ✕ Quitar
                        </button>
                      )}
                    </div>
                  ))}
                </div>

                {/* Subir archivo de imagen para el Hero */}
                <div style="background: #f1f5f9; padding: 12px; border-radius: 8px; border: 1px dashed #94a3b8; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 10px;">
                  <div>
                    <strong style="font-size: 13px; color: #334155;">
                      ¿Prefieres subir una foto desde tu computadora?
                    </strong>
                    <div style="font-size: 11px; color: #64748b;">
                      Se guardará en el servidor y se sumará al carrusel automáticamente.
                    </div>
                  </div>
                  <input
                    type="file"
                    name="archivo_hero"
                    accept="image/*"
                    style="font-size: 12px;"
                  />
                </div>
              </div>

              {/* SECCION LOGOS E IMAGENES */}
              <div
                class="panel"
                style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px;"
              >
                <h3 style="font-size: 16px; font-weight: 800; color: #1e293b; margin: 0 0 16px;">
                  3. Logotipos e Imágenes Secundarias
                </h3>
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 16px;">
                  {/* Logo Navbar */}
                  <div
                    class="form-field"
                    style="background: #f8fafc; padding: 14px; border-radius: 8px; border: 1px solid #e2e8f0;"
                  >
                    <label style="font-weight: 700; font-size: 13px; color: #1e293b; margin-bottom: 6px;">
                      Logo del Navbar (Encabezado)
                    </label>
                    <div style="display: flex; gap: 10px; align-items: center; margin-bottom: 8px;">
                      {img.logoNavbar && (
                        <img
                          src={img.logoNavbar}
                          alt="Logo Navbar"
                          style="max-height: 40px; max-width: 100px; object-fit: contain; background: #fff; padding: 4px; border-radius: 4px; border: 1px solid #e2e8f0;"
                        />
                      )}
                      <input
                        type="text"
                        name="logo_navbar"
                        value={img.logoNavbar || ''}
                        placeholder="URL del logo"
                        style="flex: 1; border: 1px solid #cbd5e1; border-radius: 6px; padding: 8px 10px; font-size: 13px;"
                      />
                    </div>
                    <div style="font-size: 11px; color: #64748b; margin-bottom: 6px;">
                      O subir imagen nueva:
                    </div>
                    <input
                      type="file"
                      name="archivo_logo_navbar"
                      accept="image/*"
                      style="font-size: 12px;"
                    />
                  </div>

                  {/* Logo Footer */}
                  <div
                    class="form-field"
                    style="background: #f8fafc; padding: 14px; border-radius: 8px; border: 1px solid #e2e8f0;"
                  >
                    <label style="font-weight: 700; font-size: 13px; color: #1e293b; margin-bottom: 6px;">
                      Logo del Footer (Pie de Página)
                    </label>
                    <div style="display: flex; gap: 10px; align-items: center; margin-bottom: 8px;">
                      {img.logoFooter && (
                        <img
                          src={img.logoFooter}
                          alt="Logo Footer"
                          style="max-height: 40px; max-width: 100px; object-fit: contain; background: #fff; padding: 4px; border-radius: 4px; border: 1px solid #e2e8f0;"
                        />
                      )}
                      <input
                        type="text"
                        name="logo_footer"
                        value={img.logoFooter || ''}
                        placeholder="URL del logo footer (opcional)"
                        style="flex: 1; border: 1px solid #cbd5e1; border-radius: 6px; padding: 8px 10px; font-size: 13px;"
                      />
                    </div>
                    <div style="font-size: 11px; color: #64748b; margin-bottom: 6px;">
                      O subir imagen nueva:
                    </div>
                    <input
                      type="file"
                      name="archivo_logo_footer"
                      accept="image/*"
                      style="font-size: 12px;"
                    />
                  </div>

                  {/* Imagen Ecología */}
                  <div
                    class="form-field"
                    style="background: #f8fafc; padding: 14px; border-radius: 8px; border: 1px solid #e2e8f0;"
                  >
                    <label style="font-weight: 700; font-size: 13px; color: #1e293b; margin-bottom: 6px;">
                      Imagen de Sección "¿Qué es este sitio?"
                    </label>
                    <div style="display: flex; gap: 10px; align-items: center; margin-bottom: 8px;">
                      {img.imagenEcologia && (
                        <img
                          src={img.imagenEcologia}
                          alt="Ecología"
                          style="max-height: 40px; max-width: 80px; object-fit: cover; border-radius: 4px;"
                        />
                      )}
                      <input
                        type="text"
                        name="imagen_ecologia"
                        value={img.imagenEcologia || ''}
                        placeholder="URL imagen"
                        style="flex: 1; border: 1px solid #cbd5e1; border-radius: 6px; padding: 8px 10px; font-size: 13px;"
                      />
                    </div>
                    <div style="font-size: 11px; color: #64748b; margin-bottom: 6px;">
                      O subir imagen nueva:
                    </div>
                    <input
                      type="file"
                      name="archivo_imagen_ecologia"
                      accept="image/*"
                      style="font-size: 12px;"
                    />
                  </div>
                </div>
              </div>

              {/* SECCION TEXTOS E ICONOS */}
              <div
                class="panel"
                style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px;"
              >
                <h3 style="font-size: 16px; font-weight: 800; color: #1e293b; margin: 0 0 16px;">
                  4. Textos del Portal e Íconos de Tarjetas
                </h3>
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 16px; margin-bottom: 20px;">
                  <div class="form-field">
                    <label style="font-weight: 700; font-size: 12px; color: #475569;">
                      Cintillo del Hero (Texto pequeño superior)
                    </label>
                    <input
                      type="text"
                      name="txt_hero_cintillo"
                      value={txt.heroCintillo || ''}
                      style="border: 1px solid #cbd5e1; border-radius: 6px; padding: 8px 10px; font-size: 13px;"
                    />
                  </div>
                  <div class="form-field">
                    <label style="font-weight: 700; font-size: 12px; color: #475569;">
                      Título Principal del Hero
                    </label>
                    <input
                      type="text"
                      name="txt_hero_titulo"
                      value={txt.heroTitulo || ''}
                      style="border: 1px solid #cbd5e1; border-radius: 6px; padding: 8px 10px; font-size: 13px;"
                    />
                  </div>
                  <div class="form-field">
                    <label style="font-weight: 700; font-size: 12px; color: #475569;">
                      Frase Resaltada en Oro (Hero)
                    </label>
                    <input
                      type="text"
                      name="txt_hero_resaltado"
                      value={txt.heroTituloResaltado || ''}
                      style="border: 1px solid #cbd5e1; border-radius: 6px; padding: 8px 10px; font-size: 13px;"
                    />
                  </div>
                  <div class="form-field" style="grid-column: 1 / -1;">
                    <label style="font-weight: 700; font-size: 12px; color: #475569;">
                      Subtítulo Descriptivo del Hero
                    </label>
                    <textarea
                      name="txt_hero_subtitulo"
                      rows={2}
                      style="border: 1px solid #cbd5e1; border-radius: 6px; padding: 8px 10px; font-size: 13px; resize: vertical;"
                    >
                      {txt.heroSubtitulo || ''}
                    </textarea>
                  </div>
                  <div class="form-field">
                    <label style="font-weight: 700; font-size: 12px; color: #475569;">
                      Texto Botón Principal (Hero 1)
                    </label>
                    <input
                      type="text"
                      name="txt_hero_btn1"
                      value={txt.heroBtn1 || 'Conoce el programa'}
                      style="border: 1px solid #cbd5e1; border-radius: 6px; padding: 8px 10px; font-size: 13px;"
                    />
                  </div>
                  <div class="form-field">
                    <label style="font-weight: 700; font-size: 12px; color: #475569;">
                      Texto Botón Participar (Hero 2)
                    </label>
                    <input
                      type="text"
                      name="txt_hero_btn2"
                      value={txt.heroBtn2 || 'Registra tu participación'}
                      style="border: 1px solid #cbd5e1; border-radius: 6px; padding: 8px 10px; font-size: 13px;"
                    />
                  </div>
                </div>

                {/* ÍCONOS Y TÍTULOS DE LAS 4 TARJETAS */}
                <div style="border-top: 1px solid #e2e8f0; padding-top: 16px;">
                  <h4 style="font-size: 14px; font-weight: 800; color: #334155; margin: 0 0 12px;">
                    Íconos y Títulos de las 4 Tarjetas de Acción
                  </h4>
                  <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 12px;">
                    {/* Tarjeta 1 */}
                    <div style="background: #f8fafc; padding: 12px; border-radius: 8px; border: 1px solid #e2e8f0;">
                      <div style="display: flex; gap: 8px; margin-bottom: 6px;">
                        <input
                          type="text"
                          name="ico_card1"
                          value={ico.cardPrograma || '🏛️'}
                          style="width: 44px; text-align: center; font-size: 18px; border: 1px solid #cbd5e1; border-radius: 6px;"
                        />
                        <input
                          type="text"
                          name="txt_card1_titulo"
                          value={txt.card1Titulo || 'Conoce el Programa'}
                          style="flex: 1; border: 1px solid #cbd5e1; border-radius: 6px; padding: 6px 8px; font-size: 12px; font-weight: 700;"
                        />
                      </div>
                      <textarea
                        name="txt_card1_desc"
                        rows={2}
                        style="width: 100%; border: 1px solid #cbd5e1; border-radius: 6px; padding: 6px 8px; font-size: 11px; resize: vertical;"
                      >
                        {txt.card1Desc || ''}
                      </textarea>
                    </div>

                    {/* Tarjeta 2 */}
                    <div style="background: #f8fafc; padding: 12px; border-radius: 8px; border: 1px solid #e2e8f0;">
                      <div style="display: flex; gap: 8px; margin-bottom: 6px;">
                        <input
                          type="text"
                          name="ico_card2"
                          value={ico.cardProceso || '⚙️'}
                          style="width: 44px; text-align: center; font-size: 18px; border: 1px solid #cbd5e1; border-radius: 6px;"
                        />
                        <input
                          type="text"
                          name="txt_card2_titulo"
                          value={txt.card2Titulo || 'Conoce el Proceso'}
                          style="flex: 1; border: 1px solid #cbd5e1; border-radius: 6px; padding: 6px 8px; font-size: 12px; font-weight: 700;"
                        />
                      </div>
                      <textarea
                        name="txt_card2_desc"
                        rows={2}
                        style="width: 100%; border: 1px solid #cbd5e1; border-radius: 6px; padding: 6px 8px; font-size: 11px; resize: vertical;"
                      >
                        {txt.card2Desc || ''}
                      </textarea>
                    </div>

                    {/* Tarjeta 3 */}
                    <div style="background: #f8fafc; padding: 12px; border-radius: 8px; border: 1px solid #e2e8f0;">
                      <div style="display: flex; gap: 8px; margin-bottom: 6px;">
                        <input
                          type="text"
                          name="ico_card3"
                          value={ico.cardCalendario || '📅'}
                          style="width: 44px; text-align: center; font-size: 18px; border: 1px solid #cbd5e1; border-radius: 6px;"
                        />
                        <input
                          type="text"
                          name="txt_card3_titulo"
                          value={txt.card3Titulo || 'Calendario de Actividades'}
                          style="flex: 1; border: 1px solid #cbd5e1; border-radius: 6px; padding: 6px 8px; font-size: 12px; font-weight: 700;"
                        />
                      </div>
                      <textarea
                        name="txt_card3_desc"
                        rows={2}
                        style="width: 100%; border: 1px solid #cbd5e1; border-radius: 6px; padding: 6px 8px; font-size: 11px; resize: vertical;"
                      >
                        {txt.card3Desc || ''}
                      </textarea>
                    </div>

                    {/* Tarjeta 4 */}
                    <div style="background: #f8fafc; padding: 12px; border-radius: 8px; border: 1px solid #e2e8f0;">
                      <div style="display: flex; gap: 8px; margin-bottom: 6px;">
                        <input
                          type="text"
                          name="ico_card4"
                          value={ico.cardDocumentos || '📄'}
                          style="width: 44px; text-align: center; font-size: 18px; border: 1px solid #cbd5e1; border-radius: 6px;"
                        />
                        <input
                          type="text"
                          name="txt_card4_titulo"
                          value={txt.card4Titulo || 'Consulta Documentos'}
                          style="flex: 1; border: 1px solid #cbd5e1; border-radius: 6px; padding: 6px 8px; font-size: 12px; font-weight: 700;"
                        />
                      </div>
                      <textarea
                        name="txt_card4_desc"
                        rows={2}
                        style="width: 100%; border: 1px solid #cbd5e1; border-radius: 6px; padding: 6px 8px; font-size: 11px; resize: vertical;"
                      >
                        {txt.card4Desc || ''}
                      </textarea>
                    </div>
                  </div>
                </div>

                {/* FOOTER INFORMACIÓN */}
                <div style="border-top: 1px solid #e2e8f0; padding-top: 16px; margin-top: 16px;">
                  <h4 style="font-size: 14px; font-weight: 800; color: #334155; margin: 0 0 12px;">
                    Información del Pie de Página (Footer)
                  </h4>
                  <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 12px;">
                    <div class="form-field">
                      <label style="font-weight: 700; font-size: 11px; color: #475569;">
                        Nombre de la Entidad / Municipio
                      </label>
                      <input
                        type="text"
                        name="txt_footer_entidad"
                        value={txt.footerEntidad || 'Municipio de San Pedro Tlaquepaque'}
                        style="border: 1px solid #cbd5e1; border-radius: 6px; padding: 6px 8px; font-size: 12px;"
                      />
                    </div>
                    <div class="form-field">
                      <label style="font-weight: 700; font-size: 11px; color: #475569;">
                        Correo de Contacto Oficial
                      </label>
                      <input
                        type="text"
                        name="txt_footer_email"
                        value={txt.footerEmail || 'ordenamiento@tlaquepaque.gob.mx'}
                        style="border: 1px solid #cbd5e1; border-radius: 6px; padding: 6px 8px; font-size: 12px;"
                      />
                    </div>
                    <div class="form-field" style="grid-column: 1 / -1;">
                      <label style="font-weight: 700; font-size: 11px; color: #475569;">
                        Dirección y Datos de Contacto
                      </label>
                      <textarea
                        name="txt_footer_contacto"
                        rows={2}
                        style="border: 1px solid #cbd5e1; border-radius: 6px; padding: 6px 8px; font-size: 12px; resize: vertical;"
                      >
                        {txt.footerContacto || ''}
                      </textarea>
                    </div>
                  </div>
                </div>
              </div>

              {/* MOTIVO OBLIGATORIO Y BOTON GUARDAR */}
              <div
                class="panel"
                style="background: #f8fafc; border: 2px solid #3b82f6; border-radius: 12px; padding: 20px; box-shadow: 0 4px 16px rgba(59,130,246,0.1);"
              >
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
                      id="motivo-input-usuario"
                      name="motivo"
                      required
                      placeholder="Ej. Cambio de colores institucionales de temporada / nuevo logo / actualización de fotos"
                      style="width: 100%; border: 1.5px solid #cbd5e1; border-radius: 8px; padding: 10px 14px; font-size: 14px;"
                    />
                  </div>

                  <div style="display: flex; gap: 8px; flex-wrap: wrap;">
                    <span style="font-size: 12px; color: #64748b; align-self: center;">
                      Sugerencias rápidas:
                    </span>
                    <button
                      type="button"
                      class="btn"
                      style="background: #e2e8f0; color: #334155; padding: 4px 10px; font-size: 11px; border-radius: 999px;"
                      {...domEvents({
                        onclick:
                          "document.getElementById('motivo-input-usuario').value = 'Actualización de colores y diseño'",
                      })}
                    >
                      Colores y diseño
                    </button>
                    <button
                      type="button"
                      class="btn"
                      style="background: #e2e8f0; color: #334155; padding: 4px 10px; font-size: 11px; border-radius: 999px;"
                      {...domEvents({
                        onclick:
                          "document.getElementById('motivo-input-usuario').value = 'Actualización de fotos del carrusel'",
                      })}
                    >
                      Fotos del carrusel
                    </button>
                    <button
                      type="button"
                      class="btn"
                      style="background: #e2e8f0; color: #334155; padding: 4px 10px; font-size: 11px; border-radius: 999px;"
                      {...domEvents({
                        onclick:
                          "document.getElementById('motivo-input-usuario').value = 'Cambio de logotipos oficiales'",
                      })}
                    >
                      Logotipos
                    </button>
                  </div>

                  <div style="display: flex; justify-content: flex-end; gap: 12px; margin-top: 10px;">
                    <Button buttonType="submit" variant="primary" size="lg">
                      💾 Guardar Cambios de Vista de Usuario
                    </Button>
                  </div>
                </div>
              </div>
            </form>
          )}

          {/* TAB 2: VISTA DE PANEL */}
          {tabActiva === 'panel' && (
            <form
              method="post"
              action={adminRoutes.personalizacion.index.href()}
              enctype="multipart/form-data"
              style="display: flex; flex-direction: column; gap: 24px;"
            >
              <input type="hidden" name="section" value="panel" />
              <input type="hidden" name="tab" value="panel" />

              <div
                class="panel"
                style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px;"
              >
                <h3 style="font-size: 16px; font-weight: 800; color: #1e293b; margin: 0 0 16px;">
                  1. Colores y Apariencia del Panel Administrador
                </h3>
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 16px;">
                  <div class="form-field">
                    <label style="font-weight: 700; font-size: 12px; color: #475569;">
                      Fondo de la Barra Lateral (Sidebar)
                    </label>
                    <div style="display: flex; gap: 8px; align-items: center;">
                      <input
                        type="color"
                        id="p-side-bg"
                        name="panel_sidebar_fondo"
                        value={p.sidebarFondo || '#ffffff'}
                        style="width: 44px; height: 38px; border: 1px solid #cbd5e1; border-radius: 6px; padding: 2px; cursor: pointer;"
                      />
                      <input
                        type="text"
                        value={p.sidebarFondo || '#ffffff'}
                        {...domEvents({
                          onchange: "document.getElementById('p-side-bg').value = this.value;",
                        })}
                        style="flex: 1; border: 1px solid #cbd5e1; border-radius: 6px; padding: 8px 10px; font-family: monospace; font-size: 13px;"
                      />
                    </div>
                  </div>

                  <div class="form-field">
                    <label style="font-weight: 700; font-size: 12px; color: #475569;">
                      Texto del Menú Lateral
                    </label>
                    <div style="display: flex; gap: 8px; align-items: center;">
                      <input
                        type="color"
                        id="p-side-text"
                        name="panel_sidebar_texto"
                        value={p.sidebarTexto || '#475066'}
                        style="width: 44px; height: 38px; border: 1px solid #cbd5e1; border-radius: 6px; padding: 2px; cursor: pointer;"
                      />
                      <input
                        type="text"
                        value={p.sidebarTexto || '#475066'}
                        {...domEvents({
                          onchange: "document.getElementById('p-side-text').value = this.value;",
                        })}
                        style="flex: 1; border: 1px solid #cbd5e1; border-radius: 6px; padding: 8px 10px; font-family: monospace; font-size: 13px;"
                      />
                    </div>
                  </div>

                  <div class="form-field">
                    <label style="font-weight: 700; font-size: 12px; color: #475569;">
                      Fondo de la Barra Superior (Topbar)
                    </label>
                    <div style="display: flex; gap: 8px; align-items: center;">
                      <input
                        type="color"
                        id="p-top-bg"
                        name="panel_topbar_fondo"
                        value={p.topbarFondo || '#2e3440'}
                        style="width: 44px; height: 38px; border: 1px solid #cbd5e1; border-radius: 6px; padding: 2px; cursor: pointer;"
                      />
                      <input
                        type="text"
                        value={p.topbarFondo || '#2e3440'}
                        {...domEvents({
                          onchange: "document.getElementById('p-top-bg').value = this.value;",
                        })}
                        style="flex: 1; border: 1px solid #cbd5e1; border-radius: 6px; padding: 8px 10px; font-family: monospace; font-size: 13px;"
                      />
                    </div>
                  </div>

                  <div class="form-field">
                    <label style="font-weight: 700; font-size: 12px; color: #475569;">
                      Color de Elementos Activos / Acento
                    </label>
                    <div style="display: flex; gap: 8px; align-items: center;">
                      <input
                        type="color"
                        id="p-acento"
                        name="panel_color_acento"
                        value={p.colorAcento || '#2563eb'}
                        style="width: 44px; height: 38px; border: 1px solid #cbd5e1; border-radius: 6px; padding: 2px; cursor: pointer;"
                      />
                      <input
                        type="text"
                        value={p.colorAcento || '#2563eb'}
                        {...domEvents({
                          onchange: "document.getElementById('p-acento').value = this.value;",
                        })}
                        style="flex: 1; border: 1px solid #cbd5e1; border-radius: 6px; padding: 8px 10px; font-family: monospace; font-size: 13px;"
                      />
                    </div>
                  </div>

                  <div class="form-field">
                    <label style="font-weight: 700; font-size: 12px; color: #475569;">
                      Fondo General del Panel
                    </label>
                    <div style="display: flex; gap: 8px; align-items: center;">
                      <input
                        type="color"
                        id="p-admin-bg"
                        name="panel_admin_bg"
                        value={p.adminBg || '#f4f6fb'}
                        style="width: 44px; height: 38px; border: 1px solid #cbd5e1; border-radius: 6px; padding: 2px; cursor: pointer;"
                      />
                      <input
                        type="text"
                        value={p.adminBg || '#f4f6fb'}
                        {...domEvents({
                          onchange: "document.getElementById('p-admin-bg').value = this.value;",
                        })}
                        style="flex: 1; border: 1px solid #cbd5e1; border-radius: 6px; padding: 8px 10px; font-family: monospace; font-size: 13px;"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div
                class="panel"
                style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px;"
              >
                <h3 style="font-size: 16px; font-weight: 800; color: #1e293b; margin: 0 0 16px;">
                  2. Logotipo y Título del Administrador
                </h3>
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 16px;">
                  <div class="form-field">
                    <label style="font-weight: 700; font-size: 13px; color: #1e293b; margin-bottom: 6px;">
                      Logo del Menú Admin
                    </label>
                    <div style="display: flex; gap: 10px; align-items: center; margin-bottom: 8px;">
                      {p.adminLogo && (
                        <img
                          src={p.adminLogo}
                          alt="Admin Logo"
                          style="max-height: 40px; max-width: 60px; object-fit: contain; background: #fff; padding: 2px; border: 1px solid #cbd5e1; border-radius: 4px;"
                        />
                      )}
                      <input
                        type="text"
                        name="panel_admin_logo"
                        value={p.adminLogo || ''}
                        placeholder="URL del logo"
                        style="flex: 1; border: 1px solid #cbd5e1; border-radius: 6px; padding: 8px 10px; font-size: 13px;"
                      />
                    </div>
                    <div style="font-size: 11px; color: #64748b; margin-bottom: 6px;">
                      O subir imagen nueva:
                    </div>
                    <input
                      type="file"
                      name="archivo_admin_logo"
                      accept="image/*"
                      style="font-size: 12px;"
                    />
                  </div>

                  <div class="form-field">
                    <label style="font-weight: 700; font-size: 13px; color: #1e293b; margin-bottom: 6px;">
                      Título del Panel (Menú Superior)
                    </label>
                    <textarea
                      name="panel_admin_titulo"
                      rows={2}
                      style="border: 1px solid #cbd5e1; border-radius: 6px; padding: 8px 10px; font-size: 13px;"
                    >
                      {p.adminTitulo || 'ADMINISTRADOR\nBITÁCORA AMBIENTAL'}
                    </textarea>
                  </div>
                </div>
              </div>

              {/* MOTIVO Y GUARDAR PANEL */}
              <div
                class="panel"
                style="background: #f8fafc; border: 2px solid #3b82f6; border-radius: 12px; padding: 20px; box-shadow: 0 4px 16px rgba(59,130,246,0.1);"
              >
                <div style="display: flex; flex-direction: column; gap: 12px;">
                  <div>
                    <label style="font-weight: 800; font-size: 14px; color: #1e293b; display: flex; align-items: center; gap: 6px;">
                      <span>📝</span> Motivo del Cambio{' '}
                      <span style="color: #dc2626; font-size: 12px;">
                        (Obligatorio para la Bitácora de Seguridad)
                      </span>
                    </label>
                    <input
                      type="text"
                      name="motivo"
                      required
                      placeholder="Ej. Cambio de colores del panel de administración"
                      style="width: 100%; border: 1.5px solid #cbd5e1; border-radius: 8px; padding: 10px 14px; font-size: 14px; margin-top: 6px;"
                    />
                  </div>

                  <div style="display: flex; justify-content: flex-end;">
                    <Button buttonType="submit" variant="primary" size="lg">
                      💾 Guardar Cambios de Vista de Panel
                    </Button>
                  </div>
                </div>
              </div>
            </form>
          )}

          {/* TAB 3: HISTORIAL Y AUDITORIA ("QUIEN Y POR QUE") */}
          {tabActiva === 'historial' && (
            <div
              class="panel"
              style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px;"
            >
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
                <div>
                  <h3 style="font-size: 16px; font-weight: 800; color: #1e293b; margin: 0 0 4px;">
                    📋 Registro de Auditoría de Personalización
                  </h3>
                  <p style="font-size: 13px; color: #64748b; margin: 0;">
                    Historial inmutable con cada cambio realizado, el autor responsable, fecha
                    exacta y motivo.
                  </p>
                </div>
              </div>

              <div class="table-wrap">
                <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
                  <thead>
                    <tr style="background: #f1f5f9;">
                      <th style="padding: 10px 12px; text-align: left; font-weight: 700; color: #475569;">
                        #
                      </th>
                      <th style="padding: 10px 12px; text-align: left; font-weight: 700; color: #475569;">
                        Administrador
                      </th>
                      <th style="padding: 10px 12px; text-align: left; font-weight: 700; color: #475569;">
                        Fecha y Hora
                      </th>
                      <th style="padding: 10px 12px; text-align: left; font-weight: 700; color: #475569;">
                        Sección
                      </th>
                      <th style="padding: 10px 12px; text-align: left; font-weight: 700; color: #475569;">
                        Motivo / Justificación
                      </th>
                      <th style="padding: 10px 12px; text-align: center; font-weight: 700; color: #475569;">
                        Acción
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {auditLogs.length === 0 ? (
                      <tr>
                        <td colspan={6} style="padding: 24px; text-align: center; color: #94a3b8;">
                          Aún no hay registros de cambios en el historial.
                        </td>
                      </tr>
                    ) : (
                      auditLogs.map((log) => {
                        const d = new Date(log.created_at)
                        const fechaStr = `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getFullYear()} ${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`

                        return (
                          <tr style="border-bottom: 1px solid #f1f5f9;">
                            <td style="padding: 12px; font-weight: 700; color: #64748b;">
                              #{log.id}
                            </td>
                            <td style="padding: 12px;">
                              <div style="font-weight: 700; color: #1e293b;">
                                👤 {log.user_name}
                              </div>
                              <div style="font-size: 11px; color: #64748b;">{log.user_email}</div>
                            </td>
                            <td style="padding: 12px; color: #334155; font-size: 12px;">
                              {fechaStr}
                            </td>
                            <td style="padding: 12px;">
                              <span style="background: #e2e8f0; color: #334155; padding: 3px 8px; border-radius: 999px; font-size: 11px; font-weight: 700; text-transform: uppercase;">
                                {log.section || 'General'}
                              </span>
                            </td>
                            <td style="padding: 12px; font-weight: 600; color: #1e293b; max-width: 300px;">
                              "{log.motivo}"
                            </td>
                            <td style="padding: 12px; text-align: center;">
                              <form method="post" action={adminRoutes.personalizacion.index.href()}>
                                <input type="hidden" name="_action" value="restore" />
                                <input type="hidden" name="log_id" value={log.id} />
                                <input type="hidden" name="tab" value="historial" />
                                <button
                                  type="submit"
                                  class="btn"
                                  style="background: #0284c7; color: #fff; padding: 6px 12px; border-radius: 6px; font-size: 12px; font-weight: 700; cursor: pointer; border: none;"
                                  {...domEvents({
                                    onclick:
                                      "return confirm('¿Seguro que deseas restaurar la configuración exacta de este registro?')",
                                  })}
                                >
                                  ⏪ Restaurar esta versión
                                </button>
                              </form>
                            </td>
                          </tr>
                        )
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* MINI PREVIEW MODAL */}
          <div
            id="mini-preview-modal"
            style="display: none; position: fixed; inset: 0; background: rgba(15,23,42,0.75); z-index: 9999; align-items: center; justify-content: center; padding: 20px;"
          >
            <div style="background: #ffffff; width: 95%; max-width: 1100px; height: 85vh; border-radius: 16px; overflow: hidden; display: flex; flex-direction: column; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.5);">
              <div style="background: #1e293b; color: #ffffff; padding: 12px 20px; display: flex; justify-content: space-between; align-items: center;">
                <div style="font-weight: 700; font-size: 14px; display: flex; align-items: center; gap: 8px;">
                  <span>👁️</span> Previsualizador de Página (Mini Portal)
                </div>
                <button
                  type="button"
                  style="background: transparent; border: none; color: #ffffff; font-size: 20px; cursor: pointer;"
                  {...domEvents({
                    onclick: "document.getElementById('mini-preview-modal').style.display='none';",
                  })}
                >
                  ✕
                </button>
              </div>
              <iframe
                src={routes.home.href()}
                style="width: 100%; flex: 1; border: none;"
                title="Mini Preview"
              />
            </div>
          </div>
        </div>

        {/* Dynamic script for adding hero carousel photos */}
        <script
          innerHTML={`
              function addHeroImageInput() {
                var container = document.getElementById('hero-images-container');
                var count = container.querySelectorAll('.hero-image-row').length + 1;
                var row = document.createElement('div');
                row.className = 'hero-image-row';
                row.style = 'display: flex; gap: 10px; align-items: center; background: #f8fafc; padding: 10px; border-radius: 8px; border: 1px solid #e2e8f0;';
                row.innerHTML = '<span style="font-size: 12px; font-weight: 800; color: #64748b; width: 60px;">Foto #' + count + '</span>' +
                  '<input type="text" name="hero_imagenes[]" placeholder="https://ejemplo.com/foto.jpg" style="flex: 1; border: 1px solid #cbd5e1; border-radius: 6px; padding: 8px 10px; font-size: 13px;" />' +
                  '<button type="button" style="background: #fee2e2; color: #b91c1c; border: none; border-radius: 6px; padding: 8px 12px; font-size: 12px; font-weight: 700; cursor: pointer;" onclick="this.parentElement.remove();">✕ Quitar</button>';
                container.appendChild(row);
              }
            `}
        />
      </AdminLayout>
    )
  }
}
