import type { Handle, RemixNode } from 'remix/ui'

import { Document } from '../../actions/document.tsx'
import { adminRoutes, routes } from '../../routes.ts'
import { Icon } from './icon.tsx'

export interface AdminLayoutProps {
  children?: RemixNode
  user: { name: string; role: string }
  active:
    | 'general'
    | 'cuenta'
    | 'avisos'
    | 'reuniones'
    | 'poel'
    | 'participaciones'
    | 'estadisticas'
    | 'usuarios'
    | 'exportar'
  title: string
}

const MENU: Array<{
  key: AdminLayoutProps['active']
  href: string
  label: string
  icon: RemixNode
}> = [
  {
    key: 'general',
    href: adminRoutes.index.href(),
    label: 'Vista general',
    icon: <Icon name="mdi:home" />,
  },
  {
    key: 'cuenta',
    href: adminRoutes.cuenta.href(),
    label: 'Mi cuenta',
    icon: <Icon name="mdi:account" />,
  },
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
    key: 'participaciones',
    href: adminRoutes.participaciones.href() + '?origen=digital',
    label: 'Participaciones Digitales',
    icon: <Icon name="mdi:laptop" />,
  },
  {
    key: 'estadisticas',
    href: adminRoutes.estadisticas.href() + '?origen=digital',
    label: 'Estadísticas Digitales',
    icon: <Icon name="mdi:chart-bar" />,
  },
  {
    key: 'participaciones',
    href: adminRoutes.participaciones.href() + '?origen=fisica',
    label: 'Participaciones Físicas',
    icon: <Icon name="mdi:file-document-outline" />,
  },
  {
    key: 'estadisticas',
    href: adminRoutes.estadisticas.href() + '?origen=fisica',
    label: 'Estadísticas Físicas',
    icon: <Icon name="mdi:chart-box-outline" />,
  },
  {
    key: 'usuarios',
    href: adminRoutes.index.href() + '#usuarios',
    label: 'Usuarios',
    icon: <Icon name="mdi:account-group-outline" />,
  },
  {
    key: 'exportar',
    href: adminRoutes.exportar.href(),
    label: 'Exportar tablas',
    icon: <Icon name="mdi:table-arrow-down" />,
  },
]

export function AdminLayout(handle: Handle<AdminLayoutProps>) {
  return () => {
    const { children, user, active, title } = handle.props

    return (
      <Document title={`${title} – Bitácora Ambiental`} head={<link rel="stylesheet" href="/admin.css" />}>
        <div class="admin">
          <aside class="sidebar">
            <div class="sidebar__brand">
              <img src="/images/tlaquepaque.png" alt="Tlaquepaque" />
              <div class="sidebar__brand-text">
                ADMINISTRADOR
                <br />
                BITÁCORA AMBIENTAL
              </div>
            </div>
            <nav class="sidebar__menu">
              <div class="sidebar__label">MENÚ</div>
              {MENU.map((item) => (
                <a
                  href={item.href}
                  class={'sidebar__item' + (item.key === active ? ' active' : '')}
                >
                  {item.icon}
                  {item.label}
                </a>
              ))}
              <div class="sidebar__label">CUENTA</div>
              <a href={routes.login.index.href()} class="sidebar__item sidebar__logout">
                <Icon name="mdi:logout" />
                Cerrar sesión
              </a>
            </nav>
          </aside>
          <div class="admin-main">
            <header class="topbar">
              <span class="topbar__title">{title.toUpperCase()}</span>
              <span class="topbar__user">
                👤 {user.name} · {user.role}
              </span>
            </header>
            <main class="content">{children}</main>
          </div>
        </div>
      </Document>
    )
  }
}
