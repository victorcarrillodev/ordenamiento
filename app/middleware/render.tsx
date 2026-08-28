import * as path from 'node:path'

import type { Router } from 'remix/router'
import { renderWith } from 'remix/middleware/render'
import { createHtmlResponse } from 'remix/response/html'
import type { RemixNode } from 'remix/ui'
import { renderToStream } from 'remix/ui/server'

import { assetServer } from '../assets.ts'

/**
 * Cabeceras de seguridad (OWASP Secure Headers Project) aplicadas a toda
 * respuesta HTML renderizada. Los orígenes externos de la CSP son los que el
 * sitio usa realmente: Google Fonts, Iconify, unpkg (Leaflet) y los tiles
 * ArcGIS/OSM del mapa.
 */
const SECURITY_HEADERS: Record<string, string> = {
  'content-security-policy': [
    "default-src 'self'",
    "script-src 'self' https://code.iconify.design https://unpkg.com",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://unpkg.com",
    "font-src 'self' https://fonts.gstatic.com",
    "img-src 'self' data: blob: https:",
    "connect-src 'self' https://api.iconify.design",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'self'",
  ].join('; '),
  'x-content-type-options': 'nosniff',
  'x-frame-options': 'SAMEORIGIN',
  'referrer-policy': 'strict-origin-when-cross-origin',
  'permissions-policy': 'geolocation=(), microphone=(), camera=(), payment=()',
  'cross-origin-opener-policy': 'same-origin',
}

export function render() {
  return renderWith(
    ({ request, router }) =>
      function render(node: RemixNode, init?: ResponseInit) {
        const stream = renderToStream(node, {
          frameSrc: request.url,
          signal: request.signal,
          resolveFrame: (src) => resolveFrame(router, request, src),
          // Server rendering turns client entries into browser module URLs and preloads.
          async resolveClientEntry(entryId, component) {
            if (!entryId.startsWith('file://')) {
              throw new Error(
                `Expected \`import.meta.url\` for clientEntry ID, received '${entryId}'`,
              )
            }

            const [href, preloads] = await Promise.all([
              assetServer.getHref(entryId),
              assetServer.getPreloads(entryId),
            ])

            return {
              href,
              exportName: entryId.split('#')[1] || component.name || titleCaseFileName(entryId),
              preloads,
            }
          },
        })

        const headers = new Headers(init?.headers)
        for (const [name, value] of Object.entries(SECURITY_HEADERS)) {
          if (!headers.has(name)) headers.set(name, value)
        }
        return createHtmlResponse(stream, { ...init, headers })
      },
  )
}

async function resolveFrame(router: Router, request: Request, src: string) {
  const url = new URL(src, request.url)

  const headers = new Headers()
  headers.set('Accept', 'text/html')

  const cookie = request.headers.get('Cookie')
  if (cookie) headers.set('Cookie', cookie)

  const response = await router.fetch(
    new Request(url, {
      method: 'GET',
      headers,
      signal: request.signal,
    }),
  )

  if (!response.ok) {
    return `<pre>Frame error: ${response.status} ${response.statusText}</pre>`
  }

  // El cuerpo se inserta TAL CUAL dentro del documento. Si la respuesta no es
  // HTML (un PDF, una imagen, un .docx…) volcarla aquí corrompe la página y el
  // recurso nunca se ve. Para esos casos usar <object>/<embed>, no <iframe>.
  const contentType = response.headers.get('content-type') ?? ''
  if (!contentType.includes('text/html')) {
    await response.body?.cancel()
    return `<pre>Frame error: contenido no HTML (${contentType || 'desconocido'}); use &lt;object&gt; para incrustarlo</pre>`
  }

  if (response.body) return response.body
  return await response.text()
}

function titleCaseFileName(fileUrl: string): string {
  const url = new URL(fileUrl)
  const fileName = path.basename(url.pathname, path.extname(url.pathname))
  return fileName
    .split(/[^A-Za-z0-9]+/)
    .filter(Boolean)
    .map((segment) => segment[0]!.toUpperCase() + segment.slice(1))
    .join('')
}
