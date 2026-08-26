import { clientEntry, css, type Handle, type SerializableProps } from 'remix/ui'

export interface SubmitButtonProps extends SerializableProps {
  label: string
  pendingLabel: string
}

const spinnerStyle = css({
  width: '14px',
  height: '14px',
  border: '2px solid rgba(255,255,255,0.3)',
  borderTopColor: '#ffffff',
  borderRadius: '50%',
  animation: 'spin 0.8s linear infinite',
  '@keyframes spin': {
    to: { transform: 'rotate(360deg)' },
  },
})

export const SubmitButton = clientEntry(
  import.meta.url,
  function SubmitButton(handle: Handle<SubmitButtonProps>) {
    let pendiente = false
    let scheduled = false

    return () => {
      const { label, pendingLabel } = handle.props

      if (!scheduled) {
        scheduled = true
        handle.queueTask((signal) => {
          const btn = document.getElementById(handle.id)
          const form = btn?.closest('form')
          if (form) {
            form.addEventListener(
              'submit',
              () => {
                if (pendiente) return
                pendiente = true
                handle.update()
              },
              signal instanceof AbortSignal ? { signal } : undefined,
            )
          }
        })
      }

      return (
        <button
          id={handle.id}
          type="submit"
          aria-disabled={pendiente ? 'true' : undefined}
          mix={css({
            background: '#8c1d3d',
            color: '#ffffff',
            border: 'none',
            borderRadius: '8px',
            fontWeight: 700,
            fontSize: '14px',
            padding: '13px 34px',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            fontFamily: "'Montserrat', 'Helvetica Neue', Arial, sans-serif",
            pointerEvents: pendiente ? 'none' : 'auto',
            opacity: pendiente ? 0.8 : 1,
            cursor: pendiente ? 'wait' : 'pointer',
            transition: 'background-color 180ms ease, opacity 180ms ease',
            '&:hover': {
              background: '#6f1730',
            },
          })}
        >
          {pendiente ? (
            <>
              <span mix={spinnerStyle} aria-hidden="true" />
              <span>{pendingLabel}</span>
            </>
          ) : (
            <>
              <span>{label}</span>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path
                  d="M22 2L11 13M22 2L15 22l-4-9-9-4 19-7z"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
              </svg>
            </>
          )}
        </button>
      )
    }
  },
)
