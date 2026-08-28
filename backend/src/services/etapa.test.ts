import { describe, expect, it } from 'bun:test'

import { etapaDe } from './participations.ts'

/**
 * `etapaDe` del backend y el del panel (app/actions/admin/etapa.ts) tienen que
 * coincidir: si divergen, la tabla del admin y el filtro del API dirían cosas
 * distintas de la misma participación.
 */
describe('etapaDe (backend)', () => {
  it('sin dictamen y sin aviso, la participación sigue En proceso', () => {
    expect(etapaDe({ estado: 'En proceso', notificado_en: null })).toBe('En proceso')
  })

  it('con dictamen pero sin correo, queda Dictaminada', () => {
    expect(etapaDe({ estado: 'Procedente', notificado_en: null })).toBe('Dictaminada')
    expect(etapaDe({ estado: 'No procedente', notificado_en: null })).toBe('Dictaminada')
  })

  it('con el correo enviado pasa a Notificada', () => {
    expect(etapaDe({ estado: 'Procedente', notificado_en: new Date() })).toBe('Notificada')
  })

  it('el sello de notificación manda sobre el estado', () => {
    expect(etapaDe({ estado: 'En proceso', notificado_en: new Date() })).toBe('Notificada')
  })
})
