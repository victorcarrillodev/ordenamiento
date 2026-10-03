/**
 * Registro presencial — el selector entre captura asistida y llenado a mano, y
 * los formatos para imprimir. Las dos acciones y el PDF cuelgan del controller
 * del panel; aquí vive su lógica.
 */
import { redirect } from 'remix/response/redirect'
import type { RemixNode } from 'remix/ui'

import { backendFetch, fetchJsonOr, requireAdminUser } from '../../backend.ts'
import { esEtapaConsulta, type EtapaConsulta } from '../../data/consulta.ts'
import { adminRoutes } from '../../routes.ts'
import { respuestaDeArchivo } from '../../utils/archivo-proxy.ts'
import { PresencialPage, type FormatoPendiente } from './presencial-page.tsx'

interface Contexto {
  request: Request
  params: { id: string }
  render: (node: RemixNode, init?: ResponseInit) => Response
}

/** Los formatos pendientes y la etapa de la consulta: lo que dibuja la página. */
async function datos(request: Request) {
  const [formatos, consulta] = await Promise.all([
    fetchJsonOr<{ formatos: FormatoPendiente[] }>(request, '/api/formatos?estado=pendiente', {
      formatos: [],
    }),
    fetchJsonOr<{ etapa: EtapaConsulta }>(request, '/api/consulta', { etapa: 'pendiente' }),
  ])
  return {
    pendientes: formatos.formatos ?? [],
    etapa: esEtapaConsulta(consulta.etapa) ? consulta.etapa : ('pendiente' as const),
  }
}

export async function presencialAction(context: Omit<Contexto, 'params'>): Promise<Response> {
  const user = await requireAdminUser(context.request)
  if (user instanceof Response) return user

  const { pendientes, etapa } = await datos(context.request)
  const generadoId = new URL(context.request.url).searchParams.get('generado')
  const generado = generadoId ? pendientes.find((f) => f.id === generadoId) : undefined
  return context.render(
    <PresencialPage user={user} etapa={etapa} pendientes={pendientes} generado={generado} />,
  )
}

/** Entrar por GET a la dirección de generar un formato (recargar tras generarlo) lleva al selector. */
export function formatoNuevoIndexAction(): Response {
  return redirect(adminRoutes.presencial.href())
}

/** Genera un formato (reserva su folio) y vuelve al selector con su descarga lista. */
export async function formatoNuevoAction(context: Omit<Contexto, 'params'>): Promise<Response> {
  const user = await requireAdminUser(context.request)
  if (user instanceof Response) return user

  const response = await backendFetch(context.request, '/api/formatos', { method: 'POST' })
  if (!response.ok) {
    const data = (await response.json().catch(() => ({}))) as { error?: string }
    const { pendientes, etapa } = await datos(context.request)
    return context.render(
      <PresencialPage
        user={user}
        etapa={etapa}
        pendientes={pendientes}
        error={data.error ?? 'No se pudo generar el formato.'}
      />,
      { status: response.status },
    )
  }
  const formato = (await response.json()) as { id: string }
  return redirect(`${adminRoutes.presencial.href()}?generado=${encodeURIComponent(formato.id)}`)
}

/** El formato en blanco con su folio, siempre como descarga: es para imprimirlo. */
export async function formatoPdfAction(context: Contexto): Promise<Response> {
  const user = await requireAdminUser(context.request)
  if (user instanceof Response) return user

  const response = await backendFetch(
    context.request,
    `/api/formatos/${encodeURIComponent(context.params.id)}/pdf`,
  )
  if (!response.ok) return new Response('Not Found', { status: response.status })
  return respuestaDeArchivo(response, true)
}
