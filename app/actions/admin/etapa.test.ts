import { describe, expect, it } from 'vitest'

import { etapaDe, infoEtapa } from './etapa.ts'

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
