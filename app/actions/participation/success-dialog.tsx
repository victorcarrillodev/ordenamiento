import type { Handle } from 'remix/ui'
import { css } from 'remix/ui'
import { btnPrimaryProps, colors, FONT_STACK } from '../../ui/civic-horizon.ts'
import { SuccessDialogBoost } from './public/success-dialog-boost.tsx'

export interface SuccessDialogProps {
  folio?: string
  homeHref: string
}

const dialogStyle = css({
  border: 'none',
  borderRadius: '16px',
  padding: '32px',
  maxWidth: '520px',
  width: '90%',
  backgroundColor: '#ffffff',
  boxShadow: '0 20px 50px rgba(0,0,0,0.25)',
  margin: 'auto',
  fontFamily: FONT_STACK,
  '&::backdrop': {
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    backdropFilter: 'blur(4px)',
  },
})

export function SuccessDialog(handle: Handle<SuccessDialogProps>) {
  return () => {
    const { folio, homeHref } = handle.props
    const titleId = `${handle.id}-title`

    return (
      <dialog open mix={dialogStyle} aria-labelledby={titleId}>
        <SuccessDialogBoost homeHref={homeHref} />
        <div
          aria-hidden="true"
          mix={css({
            width: '56px',
            height: '56px',
            borderRadius: '50%',
            background: colors.green100,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '26px',
            marginBottom: '16px',
          })}
        >
          ✅
        </div>
        <h2
          id={titleId}
          mix={css({
            fontFamily: FONT_STACK,
            fontSize: '22px',
            fontWeight: 700,
            color: colors.green700,
            margin: '0 0 10px',
          })}
        >
          ¡Participación registrada con éxito!
        </h2>
        <p
          mix={css({
            fontFamily: FONT_STACK,
            fontSize: '14.5px',
            lineHeight: 1.6,
            color: colors.gray500,
            margin: '0 0 16px',
          })}
        >
          Tu aportación ha sido recibida correctamente por el equipo técnico del Programa de
          Ordenamiento Territorial.
          {folio ? (
            <>
              {' '}
              Tu folio de seguimiento es <strong>{folio}</strong>.
            </>
          ) : null}
        </p>
        <div mix={css({ display: 'flex', justifyContent: 'flex-end', marginTop: '20px' })}>
          <a
            href={homeHref}
            mix={css({
              ...btnPrimaryProps,
              fontSize: '13.5px',
              padding: '10px 24px',
              textDecoration: 'none',
            })}
          >
            Volver al inicio
          </a>
        </div>
      </dialog>
    )
  }
}
