/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, expect, it, spyOn } from 'bun:test'
import * as pool from '../db/pool.ts'
import { getParticipation } from './participations.ts'

describe('H2 · getParticipation SELECT explícito', () => {
  it('trae todas las columnas que detalle y word necesitan, sin SELECT *', async () => {
    let capturedQuery = ''
    let capturedParams: unknown[] = []
    const spy = spyOn(pool.sql as any, 'unsafe').mockImplementation(async (q: string, p: unknown[]) => {
      if (!capturedQuery) {
        capturedQuery = q
        capturedParams = p as unknown[]
        return [{ id: '550e8400-e29b-41d4-a716-446655440042', folio: 'F-1', nombre: 'A', correo: 'a@b.com', calle: 'c', numero: '1', colonia: 'col', municipio: 'mun', domicilio: 'dom', municipio_participante: 'mp', institucion: 'inst', ocupacion: 'ocu', latitud: '1', longitud: '2', observacion: 'obs', estado: 'En proceso', fuente: 'f', genero: 'g', tematica: 't', created_at: new Date(), resolucion_motivo: '', resolucion_direccion: '', resolucion_cita: '', resolucion_en: null, resuelto_por: null, notificado_en: null, notificado_a: '', creado_por: null, updated_at: new Date() }] as any
      }
      return [] as any
    })

    await getParticipation('550e8400-e29b-41d4-a716-446655440042')
    expect(capturedQuery).not.toMatch(/SELECT\s+\*/i)
    const neededForDetalle = [
      'folio', 'origen', 'nombre', 'correo', 'colonia', 'municipio', 'domicilio', 'municipio_participante',
      'institucion', 'ocupacion', 'observacion', 'estado', 'fuente', 'genero', 'tematica', 'created_at',
      'resolucion_motivo', 'resolucion_direccion', 'resolucion_cita', 'resolucion_en', 'notificado_en', 'notificado_a',
    ]
    for (const col of neededForDetalle) {
      expect(capturedQuery).toContain(col)
    }
    const neededForWord = ['calle', 'numero', 'latitud', 'longitud', 'domicilio', 'municipio_participante']
    for (const col of neededForWord) {
      expect(capturedQuery).toContain(col)
    }
    expect(capturedQuery).not.toContain('busqueda_tsv')
    expect(capturedQuery).not.toContain('texto_tsv')
    expect(capturedQuery).not.toContain('password_hash')
    expect(capturedParams).toEqual(['550e8400-e29b-41d4-a716-446655440042'])
    spy.mockRestore()
  })

  it('coincide con Row de word.ts y SELECT de app.ts /word', async () => {
    const wordRowFields = ['id', 'folio', 'origen', 'nombre', 'correo', 'calle', 'numero', 'colonia', 'municipio', 'domicilio', 'municipio_participante', 'institucion', 'ocupacion', 'latitud', 'longitud', 'observacion', 'estado', 'fuente', 'genero', 'tematica', 'created_at']
    let q = ''
    const spy = spyOn(pool.sql as any, 'unsafe').mockImplementation(async (query: string) => {
      if (!q) q = query
      return [{ id: 'x', folio: 'F', origen: 'digital', nombre: 'n', correo: 'c', calle: 'c', numero: '1', colonia: 'c', municipio: 'm', domicilio: 'd', municipio_participante: 'mp', institucion: 'i', ocupacion: 'o', latitud: '1', longitud: '2', observacion: 'obs', estado: 'En proceso', fuente: 'f', genero: 'g', tematica: 't', created_at: new Date(), resolucion_motivo: '', resolucion_direccion: '', resolucion_cita: '', resolucion_en: null, resuelto_por: null, notificado_en: null, notificado_a: '', creado_por: null, updated_at: new Date() }] as any
    })
    await getParticipation('550e8400-e29b-41d4-a716-446655440042')
    for (const f of wordRowFields) {
      expect(q.toLowerCase()).toContain(f.toLowerCase())
    }
    spy.mockRestore()
  })
})
