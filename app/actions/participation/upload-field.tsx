import type { Handle } from 'remix/ui'
import { css } from 'remix/ui'
import { colors, FONT_STACK } from '../../ui/civic-horizon.ts'
import { textoLimites } from '../../utils/uploads.ts'

export interface UploadFieldProps {
  error?: string
}

const labelStyle = css({
  fontFamily: FONT_STACK,
  fontSize: '12.5px',
  fontWeight: 700,
  color: colors.gray700,
  letterSpacing: '0.03em',
  display: 'block',
  marginBottom: '5px',
})

const fieldGroupStyle = css({
  display: 'flex',
  flexDirection: 'column',
  gap: '0',
  minWidth: 0,
})

const errorMsgStyle = css({
  fontFamily: FONT_STACK,
  fontSize: '12.5px',
  color: '#dc2626',
  marginTop: '4px',
})

const hintStyle = css({
  fontFamily: FONT_STACK,
  fontSize: '11.5px',
  color: colors.gray400,
  marginTop: '5px',
})

export function UploadField(handle: Handle<UploadFieldProps>) {
  return () => {
    const { error } = handle.props

    return (
      <div mix={fieldGroupStyle}>
        <label for="archivos" mix={labelStyle}>
          Documentos adjuntos (opcional)
        </label>
        <input
          id="archivos"
          name="archivos"
          type="file"
          multiple
          accept=".pdf,.shp,.jpg,.jpeg,.dwg,.png,.docx,.xlsx,.kmz"
          aria-describedby={error ? 'archivos-error' : 'archivos-hint'}
          aria-invalid={error ? 'true' : undefined}
          mix={css({
            fontFamily: FONT_STACK,
            fontSize: '13px',
            color: colors.gray500,
            width: '100%',
            '&::file-selector-button': {
              fontFamily: FONT_STACK,
              fontSize: '13px',
              fontWeight: 700,
              color: colors.burgundy900,
              background: colors.burgundy50,
              border: `1px solid ${colors.burgundy900}30`,
              borderRadius: '6px',
              padding: '8px 14px',
              marginRight: '12px',
              cursor: 'pointer',
            },
          })}
        />
        <span id="archivos-hint" mix={hintStyle}>
          {textoLimites()}
        </span>
        {error ? (
          <span id="archivos-error" role="alert" mix={errorMsgStyle}>
            ⚠ {error}
          </span>
        ) : null}
      </div>
    )
  }
}
