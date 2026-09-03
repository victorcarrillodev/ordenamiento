/** Rechaza temprano cuerpos gigantes sin bufferizarlos completos en memoria. */
export function bodyTooLarge(request: Request, limitBytes: number): boolean {
  const declared = Number(request.headers.get('content-length') ?? '0')
  return Number.isFinite(declared) && declared > limitBytes
}

export function json(data: unknown, init?: number | ResponseInit): Response {
  if (typeof init === 'number') {
    return new Response(JSON.stringify(data), {
      status: init,
      headers: { 'content-type': 'application/json' },
    })
  }
  const headers: Record<string, string> = {
    'content-type': 'application/json',
    ...(init?.headers as Record<string, string> | undefined),
  }
  return new Response(JSON.stringify(data), { status: init?.status ?? 200, headers })
}

/** Extrae la IP real del cliente respetando TRUST_PROXY env var */
export function clientIp(request: Request, remoteAddr: string | null): string {
  // Si TRUST_PROXY está habilitado, usar x-forwarded-for
  if (process.env.TRUST_PROXY === 'true') {
    const xForwardedFor = request.headers.get('x-forwarded-for')
    if (xForwardedFor) {
      // Tomar el primer valor (cliente original)
      const firstIp = xForwardedFor.split(',')[0].trim()
      if (firstIp) return firstIp
    }
  }

  // Usar remoteAddr si está disponible
  if (remoteAddr) return remoteAddr

  return 'unknown'
}

// In-memory rate limiter storage: Map<key, { count: number; windowStart: number }>
const rateLimitStore = new Map<string, { count: number; windowStart: number }>()

/** In-memory rate limiter simple. Devuelve true si bloqueado, false si permitido */
export function rateLimit(
  key: string,
  maxRequests: number,
  windowMs: number,
  nowMs?: number,
): boolean {
  const now = nowMs ?? Date.now()
  const entry = rateLimitStore.get(key)

  if (!entry) {
    // Primera solicitud para esta clave
    rateLimitStore.set(key, { count: 1, windowStart: now })
    return false
  }

  // Comprobar si la ventana ha expirado
  if (now - entry.windowStart > windowMs) {
    // Reiniciar la ventana
    rateLimitStore.set(key, { count: 1, windowStart: now })
    return false
  }

  // Aún dentro de la ventana
  entry.count++
  return entry.count > maxRequests
}

/** Rechaza inyección CSS: valida que sea solo hex/rgba, no etiquetas */
export function isSafeCssColor(color: unknown): boolean {
  // Rechazar no-strings
  if (typeof color !== 'string') return false

  // Rechazar cadenas vacías
  if (color.trim() === '') return false

  // Aceptar hex: #fff, #ffffff
  if (/^#[0-9a-fA-F]{3}([0-9a-fA-F]{3})?$/.test(color)) return true

  // Aceptar rgba/rgb: rgba(255,0,0,0.5), rgb(255,0,0)
  if (/^rgba?\s*\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*(,\s*[\d.]+\s*)?\)$/.test(color)) return true

  // Rechazar todo lo demás (nombres de colores, inyecciones, etc.)
  return false
}

/** Rechaza javascript:, data:, http://, etc. Solo permite rutas relativas, protocol-relative y https */
export function isSafeImageUrl(url: unknown): boolean {
  // Solo aceptar strings
  if (typeof url !== 'string') return false

  if (url.trim() === '') return false

  // Rechazar javascript: y data:
  if (url.toLowerCase().startsWith('javascript:') || url.toLowerCase().startsWith('data:')) {
    return false
  }

  // Rechazar http:// (solo https permitido)
  if (url.toLowerCase().startsWith('http://')) return false

  // Rechazar caracteres peligrosos en URL
  if (url.includes(' ') || url.includes('\n') || url.includes('\r') || url.includes('\t')) {
    return false
  }

  // Aceptar rutas relativas: /path/to/image.png
  if (url.startsWith('/')) return true

  // Aceptar protocol-relative: //cdn.example/image.png
  if (url.startsWith('//')) return true

  // Aceptar https://
  if (url.toLowerCase().startsWith('https://')) return true

  // Rechazar todo lo demás
  return false
}

/** Escapa HTML, trunca a maxLength, devuelve string limpio */
export function sanitizeText(text: unknown, maxLength: number = 500): string {
  // Convertir no-strings a vacío
  if (typeof text !== 'string') return ''

  // Remover etiquetas HTML: <script>, <b>, etc.
  const cleaned = text.replace(/<[^>]*>/g, '')

  // Truncar a maxLength
  if (cleaned.length > maxLength) {
    return cleaned.slice(0, maxLength)
  }

  return cleaned
}

/**
 * Logger mínimo del backend. Centraliza el registro para que los errores en
 * hot paths sean visibles y consistentes (en vez de `console.*` dispersos).
 * No silencia: el error se escribe con nivel, marca de tiempo y contexto.
 */
export const logger = {
  /**
   * Acciones que conviene poder rastrear después aunque no sean errores:
   * quién restableció la contraseña de quién, quién borró qué cuenta.
   */
  info(context: string, msg: string): void {
    console.log(`[${new Date().toISOString()}] INFO ${context}: ${msg}`)
  },
  error(context: string, err: unknown): void {
    const msg = err instanceof Error ? `${err.message}\n${err.stack ?? ''}` : String(err)
    console.error(`[${new Date().toISOString()}] ERROR ${context}: ${msg}`)
  },
  warn(context: string, msg: string): void {
    console.warn(`[${new Date().toISOString()}] WARN ${context}: ${msg}`)
  },
}
