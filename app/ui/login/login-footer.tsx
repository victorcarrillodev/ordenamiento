/**
 * LoginFooter – enlaces de ayuda/términos dentro de la tarjeta
 */
import type { Handle, RemixNode } from 'remix/ui'

export interface LoginFooterProps {
  links: Array<{ label: string; icon: RemixNode }>
}

export function LoginFooter(handle: Handle<LoginFooterProps>) {
  return () => (
    <div class="login__footer">
      {handle.props.links.map((link) => (
        <a class="login__footer-link" href="#" key={link.label}>
          {link.icon}
          {link.label}
        </a>
      ))}
    </div>
  )
}
