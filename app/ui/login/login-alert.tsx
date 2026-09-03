/**
 * LoginAlert — alerta estilo Material UI para mensajes de estado del login
 * (error, éxito, advertencia, info)
 */
import type { Handle } from 'remix/ui'
import type { LoginAlert } from './types.ts'

export function LoginAlert(handle: Handle<LoginAlert>) {
  return () => {
    const { type, message } = handle.props

    const icon = (() => {
      if (type === 'success') {
        return (
          <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="1.5" />
            <path
              d="M8 12l3 3 5-6"
              stroke="currentColor"
              stroke-width="1.5"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </svg>
        )
      }
      if (type === 'warning') {
        return (
          <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path
              d="M12 2L2 22h20L12 2z"
              stroke="currentColor"
              stroke-width="1.5"
              stroke-linejoin="round"
            />
            <path d="M12 9v5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
            <circle cx="12" cy="17" r="1" fill="currentColor" />
          </svg>
        )
      }
      if (type === 'info') {
        return (
          <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="1.5" />
            <path d="M12 11v5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
            <circle cx="12" cy="8" r="1" fill="currentColor" />
          </svg>
        )
      }
      // error
      return (
        <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="1.5" />
          <path
            d="M15 9l-6 6m0-6l6 6"
            stroke="currentColor"
            stroke-width="1.5"
            stroke-linecap="round"
          />
        </svg>
      )
    })()

    return (
      <div class={`login__alert login__alert--${type}`} role="alert">
        <span class="login__alert-icon">{icon}</span>
        <span class="login__alert-message">{message}</span>
      </div>
    )
  }
}
