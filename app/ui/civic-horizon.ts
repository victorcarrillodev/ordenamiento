/**
 * Civic Horizon Design System
 * Portal de Ordenamiento Territorial – San Pedro Tlaquepaque
 *
 * Central design token and CSSProps object file.
 * Import raw CSSProps from here and pass them to css() at the call site,
 * OR use the pre-built css() descriptors directly via mix={…}.
 *
 * IMPORTANT: These are plain CSSProps objects — NOT css() descriptors.
 * Call css({...tokenObject, ...extraStyles}) at the use site, or use mix={[descriptor, css({...})]}
 */
import { css } from 'remix/ui'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type CSSProps = Record<string, any>

// ---------------------------------------------------------------------------
// Color Palette
// ---------------------------------------------------------------------------

export const colors = {
  /** Primary institutional burgundy */
  burgundy900: '#8c1d3d',
  burgundy800: '#a02246',
  burgundy700: '#b52a52',
  burgundy100: '#f9edf1',
  burgundy50: '#fdf5f7',

  /** Heritage gold accent */
  gold500: '#c9a227',
  gold400: '#e0b84a',
  gold300: '#f0cc74',
  gold100: '#fdf6e0',

  /** Greens for ecology theme */
  green700: '#2d6a4f',
  green500: '#40916c',
  green100: '#d8f3dc',

  /** Neutrals */
  gray950: '#0f1117',
  gray900: '#1a1d26',
  gray800: '#252836',
  gray700: '#363a4a',
  gray500: '#6b7080',
  gray400: '#9a9faf',
  gray300: '#c8cad4',
  gray200: '#e2e4ec',
  gray100: '#f1f2f6',
  gray50: '#f8f9fc',
  white: '#ffffff',
} as const

// ---------------------------------------------------------------------------
// Typography
// ---------------------------------------------------------------------------

export const FONT_STACK = "'Montserrat', 'Helvetica Neue', Arial, sans-serif"

// ---------------------------------------------------------------------------
// Raw CSSProps tokens (spread into css() at call sites)
// ---------------------------------------------------------------------------

export const headingXLProps: CSSProps = {
  fontFamily: FONT_STACK,
  fontSize: 'clamp(32px, 5vw, 60px)',
  fontWeight: 800,
  lineHeight: 1.1,
  letterSpacing: '-0.02em',
  color: colors.white,
}

export const headingLProps: CSSProps = {
  fontFamily: FONT_STACK,
  fontSize: 'clamp(26px, 4vw, 42px)',
  fontWeight: 700,
  lineHeight: 1.15,
  letterSpacing: '-0.01em',
  color: colors.gray900,
}

export const headingMProps: CSSProps = {
  fontFamily: FONT_STACK,
  fontSize: 'clamp(20px, 3vw, 28px)',
  fontWeight: 700,
  lineHeight: 1.25,
  color: colors.gray900,
}

export const eyebrowProps: CSSProps = {
  fontFamily: FONT_STACK,
  fontSize: '12px',
  fontWeight: 700,
  letterSpacing: '0.15em',
  textTransform: 'uppercase',
  color: colors.gold400,
}

export const bodyLargeProps: CSSProps = {
  fontFamily: FONT_STACK,
  fontSize: '18px',
  lineHeight: 1.7,
  color: colors.gray700,
}

export const bodyProps: CSSProps = {
  fontFamily: FONT_STACK,
  fontSize: '16px',
  lineHeight: 1.7,
  color: colors.gray700,
}

export const sectionContainerProps: CSSProps = {
  maxWidth: '1200px',
  margin: '0 auto',
  padding: '0 24px',
  width: '100%',
}

export const sectionPaddingProps: CSSProps = {
  padding: '96px 0',
  '@media (max-width: 768px)': { padding: '64px 0' },
}

export const btnPrimaryProps: CSSProps = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '8px',
  padding: '14px 32px',
  borderRadius: '4px',
  background: colors.burgundy900,
  color: colors.white,
  fontFamily: FONT_STACK,
  fontSize: '14px',
  fontWeight: 700,
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
  textDecoration: 'none',
  border: 'none',
  cursor: 'pointer',
  transition: 'background 200ms ease, transform 150ms ease, box-shadow 200ms ease',
  '&:hover': {
    background: colors.burgundy800,
    transform: 'translateY(-2px)',
    boxShadow: `0 8px 24px rgba(140,29,61,0.35)`,
  },
  '&:active': { transform: 'translateY(0)' },
}

export const btnSecondaryProps: CSSProps = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '8px',
  padding: '13px 31px',
  borderRadius: '4px',
  background: 'transparent',
  color: colors.white,
  fontFamily: FONT_STACK,
  fontSize: '14px',
  fontWeight: 700,
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
  textDecoration: 'none',
  border: `2px solid rgba(255,255,255,0.7)`,
  cursor: 'pointer',
  transition: 'background 200ms ease, border-color 200ms ease, transform 150ms ease',
  '&:hover': {
    background: 'rgba(255,255,255,0.12)',
    borderColor: colors.white,
    transform: 'translateY(-2px)',
  },
  '&:active': { transform: 'translateY(0)' },
}

export const btnGoldProps: CSSProps = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '8px',
  padding: '14px 32px',
  borderRadius: '4px',
  background: colors.gold400,
  color: colors.gray950,
  fontFamily: FONT_STACK,
  fontSize: '14px',
  fontWeight: 700,
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
  textDecoration: 'none',
  border: 'none',
  cursor: 'pointer',
  transition: 'background 200ms ease, transform 150ms ease, box-shadow 200ms ease',
  '&:hover': {
    background: colors.gold300,
    transform: 'translateY(-2px)',
    boxShadow: `0 8px 24px rgba(201,162,39,0.4)`,
  },
  '&:active': { transform: 'translateY(0)' },
}

export const cardProps: CSSProps = {
  background: colors.white,
  borderRadius: '12px',
  border: `1px solid ${colors.gray200}`,
  padding: '32px 28px',
  display: 'flex',
  flexDirection: 'column',
  gap: '16px',
  transition: 'box-shadow 250ms ease, transform 250ms ease, border-color 250ms ease',
  '&:hover': {
    boxShadow: '0 12px 40px rgba(140,29,61,0.12)',
    transform: 'translateY(-4px)',
    borderColor: colors.burgundy900,
  },
}

export const inputProps: CSSProps = {
  fontFamily: FONT_STACK,
  fontSize: '15px',
  color: colors.gray900,
  background: colors.white,
  border: `1.5px solid ${colors.gray300}`,
  borderRadius: '8px',
  padding: '12px 16px',
  width: '100%',
  outline: 'none',
  transition: 'border-color 180ms ease, box-shadow 180ms ease',
  '&:focus': {
    borderColor: colors.burgundy900,
    boxShadow: `0 0 0 3px rgba(140,29,61,0.12)`,
  },
  '&::placeholder': {
    color: colors.gray400,
  },
}

export const inputErrorProps: CSSProps = {
  borderColor: '#dc2626',
  '&:focus': {
    borderColor: '#dc2626',
    boxShadow: '0 0 0 3px rgba(220,38,38,0.12)',
  },
}

// ---------------------------------------------------------------------------
// Pre-built css() descriptors for elements that need no customization
// ---------------------------------------------------------------------------

export const eyebrowStyle = css(eyebrowProps)
export const bodyLargeStyle = css(bodyLargeProps)
export const bodyStyle = css(bodyProps)
export const cardStyle = css(cardProps)
export const btnPrimaryStyle = css(btnPrimaryProps)
export const btnSecondaryStyle = css(btnSecondaryProps)
export const btnGoldStyle = css(btnGoldProps)
export const inputStyle = css(inputProps)
export const inputErrorStyle = css(inputErrorProps)
