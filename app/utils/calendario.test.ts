import { describe, expect, it } from 'vitest'

import {
  agruparPorFecha,
  claveMes,
  claveMesVecino,
  construirGrilla,
  desplazarMes,
  diaEnMexico,
  diaYMes,
  fechaConDia,
  fechaLarga,
  horario,
  hoyEnMexico,
  isoDeDia,
  parsearMes,
} from './calendario.ts'

describe('calendario', () => {
  it('parsearMes acepta solo meses reales', () => {
    expect(parsearMes('2026-09')).toEqual({ anio: 2026, mes: 8 })
    expect(parsearMes('2026-13')).toBeNull()
    expect(parsearMes('2026-00')).toBeNull()
    expect(parsearMes('2026-9')).toBeNull()
    expect(parsearMes('<script>')).toBeNull()
    expect(parsearMes(null)).toBeNull()
    // Los mismos años que rechaza el backend: pedirle 0000 acababa en 500.
    expect(parsearMes('0000-01')).toBeNull()
    expect(parsearMes('0050-01')).toBeNull()
    expect(parsearMes('0100-01')).toEqual({ anio: 100, mes: 0 })
  })

  it('desplazarMes cruza años en ambos sentidos', () => {
    expect(desplazarMes(2026, 11, 1)).toEqual({ anio: 2027, mes: 0 })
    expect(desplazarMes(2026, 0, -1)).toEqual({ anio: 2025, mes: 11 })
    expect(claveMes(2027, 0)).toBe('2027-01')
  })

  // Regresión (Testing): en años de 3 cifras los enlaces salían como
  // `?mes=100-01`, que `parsearMes` no acepta, y la página caía en el mes actual.
  it('las claves llevan el año a 4 dígitos y se vuelven a leer', () => {
    expect(claveMes(100, 0)).toBe('0100-01')
    expect(parsearMes(claveMes(100, 0))).toEqual({ anio: 100, mes: 0 })
    expect(isoDeDia(100, 0, 5)).toBe('0100-01-05')
  })

  it('claveMesVecino no sale del rango que acepta parsearMes', () => {
    expect(claveMesVecino(2026, 11, 1)).toBe('2027-01')
    expect(claveMesVecino(100, 1, -1)).toBe('0100-01')
    expect(claveMesVecino(100, 0, -1)).toBeNull()
    expect(claveMesVecino(9999, 11, 1)).toBeNull()
  })

  it('las fechas no se corren de día por la zona horaria', () => {
    expect(fechaLarga('2026-09-20')).toBe('20 de septiembre de 2026')
    expect(fechaConDia('2026-09-20')).toBe('Domingo 20 de septiembre de 2026')
    expect(diaYMes('2026-10-05')).toEqual({ dia: '5', mes: 'oct' })
  })

  it('el día se toma en la hora del municipio, no en la del servidor', () => {
    expect(diaEnMexico(new Date('2026-09-18T03:00:00Z'))).toBe('2026-09-17')
    // Marca de tiempo tal como la devuelve Postgres (`updated_at::text`).
    expect(diaEnMexico(new Date('2026-09-01 12:00:00.123456+00'))).toBe('2026-09-01')
    expect(diaEnMexico(new Date('basura'))).toBe('')
    expect(hoyEnMexico()).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })

  it('horario', () => {
    expect(horario('10:00', '12:00')).toBe('10:00 – 12:00')
    expect(horario('10:00', '')).toBe('10:00')
    expect(horario('', '')).toBe('')
  })

  it('la cuadrícula empieza en lunes y completa semanas', () => {
    // Septiembre de 2026 empieza en martes: un hueco antes del día 1.
    const celdas = construirGrilla(2026, 8, agruparPorFecha([{ fecha: '2026-09-17' }]))
    expect(celdas[0]).toBeNull()
    expect(celdas[1]?.fecha).toBe('2026-09-01')
    expect(celdas.length % 7).toBe(0)
    const dia17 = celdas.find((c) => c?.fecha === '2026-09-17')
    expect(dia17?.items).toHaveLength(1)
  })
})
