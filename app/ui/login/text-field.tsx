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
  /** Valor precargado: al reenviar un formulario con error no se pierde lo escrito. */
  value?: string
  autoFocus?: boolean
  minLength?: number
  maxLength?: number
  /** Texto de ayuda permanente bajo el campo (p. ej. requisitos de contraseña). */
  hint?: string
  /**
   * Añade el botón de mostrar/ocultar contraseña. El botón nace `hidden` y solo
   * lo revela `public/login.js`: sin JavaScript no queda un control muerto.
   */
  reveal?: boolean
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

export function UserIcon() {
  return () => (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="8" r="3.5" stroke="currentColor" stroke-width="1.5" />
      <path
        d="M5 19.5a7 7 0 0 1 14 0"
        stroke="currentColor"
        stroke-width="1.5"
        stroke-linecap="round"
      />
    </svg>
  )
}

/** Botón mostrar/ocultar. Los dos iconos se renderizan y el CSS decide cuál se ve. */
function RevealButton(handle: Handle<{ target: string }>) {
  return () => (
    <button
      type="button"
      class="login__visibility"
      data-password-toggle={handle.props.target}
      aria-controls={handle.props.target}
      aria-pressed="false"
      aria-label="Mostrar contraseña"
      hidden
    >
      <svg class="login__visibility-show" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path
          d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z"
          stroke="currentColor"
          stroke-width="1.5"
          stroke-linejoin="round"
        />
        <circle cx="12" cy="12" r="3" stroke="currentColor" stroke-width="1.5" />
      </svg>
      <svg class="login__visibility-hide" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M4 4l16 16" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
        <path
          d="M9.9 5.8A9.6 9.6 0 0 1 12 5.5c6 0 9.5 6.5 9.5 6.5a17 17 0 0 1-3.2 3.9M6.6 7.6A17 17 0 0 0 2.5 12S6 18.5 12 18.5c1 0 1.9-.2 2.7-.5"
          stroke="currentColor"
          stroke-width="1.5"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
      </svg>
    </button>
  )
}

export function TextField(handle: Handle<TextFieldProps>) {
  return () => {
    const {
      id,
      name,
      label,
      type,
      placeholder,
      autoComplete,
      error,
      labelAside,
      value,
      autoFocus,
      minLength,
      maxLength,
      hint,
      reveal,
    } = handle.props

    const icon = type === 'email' ? <MailIcon /> : type === 'password' ? <LockIcon /> : <UserIcon />

    const hintId = hint ? `${id}-hint` : undefined
    const errorId = error ? `${id}-error` : undefined
    const describedBy = [errorId, hintId].filter(Boolean).join(' ') || undefined

    const input = (() => {
      const props = {
        class: error ? 'login__input login__input--error' : 'login__input',
        id,
        name,
        placeholder,
        autoComplete,
        value,
        minLength,
        maxLength,
        autofocus: autoFocus ? true : undefined,
        'aria-invalid': error ? true : undefined,
        'aria-describedby': describedBy,
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
          {type === 'password' && reveal ? <RevealButton target={id} /> : null}
        </div>
        {error ? (
          <span class="login__error" id={errorId} role="alert">
            {error}
          </span>
        ) : null}
        {hint ? (
          <span class="login__hint" id={hintId}>
            {hint}
          </span>
        ) : null}
      </div>
    )
  }
}
