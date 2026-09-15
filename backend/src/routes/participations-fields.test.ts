import { afterEach, beforeEach, describe, expect, it, spyOn } from 'bun:test'
import * as pool from '../db/pool.ts'
import * as folios from '../services/folio.ts'
import * as mail from '../services/mail.ts'
import { handleCreateParticipation } from './participations.ts'

let restore: Array<() => void>
let saved: Record<string, unknown>
beforeEach(() => {
  saved = {}
  const tx = Object.assign(
    (query: TemplateStringsArray, ...values: unknown[]) => {
      const columns =
        query
          .join('?')
          .match(/INSERT INTO participations \(([\s\S]*?)\)/)?.[1]
          .split(',')
          .map((v) => v.trim()) ?? []
      for (let i = 0; i < columns.length; i++) saved[columns[i]] = values[i]
      return Promise.resolve([{ id: '00000000-0000-4000-8000-000000000001' }])
    },
    { unsafe: () => Promise.resolve([]) },
  )
  const begin = spyOn(pool.sql, 'begin').mockImplementation(((
    work: (db: typeof tx) => Promise<unknown>,
  ) => work(tx)) as never)
  const folio = spyOn(folios, 'nextFolio').mockResolvedValue('PRUEBA-1')
  const correo = spyOn(mail, 'mailConfigurado').mockReturnValue(false)
  restore = [() => begin.mockRestore(), () => folio.mockRestore(), () => correo.mockRestore()]
})
afterEach(() => restore.forEach((fn) => fn()))

function form() {
  const data = new FormData()
  data.set('nombre', 'Persona de prueba')
  data.set('correo', 'prueba@example.com')
  data.set('consentimiento', '1')
  data.set('observacion', 'Una propuesta para el municipio')
  return data
}

describe('persistencia de complementarios por la API', () => {
  it('guarda los campos opcionales de la participación digital en sus columnas', async () => {
    const data = form()
    const fields = {
      domicilio: 'Calle del hogar 12',
      municipio_participante: 'Guadalajara',
      ocupacion: 'Docente',
      fuente: 'Persona ciudadana',
      genero: 'Prefiero no responder',
      tematica: 'Movilidad',
    }
    for (const [key, value] of Object.entries(fields)) data.set(key, value)
    const response = await handleCreateParticipation(
      new Request('http://local/api/participations', { method: 'POST', body: data }),
      null,
    )
    expect(response.status).toBe(201)
    for (const [key, value] of Object.entries(fields)) expect(saved[key]).toBe(value)
  })
  it('permite omitir los complementarios y rechaza texto excesivo antes de persistir', async () => {
    const data = form()
    const response = await handleCreateParticipation(
      new Request('http://local/api/participations', { method: 'POST', body: data }),
      null,
    )
    expect(response.status).toBe(201)
    expect(saved.fuente).toBe('')
    expect(saved.domicilio).toBe('')
    saved = {}
    data.set('ocupacion', 'x'.repeat(201))
    const invalid = await handleCreateParticipation(
      new Request('http://local/api/participations', { method: 'POST', body: data }),
      null,
    )
    expect(invalid.status).toBe(422)
    expect(saved).toEqual({})
  })
})
