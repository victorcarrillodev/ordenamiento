/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, expect, it, spyOn, beforeEach, afterEach } from 'bun:test'
import * as pool from '../db/pool.ts'
import {
  deepMerge,
  getCustomizations,
  saveCustomizations,
  DEFAULT_THEME_CONFIG,
} from './customizations.ts'

describe('customizations · deepMerge', () => {
  it('fusiona objetos anidados recursivamente', () => {
    const base = { a: 1, nested: { x: 1, y: 2 } }
    const over = { b: 2, nested: { y: 20, z: 30 } }
    const result = deepMerge(base, over)
    expect(result).toEqual({ a: 1, b: 2, nested: { x: 1, y: 20, z: 30 } })
  })

  it('NO permite prototype pollution vía __proto__', () => {
    const malicious = JSON.parse('{ "nested": { "__proto__": { "polluted": true } } }')
    const result = deepMerge({ nested: {} }, malicious)
    expect(({} as any).polluted).toBeUndefined()
    expect(result.nested.polluted).toBeUndefined()
  })

  it('NO permite prototype pollution vía constructor', () => {
    const malicious = JSON.parse('{ "constructor": { "prototype": { "polluted": true } } }')
    deepMerge({}, malicious)
    expect(({} as any).polluted).toBeUndefined()
  })

  it('ignora source no objeto', () => {
    expect(deepMerge({ a: 1 }, null)).toEqual({ a: 1 })
    expect(deepMerge({ a: 1 }, 5 as any)).toEqual({ a: 1 })
  })
})

describe('customizations · getCustomizations', () => {
  let sqlMock: ReturnType<typeof spyOn> | null = null
  beforeEach(() => {
    // getCustomizations usa el tag `sql\`...\``, no `.unsafe`, así que espiamos sql.
    sqlMock = spyOn(pool, 'sql' as any)
  })
  afterEach(() => {
    sqlMock?.mockRestore()
  })

  it('lee la config de la BD y la fusiona con el default', async () => {
    sqlMock!.mockResolvedValueOnce([
      { config: { usuario: { colores: { primario: '#123456' } } } },
    ] as any)
    const cfg = await getCustomizations()
    expect(cfg.usuario.colores.primario).toBe('#123456')
  })

  it('retorna default si no hay fila', async () => {
    sqlMock!.mockResolvedValueOnce([] as any)
    const cfg = await getCustomizations()
    expect(cfg).toBeDefined()
    expect(Object.keys(cfg).length).toBeGreaterThan(0)
  })

  it('separa el párrafo tercero en configuraciones guardadas con la pregunta antigua', async () => {
    const texts = DEFAULT_THEME_CONFIG.usuario.textos
    sqlMock!.mockResolvedValueOnce([
      {
        config: {
          usuario: {
            textos: {
              programaPregunta4: `${texts.programaPregunta4} ${texts.programaParrafo3}`,
              programaParrafo1: 'Texto personalizado que debe conservarse',
            },
          },
        },
      },
    ] as never)
    const cfg = await getCustomizations()
    expect(cfg.usuario.textos.programaPregunta4).toBe(texts.programaPregunta4)
    expect(cfg.usuario.textos.programaParrafo3).toBe(texts.programaParrafo3)
    expect(cfg.usuario.textos.programaParrafo1).toBe('Texto personalizado que debe conservarse')
  })
})

describe('customizations · saveCustomizations', () => {
  const usuario = { id: '1', name: 'Admin', email: 'admin@tlaquepaque.gob.mx' }
  let sqlMock: ReturnType<typeof spyOn> | null = null
  const guardados: any[] = []

  beforeEach(() => {
    guardados.length = 0
    sqlMock = spyOn(pool, 'sql' as any)
    // `spyOn` no conserva `sql.json`, que el servicio usa para armar la columna JSONB.
    ;(pool.sql as any).json = (valor: unknown) => ({ json: valor })
    sqlMock!.mockImplementation(((cadenas: TemplateStringsArray, ...valores: any[]) => {
      if (cadenas.join('?').includes('INSERT INTO site_customizations')) {
        guardados.push(valores[0].json)
      }
      return Promise.resolve([])
    }) as never)
  })
  afterEach(() => {
    sqlMock?.mockRestore()
  })

  it('guarda canónicos los textos con formato y deja igual los demás', async () => {
    await saveCustomizations({
      config: {
        usuario: {
          textos: {
            ctaParrafo: '<div style="text-align: center;">Tu <b>voz</b><script>x()</script></div>',
            heroTitulo: 'Título <b>sin formato</b>',
          },
        },
      } as any,
      user: usuario,
      motivo: 'Prueba',
      section: 'usuario',
    })
    expect(guardados).toHaveLength(1)
    const textos = guardados[0].usuario.textos
    expect(textos.ctaParrafo).toBe('<p style="text-align:center">Tu <strong>voz</strong></p>')
    expect(textos.heroTitulo).toBe('Título <b>sin formato</b>')
    // Lo que no se tocó conserva su valor por defecto.
    expect(textos.queEsParrafo1).toBe(DEFAULT_THEME_CONFIG.usuario.textos.queEsParrafo1)
  })

  it('un texto con formato sin contenido se guarda vacío', async () => {
    await saveCustomizations({
      config: { usuario: { textos: { ctaParrafo: '<p><br></p>' } } } as any,
      user: usuario,
      motivo: 'Prueba',
    })
    expect(guardados[0].usuario.textos.ctaParrafo).toBe('')
  })
})
