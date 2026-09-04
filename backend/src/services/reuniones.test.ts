/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, expect, it, spyOn, beforeEach, afterEach } from 'bun:test'

import * as pool from '../db/pool.ts'
import { listReunionesActivas } from './reuniones.ts'

let consultas: Array<{ sql: string; valores: unknown[] }>
let sqlMock: any

beforeEach(() => {
  consultas = []
  sqlMock = spyOn(pool as any, 'sql').mockImplementation(
    async (strings: TemplateStringsArray, ...valores: unknown[]) => {
      consultas.push({ sql: strings.join('?'), valores })
      return []
    },
  )
})

afterEach(() => {
  sqlMock.mockRestore()
})

describe('listReunionesActivas', () => {
  it('filtra por fecha futura y ordena cronológicamente', async () => {
    await listReunionesActivas()

    expect(consultas).toHaveLength(1)
    expect(consultas[0].sql).toContain('FROM reuniones')
    expect(consultas[0].sql).toContain('WHERE fecha >= CURRENT_DATE')
    expect(consultas[0].sql).toContain('ORDER BY fecha ASC, id ASC')
  })

  it('devuelve las filas del calendario público tal cual', async () => {
    const reunion = {
      id: '1',
      titulo: 'Comité técnico',
      fecha: '2026-09-20',
      hora_inicio: '10:00',
      hora_fin: '',
    }
    sqlMock.mockResolvedValue([reunion])

    const filas = await listReunionesActivas()
    expect(filas).toEqual([reunion])
  })
})
