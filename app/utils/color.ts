/**
 * Colores: normalizar, medir contraste y armar la capa de la portada.
 *
 * Los usa Personalización para tres cosas que no se pueden improvisar en el navegador:
 *
 *  · Decir si un texto se lee sobre su fondo (contraste WCAG) ANTES de guardar. Un
 *    portal público con el texto del menú casi del color de su fondo no lo corrige
 *    nadie hasta que alguien se queja.
 *  · Guardar un color siempre como `#rrggbb`: es lo único que acepta `<input type="color">`,
 *    y un `#fff` escrito a mano lo dejaría en negro.
 *  · Armar el degradado que se pone encima de las fotos de la portada y del banner de
 *    participación, de modo que siga al color primario en lugar de quedarse en guinda.
 *
 * `public/personalizacion.js` repite estas fórmulas (un script del navegador no puede
 * importar TypeScript); `app/ui/admin/personalizacion-script.test.ts` comprueba que
 * ambas den lo mismo.
 */

/** `#rgb` o `#rrggbb` (sin alfa) → `#rrggbb` en minúsculas; cualquier otra cosa → null. */
export function normalizarHex(valor: unknown): string | null {
  if (typeof valor !== 'string') return null
  const m = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(valor.trim())
  if (!m) return null
  const cuerpo = m[1].toLowerCase()
  const largo =
    cuerpo.length === 3
      ? cuerpo
          .split('')
          .map((c) => c + c)
          .join('')
      : cuerpo
  return `#${largo}`
}

export type Rgb = readonly [number, number, number]

/** `#rrggbb` → `[r, g, b]` (0-255), o null si no es un hexadecimal válido. */
export function hexARgb(valor: unknown): Rgb | null {
  const hex = normalizarHex(valor)
  if (!hex) return null
  return [
    Number.parseInt(hex.slice(1, 3), 16),
    Number.parseInt(hex.slice(3, 5), 16),
    Number.parseInt(hex.slice(5, 7), 16),
  ]
}

/** Luminancia relativa según WCAG 2.x (0 = negro, 1 = blanco). */
export function luminancia([r, g, b]: Rgb): number {
  const canal = (v: number) => {
    const c = v / 255
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  }
  return 0.2126 * canal(r) + 0.7152 * canal(g) + 0.0722 * canal(b)
}

/** Razón de contraste entre dos colores, de 1 (iguales) a 21 (negro sobre blanco). */
export function razonDeContraste(a: unknown, b: unknown): number | null {
  const ca = hexARgb(a)
  const cb = hexARgb(b)
  if (!ca || !cb) return null
  const la = luminancia(ca)
  const lb = luminancia(cb)
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05)
}

/**
 * Cómo se lee ese contraste:
 *  · `aaa`   ≥ 7     — cómodo para cualquier texto
 *  · `aa`    ≥ 4.5   — cumple para texto normal
 *  · `grande` ≥ 3    — solo texto grande o en negritas (títulos, botones)
 *  · `bajo`  < 3     — se lee mal
 */
export type NivelContraste = 'aaa' | 'aa' | 'grande' | 'bajo'

export function nivelDeContraste(razon: number): NivelContraste {
  if (razon >= 7) return 'aaa'
  if (razon >= 4.5) return 'aa'
  if (razon >= 3) return 'grande'
  return 'bajo'
}

export const ETIQUETA_NIVEL: Record<NivelContraste, string> = {
  aaa: 'Excelente',
  aa: 'Bueno',
  grande: 'Solo texto grande',
  bajo: 'Insuficiente',
}

/** `#rrggbb` + opacidad → `rgba(r,g,b,a)`; null si el color no es válido. */
export function rgba(hex: unknown, alfa: number): string | null {
  const c = hexARgb(hex)
  if (!c) return null
  return `rgba(${c[0]},${c[1]},${c[2]},${redondear(alfa)})`
}

/** Tres decimales: con dos, la intensidad guardada se movía 1 % al releerla (75 → 76). */
function redondear(n: number): number {
  return Math.round(n * 1000) / 1000
}

// ---------------------------------------------------------------------------
// Capa de la portada
// ---------------------------------------------------------------------------

/** El negro azulado de los extremos de la capa y sus opacidades de fábrica. */
const OSCURO = '#0f1117'
export const CAPA_BASE = { inicio: 0.82, centro: 0.7, fin: 0.75 } as const

/** Intensidad (en %) con la que se puede cargar la capa: ni transparente ni opaca del todo. */
export const CAPA_MIN = 30
export const CAPA_MAX = 100
export const CAPA_INICIAL = 100

export interface CapaDePortada {
  inicio: string
  centro: string
  fin: string
}

function acotarIntensidad(intensidad: number): number {
  if (!Number.isFinite(intensidad)) return CAPA_INICIAL
  return Math.min(CAPA_MAX, Math.max(CAPA_MIN, Math.round(intensidad)))
}

/**
 * Los tres tramos del degradado que se pone sobre las fotos de la portada y sobre el
 * banner «Participación ciudadana»: oscuro – color primario – oscuro. Con intensidad
 * 100 son los valores de fábrica; más baja deja ver más la foto.
 *
 * El tramo central sale del color primario: antes se guardaba como un guinda fijo, y al
 * cambiar de paleta la portada y el banner seguían tiñéndose de guinda. Si el primario
 * no es un color válido se conserva el de fábrica.
 */
export function capaDePortada(primario: unknown, intensidad: number): CapaDePortada {
  const k = acotarIntensidad(intensidad) / 100
  return {
    inicio: rgba(OSCURO, CAPA_BASE.inicio * k) as string,
    centro: (rgba(primario, CAPA_BASE.centro * k) ??
      rgba('#8c1d3d', CAPA_BASE.centro * k)) as string,
    fin: rgba(OSCURO, CAPA_BASE.fin * k) as string,
  }
}

/**
 * La intensidad (en %) que tiene guardada una capa, leída de la opacidad de su primer
 * tramo. Si no se puede leer (otro formato, otro valor) vale 100: la de fábrica.
 */
export function intensidadDeCapa(inicio: unknown): number {
  if (typeof inicio !== 'string') return CAPA_INICIAL
  const m = /^rgba\(\s*[\d.]+\s*,\s*[\d.]+\s*,\s*[\d.]+\s*,\s*([\d.]+)\s*\)$/i.exec(inicio.trim())
  if (!m) return CAPA_INICIAL
  const alfa = Number(m[1])
  if (!Number.isFinite(alfa) || alfa <= 0) return CAPA_INICIAL
  return acotarIntensidad((alfa / CAPA_BASE.inicio) * 100)
}
