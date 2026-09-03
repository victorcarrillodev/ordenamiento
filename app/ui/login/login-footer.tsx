/**
 * LoginFooter – enlaces de apoyo dentro de la tarjeta de acceso.
 *
 * Cada enlace lleva su `href` real: antes todos apuntaban a `#`, así que se
 * veían como enlaces y no llevaban a ningún sitio.
 */
import type { Handle, RemixNode } from 'remix/ui'

export interface LoginFooterLink {
  label: string
  href: string
  icon: RemixNode
}

export interface LoginFooterProps {
  links: LoginFooterLink[]
}

export function LoginFooter(handle: Handle<LoginFooterProps>) {
  return () => (
    <div class="login__footer">
      {handle.props.links.map((link) => (
        <a class="login__footer-link" href={link.href} key={link.label}>
          {link.icon}
          {link.label}
        </a>
      ))}
    </div>
  )
}
