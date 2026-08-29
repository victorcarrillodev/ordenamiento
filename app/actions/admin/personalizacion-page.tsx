import type { Handle } from 'remix/ui'
import { AdminLayout } from '../../ui/admin/admin-layout.tsx'
import { adminRoutes, routes } from '../../routes.ts'
import { Button } from '../../ui/button.tsx'
import { HERO_IMAGEN_POR_DEFECTO, type ThemeData } from '../../ui/civic-horizon.ts'

export interface AuditLogEntry {
  id: string
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

// Interactividad de esta página vive en public/admin.js (CSP-compliant).
// No se usan atributos inline onclick/onchange/onerror para respetar
// la CSP estricta (script-src 'self' sin 'unsafe-inline').

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
        : [HERO_IMAGEN_POR_DEFECTO]

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
            <a
              href="?tab=usuario"
              class="tab-btn"
              style={`padding: 12px 20px; font-size: 14px; font-weight: 700; border: none; background: transparent; cursor: pointer; border-bottom: 3px solid ${tabActiva === 'usuario' ? '#2563eb' : 'transparent'}; color: ${tabActiva === 'usuario' ? '#2563eb' : '#64748b'}; display: flex; align-items: center; gap: 8px; text-decoration: none;`}
            >
              <span>👤</span> Vista de Usuario (Portal Ciudadano)
            </a>
            <a
              href="?tab=panel"
              class="tab-btn"
              style={`padding: 12px 20px; font-size: 14px; font-weight: 700; border: none; background: transparent; cursor: pointer; border-bottom: 3px solid ${tabActiva === 'panel' ? '#2563eb' : 'transparent'}; color: ${tabActiva === 'panel' ? '#2563eb' : '#64748b'}; display: flex; align-items: center; gap: 8px; text-decoration: none;`}
            >
              <span>⚙️</span> Vista de Panel (Admin)
            </a>
            <a
              href="?tab=historial"
              class="tab-btn"
              style={`padding: 12px 20px; font-size: 14px; font-weight: 700; border: none; background: transparent; cursor: pointer; border-bottom: 3px solid ${tabActiva === 'historial' ? '#2563eb' : 'transparent'}; color: ${tabActiva === 'historial' ? '#2563eb' : '#64748b'}; display: flex; align-items: center; gap: 8px; text-decoration: none;`}
            >
              <span>📜</span> Historial y Auditoría ({auditLogs.length})
            </a>
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
                    class="palette-btn"
                    data-primario="#8c1d3d"
                    data-acento="#e0b84a"
                    data-secundario="#2d6a4f"
                    data-nav-bg="#ffffff"
                    data-nav-text="#1a1d26"
                    data-footer-bg="#0f1117"
                    data-footer-text="#ffffff"
                    style="padding: 12px; border: 1.5px solid #cbd5e1; border-radius: 10px; background: #ffffff; cursor: pointer; text-align: left; display: flex; flex-direction: column; gap: 8px; transition: transform 150ms ease;"
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
                    class="palette-btn"
                    data-primario="#1b4332"
                    data-acento="#52b788"
                    data-secundario="#2d6a4f"
                    data-nav-bg="#ffffff"
                    data-nav-text="#081c15"
                    data-footer-bg="#081c15"
                    data-footer-text="#d8f3dc"
                    style="padding: 12px; border: 1.5px solid #cbd5e1; border-radius: 10px; background: #ffffff; cursor: pointer; text-align: left; display: flex; flex-direction: column; gap: 8px; transition: transform 150ms ease;"
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
                    class="palette-btn"
                    data-primario="#1e3a8a"
                    data-acento="#38bdf8"
                    data-secundario="#0d9488"
                    data-nav-bg="#ffffff"
                    data-nav-text="#0f172a"
                    data-footer-bg="#0f172a"
                    data-footer-text="#e2e8f0"
                    style="padding: 12px; border: 1.5px solid #cbd5e1; border-radius: 10px; background: #ffffff; cursor: pointer; text-align: left; display: flex; flex-direction: column; gap: 8px; transition: transform 150ms ease;"
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
                    class="palette-btn"
                    data-primario="#4c0519"
                    data-acento="#fbbf24"
                    data-secundario="#b45309"
                    data-nav-bg="#18181b"
                    data-nav-text="#ffffff"
                    data-footer-bg="#09090b"
                    data-footer-text="#fafafa"
                    style="padding: 12px; border: 1.5px solid #cbd5e1; border-radius: 10px; background: #ffffff; cursor: pointer; text-align: left; display: flex; flex-direction: column; gap: 8px; transition: transform 150ms ease;"
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
                        class="sync-color-text"
                        data-target="c-primario"
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
                        class="sync-color-text"
                        data-target="c-acento"
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
                        class="sync-color-text"
                        data-target="c-secundario"
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
                        class="sync-color-text"
                        data-target="c-nav-bg"
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
                        class="sync-color-text"
                        data-target="c-nav-text"
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
                        class="sync-color-text"
                        data-target="c-footer-bg"
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
                        class="sync-color-text"
                        data-target="c-footer-text"
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
                    id="btn-add-hero"
                    style="background: #e0f2fe; color: #0284c7; border: 1px solid #bae6fd; padding: 8px 14px; border-radius: 8px; font-size: 12px; font-weight: 700; cursor: pointer;"
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
                        class="hero-img-preview"
                        style="width: 50px; height: 35px; object-fit: cover; border-radius: 4px; border: 1px solid #cbd5e1;"
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
                          class="hero-remove"
                          style="background: #fee2e2; color: #b91c1c; border: none; border-radius: 6px; padding: 8px 12px; font-size: 12px; font-weight: 700; cursor: pointer;"
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

                  {/* Imagen Programa */}
                  <div
                    class="form-field"
                    style="background: #f8fafc; padding: 14px; border-radius: 8px; border: 1px solid #e2e8f0;"
                  >
                    <label style="font-weight: 700; font-size: 13px; color: #1e293b; margin-bottom: 6px;">
                      Imagen de Sección "¿Qué es el Programa?"
                    </label>
                    <div style="display: flex; gap: 10px; align-items: center; margin-bottom: 8px;">
                      {img.imagenPrograma && (
                        <img
                          src={img.imagenPrograma}
                          alt="Programa"
                          style="max-height: 40px; max-width: 80px; object-fit: cover; border-radius: 4px;"
                        />
                      )}
                      <input
                        type="text"
                        name="imagen_programa"
                        value={img.imagenPrograma || ''}
                        placeholder="URL imagen"
                        style="flex: 1; border: 1px solid #cbd5e1; border-radius: 6px; padding: 8px 10px; font-size: 13px;"
                      />
                    </div>
                    <div style="font-size: 11px; color: #64748b; margin-bottom: 6px;">
                      O subir imagen nueva:
                    </div>
                    <input
                      type="file"
                      name="archivo_imagen_programa"
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
                      class="btn motivo-suggest"
                      data-motivo="Actualización de colores y diseño"
                      style="background: #e2e8f0; color: #334155; padding: 4px 10px; font-size: 11px; border-radius: 999px;"
                    >
                      Colores y diseño
                    </button>
                    <button
                      type="button"
                      class="btn motivo-suggest"
                      data-motivo="Actualización de fotos del carrusel"
                      style="background: #e2e8f0; color: #334155; padding: 4px 10px; font-size: 11px; border-radius: 999px;"
                    >
                      Fotos del carrusel
                    </button>
                    <button
                      type="button"
                      class="btn motivo-suggest"
                      data-motivo="Cambio de logotipos oficiales"
                      style="background: #e2e8f0; color: #334155; padding: 4px 10px; font-size: 11px; border-radius: 999px;"
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
                        class="sync-color-text"
                        data-target="p-side-bg"
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
                        class="sync-color-text"
                        data-target="p-side-text"
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
                        class="sync-color-text"
                        data-target="p-top-bg"
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
                        class="sync-color-text"
                        data-target="p-acento"
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
                        class="sync-color-text"
                        data-target="p-admin-bg"
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
                      id="motivo-input-panel"
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
                  <p style="font-size: 13px; color: #64748b; margin: 0 0 12px;">
                    Historial inmutable con cada cambio realizado, el autor responsable, fecha
                    exacta y motivo.
                  </p>
                  <div style="display: flex; gap: 12px; align-items: center; margin-bottom: 16px; flex-wrap: wrap;">
                    <div style="flex: 1; min-width: 240px; position: relative;">
                      <input
                        type="text"
                        id="historial-search"
                        placeholder="🔍 Buscar en historial por usuario, motivo o sección..."
                        style="width: 100%; border: 1.5px solid #cbd5e1; border-radius: 8px; padding: 10px 14px 10px 36px; font-size: 13px;"
                      />
                      <span style="position: absolute; left: 12px; top: 50%; transform: translateY(-50%); color: #94a3b8;">
                        🔍
                      </span>
                    </div>
                    <span
                      id="historial-count"
                      style="font-size: 12px; color: #64748b; font-weight: 600;"
                    >
                      {auditLogs.length} registros
                    </span>
                  </div>
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
                  <tbody id="historial-tbody">
                    {auditLogs.length === 0 ? (
                      <tr id="historial-empty">
                        <td colspan={6} style="padding: 24px; text-align: center; color: #94a3b8;">
                          Aún no hay registros de cambios en el historial.
                        </td>
                      </tr>
                    ) : (
                      auditLogs.map((log) => {
                        const d = new Date(log.created_at)
                        const fechaStr = `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getFullYear()} ${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`

                        const haystack =
                          `${log.user_name} ${log.user_email} ${log.motivo} ${log.section}`.toLowerCase()
                        return (
                          <tr data-search={haystack} style="border-bottom: 1px solid #f1f5f9;">
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
                              <form
                                method="post"
                                action={adminRoutes.personalizacion.index.href()}
                                class="restore-form"
                              >
                                <input type="hidden" name="_action" value="restore" />
                                <input type="hidden" name="log_id" value={log.id} />
                                <input type="hidden" name="tab" value="historial" />
                                <button
                                  type="submit"
                                  class="btn"
                                  style="background: #0284c7; color: #fff; padding: 6px 12px; border-radius: 6px; font-size: 12px; font-weight: 700; cursor: pointer; border: none;"
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

          {/* HERRAMIENTA: PRUEBA SMTP (cablea POST /api/mail/test — antes huérfano) */}
          <div
            class="panel"
            style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px; margin-top: 24px;"
          >
            <h3 style="font-size: 15px; font-weight: 800; color: #1e293b; margin: 0 0 8px; display: flex; align-items: center; gap: 8px;">
              <span>✉</span> Prueba de correo SMTP
            </h3>
            <p style="font-size: 13px; color: #64748b; margin: 0 0 16px;">
              Verifica que el servidor de correo esté configurado (SMTP_HOST/SMTP_USER/SMTP_PASS).
              Envía un correo de prueba al destinatario indicado usando la plantilla institucional.
            </p>
            <form
              method="post"
              action={adminRoutes.personalizacion.index.href()}
              style="display: flex; gap: 12px; align-items: flex-end; flex-wrap: wrap;"
            >
              <input type="hidden" name="_action" value="testMail" />
              <input type="hidden" name="tab" value={tabActiva} />
              <div class="form-field" style="flex: 1; min-width: 240px;">
                <label
                  for="smtp-test-para"
                  style="font-weight: 700; font-size: 12px; color: #475569;"
                >
                  Correo destino para la prueba
                </label>
                <input
                  id="smtp-test-para"
                  name="para"
                  type="email"
                  required
                  placeholder="tu.correo@ejemplo.com"
                  style="border: 1px solid #cbd5e1; border-radius: 6px; padding: 8px 10px; font-size: 13px; width: 100%;"
                />
              </div>
              <Button buttonType="submit" variant="primary">
                📨 Enviar correo de prueba
              </Button>
            </form>
            <p style="font-size: 11px; color: #94a3b8; margin: 10px 0 0;">
              Solo admin. El backend responde 503 si SMTP no está configurado y 502 si el envío
              falla; el resultado se muestra arriba como mensaje de éxito o error.
            </p>
          </div>

          {/* MINI PREVIEW MODAL: no es un iframe al sitio real (eso mostraría la
              última versión guardada, no lo que se está editando). Es una maqueta
              reducida del portal que se actualiza en vivo mientras se escribe, y
              marca con una etiqueta cada zona que se puede personalizar. */}
          <div id="mini-preview-modal" class="mp-modal">
            <div class="mp-modal__box">
              <div class="mp-modal__head">
                <div class="mp-modal__title">
                  <span>👁️</span> Vista previa en vivo (mini portal)
                </div>
                <p class="mp-modal__hint">
                  Se actualiza mientras editas la pestaña "Vista de Usuario". Cada etiqueta marca
                  una zona personalizable.
                </p>
                <button
                  type="button"
                  id="btn-close-preview"
                  class="mp-modal__close"
                  aria-label="Cerrar"
                >
                  ✕
                </button>
              </div>
              <div class="mp-modal__body">
                <div class="mp">
                  <div
                    id="mp-nav"
                    class="mp__nav"
                    style={`background:${c.navbarFondo || '#ffffff'};color:${c.navbarTexto || '#1a1d26'};`}
                  >
                    <span class="mp__tag">✎ Menú superior</span>
                    <div class="mp__nav-brand">
                      {img.logoNavbar ? (
                        <img id="mp-nav-logo" src={img.logoNavbar} alt="Logo" />
                      ) : (
                        <span id="mp-nav-logo" class="mp__logo-fallback">
                          🏛️
                        </span>
                      )}
                      <strong>Ordenamiento Ecológico</strong>
                    </div>
                    <div class="mp__nav-links">
                      <span>Inicio</span>
                      <span>Participa</span>
                      <span>Documentos</span>
                    </div>
                  </div>

                  <div
                    id="mp-hero"
                    class="mp__hero"
                    style={`background-image:url("${heroImgs[0]}");`}
                  >
                    <span class="mp__tag mp__tag--light">✎ Portada (Hero)</span>
                    <span id="mp-cintillo" class="mp__cintillo">
                      {txt.heroCintillo || 'Programa de Ordenamiento Ecológico'}
                    </span>
                    <h2 class="mp__titulo">
                      <span id="mp-titulo">{txt.heroTitulo || 'Participa en el ordenamiento'}</span>{' '}
                      <span id="mp-resaltado" style={`color:${c.acento || '#e0b84a'}`}>
                        {txt.heroTituloResaltado || 'de tu territorio'}
                      </span>
                    </h2>
                    <p id="mp-subtitulo" class="mp__subtitulo">
                      {txt.heroSubtitulo ||
                        'Consulta el proceso, revisa documentos y registra tu participación ciudadana.'}
                    </p>
                    <div class="mp__hero-actions">
                      <span
                        id="mp-btn1"
                        class="mp__btn mp__btn--fill"
                        style={`background:${c.primario || '#8c1d3d'};`}
                      >
                        {txt.heroBtn1 || 'Conoce el programa'}
                      </span>
                      <span
                        id="mp-btn2"
                        class="mp__btn mp__btn--outline"
                        style={`border-color:${c.secundario || '#2d6a4f'};color:${c.secundario || '#2d6a4f'};`}
                      >
                        {txt.heroBtn2 || 'Registra tu participación'}
                      </span>
                    </div>
                  </div>

                  <div class="mp__cards">
                    <span class="mp__tag">✎ Tarjetas de acción</span>
                    <div class="mp__cards-row">
                      <div class="mp__card">
                        <span
                          id="mp-card-icon-1"
                          class="mp__card-icon"
                          style={`color:${c.acento || '#e0b84a'};`}
                        >
                          {ico.cardPrograma || '🏛️'}
                        </span>
                        <strong id="mp-card-titulo-1">
                          {txt.card1Titulo || 'Conoce el Programa'}
                        </strong>
                      </div>
                      <div class="mp__card">
                        <span
                          id="mp-card-icon-2"
                          class="mp__card-icon"
                          style={`color:${c.acento || '#e0b84a'};`}
                        >
                          {ico.cardProceso || '⚙️'}
                        </span>
                        <strong id="mp-card-titulo-2">
                          {txt.card2Titulo || 'Conoce el Proceso'}
                        </strong>
                      </div>
                      <div class="mp__card">
                        <span
                          id="mp-card-icon-3"
                          class="mp__card-icon"
                          style={`color:${c.acento || '#e0b84a'};`}
                        >
                          {ico.cardCalendario || '📅'}
                        </span>
                        <strong id="mp-card-titulo-3">
                          {txt.card3Titulo || 'Calendario de Actividades'}
                        </strong>
                      </div>
                      <div class="mp__card">
                        <span
                          id="mp-card-icon-4"
                          class="mp__card-icon"
                          style={`color:${c.acento || '#e0b84a'};`}
                        >
                          {ico.cardDocumentos || '📄'}
                        </span>
                        <strong id="mp-card-titulo-4">
                          {txt.card4Titulo || 'Consulta Documentos'}
                        </strong>
                      </div>
                    </div>
                  </div>

                  <div
                    id="mp-footer"
                    class="mp__footer"
                    style={`background:${c.footerFondo || '#0f1117'};color:${c.footerTexto || '#ffffff'};`}
                  >
                    <span class="mp__tag mp__tag--light">✎ Pie de página</span>
                    {img.logoFooter ? (
                      <img id="mp-footer-logo" src={img.logoFooter} alt="Logo" />
                    ) : (
                      <span id="mp-footer-logo" class="mp__logo-fallback">
                        🏛️
                      </span>
                    )}
                    <div>
                      <strong id="mp-footer-entidad">
                        {txt.footerEntidad || 'Municipio de San Pedro Tlaquepaque'}
                      </strong>
                      <div id="mp-footer-email">
                        {txt.footerEmail || 'ordenamiento@tlaquepaque.gob.mx'}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </AdminLayout>
    )
  }
}
