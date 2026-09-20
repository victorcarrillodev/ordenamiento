import { afterEach, describe, expect, it, vi } from 'vitest'
import { router } from '../../router.ts'
import { routes } from '../../routes.ts'
import { createRequire } from 'node:module'

const { JSDOM } = createRequire(import.meta.url)('jsdom') as {
  JSDOM: new (html: string) => { window: { document: Document } }
}

vi.mock('../../backend.ts', async (original) => ({
  ...(await original<typeof import('../../backend.ts')>()),
  getPublicTheme: vi.fn(async () => ({
    usuario: {
      textos: { navEnlaceInicio: 'Inicio unificado', navEnlacePoetdum: 'Programa unificado' },
    },
  })),
}))
afterEach(() => vi.unstubAllGlobals())

describe('observaciones del formulario ciudadano', () => {
  it('usa la misma navegación en la portada, el formulario y los errores', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => Response.json({})),
    )
    for (const url of [
      routes.home.href(),
      routes.participation.index.href(),
      routes.error.href({ code: '404' }),
    ]) {
      const res = await router.fetch(new Request(`http://localhost${url}`))
      const html = await res.text()
      expect(html).toContain('Inicio unificado')
      expect(html).toContain('Programa unificado')
      if (url === routes.home.href()) {
        const section = new JSDOM(html).window.document.querySelector('#que-es-el-programa')!
        expect(section.querySelectorAll('li')).toHaveLength(4)
        expect(section.querySelectorAll('p')).toHaveLength(3)
        expect(section.querySelector('ul')!.textContent).not.toContain('Una vez aprobado')
        expect(section.querySelectorAll('p')[2].textContent).toContain('Una vez aprobado')
      }
    }
  })
  it('envía todos los complementarios y conserva sus valores al fallar la validación', async () => {
    let sent: FormData | undefined
    vi.stubGlobal(
      'fetch',
      vi.fn(async (_url: unknown, init?: RequestInit) => {
        sent = init?.body as FormData
        return Response.json({ folio: 'PRUEBA-1' }, { status: 201 })
      }),
    )
    const form = new FormData()
    const values = {
      nombre: 'Ciudadana Ejemplo',
      email: 'ejemplo@example.com',
      colonia: 'Centro',
      municipio: 'Tlaquepaque',
      observacion: 'Una propuesta ciudadana',
      consentimiento: '1',
      domicilio: 'Calle del hogar 42',
      municipio_participante: 'Guadalajara',
      ocupacion: 'Arquitecta',
      fuente: 'Persona ciudadana',
      genero: 'Mujer',
      tematica: 'Movilidad',
    }
    for (const [key, value] of Object.entries(values)) form.set(key, value)
    const res = await router.fetch(
      new Request(`http://localhost${routes.participation.action.href()}`, {
        method: 'POST',
        body: form,
      }),
    )
    expect(res.status).toBe(302)
    for (const key of [
      'domicilio',
      'municipio_participante',
      'ocupacion',
      'fuente',
      'genero',
      'tematica',
    ] as const)
      expect(sent?.get(key)).toBe(values[key])
    form.set('email', 'inválido')
    const invalid = await router.fetch(
      new Request(`http://localhost${routes.participation.action.href()}`, {
        method: 'POST',
        body: form,
      }),
    )
    const html = await invalid.text()
    expect(invalid.status).toBe(422)
    expect(html).toContain('Inicio unificado')
    expect(html).toContain('Calle del hogar 42')
    expect(html).toContain('Arquitecta')
    expect(html).toMatch(/value="Mujer" selected/)
  })
})
