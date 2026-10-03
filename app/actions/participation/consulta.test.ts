import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { olvidarTemaPublico } from '../../backend.ts'
import {
  etapaDeConsulta,
  TEXTO_CONSULTA_CONCLUIDA,
  TITULO_CONSULTA_CONCLUIDA,
} from '../../data/consulta.ts'
import { router } from '../../router.ts'
import { routes } from '../../routes.ts'

const ORIGINAL_FETCH = globalThis.fetch

function conEtapa(etapa: string | undefined) {
  olvidarTemaPublico()
  globalThis.fetch = vi.fn(async () =>
    Response.json({ theme: etapa ? { programa: { consulta: etapa } } : {} }),
  ) as unknown as typeof fetch
}

const textoDe = (html: string) => html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ')

async function paginaDelFormulario() {
  const res = await router.fetch(
    new Request(`http://localhost${routes.participation.index.href()}`),
  )
  return { res, html: (await res?.text()) ?? '' }
}

describe('el formulario según la etapa de la consulta', () => {
  beforeEach(() => olvidarTemaPublico())
  afterEach(() => {
    globalThis.fetch = ORIGINAL_FETCH
    olvidarTemaPublico()
  })

  it('abierta: se muestra el formulario', async () => {
    conEtapa('abierta')
    const { html } = await paginaDelFormulario()
    expect(html).toContain('id="participation-form"')
    expect(textoDe(html)).not.toContain('Consulta pública concluida')
  })

  it('concluida: en lugar del formulario, el mensaje acordado', async () => {
    conEtapa('concluida')
    const { html } = await paginaDelFormulario()
    expect(html).not.toContain('id="participation-form"')
    const texto = textoDe(html)
    expect(texto).toContain('Consulta pública concluida')
    expect(texto).toContain(TEXTO_CONSULTA_CONCLUIDA)
  })

  it('pendiente (o sin dato): se explica que aún no inicia, sin formulario', async () => {
    for (const etapa of ['pendiente', undefined]) {
      conEtapa(etapa)
      const { html } = await paginaDelFormulario()
      expect(html, String(etapa)).not.toContain('id="participation-form"')
      expect(textoDe(html), String(etapa)).toContain('La consulta pública aún no inicia')
    }
  })

  it('la confirmación de quien acaba de registrarse se ve aunque la consulta ya haya concluido', async () => {
    conEtapa('concluida')
    const res = await router.fetch(
      new Request(
        `http://localhost${routes.participation.index.href()}?success=1&folio=X-1&acuse=1.f`,
      ),
    )
    const html = (await res?.text()) ?? ''
    expect(textoDe(html)).toContain('Tu participación quedó registrada')
    expect(textoDe(html)).not.toContain('Consulta pública concluida')
  })

  it('si la consulta concluye mientras se llenaba el formulario, el envío explica por qué no se recibió', async () => {
    globalThis.fetch = vi.fn(async (url: string | URL | Request) => {
      if (String(url).includes('/api/participations')) {
        return Response.json(
          { error: 'concluyó', codigo: 'consulta_no_abierta', etapa: 'concluida' },
          { status: 403 },
        )
      }
      return Response.json({ theme: { programa: { consulta: 'abierta' } } })
    }) as unknown as typeof fetch
    const fd = new FormData()
    fd.set('nombre', 'Ciudadana Ejemplo')
    fd.set('email', 'ejemplo@example.com')
    fd.set('alcance_ubicacion', 'municipio')
    fd.set('observacion', 'Una propuesta ciudadana con detalle suficiente')
    fd.set('consentimiento', '1')
    const res = await router.fetch(
      new Request(`http://localhost${routes.participation.action.href()}`, {
        method: 'POST',
        body: fd,
      }),
    )
    expect(res?.status).toBe(403)
    expect(textoDe((await res?.text()) ?? '')).toContain(TITULO_CONSULTA_CONCLUIDA)
  })
})

describe('etapaDeConsulta', () => {
  it('lee la etapa del tema y, sin dato válido, la consulta no ha iniciado', () => {
    expect(etapaDeConsulta({ programa: { consulta: 'abierta' } })).toBe('abierta')
    expect(etapaDeConsulta({ programa: { consulta: 'concluida' } })).toBe('concluida')
    expect(etapaDeConsulta({ programa: { consulta: 'otra' } })).toBe('pendiente')
    expect(etapaDeConsulta({})).toBe('pendiente')
    expect(etapaDeConsulta(null)).toBe('pendiente')
    expect(etapaDeConsulta(undefined)).toBe('pendiente')
  })

  it('el mensaje de cierre es el acordado, palabra por palabra', () => {
    expect(TEXTO_CONSULTA_CONCLUIDA).toBe(
      'Gracias por participar en la consulta pública del Proyecto del Programa. El periodo para recibir observaciones y propuestas ha concluido. En el apartado ‘Participaciones y respuestas’ podrás consultar las versiones públicas de las participaciones recibidas y, conforme se publiquen, los oficios de respuesta correspondientes.',
    )
  })
})
