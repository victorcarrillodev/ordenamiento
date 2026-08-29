import { handleRequest, init } from './app.ts'
import { MAX_TOTAL_BYTES } from './files/limits.ts'
import { logger } from './utils.ts'

const PORT = Number(process.env.PORT ?? 5920)

await init()

Bun.serve({
  port: PORT,
  maxRequestBodySize: MAX_TOTAL_BYTES + 16 * 1024 * 1024,
  fetch(request) {
    return handleRequest(request).catch((err) => {
      console.error('[server] error', err)
      return new Response(JSON.stringify({ error: 'Error interno' }), {
        status: 500,
        headers: { 'content-type': 'application/json' },
      })
    })
  },
})

console.log(`[server] backend escuchando en http://localhost:${PORT}`)
