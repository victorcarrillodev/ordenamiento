/**
 * TextField – campo de formulario con icono (email / contraseña)
 */
import type { Handle, RemixNode } from 'remix/ui'

export interface TextFieldProps {
  id: string
  name: string
  label: string
  type: 'email' | 'password' | 'text'
  placeholder: string
  autoComplete?: string
  error?: string
  labelAside?: RemixNode
}

export function MailIcon() {
  return () => (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M4 6h16a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1Zm0 1 8 6 8-6"
        stroke="currentColor"
        stroke-width="1.5"
        stroke-linecap="round"
        stroke-linejoin="round"
      />
    </svg>
  )
}

export function LockIcon() {
  return () => (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="5" y="10" width="14" height="10" rx="1.5" stroke="currentColor" stroke-width="1.5" />
      <path
        d="M8 10V7a4 4 0 0 1 8 0v3"
        stroke="currentColor"
        stroke-width="1.5"
        stroke-linecap="round"
      />
    </svg>
  )
}

export function TextField(handle: Handle<TextFieldProps>) {
  return () => {
    const { id, name, label, type, placeholder, autoComplete, error, labelAside } = handle.props
    const icon = type === 'email' ? <MailIcon /> : type === 'password' ? <LockIcon /> : null

    const input = (() => {
      const props = {
        class: error ? 'login__input login__input--error' : 'login__input',
        id,
        name,
        placeholder,
        autoComplete,
        'aria-invalid': error ? true : undefined,
        'aria-describedby': error ? `${id}-error` : undefined,
        required: true,
      }
      if (type === 'text') return <input type="text" {...props} />
      return type === 'email' ? (
        <input type="email" {...props} />
      ) : (
        <input type="password" {...props} />
      )
    })()

    return (
      <div class="login__field">
        <div class="login__field-row">
          <label class="login__label" for={id}>
            {label}
          </label>
          {labelAside}
        </div>
        <div class="login__input-wrap">
          <span class="login__icon">{icon}</span>
          {input}
        </div>
        {error ? (
          <span class="login__error" id={`${id}-error`} role="alert">
            {error}
          </span>
        ) : null}
      </div>
    )
  }
}
