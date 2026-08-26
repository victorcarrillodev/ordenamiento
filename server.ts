import * as http from 'node:http'
import { createRequestListener } from 'remix/node-fetch-server'

import { router } from './app/router.ts'

const port = process.env.PORT ? Number.parseInt(process.env.PORT, 10) : 44100
const hmrProxyPort = process.env.HMR_PROXY_PORT
  ? Number.parseInt(process.env.HMR_PROXY_PORT, 10)
  : null

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
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://unpkg.com https://cdn.jsdelivr.net",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://unpkg.com https://cdn.jsdelivr.net",
      "font-src 'self' https://fonts.gstatic.com data:",
      "img-src 'self' data: blob: https://*.tile.openstreetmap.org https://tile.openstreetmap.org https://unpkg.com",
      "connect-src 'self' http://localhost:* ws://localhost:* ws: wss:",
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

const server = http.createServer(
  createRequestListener(async (request: Request) => {
    try {
      const res = await router.fetch(request)
      return withSecurityHeaders(res)
    } catch (error) {
      if (!(request.signal.aborted && error === request.signal.reason)) {
        console.error(error)
      }
      return withSecurityHeaders(errorPage('500'))
    }
  }),
)

/** Página de error con la imagen institucional (public/image/errores/<code>.png). */
function errorPage(code: '404' | '401' | '403' | '429' | '500' | '503'): Response {
  const html = `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Error ${code}</title><style>body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;background:#f4f6fb;font-family:Montserrat,system-ui,sans-serif;color:#2b3445}img{max-width:min(90vw,520px);height:auto;border-radius:12px}</style></head><body><img src="/image/errores/${code}.png" alt="Error ${code}"></body></html>`
  return new Response(html, {
    status: Number(code),
    headers: { 'content-type': 'text/html; charset=utf-8' },
  })
}

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
