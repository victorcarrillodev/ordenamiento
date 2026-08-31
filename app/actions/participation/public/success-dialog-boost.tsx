import { clientEntry, on, type Handle, type MixInput, type SerializableProps } from 'remix/ui'

export interface SuccessDialogBoostProps extends SerializableProps {
  homeHref: string
}

export const SuccessDialogBoost = clientEntry(
  import.meta.url,
  function SuccessDialogBoost(handle: Handle<SuccessDialogBoostProps>) {
    let scheduled = false

    return () => {
      if (!scheduled) {
        scheduled = true
        handle.queueTask((signal) => {
          if (signal.aborted) return
          const dialog = document.getElementById(handle.id)?.closest('dialog')
          if (dialog && typeof dialog.showModal === 'function') {
            try {
              if (dialog.open) dialog.close()
              dialog.showModal()
            } catch {
              // Si no compatible, el navegador mantiene el comportamiento server-rendered dialog[open]
            }
          }
        })
      }

      return (
        <span
          id={handle.id}
          style={{ display: 'none' }}
          mix={
            on<HTMLDialogElement>('cancel', (event) => {
              event.preventDefault()
              window.location.href = handle.props.homeHref
            }) as unknown as MixInput<HTMLSpanElement>
          }
        />
      )
    }
  },
)
