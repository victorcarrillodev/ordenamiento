import { redirect } from 'remix/response/redirect'
import { createController } from 'remix/router'

import { assetServer } from '../assets.ts'
import { fetchJsonOr, getPublicTheme, logoutBackend } from '../backend.ts'
import { sugerirColonias, sugerirMunicipios } from '../data/colonias.ts'
import { routes } from '../routes.ts'
import { HomePage } from './home-page.tsx'
import type { ReunionPublica } from './public/reuniones-calendario.tsx'
import { marcaAction } from './marca-controller.tsx'
import { ErrorPage } from './error-page.tsx'

/** Cuántas sugerencias devuelve el autocompletado por consulta. */
const SUGERENCIAS_POR_CONSULTA = 12

export default createController(routes, {
  actions: {
    async assets(context) {
      return (
        (await assetServer.fetch(context.request)) ?? new Response('Not Found', { status: 404 })
      )
    },
    async home(context) {
      const [theme, reunionesData] = await Promise.all([
        getPublicTheme(context.request),
        fetchJsonOr<{ reuniones: ReunionPublica[] }>(context.request, '/api/reuniones/activas', {
          reuniones: [],
        }),
      ])
      return context.render(
        <HomePage theme={theme} reuniones={reunionesData.reuniones ?? []} />,
      )
    },
    async homeSlash(context) {
      const [theme, reunionesData] = await Promise.all([
        getPublicTheme(context.request),
        fetchJsonOr<{ reuniones: ReunionPublica[] }>(context.request, '/api/reuniones/activas', {
          reuniones: [],
        }),
      ])
      return context.render(
        <HomePage theme={theme} reuniones={reunionesData.reuniones ?? []} />,
      )
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
    error(context) {
      const code = Number(context.params.code) || 404
      return context.render(<ErrorPage code={code} />, { status: code })
    },
    errorDefault(context) {
      return context.render(<ErrorPage code={404} />, { status: 404 })
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
