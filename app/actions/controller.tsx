import { redirect } from 'remix/response/redirect'
import { createController } from 'remix/router'
import type { RemixNode } from 'remix/ui'

import { assetServer } from '../assets.ts'
import { fetchJsonOr, getPublicTheme, logoutBackend } from '../backend.ts'
import { sugerirColonias, sugerirMunicipios } from '../data/colonias.ts'
import { routes } from '../routes.ts'
import type { ActividadPublica, AvisoPortada } from '../data/programa.ts'
import { HomePage } from './home-page.tsx'
import { marcaAction } from './marca-controller.tsx'
import { ErrorPage } from './error-page.tsx'

/** Cuántas sugerencias devuelve el autocompletado por consulta. */
const SUGERENCIAS_POR_CONSULTA = 12

/** La portada muestra las tres actividades más próximas (ver la propuesta). */
const PROXIMAS_EN_PORTADA = 3

/**
 * Portada. Si el backend no responde, cada bloque cae a su versión vacía (sin
 * franja de aviso, «no hay actividades programadas») y el resto sigue en pie.
 */
async function renderHome(context: { request: Request; render: (node: RemixNode) => Response }) {
  const [theme, avisoData, proximasData] = await Promise.all([
    getPublicTheme(context.request),
    fetchJsonOr<{ aviso: AvisoPortada | null }>(context.request, '/api/actividades/aviso', {
      aviso: null,
    }),
    fetchJsonOr<{ actividades: ActividadPublica[] }>(
      context.request,
      `/api/actividades?vista=proximas&limite=${PROXIMAS_EN_PORTADA}`,
      { actividades: [] },
    ),
  ])
  return context.render(
    <HomePage
      theme={theme}
      aviso={avisoData.aviso ?? null}
      proximas={proximasData.actividades ?? []}
    />,
  )
}

export default createController(routes, {
  actions: {
    async assets(context) {
      return (
        (await assetServer.fetch(context.request)) ?? new Response('Not Found', { status: 404 })
      )
    },
    home(context) {
      return renderHome(context)
    },
    homeSlash(context) {
      return renderHome(context)
    },
    participationLogin() {
      return redirect(routes.login.index.href())
    },
    /** Imágenes subidas en Personalización (ver marca-controller.tsx). */
    marca(context) {
      return marcaAction(context.request, context.params.path)
    },
    /** Endpoint de búsqueda y sugerencias de colonias y municipios de Jalisco para autocomplete */
    async colonias(context) {
      const url = new URL(context.request.url)
      const q = url.searchParams.get('q') ?? ''
      const tipo = url.searchParams.get('tipo') ?? 'colonia'
      const municipio = url.searchParams.get('municipio') ?? undefined

      const items =
        tipo === 'municipio'
          ? await sugerirMunicipios(q, SUGERENCIAS_POR_CONSULTA)
          : await sugerirColonias(q, municipio, SUGERENCIAS_POR_CONSULTA)

      return Response.json(
        { items },
        {
          headers: {
            'cache-control': 'public, max-age=86400, stale-while-revalidate=604800',
          },
        },
      )
    },
    /**
     * Vistas de error institucionales (400, 401, 403, 404, 429, 500, 502, 503, 504)
     */
    async error(context) {
      const code = Number(context.params.code) || 404
      return context.render(
        <ErrorPage code={code} theme={await getPublicTheme(context.request)} />,
        { status: code },
      )
    },
    async errorDefault(context) {
      return context.render(
        <ErrorPage code={404} theme={await getPublicTheme(context.request)} />,
        { status: 404 },
      )
    },
    /**
     * El botón "Cerrar sesión" del panel admin solo enlazaba a /login sin
     * llamar nunca a esta ruta: la cookie de sesión seguía siendo válida y
     * volver a entrar a /admin/* funcionaba igual que antes de "salir".
     */
    async logout(context) {
      const setCookie = await logoutBackend(context.request)
      return redirect(routes.login.index.href(), {
        headers: setCookie ? { 'set-cookie': setCookie } : undefined,
      })
    },
  },
})
