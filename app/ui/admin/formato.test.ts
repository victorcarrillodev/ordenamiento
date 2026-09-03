import { describe, expect, it } from 'vitest'

import {
  formatearDiaFechaHora,
  formatearDuracion,
  formatearFecha,
  formatearFechaHora,
} from './formato.ts'

describe('formatearDuracion', () => {
  it('usa segundos, minutos y horas según la magnitud', () => {
    expect(formatearDuracion(45)).toBe('45 s')
    expect(formatearDuracion(60)).toBe('1 min')
    expect(formatearDuracion(45 * 60)).toBe('45 min')
    expect(formatearDuracion(2 * 3600)).toBe('2 h')
    expect(formatearDuracion(2 * 3600 + 15 * 60)).toBe('2 h 15 min')
  })

  it('no inventa duraciones a partir de valores imposibles', () => {
    expect(formatearDuracion(0)).toBe('—')
    expect(formatearDuracion(-30)).toBe('—')
    expect(formatearDuracion(Number.NaN)).toBe('—')
    expect(formatearDuracion(Number.POSITIVE_INFINITY)).toBe('—')
  })

  it('sigue contando en horas más allá de un día', () => {
    // Se corta en horas a propósito: «73 h» dice más que «3 d 1 h» al medir
    // tiempo de trabajo acumulado.
    expect(formatearDuracion(73 * 3600)).toBe('73 h')
  })
})

describe('formatearFechaHora', () => {
  it('devuelve el guion largo ante valores que no son fechas', () => {
    expect(formatearFechaHora(null)).toBe('—')
    expect(formatearFechaHora(undefined)).toBe('—')
    expect(formatearFechaHora('')).toBe('—')
    expect(formatearFechaHora('no-es-fecha')).toBe('—')
  })

  it('escribe la hora del municipio, no la del servidor', () => {
    // 2026-09-02T18:00:00Z son las 12:00 en America/Mexico_City (UTC-6).
    expect(formatearFechaHora('2026-09-02T18:00:00Z')).toContain('12:00')
  })
})

describe('formatearFecha', () => {
  it('tolera basura sin romper la página', () => {
    expect(formatearFecha('no-es-fecha')).toBe('—')
    expect(formatearFecha(null)).toBe('—')
  })

  it('formatea una fecha ISO válida', () => {
    expect(formatearFecha('2026-09-02T18:00:00Z')).toContain('2026')
  })
})

describe('formatearDiaFechaHora', () => {
  it('incluye el día de la semana además de la fecha y la hora', () => {
    // 2026-09-02T18:00:00Z es miércoles a las 12:00 en Tlaquepaque.
    const salida = formatearDiaFechaHora('2026-09-02T18:00:00Z')
    expect(salida).toContain('mié')
    expect(salida).toContain('2026')
    expect(salida).toContain('12:00')
  })

  it('tolera valores que no son fechas', () => {
    expect(formatearDiaFechaHora('no-es-fecha')).toBe('—')
    expect(formatearDiaFechaHora(null)).toBe('—')
  })
})
