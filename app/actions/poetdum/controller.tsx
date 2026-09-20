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
import { routes } from '../../routes.ts'
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

/** Cabeceras del backend que se reenvían al servir un archivo. */
const CABECERAS_ARCHIVO = [
  'content-type',
  'content-disposition',
  'content-length',
  'x-content-type-options',
  'cross-origin-resource-policy',
  'cache-control',
]

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

      const [theme, proximas, avances, documentos, indicadores] = await Promise.all([
        getPublicTheme(context.request),
        actividadesDe(context.request, `vista=proximas&limite=${EN_EL_HUB}`),
        actividadesDe(context.request, 'vista=avances'),
        fetchJsonOr<{ documentos: DocumentoPublico[] }>(
          context.request,
          `/api/actividades/documentos${filtros.size ? `?${filtros}` : ''}`,
          { documentos: [] },
        ).then((d) => d.documentos ?? []),
        indicadoresDe(context.request),
      ])

      return context.render(
        <PoetdumPage
          theme={theme}
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
      const descarga = new URL(context.request.url).searchParams.get('download') === '1'
      const response = await backendFetch(
        context.request,
        `/api/actividades/archivos/${encodeURIComponent(aid)}${descarga ? '?download=1' : ''}`,
      )
      if (!response.ok) return new Response('Not Found', { status: 404 })

      const headers = new Headers()
      for (const nombre of CABECERAS_ARCHIVO) {
        const valor = response.headers.get(nombre)
        if (valor) headers.set(nombre, valor)
      }
      // Sin `sandbox`: el visor de PDF del navegador se niega a abrir dentro
      // de un documento aislado. El recurso sigue sin poder cargar nada.
      headers.set('content-security-policy', "default-src 'none'; frame-ancestors 'self'")
      return new Response(response.body, { headers })
    },
  },
})
