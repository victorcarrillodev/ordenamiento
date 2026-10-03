/**
 * Páginas públicas del Programa (POETDUM). Todo sale del mismo registro de
 * cada actividad; el backend decide qué va en cada vista y solo entrega lo
 * publicado. Si el backend no responde, cada página cae a su versión vacía.
 */
import { createController } from 'remix/router'

import { backendFetch, fetchJsonOr, getPublicTheme } from '../../backend.ts'
import {
  esFasePrograma,
  esTipoArchivo,
  TIPO_FOTOGRAFIA,
  type ActividadPublica,
  type DocumentoPublico,
} from '../../data/programa.ts'
import { etapaDeConsulta } from '../../data/consulta.ts'
import { PAGINA_VACIA, type PaginaPublica } from '../../data/participaciones-publicas.ts'
import { PROYECTO_VACIO, type ProyectoPublico } from '../../data/proyecto.ts'
import { routes } from '../../routes.ts'
import { pideDescarga, respuestaDeArchivo } from '../../utils/archivo-proxy.ts'
import { claveMes, hoyEnMexico, parsearFecha, parsearMes } from '../../utils/calendario.ts'
import { AvancesPage } from './avances-page.tsx'
import { CalendarioPage } from './calendario-page.tsx'
import { SeguimientoPage } from './seguimiento-page.tsx'
import { PoetdumPage } from './show-page.tsx'
import type { Indicador } from './types.ts'

/** Cuántos avances recientes y próximas actividades muestra el hub. */
const EN_EL_HUB = 3

const actividadesDe = (request: Request, consulta: string) =>
  fetchJsonOr<{ actividades: ActividadPublica[] }>(request, `/api/actividades?${consulta}`, {
    actividades: [],
  }).then((d) => d.actividades ?? [])

const indicadoresDe = (request: Request) =>
  fetchJsonOr<{ indicadores: Indicador[] }>(request, '/api/indicadores', { indicadores: [] }).then(
    (d) => d.indicadores ?? [],
  )

export default createController(routes.poetdum, {
  actions: {
    async show(context) {
      const params = new URL(context.request.url).searchParams
      // Filtros del repositorio: un valor inventado se ignora en vez de romper.
      const tipoParam = params.get('tipo')
      const faseParam = params.get('fase')
      const tipo = esTipoArchivo(tipoParam) && tipoParam !== TIPO_FOTOGRAFIA ? tipoParam : ''
      const fase = esFasePrograma(faseParam) ? faseParam : ''
      const filtros = new URLSearchParams()
      if (tipo) filtros.set('tipo', tipo)
      if (fase) filtros.set('fase', fase)

      // Buscador de «Participaciones y respuestas»: un valor raro se acota, no rompe.
      const busqueda = (params.get('folio') ?? '').trim().slice(0, 40)
      const pagina = Number(params.get('pagina'))
      const paginaPedida = Number.isInteger(pagina) && pagina > 0 ? pagina : 1

      const [theme, proximas, avances, documentos, indicadores, proyecto, participaciones] =
        await Promise.all([
          getPublicTheme(context.request),
          actividadesDe(context.request, `vista=proximas&limite=${EN_EL_HUB}`),
          actividadesDe(context.request, 'vista=avances'),
          fetchJsonOr<{ documentos: DocumentoPublico[] }>(
            context.request,
            `/api/actividades/documentos${filtros.size ? `?${filtros}` : ''}`,
            { documentos: [] },
          ).then((d) => d.documentos ?? []),
          indicadoresDe(context.request),
          fetchJsonOr<ProyectoPublico>(context.request, '/api/proyecto', PROYECTO_VACIO),
          fetchJsonOr<PaginaPublica>(
            context.request,
            `/api/participaciones-publicas?page=${paginaPedida}${busqueda ? `&folio=${encodeURIComponent(busqueda)}` : ''}`,
            PAGINA_VACIA,
          ),
        ])

      return context.render(
        <PoetdumPage
          theme={theme}
          etapaConsulta={etapaDeConsulta(theme)}
          proyecto={{ ...PROYECTO_VACIO, ...proyecto }}
          participaciones={{ ...PAGINA_VACIA, ...participaciones }}
          busqueda={busqueda}
          proximas={proximas}
          avancesRecientes={avances.slice(-EN_EL_HUB).reverse()}
          documentos={documentos}
          tipo={tipo}
          fase={fase}
          programaAprobado={theme?.programa?.aprobado === true}
          indicadores={indicadores}
        />,
      )
    },

    /**
     * Proxy de los PDF del Proyecto del Programa. El backend decide si se pueden
     * ver (con la consulta pendiente solo el panel) y calcula la disposición.
     */
    async proyectoArchivo(context) {
      const descarga = pideDescarga(context.request)
      const response = await backendFetch(
        context.request,
        `/api/proyecto/documentos/${encodeURIComponent(context.params.id)}/archivo${descarga ? '?download=1' : ''}`,
      )
      if (!response.ok) return new Response('Not Found', { status: 404 })
      return respuestaDeArchivo(response, descarga)
    },

    /**
     * Proxy de la versión pública de una participación o de su oficio de
     * respuesta. Solo salen los publicados: para el resto, el backend responde
     * 404 igual que para un folio que no existe.
     */
    async participacionArchivo(context) {
      const { folio, documento } = context.params
      if (documento !== 'participacion' && documento !== 'oficio') {
        return new Response('Not Found', { status: 404 })
      }
      const descarga = pideDescarga(context.request)
      const response = await backendFetch(
        context.request,
        `/api/participaciones-publicas/${encodeURIComponent(folio)}/${documento}${descarga ? '?download=1' : ''}`,
      )
      if (!response.ok) return new Response('Not Found', { status: 404 })
      return respuestaDeArchivo(response, descarga)
    },

    async avances(context) {
      const faseParam = new URL(context.request.url).searchParams.get('fase')
      const fase = esFasePrograma(faseParam) ? faseParam : ''
      const [theme, avances] = await Promise.all([
        getPublicTheme(context.request),
        actividadesDe(
          context.request,
          `vista=avances${fase ? `&fase=${encodeURIComponent(fase)}` : ''}`,
        ),
      ])
      return context.render(<AvancesPage theme={theme} avances={avances} fase={fase} />)
    },

    async calendario(context) {
      const hoy = hoyEnMexico()
      // Un `?mes=` inválido no es un error: se muestra el mes actual.
      const mes =
        parsearMes(new URL(context.request.url).searchParams.get('mes')) ?? parsearFecha(hoy)
      const [theme, actividades] = await Promise.all([
        getPublicTheme(context.request),
        actividadesDe(context.request, `vista=calendario&mes=${claveMes(mes.anio, mes.mes)}`),
      ])
      return context.render(
        <CalendarioPage
          theme={theme}
          actividades={actividades}
          anio={mes.anio}
          mes={mes.mes}
          hoy={hoy}
        />,
      )
    },

    async seguimiento(context) {
      const theme = await getPublicTheme(context.request)
      const programaAprobado = theme?.programa?.aprobado === true
      // Mientras el Programa no esté aprobado no se consultan indicadores.
      const indicadores = programaAprobado ? await indicadoresDe(context.request) : []
      return context.render(
        <SeguimientoPage
          theme={theme}
          programaAprobado={programaAprobado}
          indicadores={indicadores}
        />,
      )
    },

    /**
     * Proxy de los archivos de las actividades (ver documento / descargar). El
     * backend decide si se puede ver (solo de actividades publicadas, salvo
     * para el panel) y calcula tipo, disposición y caché; aquí se reenvían.
     */
    async archivo(context) {
      const { aid } = context.params
      const descarga = pideDescarga(context.request)
      const response = await backendFetch(
        context.request,
        `/api/actividades/archivos/${encodeURIComponent(aid)}${descarga ? '?download=1' : ''}`,
      )
      if (!response.ok) return new Response('Not Found', { status: 404 })
      return respuestaDeArchivo(response, descarga)
    },
  },
})
