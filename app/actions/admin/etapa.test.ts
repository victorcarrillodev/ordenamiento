import { describe, expect, it } from 'vitest'

import { ICONOS } from '../../ui/admin/iconos.ts'
import { DICTAMENES, ETAPAS, INFO_ETAPA, etapaDe, infoEtapa, leerResumen } from './etapa.ts'

describe('etapaDe', () => {
  it('una participación recién capturada está En proceso', () => {
    expect(etapaDe({ estado: 'En proceso', notificado_en: null })).toBe('En proceso')
  })

  it('dictaminada procedente pero sin avisar todavía queda en Dictaminada', () => {
    expect(etapaDe({ estado: 'Procedente', notificado_en: null })).toBe('Dictaminada')
  })

  it('dictaminada no procedente también cuenta como resuelta', () => {
    expect(etapaDe({ estado: 'No procedente', notificado_en: null })).toBe('Dictaminada')
  })

  it('con el correo enviado pasa a Notificada', () => {
    expect(etapaDe({ estado: 'Procedente', notificado_en: '2026-08-27T10:00:00Z' })).toBe(
      'Notificada',
    )
  })

  it('el sello de notificación manda sobre el estado: no se puede retroceder', () => {
    // Si un admin devolviera el estado a "En proceso" tras haber notificado, el
    // ciudadano ya recibió el correo. La etapa no debe fingir que no pasó.
    expect(etapaDe({ estado: 'En proceso', notificado_en: '2026-08-27T10:00:00Z' })).toBe(
      'Notificada',
    )
  })

  it('trata la ausencia de notificado_en como no notificada', () => {
    expect(etapaDe({ estado: 'Procedente' })).toBe('Dictaminada')
  })
})

describe('infoEtapa', () => {
  it('marca lo que falta hacer en cada etapa abierta', () => {
    expect(infoEtapa({ estado: 'En proceso' }).pendiente).toBe('Falta dictaminar')
    expect(infoEtapa({ estado: 'Procedente' }).pendiente).toBe('Falta avisar al ciudadano')
  })

  it('no deja pendientes cuando el trámite cerró', () => {
    const info = infoEtapa({ estado: 'Procedente', notificado_en: '2026-08-27T10:00:00Z' })
    expect(info.pendiente).toBe('')
    expect(info.titulo).toBe('Datos enviados')
  })
})

describe('INFO_ETAPA', () => {
  it('cada etapa trae un icono de la colección y una ayuda para el filtro', () => {
    for (const etapa of ETAPAS) {
      const info = INFO_ETAPA[etapa]
      // Un nombre que no esté en el registro dejaría el hueco del icono en la tabla.
      expect(ICONOS[info.icono], `${etapa}: ${info.icono}`).toBeDefined()
      expect(info.ayuda.length).toBeGreaterThan(10)
    }
  })

  it('los iconos de las tres etapas son distintos', () => {
    const iconos = ETAPAS.map((e) => INFO_ETAPA[e].icono)
    expect(new Set(iconos).size).toBe(ETAPAS.length)
  })
})

describe('leerResumen', () => {
  const bueno = {
    total: 7,
    etapas: { 'En proceso': 2, Dictaminada: 3, Notificada: 2 },
    estados: { Procedente: 4, 'En proceso': 2, 'No procedente': 1 },
  }

  it('acepta el resumen tal como lo responde el backend', () => {
    expect(leerResumen(bueno)).toEqual(bueno)
  })

  it('acepta ceros: una base vacía no es una respuesta rota', () => {
    const vacio = {
      total: 0,
      etapas: { 'En proceso': 0, Dictaminada: 0, Notificada: 0 },
      estados: { Procedente: 0, 'En proceso': 0, 'No procedente': 0 },
    }
    expect(leerResumen(vacio)).toEqual(vacio)
  })

  it.each([
    ['null', null],
    ['texto', 'hola'],
    ['un objeto vacío', {}],
    ['un listado en lugar del resumen', { items: [], total: 0, page: 1, limit: 10 }],
    ['total que no es número', { ...bueno, total: '7' }],
    ['total negativo', { ...bueno, total: -1 }],
    ['total infinito', { ...bueno, total: Number.POSITIVE_INFINITY }],
    ['una etapa que falta', { ...bueno, etapas: { 'En proceso': 2, Dictaminada: 3 } }],
    ['una etapa con texto', { ...bueno, etapas: { ...bueno.etapas, Notificada: 'dos' } }],
    ['un dictamen que falta', { ...bueno, estados: { Procedente: 4 } }],
    ['sin etapas', { total: 1, estados: bueno.estados }],
    ['sin estados', { total: 1, etapas: bueno.etapas }],
  ])('devuelve null ante %s, para no pintar un NaN ni un cero falso', (_caso, crudo) => {
    expect(leerResumen(crudo)).toBeNull()
  })

  it('toma de la respuesta solo las etapas y dictámenes que conoce', () => {
    const leido = leerResumen({ ...bueno, etapas: { ...bueno.etapas, Otra: 9 } })
    expect(Object.keys(leido!.etapas)).toEqual([...ETAPAS])
    expect(Object.keys(leido!.estados)).toEqual([...DICTAMENES])
  })
})
