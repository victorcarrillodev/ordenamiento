import type { Handle } from 'remix/ui'
import { css } from 'remix/ui'
import { colors, FONT_STACK } from '../../ui/civic-horizon.ts'
import { textoLimites } from '../../utils/uploads.ts'

export interface UploadFieldProps {
  error?: string
}

const labelStyle = css({
  fontFamily: FONT_STACK,
  fontSize: '13px',
  fontWeight: 700,
  color: '#1e293b',
  letterSpacing: '0.01em',
  display: 'block',
  marginBottom: '6px',
})

const fieldGroupStyle = css({
  display: 'flex',
  flexDirection: 'column',
  gap: '6px',
  minWidth: 0,
})

const errorMsgStyle = css({
  fontFamily: FONT_STACK,
  fontSize: '12.5px',
  fontWeight: 600,
  color: '#dc2626',
  marginTop: '4px',
})

const hintStyle = css({
  fontFamily: FONT_STACK,
  fontSize: '12px',
  color: '#475569',
  marginTop: '4px',
  lineHeight: 1.45,
})

const uploadContainerStyle = css({
  border: '1.5px dashed #cbd5e1',
  borderRadius: '10px',
  padding: '16px',
  backgroundColor: '#f8fafc',
  transition: 'border-color 180ms ease, background-color 180ms ease',
  '&:hover': {
    borderColor: colors.burgundy900,
    backgroundColor: '#fdf8f9',
  },
})

export function UploadField(handle: Handle<UploadFieldProps>) {
  return () => {
    const { error } = handle.props

    return (
      <div mix={fieldGroupStyle}>
        <label for="archivos" mix={labelStyle}>
          Documentos adjuntos (opcional)
        </label>

        <div mix={uploadContainerStyle}>
          <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 12px;">
            <div style="display: flex; align-items: center; gap: 10px;">
              <label
                for="archivos"
                style="display: inline-flex; align-items: center; gap: 8px; background: #8c1d3d; color: #ffffff; font-family: Montserrat, sans-serif; font-size: 13px; font-weight: 700; padding: 9px 18px; border-radius: 6px; cursor: pointer; transition: background 150ms ease; box-shadow: 0 2px 6px rgba(140,29,61,0.2);"
              >
                <iconify-icon icon="mdi:paperclip" width="16" height="16" />
                <span>Seleccionar archivos</span>
              </label>
              <span
                id="file-count-label"
                style="font-size: 12.5px; color: #475569; font-weight: 500;"
              >
                Ningún archivo seleccionado
              </span>
            </div>
            <span style="font-size: 11.5px; color: #64748b; font-weight: 600;">
              Máx. 5 archivos (50 MB c/u)
            </span>
          </div>

          <input
            id="archivos"
            name="archivos"
            type="file"
            multiple
            accept=".pdf,.shp,.jpg,.jpeg,.dwg,.png,.docx,.xlsx,.kmz"
            aria-describedby={error ? 'archivos-error' : 'archivos-hint'}
            aria-invalid={error ? 'true' : undefined}
            style="position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0, 0, 0, 0); border: 0;"
          />

          {/* Contenedor dinámico de vista previa de archivos */}
          <div
            id="file-list-preview"
            style="display: none; margin-top: 14px; flex-direction: column; gap: 8px;"
          />
        </div>

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
