import * as http from 'node:http'
import { createRequestListener } from 'remix/node-fetch-server'

import { router } from './app/router.ts'

const port = process.env.PORT ? Number.parseInt(process.env.PORT, 10) : 44100
const hmrProxyPort = process.env.HMR_PROXY_PORT
  ? Number.parseInt(process.env.HMR_PROXY_PORT, 10)
  : null

const server = http.createServer(
  createRequestListener(async (request) => {
    try {
      return await router.fetch(request)
    } catch (error) {
      if (!(request.signal.aborted && error === request.signal.reason)) {
        console.error(error)
      }
      return errorPage('500')
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
