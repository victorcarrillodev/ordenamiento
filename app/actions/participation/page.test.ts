import { readFileSync } from 'node:fs'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { olvidarTemaPublico } from '../../backend.ts'
import { router } from '../../router.ts'
import { routes } from '../../routes.ts'

afterEach(() => {
  vi.unstubAllGlobals()
  olvidarTemaPublico()
})

/** El portal con la consulta abierta: es cuando el formulario se muestra. */
async function paginaDelFormulario(): Promise<string> {
  olvidarTemaPublico()
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => Response.json({ theme: { programa: { consulta: 'abierta' } } })),
  )
  const res = await router.fetch(
    new Request(`http://localhost${routes.participation.index.href()}`),
  )
  expect(res?.status).toBe(200)
  return (await res?.text()) ?? ''
}

describe('página «Registra tu participación»', () => {
  it('la columna lateral lleva la fotografía del territorio y la frase acordada', async () => {
    const html = await paginaDelFormulario()
    expect(html).toContain('Tu voz ayuda a construir el futuro de San Pedro Tlaquepaque.')
    expect(html).toMatch(/<img[^>]*src="\/ordena\/assets\/img\/participacion\/territorio\.webp"/)
    expect(html).toMatch(/<img[^>]*alt="Vista aérea del centro de San Pedro Tlaquepaque/)
    // La frase y la foto anteriores ya no están.
    expect(html).not.toContain('el territorio que queremos')
    expect(html).not.toContain('participacion.webp')
  })

  it('la imagen existe en public/ (una ruta rota dejaría la columna vacía)', () => {
    const imagen = readFileSync(
      new URL('../../../public/assets/img/participacion/territorio.webp', import.meta.url),
    )
    expect(imagen.byteLength).toBeGreaterThan(10_000)
    // WebP: cabecera RIFF....WEBP
    expect(imagen.subarray(0, 4).toString('ascii')).toBe('RIFF')
    expect(imagen.subarray(8, 12).toString('ascii')).toBe('WEBP')
  })

  it('el portal se llama «Bitácora», sin «Ambiental»', async () => {
    const html = await paginaDelFormulario()
    expect(html).toContain('Bitácora')
    expect(html).not.toContain('Bitácora Ambiental')
  })

  it('presenta el formulario con el texto acordado', async () => {
    const html = (await paginaDelFormulario()).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ')
    expect(html).toContain(
      'Comparte tus observaciones o propuestas sobre el Proyecto del Programa. Los campos marcados con * son obligatorios.',
    )
  })
})
