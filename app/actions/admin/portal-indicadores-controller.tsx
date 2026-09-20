import { redirect } from 'remix/response/redirect'
import { createController } from 'remix/router'

import { backendFetch, fetchJsonOr, olvidarTemaPublico, requireAdminUser } from '../../backend.ts'
import type { DocumentoPublico } from '../../data/programa.ts'
import { adminRoutes } from '../../routes.ts'
import type { ThemeData } from '../../ui/civic-horizon.ts'
import { PortalIndicadoresPage, type IndicadorAdmin } from './portal-indicadores-page.tsx'

/**
 * Lo que dibuja la página: los indicadores, los documentos que pueden servir
 * de respaldo (archivos de actividades publicadas: el informe de evaluación se
 * publica como una actividad más) y si el Programa ya está aprobado.
 */
async function datosDeLaPagina(request: Request) {
  const [indData, docsData, temaData] = await Promise.all([
    fetchJsonOr<{ indicadores: IndicadorAdmin[] }>(request, '/api/indicadores', {
      indicadores: [],
    }),
    fetchJsonOr<{ documentos: DocumentoPublico[] }>(request, '/api/actividades/documentos', {
      documentos: [],
    }),
    // Sin la caché del portal: aquí se acaba de cambiar y se quiere ver ya.
    fetchJsonOr<{ theme: ThemeData }>(request, '/api/settings/theme', { theme: null }),
  ])
  return {
    indicadores: indData.indicadores ?? [],
    documentos: docsData.documentos ?? [],
    programaAprobado: temaData.theme?.programa?.aprobado === true,
  }
}

export default createController(adminRoutes.indicadores, {
  actions: {
    async index(context) {
      const user = await requireAdminUser(context.request)
      if (user instanceof Response) return user
      const ok = new URL(context.request.url).searchParams.get('ok')
      return context.render(
        <PortalIndicadoresPage
          user={user}
          {...await datosDeLaPagina(context.request)}
          programaCambiado={ok === 'programa'}
        />,
      )
    },

    async action(context) {
      const user = await requireAdminUser(context.request)
      if (user instanceof Response) return user

      const formData = await context.request.formData()
      const intent = String(formData.get('intent') ?? 'crear')
      const conError = async (error: string, status: number) =>
        context.render(
          <PortalIndicadoresPage
            user={user}
            {...await datosDeLaPagina(context.request)}
            error={error}
          />,
          { status },
        )

      if (intent === 'programa') {
        // Se guarda con la configuración del portal, que deja constancia de
        // quién lo cambió y por qué (bitácora de Personalización).
        const aprobado = formData.get('aprobado') === '1'
        const response = await backendFetch(context.request, '/api/settings/theme', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            config: { programa: { aprobado } },
            motivo: aprobado
              ? 'Programa aprobado: se publica «Seguimiento y evaluación»'
              : 'Programa en elaboración: se retira «Seguimiento y evaluación»',
            section: 'general',
          }),
        })
        if (!response.ok)
          return conError('No se pudo cambiar el estado del Programa', response.status)
        olvidarTemaPublico()
        return redirect(`${adminRoutes.indicadores.index.href()}?ok=programa`)
      }

      if (intent === 'eliminar') {
        const id = String(formData.get('id') ?? '').trim()
        const response = await backendFetch(
          context.request,
          `/api/indicadores/${encodeURIComponent(id)}`,
          { method: 'DELETE' },
        )
        if (!response.ok) return conError('No se pudo eliminar', response.status)
        return redirect(adminRoutes.indicadores.index.href())
      }

      // crear (editar se hace vía PUT pero formulario solo hace crear por ahora)
      const nombre = String(formData.get('nombre') ?? '').trim()
      const descripcion = String(formData.get('descripcion') ?? '').trim()
      const unidad = String(formData.get('unidad') ?? '').trim()
      const metaRaw = String(formData.get('meta') ?? '').trim()
      // Un texto no numérico no debe llegar al backend como NaN: se trata como sin meta.
      const meta = metaRaw !== '' && Number.isFinite(Number(metaRaw)) ? Number(metaRaw) : null
      const fecha_evaluacion = String(formData.get('fecha_evaluacion') ?? '').trim() || null
      const resultado_texto = String(formData.get('resultado_texto') ?? '').trim() || null
      const documento_respaldo_id = String(formData.get('documento_respaldo') ?? '').trim() || null

      const mediciones: Array<{ periodo: string; valor: number }> = []
      for (let i = 1; i <= 3; i++) {
        const periodo = String(formData.get(`periodo_${i}`) ?? '').trim()
        const valorRaw = String(formData.get(`valor_${i}`) ?? '').trim()
        if (periodo && valorRaw !== '') {
          const valor = Number(valorRaw)
          if (Number.isFinite(valor)) mediciones.push({ periodo, valor })
        }
      }

      const body: Record<string, unknown> = {
        nombre,
        descripcion,
        unidad,
        meta,
        fecha_evaluacion,
        resultado_texto,
        documento_respaldo_id,
        mediciones,
      }
      // si es edición, usar PUT
      const editarId = String(formData.get('editar_id') ?? '').trim()
      const path = editarId
        ? `/api/indicadores/${encodeURIComponent(editarId)}`
        : '/api/indicadores'
      const method = editarId ? 'PUT' : 'POST'

      const response = await backendFetch(context.request, path, {
        method,
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
      })

      if (!response.ok) {
        const errData = (await response.json().catch(() => ({}))) as { error?: string }
        return conError(errData.error ?? 'No se pudo guardar el indicador', response.status)
      }

      return redirect(adminRoutes.indicadores.index.href())
    },
  },
})
