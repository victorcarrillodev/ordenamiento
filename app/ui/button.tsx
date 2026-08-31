import type { Handle, MixInput, RemixNode } from 'remix/ui'
import { css } from 'remix/ui'
import { colors, FONT_STACK } from './civic-horizon.ts'

export type ButtonVariant =

  | 'primary'
  | 'contained'
  | 'secondary'
  | 'outlined'
  | 'outlend'
  | 'gold'
  | 'accent'
  | 'dark'
  | 'danger'
  | 'red'
  | 'text'
  | 'ghost'

export type ButtonSize = 'sm' | 'md' | 'lg'

export interface ButtonProps {

  
  /** Visual button variant */
  variant?: ButtonVariant
  /** Legacy alias for variant */
  type?: ButtonVariant
  /** Button size */
  size?: ButtonSize
  /** Native button type when rendered as <button> */
  buttonType?: 'button' | 'submit' | 'reset'
  /** URL when rendered as a link <a> */
  href?: string
  /** Link target attribute */
  target?: string
  /** Link rel attribute */
  rel?: string
  /** Disabled state */
  disabled?: boolean
  /** Full-width button stretching to container */
  fullWidth?: boolean
  /** Left prefix icon or element */
  icon?: RemixNode
  /** Right suffix icon or element */
  iconRight?: RemixNode
  /** Legacy text data property */
  data?: string
  /** Explicit text label */
  label?: string
  /** Child content or JSX */
  children?: RemixNode
  /** Custom CSS class */
  class?: string
  /** Element ID */
  id?: string
  /** Additional Remix mix descriptor(s) */
  mix?: MixInput<HTMLElement>
  /** Accessibility label */
  ariaLabel?: string
  /** Tooltip title */
  title?: string
  
}

// ---------------------------------------------------------------------------
// Variant Styles
// ---------------------------------------------------------------------------

const baseButtonStyle = css({
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '8px',
  fontFamily: FONT_STACK,
  fontWeight: 600,
  textDecoration: 'none',
  textAlign: 'center',
  whiteSpace: 'nowrap',
  verticalAlign: 'middle',
  userSelect: 'none',
  border: '1px solid transparent',
  cursor: 'pointer',
  boxSizing: 'border-box',
  transition:
    'background 180ms ease, border-color 180ms ease, color 180ms ease, box-shadow 180ms ease, transform 120ms ease',
  outline: 'none',
  '&:focus-visible': {
    boxShadow: `0 0 0 3px rgba(140, 29, 61, 0.35)`,
  },
  '&:active:not(:disabled)': {
    transform: 'scale(0.98)',
  },
  '&:disabled': {
    opacity: 0.5,
    cursor: 'not-allowed',
    pointerEvents: 'none',
    boxShadow: 'none',
    transform: 'none',
  },
})

const variantPrimary = css({
  backgroundColor: colors.burgundy900,
  color: colors.white,
  borderColor: colors.burgundy900,
  boxShadow: '0 2px 8px rgba(140, 29, 61, 0.25)',
  '&:hover:not(:disabled)': {
    backgroundColor: colors.burgundy800,
    borderColor: colors.burgundy800,
    boxShadow: '0 4px 14px rgba(140, 29, 61, 0.35)',
    transform: 'translateY(-1px)',
  },
})

const variantSecondary = css({
  backgroundColor: 'transparent',
  color: colors.burgundy900,
  borderColor: colors.burgundy900,
  '&:hover:not(:disabled)': {
    backgroundColor: 'rgba(140, 29, 61, 0.08)',
    borderColor: colors.burgundy800,
    color: colors.burgundy800,
    transform: 'translateY(-1px)',
  },
})

const variantGold = css({
  backgroundColor: colors.gold400,
  color: colors.gray950,
  borderColor: colors.gold400,
  boxShadow: '0 2px 8px rgba(201, 162, 39, 0.3)',
  '&:hover:not(:disabled)': {
    backgroundColor: colors.gold300,
    borderColor: colors.gold300,
    boxShadow: '0 4px 14px rgba(201, 162, 39, 0.4)',
    transform: 'translateY(-1px)',
  },
})

const variantDark = css({
  backgroundColor: colors.gray900,
  color: colors.white,
  borderColor: colors.gray900,
  boxShadow: '0 2px 8px rgba(15, 17, 23, 0.25)',
  '&:hover:not(:disabled)': {
    backgroundColor: colors.gray800,
    borderColor: colors.gray800,
    boxShadow: '0 4px 14px rgba(15, 17, 23, 0.35)',
    transform: 'translateY(-1px)',
  },
})

const variantDanger = css({
  backgroundColor: '#dc2626',
  color: colors.white,
  borderColor: '#dc2626',
  boxShadow: '0 2px 8px rgba(220, 38, 38, 0.25)',
  '&:hover:not(:disabled)': {
    backgroundColor: '#b91c1c',
    borderColor: '#b91c1c',
    boxShadow: '0 4px 14px rgba(220, 38, 38, 0.35)',
    transform: 'translateY(-1px)',
  },
})

const variantText = css({
  backgroundColor: 'transparent',
  color: colors.burgundy900,
  borderColor: 'transparent',
  boxShadow: 'none',
  '&:hover:not(:disabled)': {
    backgroundColor: 'rgba(140, 29, 61, 0.08)',
    color: colors.burgundy800,
  },
})

// ---------------------------------------------------------------------------
// Size Styles
// ---------------------------------------------------------------------------

const sizeSm = css({
  padding: '6px 14px',
  fontSize: '13px',
  borderRadius: '6px',
  lineHeight: '1.3',
})

const sizeMd = css({
  padding: '10px 20px',
  fontSize: '14px',
  borderRadius: '8px',
  lineHeight: '1.4',
})

const sizeLg = css({
  padding: '14px 28px',
  fontSize: '16px',
  borderRadius: '10px',
  lineHeight: '1.5',
})

const fullWidthStyle = css({
  width: '100%',
  display: 'flex',
})


function getVariantStyle(variant: ButtonVariant = 'primary') {
  switch (variant) {
    case 'secondary':
    case 'outlined':
    case 'outlend':
      return variantSecondary
    case 'gold':
    case 'accent':
      return variantGold
    case 'dark':
      return variantDark
    case 'danger':
    case 'red':
      return variantDanger
    case 'text':
    case 'ghost':
      return variantText
    case 'primary':
    case 'contained':
    default:
      return variantPrimary
  }
}

function getSizeStyle(size: ButtonSize = 'md') {
  switch (size) {
    case 'sm':
      return sizeSm
    case 'lg':
      return sizeLg
    case 'md':
    default:
      return sizeMd
  }
}

export function Button(handle: Handle<ButtonProps>) {
  return () => {
    const {
      variant = 'primary',
      type: legacyType,
      size = 'md',
      buttonType = 'button',
      href,
      target,
      rel,
      disabled = false,
      fullWidth = false,
      icon,
      iconRight,
      data,
      label,
      children,
      class: className,
      id,
      mix: extraMix,
      ariaLabel,
      title,
    } = handle.props

    const effectiveVariant = legacyType ?? variant
    const variantStyle = getVariantStyle(effectiveVariant)
    const sizeStyle = getSizeStyle(size)

    const content = children ?? label ?? data

    const mixes: MixInput<HTMLElement> = [
      baseButtonStyle,
      variantStyle,
      sizeStyle,
      fullWidth ? fullWidthStyle : null,
      extraMix,
    ]

    if (href && !disabled) {
      return (
        <a
          href={href}
          target={target}
          rel={target === '_blank' ? (rel ?? 'noopener noreferrer') : rel}
          class={className}
          id={id}
          aria-label={ariaLabel}
          title={title}
          mix={mixes}
        >
          {icon && <span class="btn__icon-left">{icon}</span>}
          {content}
          {iconRight && <span class="btn__icon-right">{iconRight}</span>}
        </a>
      )
    }

    return (
      <button
        type={buttonType}
        disabled={disabled}
        class={className}
        id={id}
        aria-label={ariaLabel}
        aria-disabled={disabled ? 'true' : undefined}
        title={title}
        mix={mixes}
      >
        {icon && <span class="btn__icon-left">{icon}</span>}
        {content}
        {iconRight && <span class="btn__icon-right">{iconRight}</span>}
      </button>
    )
  }
}

export default Button
