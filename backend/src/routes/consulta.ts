/**
 * Etapa de la consulta pública.
 *
 *  · `GET /api/consulta` — pública: la etapa y sus fechas. El portal la usa para
 *    decidir qué mostrar.
 *  · `PUT /api/consulta` — admin: `{ "etapa": "abierta" | "concluida" | "pendiente" }`.
 */
import {
  cambiarEtapaConsulta,
  esEtapaConsulta,
  leerEstadoConsulta,
  programarConsulta,
} from '../services/consulta.ts'
import { bodyTooLarge, json, logger } from '../utils.ts'
import { exigirAdmin, type ManejadorRuta } from './ruta.ts'

export const rutasConsulta: ManejadorRuta = async (ctx) => {
  if (ctx.url.pathname !== '/api/consulta') return null

  if (ctx.method === 'GET') return json(await leerEstadoConsulta())

  if (ctx.method === 'PUT') {
    const prohibido = exigirAdmin(ctx)
    if (prohibido) return prohibido
    if (bodyTooLarge(ctx.request, 4 * 1024))
      return json({ error: 'Petición demasiado grande' }, 413)

    const cuerpo = (await ctx.request.json().catch(() => ({}))) as {
      etapa?: unknown
      accion?: unknown
      inicio?: unknown
      cierre?: unknown
    }
    if (cuerpo.accion === 'programar') {
      try {
        const resultado = await programarConsulta(cuerpo.inicio, cuerpo.cierre, ctx.user!)
        return resultado.ok
          ? json(await leerEstadoConsulta())
          : json({ error: resultado.error }, 400)
      } catch (err) {
        logger.error('consulta.programar', err)
        return json({ error: 'No se pudo guardar la programación' }, 500)
      }
    }
    if (!esEtapaConsulta(cuerpo.etapa)) {
      return json({ error: 'etapa inválida: pendiente, abierta o concluida' }, 400)
    }
    try {
      const resultado = await cambiarEtapaConsulta(cuerpo.etapa, ctx.user!)
      return resultado.ok ? json(resultado.estado) : json({ error: resultado.error }, 409)
    } catch (err) {
      logger.error('consulta.cambiar', err)
      return json({ error: 'No se pudo cambiar la etapa de la consulta' }, 500)
    }
  }

  return null
}
