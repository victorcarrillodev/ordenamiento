import type { Handle, RemixNode } from 'remix/ui'

import { Document } from '../../actions/document.tsx'
import { adminRoutes, routes } from '../../routes.ts'
import { isSafeCssColor } from '../civic-horizon.ts'
import { Icon } from './icon.tsx'

export type AdminSection =
  | 'general'
  | 'cuenta'
  | 'avisos'
  | 'reuniones'
  | 'poel'
  | 'actividades'
  | 'documentos'
  | 'indicadores'
  | 'participaciones-digital'
  | 'participaciones-fisica'
  | 'estadisticas'
  | 'usuarios'
  | 'sesiones'
  | 'exportar'
  | 'personalizacion'

export interface AdminLayoutProps {
  children?: RemixNode
  user: { name: string; role: string }
  active: AdminSection
  title: string
  /** Acciones de la propia página, alineadas a la derecha del encabezado. */
  actions?: RemixNode
  /** Frase corta bajo el título, para explicar de qué va la pantalla. */
  subtitle?: string
  /**
   * Migas de pan propias. Por omisión se dibuja «Vista general / <title>»,
   * que es lo correcto para casi todas las pantallas; solo las que cuelgan de
   * otra (el detalle de una participación) necesitan pasar las suyas.
   */
  breadcrumb?: RemixNode
  theme?: {
    sidebarFondo?: string
    sidebarTexto?: string
    topbarFondo?: string
    topbarTexto?: string
    colorAcento?: string
    adminBg?: string
    adminLogo?: string
    adminTitulo?: string
  }
}

interface ItemMenu {
  key: AdminSection
  href: string
  label: string
  icon: RemixNode
}

/**
 * El menú va agrupado por lo que uno viene a hacer, no como una lista plana:
 * con quince entradas seguidas, encontrar «Indicadores» era leerlas todas.
 */
const GRUPOS: Array<{ titulo: string; items: ItemMenu[] }> = [
  {
    titulo: 'Panel',
    items: [
      {
        key: 'general',
        href: adminRoutes.index.href(),
        label: 'Vista general',
        icon: <Icon name="mdi:view-dashboard-outline" />,
      },
      {
        key: 'estadisticas',
        href: adminRoutes.estadisticas.href(),
        label: 'Estadísticas',
        icon: <Icon name="mdi:chart-bar" />,
      },
    ],
  },
  {
    titulo: 'Participación ciudadana',
    items: [
      {
        key: 'participaciones-digital',
        href: adminRoutes.participaciones.href() + '?origen=digital',
        label: 'Digitales',
        icon: <Icon name="mdi:laptop" />,
      },
      {
        key: 'participaciones-fisica',
        href: adminRoutes.participaciones.href() + '?origen=fisica',
        label: 'Físicas',
        icon: <Icon name="mdi:clipboard-text-outline" />,
      },
    ],
  },
  {
    titulo: 'Contenido del portal',
    items: [
      {
        key: 'avisos',
        href: adminRoutes.avisos.index.href(),
        label: 'Avisos',
        icon: <Icon name="mdi:bell-outline" />,
      },
      {
        key: 'reuniones',
        href: adminRoutes.reuniones.index.href(),
        label: 'Reuniones',
        icon: <Icon name="mdi:calendar-month-outline" />,
      },
      {
        key: 'poel',
        href: adminRoutes.poel.index.href(),
        label: 'POEL – Sesiones',
        icon: <Icon name="mdi:book-open-page-variant-outline" />,
      },
      {
        key: 'actividades',
        href: adminRoutes.actividades.index.href(),
        label: 'Actividades',
        icon: <Icon name="mdi:calendar-check-outline" />,
      },
      {
        key: 'documentos',
        href: adminRoutes.documentos.index.href(),
        label: 'Documentos',
        icon: <Icon name="mdi:file-document-outline" />,
      },
      {
        key: 'indicadores',
        href: adminRoutes.indicadores.index.href(),
        label: 'Indicadores',
        icon: <Icon name="mdi:chart-line" />,
      },
    ],
  },
  {
    titulo: 'Administración',
    items: [
      {
        key: 'usuarios',
        href: adminRoutes.usuarios.index.href(),
        label: 'Usuarios',
        icon: <Icon name="mdi:account-group-outline" />,
      },
      {
        key: 'sesiones',
        href: adminRoutes.sesiones.href(),
        label: 'Registro de sesiones',
        icon: <Icon name="mdi:account-clock-outline" />,
      },
      {
        key: 'personalizacion',
        href: adminRoutes.personalizacion.index.href(),
        label: 'Personalización y marca',
        icon: <Icon name="mdi:palette-outline" />,
      },
      {
        key: 'exportar',
        href: adminRoutes.exportar.href(),
        label: 'Exportar tablas',
        icon: <Icon name="mdi:table-arrow-down" />,
      },
    ],
  },
]

const basePath = (process.env.BASE_PATH ?? '/ordena').replace(/\/$/, '')

/** Se usa como respaldo si el logotipo configurado deja de resolver. */
const LOGO_POR_DEFECTO = `${basePath}/assets/img/logo/logo-200x60.webp`

/** Primera y última inicial, para el avatar de la barra superior. */
function iniciales(nombre: string): string {
  const partes = (nombre || '').trim().split(/\s+/).filter(Boolean)
  if (partes.length === 0) return '?'
  const primera = partes[0][0]
  const ultima = partes.length > 1 ? partes[partes.length - 1][0] : ''
  return (primera + ultima).toUpperCase()
}

export function AdminLayout(handle: Handle<AdminLayoutProps>) {
  return () => {
    const { children, user, active, title, actions, subtitle, breadcrumb, theme } = handle.props
    const customLogo = theme?.adminLogo || LOGO_POR_DEFECTO
    const customTitle = theme?.adminTitulo || 'ADMINISTRADOR BITÁCORA AMBIENTAL'
    // Estos valores vienen del formulario de Personalización y se insertan
    // como texto crudo de <style> (sin escapar), así que se validan primero:
    // un valor como `red;}</style><script>...` guardado ahí inyectaría
    // markup en el panel de cualquier administrador que visite /admin/*.
    const safeColor = (value?: string) => (isSafeCssColor(value) ? value : null)
    const dynamicStyles = theme
      ? `
        :root {
          ${safeColor(theme.adminBg) ? `--a-bg: ${safeColor(theme.adminBg)};` : ''}
          ${safeColor(theme.sidebarFondo) ? `--a-sidebar: ${safeColor(theme.sidebarFondo)};` : ''}
          ${safeColor(theme.topbarFondo) ? `--a-dark: ${safeColor(theme.topbarFondo)};` : ''}
          ${safeColor(theme.colorAcento) ? `--a-blue: ${safeColor(theme.colorAcento)};` : ''}
        }
        ${safeColor(theme.sidebarTexto) ? `.sidebar__item { color: ${safeColor(theme.sidebarTexto)}; }` : ''}
        ${safeColor(theme.topbarTexto) ? `.topbar { color: ${safeColor(theme.topbarTexto)}; }` : ''}
      `
      : ''

    return (
      <Document
        title={`${title} – Bitácora Ambiental`}
        head={
          <>
            <link rel="stylesheet" href={`${basePath}/admin.css`} />
            <script src={`${basePath}/admin.js`} defer></script>
            {dynamicStyles && <style>{dynamicStyles}</style>}
          </>
        }
      >
        <div class="admin">
          {/* En móvil el menú se oculta y este control lo despliega. Se marca
              como checkbox para que funcione sin JavaScript. */}
          <input type="checkbox" id="sidebar-toggle" class="sidebar-toggle" hidden />

          <aside class="sidebar" id="sidebar">
            <div class="sidebar__brand">
              <img
                src={customLogo}
                data-imagen-alterna={LOGO_POR_DEFECTO}
                alt="Escudo del Municipio de San Pedro Tlaquepaque"
              />
              <div class="sidebar__brand-text" style="white-space: pre-line;">
                {customTitle}
              </div>
            </div>
            <nav class="sidebar__menu" aria-label="Secciones del panel">
              {GRUPOS.map((grupo) => (
                <div class="sidebar__group" key={grupo.titulo}>
                  <div class="sidebar__label">{grupo.titulo}</div>
                  {grupo.items.map((item) => (
                    <a
                      key={item.key}
                      href={item.href}
                      class={'sidebar__item' + (item.key === active ? ' active' : '')}
                      aria-current={item.key === active ? 'page' : undefined}
                    >
                      {item.icon}
                      <span>{item.label}</span>
                    </a>
                  ))}
                </div>
              ))}

              <div class="sidebar__group">
                <div class="sidebar__label">Cuenta</div>
                <a
                  href={adminRoutes.cuenta.index.href()}
                  class={'sidebar__item' + (active === 'cuenta' ? ' active' : '')}
                  aria-current={active === 'cuenta' ? 'page' : undefined}
                >
                  <Icon name="mdi:account-circle-outline" />
                  <span>Mi cuenta</span>
                </a>
                <form method="post" action={routes.logout.href()}>
                  <button type="submit" class="sidebar__item sidebar__logout">
                    <Icon name="mdi:logout" />
                    <span>Cerrar sesión</span>
                  </button>
                </form>
              </div>
            </nav>
          </aside>

          <div class="admin-main">
            <header class="topbar">
              <label
                class="topbar__burger"
                for="sidebar-toggle"
                aria-label="Abrir o cerrar el menú"
              >
                <Icon name="mdi:menu" size={22} />
              </label>
              <span class="topbar__title">{title}</span>
              <a class="topbar__user" href={adminRoutes.cuenta.index.href()} title="Ir a Mi cuenta">
                <span class="topbar__avatar" aria-hidden="true">
                  {iniciales(user.name)}
                </span>
                <span class="topbar__user-text">
                  <span class="topbar__user-name">{user.name}</span>
                  <span class="topbar__user-role">
                    {user.role === 'admin' ? 'Administrador' : 'Ciudadano'}
                  </span>
                </span>
              </a>
            </header>
            <main class="content">
              <div class="content__head">
                <div class="content__heading">
                  {active === 'general' ? null : (
                    <nav class="breadcrumb" aria-label="Ruta de navegación">
                      <a href={adminRoutes.index.href()}>Vista general</a>
                      <span class="breadcrumb__sep" aria-hidden="true">
                        /
                      </span>
                      {breadcrumb ?? title}
                    </nav>
                  )}
                  <h1 class="page-title">{title}</h1>
                  {subtitle ? <p class="page-subtitle">{subtitle}</p> : null}
                </div>
                {actions ? <div class="content__actions">{actions}</div> : null}
              </div>
              {children}
            </main>
          </div>
        </div>
      </Document>
    )
  }
}
