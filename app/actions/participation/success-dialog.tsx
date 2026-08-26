import type { Handle } from 'remix/ui'
import { css } from 'remix/ui'
import { FONT_STACK } from '../../ui/civic-horizon.ts'
import { SuccessDialogBoost } from './public/success-dialog-boost.tsx'

export interface SuccessDialogProps {
  folio?: string
  homeHref: string
  poetdumHref?: string
}

const dialogStyle = css({
  border: 'none',
  borderRadius: '20px',
  padding: '36px 32px',
  maxWidth: '540px',
  width: '92%',
  backgroundColor: '#ffffff',
  boxShadow: '0 25px 60px -15px rgba(15, 23, 42, 0.35), 0 0 1px 1px rgba(15, 23, 42, 0.05)',
  margin: 'auto',
  fontFamily: FONT_STACK,
  textAlign: 'center',
  '&::backdrop': {
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    backdropFilter: 'blur(8px)',
    WebkitBackdropFilter: 'blur(8px)',
  },
})

export function SuccessDialog(handle: Handle<SuccessDialogProps>) {
  return () => {
    const { folio, homeHref, poetdumHref = '/ordena/poetdum' } = handle.props
    const titleId = `${handle.id}-title`

    return (
      <dialog open mix={dialogStyle} aria-labelledby={titleId}>
        <SuccessDialogBoost homeHref={homeHref} />

        <div
          aria-hidden="true"
          style="width: 68px; height: 68px; border-radius: 50%; background: #dcfce7; color: #16a34a; display: flex; align-items: center; justify-content: center; font-size: 34px; margin: 0 auto 18px; box-shadow: 0 0 0 8px rgba(220, 252, 231, 0.5);"
        >
          <iconify-icon icon="mdi:check-circle" width="40" height="40" />
        </div>

        <h2
          id={titleId}
          style="font-family: Montserrat, sans-serif; font-size: 24px; font-weight: 800; color: #0f172a; margin: 0 0 10px; line-height: 1.3;"
        >
          ¡Participación registrada con éxito!
        </h2>

        <p style="font-size: 14.5px; line-height: 1.6; color: #334155; margin: 0 0 20px;">
          Tu aportación ciudadana ha sido recibida y archivada en el expediente técnico del Programa
          de Ordenamiento Territorial y Desarrollo Urbano (POETDUM) de San Pedro Tlaquepaque.
        </p>

        {folio ? (
          <div style="background: #f8fafc; border: 1.5px dashed #cbd5e1; border-radius: 12px; padding: 14px 20px; margin-bottom: 24px; display: flex; flex-direction: column; align-items: center; gap: 4px;">
            <span style="font-size: 11.5px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: #64748b;">
              Folio Oficial de Seguimiento
            </span>
            <strong style="font-size: 22px; font-weight: 900; color: #8c1d3d; letter-spacing: 0.04em;">
              {folio}
            </strong>
            <span style="font-size: 11px; color: #475569;">
              Guarda este folio para consultar el estatus de tu observación.
            </span>
          </div>
        ) : null}

        <div style="display: flex; flex-direction: column; gap: 10px;">
          <a
            href={homeHref}
            style="display: inline-flex; align-items: center; justify-content: center; gap: 8px; background: #8c1d3d; color: #ffffff; font-family: Montserrat, sans-serif; font-size: 14px; font-weight: 700; padding: 13px 28px; border-radius: 8px; text-decoration: none; box-shadow: 0 4px 14px rgba(140, 29, 61, 0.3); transition: all 160ms ease;"
          >
            <iconify-icon icon="mdi:home" width="18" height="18" />
            <span>Volver al inicio</span>
          </a>

          <a
            href={poetdumHref}
            style="display: inline-flex; align-items: center; justify-content: center; gap: 8px; background: #f1f5f9; color: #334155; font-family: Montserrat, sans-serif; font-size: 13.5px; font-weight: 600; padding: 11px 24px; border-radius: 8px; text-decoration: none; border: 1px solid #cbd5e1; transition: all 160ms ease;"
          >
            <iconify-icon icon="mdi:map-search" width="18" height="18" />
            <span>Consultar avances del POETDUM</span>
          </a>
        </div>
      </dialog>
    )
  }
}
