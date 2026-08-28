import * as http from 'node:http'
import { createRequestListener } from 'remix/node-fetch-server'

import { router } from './app/router.ts'
import { cargarCatalogo } from './app/data/colonias.ts'

// Servidor principal de Ordenamiento Territorial – San Pedro Tlaquepaque

// Precalentar catálogo SEPOMEX de Jalisco en memoria RAM en el arranque
cargarCatalogo()
  .then((cat) => {
    console.log(
      `[server] Catálogo SEPOMEX de Jalisco precalentado en memoria (${cat.length} entradas)`,
    )
  })
  .catch((err) => {
    console.warn('[server] Aviso al precalentar catálogo:', err)
  })

const port = process.env.PORT ? Number.parseInt(process.env.PORT, 10) : 44100
const hmrProxyPort = process.env.HMR_PROXY_PORT
  ? Number.parseInt(process.env.HMR_PROXY_PORT, 10)
  : null

function withCacheHeaders(response: Response, request: Request): Response {
  const headers = new Headers(response.headers)
  const url = request.url

  // Assets con hash: cache de 1 año (versionado automático)
  if (url.includes('/assets/') || /\.[a-f0-9]{8}\.(js|css|jpg|png|webp|woff|woff2)$/.test(url)) {
    headers.set('Cache-Control', 'public, max-age=31536000, immutable')
  }
  // Documentos estáticos: cache de 1 semana
  else if (/\.(pdf|xlsx|docx|txt)$/.test(url)) {
    headers.set('Cache-Control', 'public, max-age=604800')
  }
  // HTML: no cachear (siempre fresh)
  else if (response.headers.get('content-type')?.includes('text/html')) {
    headers.set('Cache-Control', 'no-cache, no-store, must-revalidate')
    headers.set('Pragma', 'no-cache')
    headers.set('Expires', '0')
  }

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  })
}

function withSecurityHeaders(response: Response): Response {
  const headers = new Headers(response.headers)

  // HSTS largo (2 años con subdominios y preload) en producción o si viene por HTTPS
  if (process.env.NODE_ENV === 'production') {
    headers.set('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload')
  }

  // Prevenir clickjacking
  if (!headers.has('X-Frame-Options')) {
    headers.set('X-Frame-Options', 'SAMEORIGIN')
  }

  // Prevenir MIME type sniffing
  if (!headers.has('X-Content-Type-Options')) {
    headers.set('X-Content-Type-Options', 'nosniff')
  }

  // Referrer Policy
  if (!headers.has('Referrer-Policy')) {
    headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  }

  // Permissions Policy
  if (!headers.has('Permissions-Policy')) {
    headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=(self)')
  }

  // Content Security Policy (CSP)
  if (!headers.has('Content-Security-Policy')) {
    const cspDirectives = [
      "default-src 'self'",
      "script-src 'self' https://unpkg.com https://cdn.jsdelivr.net https://code.iconify.design",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://unpkg.com https://cdn.jsdelivr.net",
      "font-src 'self' https://fonts.gstatic.com data:",
      "img-src 'self' data: blob: https://*.tile.openstreetmap.org https://tile.openstreetmap.org https://unpkg.com https:",
      "connect-src 'self' http://localhost:* ws://localhost:* ws: wss: https://api.iconify.design",
      "frame-ancestors 'self'",
      "base-uri 'self'",
      "form-action 'self'",
    ]
    headers.set('Content-Security-Policy', cspDirectives.join('; '))
  }

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  })
}

const basePath = (process.env.BASE_PATH ?? '/ordena').replace(/\/$/, '')
const server = http.createServer(
  createRequestListener(async (request: Request) => {
    try {
      const res = await router.fetch(request)
      // Si la respuesta es exitosa, es una redirección, o ya es HTML con estado de error, servir directamente
      if (res) {
        const isRedirect = res.status >= 300 && res.status < 400
        const isHtml = res.headers.get('content-type')?.includes('text/html')
        const isApiOrAsset =
          request.url.includes('/api/') ||
          request.url.includes('/assets/') ||
          request.url.includes('.css') ||
          request.url.includes('.js') ||
          request.url.includes('.png') ||
          request.url.includes('.svg')

        if (res.ok || isRedirect || isHtml || isApiOrAsset) {
          return withSecurityHeaders(withCacheHeaders(res, request))
        }
      }

      // Si la ruta no existe (404 / null) o no devolvió HTML para un error, servir vista de error institucional
      const status = res ? res.status : 404
      const validStatus = [400, 401, 403, 404, 429, 500, 502, 503, 504].includes(status)
        ? status
        : 404
      const errorUrl = new URL(`${basePath}/error/${validStatus}`, request.url)
      const errorRes = await router.fetch(new Request(errorUrl, request))
      if (errorRes) {
        return withSecurityHeaders(withCacheHeaders(errorRes, request))
      }

      return withSecurityHeaders(withCacheHeaders(res || new Response('Not Found', { status: 404 }), request))
    } catch (error) {
      if (!(request.signal.aborted && error === request.signal.reason)) {
        console.error(error)
      }
      try {
        const errorUrl = new URL(`${basePath}/error/500`, request.url)
        const errorRes = await router.fetch(new Request(errorUrl, request))
        if (errorRes) return withSecurityHeaders(errorRes)
      } catch {
        // Fallback silencioso
      }
      return withSecurityHeaders(
        new Response('Error interno del servidor', {
          status: 500,
          headers: { 'content-type': 'text/plain; charset=utf-8' },
        }),
      )
    }
  }),
)

server.listen(port, () => {
  if (process.env.REMIX_NODE_HMR) {
    import('remix/node-hmr/runtime').then((nodeHmr) => nodeHmr.emitServerReady())
  }

  console.log(`Server listening on http://localhost:${hmrProxyPort ?? port}`)
})

let shuttingDown = false

function shutdown() {
  if (shuttingDown) {
    return
  }

  shuttingDown = true
  server.close(() => process.exit(0))
  server.closeAllConnections()
}

process.on('SIGINT', shutdown)
process.on('SIGTERM', shutdown)
