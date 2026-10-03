import { describe, expect, it } from 'bun:test'

import { LIMITE_TEXTO_RICO, textoPlanoDe } from './texto-rico.ts'
import { CLAVES_TEXTO_RICO, canonizarTextosConFormato, esTextoConFormato } from './textos-portal.ts'

const config = (textos: Record<string, unknown>) => ({ usuario: { textos } })

describe('textos del portal con formato', () => {
  it('solo los textos de párrafo admiten formato', () => {
    expect(esTextoConFormato('queEsParrafo1')).toBe(true)
    expect(esTextoConFormato('footerContacto')).toBe(true)
    expect(esTextoConFormato('heroTitulo')).toBe(false)
    expect(esTextoConFormato('navCtaRegistrar')).toBe(false)
    expect(esTextoConFormato('__proto__')).toBe(false)
    expect(new Set(CLAVES_TEXTO_RICO).size).toBe(CLAVES_TEXTO_RICO.length)
  })

  it('deja canónico el HTML del editor en los textos con formato', () => {
    const guardado = canonizarTextosConFormato(
      config({
        ctaParrafo:
          '<div style="text-align: justify;">Tu <b>voz</b> <script>alert(1)</script>cuenta</div>',
      }),
    )
    expect(guardado.usuario.textos.ctaParrafo).toBe(
      '<p style="text-align:justify">Tu <strong>voz</strong> cuenta</p>',
    )
  })

  it('no toca los textos planos ni el resto de la configuración', () => {
    const entrada = {
      usuario: {
        colores: { primario: '#123456' },
        textos: { heroTitulo: 'Título <b>tal cual</b>', footerDesc: 'Pie de página' },
      },
      panel: { colorAcento: '#abcdef' },
    }
    const guardado = canonizarTextosConFormato(entrada)
    expect(guardado.usuario.textos.heroTitulo).toBe('Título <b>tal cual</b>')
    expect(guardado.usuario.textos.footerDesc).toBe('<p>Pie de página</p>')
    expect(guardado.usuario.colores).toEqual({ primario: '#123456' })
    expect(guardado.panel).toEqual({ colorAcento: '#abcdef' })
  })

  it('no modifica la configuración que recibe', () => {
    const entrada = config({ ctaParrafo: 'Texto' })
    canonizarTextosConFormato(entrada)
    expect(entrada.usuario.textos.ctaParrafo).toBe('Texto')
  })

  it('un texto vacío o sin contenido se guarda vacío, para que el portal use el suyo por defecto', () => {
    const guardado = canonizarTextosConFormato(
      config({ ctaParrafo: '', footerDesc: '<p><br></p>', proximasVacio: '   ' }),
    )
    expect(guardado.usuario.textos).toEqual({ ctaParrafo: '', footerDesc: '', proximasVacio: '' })
  })

  it('recorta a los caracteres visibles que admitía el texto plano', () => {
    const guardado = canonizarTextosConFormato(
      config({
        queEsParrafo2: `<p style="text-align:justify"><strong>${'x'.repeat(800)}</strong></p>`,
      }),
    )
    const texto = guardado.usuario.textos.queEsParrafo2 as string
    expect(Array.from(textoPlanoDe(texto)).length).toBe(LIMITE_TEXTO_RICO)
    expect(texto.startsWith('<p style="text-align:justify"><strong>')).toBe(true)
  })

  it('ignora lo que no es texto y las configuraciones sin textos', () => {
    expect(canonizarTextosConFormato(config({ ctaParrafo: 5 })).usuario.textos.ctaParrafo).toBe(5)
    const sinTextos = { usuario: { colores: {} } }
    expect(canonizarTextosConFormato(sinTextos)).toBe(sinTextos)
    const vacia = {}
    expect(canonizarTextosConFormato(vacia)).toBe(vacia)
  })
})
