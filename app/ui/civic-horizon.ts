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

/**
 * Configuración de personalización visual (site_customizations en el
 * backend, ver backend/src/services/customizations.ts `ThemeConfig`).
 * Frontend y backend son despliegues separados sin módulos compartidos, así
 * que el frontend la trata como JSON externo de forma deliberadamente laxa
 * en vez de duplicar aquí, y potencialmente desincronizar, esa forma anidada
 * completa. `null` cubre "sin tema configurado" / "no se pudo consultar al
 * backend" (ver getPublicTheme en app/backend.ts).
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type ThemeData = Record<string, any> | null

/**
 * Valida que un valor sea un color CSS de forma segura (hex o rgb/rgba).
 *
 * Los colores de `usuario.colores`/`panel` vienen de site_customizations,
 * editable desde el panel de Personalización, y algunos call sites los
 * interpolan directo en texto crudo de `<style>`/`<script>` (sin escapar,
 * a diferencia de un atributo JSX normal). Sin esta validación, guardar un
 * valor como `red; } </style><script>...` desde ese formulario inyectaría
 * CSS/JS en el sitio público o en el panel de otros administradores.
 */
export function isSafeCssColor(value: unknown): value is string {
  return (
    typeof value === 'string' && /^#[0-9a-fA-F]{3,8}$|^rgba?\([0-9.,\s%]+\)$/.test(value.trim())
  )
}

/**
 * Valida una URL de imagen que va a interpolarse dentro de `url(...)` en CSS.
 *
 * Las imágenes del hero vienen del panel de Personalización igual que los
 * colores. Un valor con `)` cierra el `url(...)` antes de tiempo y deja añadir
 * reglas CSS arbitrarias detrás; comillas y espacios permiten lo mismo.
 *
 * Se admiten rutas del propio sitio y URLs `https`, pero no `http` explícito:
 * el navegador bloquea esa imagen por contenido mixto y el fallo es mudo, así
 * que es preferible descartarla y caer en la imagen por defecto.
 */
export function isSafeImageUrl(value: unknown): value is string {
  if (typeof value !== 'string') return false

  const url = value.trim()
  if (url.length === 0 || /["'()\\\s]/.test(url)) return false

  // Una ruta relativa o `//host` hereda el esquema de la página, así que no
  // introduce contenido mixto.
  return url.startsWith('/') || /^https:\/\//i.test(url)
}

const basePathImagenes = (process.env.BASE_PATH ?? '/ordena').replace(/\/+$/, '')

/**
 * Imágenes que vienen con el proyecto. Se usan cuando Personalización no tiene
 * ninguna cargada y cuando la que tiene guardada ya no resuelve.
 */
export const IMAGEN_POR_DEFECTO = {
  logo: `${basePathImagenes}/assets/img/logo/logo-200x60.webp`,
  hero: `${basePathImagenes}/assets/img/hero/hero.webp`,
  ecologia: `${basePathImagenes}/assets/img/vector/vector_1.webp`,
  programa: `${basePathImagenes}/assets/img/vector/vector_2.webp`,
} as const

/** Alias histórico; la portada y la vista previa del panel lo siguen usando. */
export const HERO_IMAGEN_POR_DEFECTO = IMAGEN_POR_DEFECTO.hero

/**
 * Rutas guardadas por versiones anteriores del proyecto que hoy ya no
 * resuelven y dejan el icono de imagen rota:
 *
 *  · `/ordena/images/...`  → la carpeta se llama `assets/img`, no `images`
 *  · `ecology-split.*`     → ilustración retirada del repositorio
 */
function esRutaMuerta(src: string): boolean {
  return /\/images\//.test(src) || /ecology-split\./.test(src)
}

/**
 * Devuelve una imagen utilizable a partir de lo que hay guardado en el tema.
 *
 * El backend ya hace esta misma normalización al leer la configuración; aquí
 * se repite porque el servidor web y el backend se despliegan por separado y
 * la portada no debe depender de que ambos vayan a la misma versión.
 */
export function imagenUsable(src: unknown, porDefecto: string): string {
  if (!isSafeImageUrl(src)) return porDefecto
  const limpio = src.trim()
  if (esRutaMuerta(limpio)) return porDefecto

  // Ruta interna del backend: el navegador no llega ahí, se traduce al proxy
  // público. Ver app/actions/marca-controller.tsx.
  if (limpio.startsWith('/api/')) {
    const subida = limpio.match(/^\/api\/settings\/assets\/([A-Za-z0-9_.-]+)$/)
    // Cualquier otra ruta de /api/ es inalcanzable desde el navegador: no vale
    // la pena dejarla puesta para que acabe en un icono de imagen rota.
    return subida ? `${basePathImagenes}/marca/${subida[1]}` : porDefecto
  }

  return limpio
}

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
  padding: '14px 18px',
  width: '100%',
  outline: 'none',
  transition: 'border-color 180ms ease, box-shadow 180ms ease',
  '&:focus': {
    borderColor: colors.burgundy900,
    boxShadow: `0 0 0 3px rgba(140,29,61,0.12)`,
  },
  '&::placeholder': {
    color: '#64748b',
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
