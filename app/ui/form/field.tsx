import type { Handle, RemixNode } from 'remix/ui'
import { css } from 'remix/ui'
import { colors, FONT_STACK, inputErrorProps, inputProps } from '../civic-horizon.ts'

export type FieldAppearance = 'civic' | 'admin'

export interface FieldProps {
  name: string
  label: string
  id?: string
  type?: 'text' | 'email' | 'tel' | 'url'
  value?: string
  placeholder?: string
  required?: boolean
  readOnly?: boolean
  autoComplete?: string
  list?: string
  error?: string
  hint?: string
  appearance?: FieldAppearance
  wide?: boolean
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
  gap: '0',
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
  marginTop: '5px',
})

const requiredMark = (
  <span mix={css({ color: colors.burgundy900 })} aria-hidden="true">
    {' '}
    *
  </span>
)

export function Field(handle: Handle<FieldProps>) {
  return () => {
    const {
      name,
      label,
      id = name,
      type = 'text',
      value,
      placeholder,
      required = false,
      readOnly = false,
      autoComplete,
      list,
      error,
      hint,
      appearance = 'civic',
      wide = false,
    } = handle.props

    const errorId = error ? `${id}-error` : undefined
    const hintId = hint ? `${id}-hint` : undefined
    const describedBy = [errorId, hintId].filter(Boolean).join(' ') || undefined

    if (appearance === 'admin') {
      return (
        <div class={`form-field${wide ? ' form-field--wide' : ''}`}>
          <label for={id}>
            {label} {required ? <span class="req">*</span> : null}
          </label>
          <input
            id={id}
            name={name}
            type={type as unknown as 'text'}
            value={value}
            required={required}
            readOnly={readOnly}
            placeholder={placeholder}
            autocomplete={autoComplete}
            list={list}
            aria-required={required ? 'true' : undefined}
            aria-invalid={error ? 'true' : undefined}
            aria-describedby={describedBy}
          />
          {hint ? (
            <span id={hintId} class="form-hint">
              {hint}
            </span>
          ) : null}
          {error ? (
            <span id={errorId} role="alert" class="form-error">
              ⚠ {error}
            </span>
          ) : null}
        </div>
      )
    }

    return (
      <div mix={fieldGroupStyle} style={wide ? { gridColumn: '1 / -1' } : undefined}>
        <label for={id} mix={labelStyle}>
          {label}
          {required ? requiredMark : null}
        </label>
        <input
          id={id}
          name={name}
          type={type as unknown as 'text'}
          value={value}
          placeholder={placeholder}
          required={required}
          readOnly={readOnly}
          autocomplete={autoComplete}
          list={list}
          aria-required={required ? 'true' : undefined}
          aria-invalid={error ? 'true' : undefined}
          aria-describedby={describedBy}
          mix={css(error ? { ...inputProps, ...inputErrorProps } : inputProps)}
        />
        {hint ? (
          <span id={hintId} mix={hintStyle}>
            {hint}
          </span>
        ) : null}
        {error ? (
          <span id={errorId} role="alert" mix={errorMsgStyle}>
            ⚠ {error}
          </span>
        ) : null}
      </div>
    )
  }
}

export interface TextAreaProps extends Omit<FieldProps, 'type' | 'autoComplete'> {
  rows?: number
  minHeight?: string
}

export function TextArea(handle: Handle<TextAreaProps>) {
  return () => {
    const {
      name,
      label,
      id = name,
      value,
      placeholder,
      required = false,
      readOnly = false,
      error,
      hint,
      appearance = 'civic',
      wide = false,
      rows = 3,
      minHeight = '72px',
    } = handle.props

    const errorId = error ? `${id}-error` : undefined
    const hintId = hint ? `${id}-hint` : undefined
    const describedBy = [errorId, hintId].filter(Boolean).join(' ') || undefined

    if (appearance === 'admin') {
      return (
        <div class={`form-field${wide ? ' form-field--wide' : ''}`}>
          <label for={id}>
            {label} {required ? <span class="req">*</span> : null}
          </label>
          <textarea
            id={id}
            name={name}
            rows={rows}
            value={value}
            required={required}
            readOnly={readOnly}
            placeholder={placeholder}
            aria-required={required ? 'true' : undefined}
            aria-invalid={error ? 'true' : undefined}
            aria-describedby={describedBy}
          />
          {hint ? (
            <span id={hintId} class="form-hint">
              {hint}
            </span>
          ) : null}
          {error ? (
            <span id={errorId} role="alert" class="form-error">
              ⚠ {error}
            </span>
          ) : null}
        </div>
      )
    }

    return (
      <div mix={fieldGroupStyle} style={wide ? { gridColumn: '1 / -1' } : undefined}>
        <label for={id} mix={labelStyle}>
          {label}
          {required ? requiredMark : null}
        </label>
        <textarea
          id={id}
          name={name}
          rows={rows}
          value={value}
          placeholder={placeholder}
          required={required}
          readOnly={readOnly}
          aria-required={required ? 'true' : undefined}
          aria-invalid={error ? 'true' : undefined}
          aria-describedby={describedBy}
          mix={css({
            ...(error ? { ...inputProps, ...inputErrorProps } : inputProps),
            resize: 'vertical',
            minHeight,
          })}
        />
        {hint ? (
          <span id={hintId} mix={hintStyle}>
            {hint}
          </span>
        ) : null}
        {error ? (
          <span id={errorId} role="alert" mix={errorMsgStyle}>
            ⚠ {error}
          </span>
        ) : null}
      </div>
    )
  }
}

export interface CheckboxFieldProps {
  name: string
  id?: string
  children: RemixNode
  value?: string
  checked?: boolean
  required?: boolean
  error?: string
  appearance?: FieldAppearance
}

export function CheckboxField(handle: Handle<CheckboxFieldProps>) {
  return () => {
    const {
      name,
      id = name,
      children,
      value = '1',
      checked = false,
      required = false,
      error,
      appearance = 'civic',
    } = handle.props

    const errorId = error ? `${id}-error` : undefined

    if (appearance === 'admin') {
      return (
        <div class="form-field">
          <label class="checkbox-label" for={id}>
            <input
              id={id}
              name={name}
              type="checkbox"
              value={value}
              checked={checked}
              required={required}
              aria-required={required ? 'true' : undefined}
              aria-invalid={error ? 'true' : undefined}
              aria-describedby={errorId}
            />
            {children}
          </label>
          {error ? (
            <span id={errorId} role="alert" class="form-error">
              ⚠ {error}
            </span>
          ) : null}
        </div>
      )
    }

    return (
      <div mix={fieldGroupStyle}>
        <label
          for={id}
          mix={css({
            display: 'flex',
            alignItems: 'flex-start',
            gap: '10px',
            cursor: 'pointer',
            marginTop: '2px',
          })}
        >
          <input
            id={id}
            name={name}
            type="checkbox"
            value={value}
            checked={checked}
            required={required}
            aria-required={required ? 'true' : undefined}
            aria-invalid={error ? 'true' : undefined}
            aria-describedby={errorId}
            mix={css({
              width: '17px',
              height: '17px',
              marginTop: '2px',
              accentColor: colors.burgundy900,
              flexShrink: 0,
              cursor: 'pointer',
            })}
          />
          <span
            mix={css({
              fontFamily: FONT_STACK,
              fontSize: '13px',
              lineHeight: 1.5,
              color: colors.gray700,
            })}
          >
            {children}
          </span>
        </label>
        {error ? (
          <span id={errorId} role="alert" mix={errorMsgStyle}>
            ⚠ {error}
          </span>
        ) : null}
      </div>
    )
  }
}
