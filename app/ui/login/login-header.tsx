/**
 * LoginHeader – logo + título + subtítulo
 */
import type { Handle } from 'remix/ui'

export interface LoginHeaderProps {
  title: string
  subtitle: string
  logoSrc: string
  logoAlt: string
}

export function LoginHeader(handle: Handle<LoginHeaderProps>) {
  return () => (
    <div class="login__header">
      <div class="login__logo-wrap">
        <img class="login__logo" src={handle.props.logoSrc} alt={handle.props.logoAlt} />
      </div>
      <h1 class="login__title">{handle.props.title}</h1>
      <p class="login__subtitle">{handle.props.subtitle}</p>
    </div>
  )
}
