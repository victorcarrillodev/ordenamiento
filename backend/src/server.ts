import { handleRequest, init } from './app.ts'
import { MAX_TOTAL_BYTES } from './files/limits.ts'
import { logger } from './utils.ts'

const PORT = Number(process.env.PORT ?? 5920)

// Un fallo aquí (schema/migración) mata el proceso antes de que el healthcheck
// llegue a correr, y Docker solo reporta «container is unhealthy», que no dice
// nada. Se traduce a un mensaje que apunta al log real antes de salir.
try {
  await init()
} catch (err) {
  logger.error('init', err)
  console.error(
    '[server] arranque abortado: falló la migración o la aplicación del schema. ' +
      'El error de Postgres va justo arriba.',
  )
  process.exit(1)
}

Bun.serve({
  port: PORT,
  maxRequestBodySize: MAX_TOTAL_BYTES + 16 * 1024 * 1024,
  fetch(request) {
    return handleRequest(request).catch((err) => {
      logger.error('server.handleRequest', err)
      return new Response(JSON.stringify({ error: 'Error interno' }), {
        status: 500,
        headers: { 'content-type': 'application/json' },
      })
    })
  },
})

console.log(`[server] backend escuchando en http://localhost:${PORT}`)
