import { afterEach, beforeEach, describe, expect, it, spyOn } from 'bun:test'

import * as customizations from './customizations.ts'
import {
  cambiarEtapaConsulta,
  esEtapaConsulta,
  leerEstadoConsulta,
  puedePasarA,
  recibeParticipaciones,
  programarConsulta,
} from './consulta.ts'

const USUARIO = { id: 'u1', name: 'Admin', email: 'admin@x.mx' }
const AHORA = new Date('2026-10-05T15:00:00Z')

let guardado: Array<Record<string, unknown>> = []
let restore: Array<() => void> = []

function tema(programa: Record<string, unknown>) {
  const leer = spyOn(customizations, 'getCustomizations').mockResolvedValue({
    ...customizations.DEFAULT_THEME_CONFIG,
    programa: { ...customizations.DEFAULT_THEME_CONFIG.programa, ...programa },
  } as never)
  const guardar = spyOn(customizations, 'saveCustomizations').mockImplementation((async (
    params: Record<string, unknown>,
  ) => {
    guardado.push(params)
    return customizations.DEFAULT_THEME_CONFIG
  }) as never)
  restore.push(
    () => leer.mockRestore(),
    () => guardar.mockRestore(),
  )
}

beforeEach(() => {
  guardado = []
  restore = []
})
afterEach(() => restore.forEach((r) => r()))

describe('etapas de la consulta', () => {
  it('reconoce solo las tres etapas', () => {
    for (const etapa of ['pendiente', 'abierta', 'concluida'])
      expect(esEtapaConsulta(etapa)).toBe(true)
    for (const raro of ['', 'cerrada', 'ABIERTA', null, undefined, 1, {}]) {
      expect(esEtapaConsulta(raro)).toBe(false)
    }
  })

  it('por omisión la consulta está pendiente: no abre sola', async () => {
    tema({})
    expect(await leerEstadoConsulta()).toEqual({ etapa: 'pendiente', inicio: null, cierre: null })
    expect(await recibeParticipaciones()).toBe(false)
  })

  it('un valor desconocido guardado en la configuración se trata como pendiente', async () => {
    tema({ consulta: 'abierta ' })
    expect((await leerEstadoConsulta()).etapa).toBe('pendiente')
  })

  it('solo la etapa «abierta» recibe participaciones', async () => {
    for (const [etapa, recibe] of [
      ['pendiente', false],
      ['abierta', true],
      ['concluida', false],
    ] as const) {
      restore.forEach((r) => r())
      restore = []
      tema({ consulta: etapa })
      expect(await recibeParticipaciones(), etapa).toBe(recibe)
    }
  })

  it('transiciones: iniciar, concluir, reabrir y deshacer el inicio; no volver a pendiente tras concluir', () => {
    expect(puedePasarA('pendiente', 'abierta')).toBe(true)
    expect(puedePasarA('abierta', 'concluida')).toBe(true)
    expect(puedePasarA('concluida', 'abierta')).toBe(true)
    expect(puedePasarA('abierta', 'pendiente')).toBe(true)
    expect(puedePasarA('pendiente', 'concluida')).toBe(false)
    expect(puedePasarA('concluida', 'pendiente')).toBe(false)
  })
})

describe('cambiar la etapa', () => {
  it('programa el periodo con autor y sin alterar la etapa manual guardada', async () => {
    tema({})
    const resultado = await programarConsulta(
      '2026-11-01T09:00:00-06:00',
      '2026-11-30T18:00:00-06:00',
      USUARIO,
    )
    expect(resultado.ok).toBe(true)
    expect(guardado[0].config).toEqual({
      programa: {
        consultaProgramacion: {
          inicio: '2026-11-01T15:00:00.000Z',
          cierre: '2026-12-01T00:00:00.000Z',
        },
      },
    })
    expect(guardado[0].user).toEqual(USUARIO)
  })

  it('rechaza fechas sin zona horaria, vacías o con término no posterior', async () => {
    tema({})
    for (const [inicio, cierre] of [
      ['', ''],
      ['2026-11-01T09:00', '2026-11-02T09:00'],
      ['2026-11-02T09:00:00Z', '2026-11-01T09:00:00Z'],
      ['2026-02-31T09:00:00Z', '2026-03-04T09:00:00Z'],
    ]) {
      expect((await programarConsulta(inicio, cierre, USUARIO)).ok).toBe(false)
    }
    expect(guardado).toEqual([])
  })

  it('abre al inicio exacto y cierra al término exacto, incluso tras un reinicio', async () => {
    tema({
      consulta: 'pendiente',
      consultaProgramacion: { inicio: '2026-11-01T15:00:00Z', cierre: '2026-11-02T15:00:00Z' },
    })
    for (const [instante, etapa] of [
      ['2026-11-01T14:59:59Z', 'pendiente'],
      ['2026-11-01T15:00:00Z', 'abierta'],
      ['2026-11-02T14:59:59Z', 'abierta'],
      ['2026-11-02T15:00:00Z', 'concluida'],
    ] as const)
      expect((await leerEstadoConsulta(new Date(instante))).etapa).toBe(etapa)
    expect(guardado).toEqual([])
  })

  it('el control manual elimina la programación para que no se revierta solo', async () => {
    tema({
      consultaProgramacion: { inicio: '2026-10-01T00:00:00Z', cierre: '2026-10-06T00:00:00Z' },
    })
    await cambiarEtapaConsulta('concluida', USUARIO, AHORA)
    expect(guardado[0].config).toMatchObject({
      programa: { consultaProgramacion: null, consulta: 'concluida' },
    })
  })
  it('iniciar fija el inicio y lo deja en la bitácora de cambios', async () => {
    tema({ consulta: 'pendiente' })
    const r = await cambiarEtapaConsulta('abierta', USUARIO, AHORA)
    expect(r).toEqual({
      ok: true,
      estado: { etapa: 'abierta', inicio: AHORA.toISOString(), cierre: null },
    })
    expect(guardado).toHaveLength(1)
    expect(guardado[0].user).toEqual(USUARIO)
    expect(guardado[0].motivo).toContain('se inició')
    expect(guardado[0].config).toEqual({
      programa: { consulta: 'abierta', consultaInicio: AHORA.toISOString(), consultaCierre: null },
    })
  })

  it('concluir fija el cierre y conserva el inicio', async () => {
    tema({ consulta: 'abierta', consultaInicio: '2026-09-01T00:00:00.000Z' })
    const r = await cambiarEtapaConsulta('concluida', USUARIO, AHORA)
    expect(r).toEqual({
      ok: true,
      estado: {
        etapa: 'concluida',
        inicio: '2026-09-01T00:00:00.000Z',
        cierre: AHORA.toISOString(),
      },
    })
  })

  it('reabrir limpia el cierre y conserva el inicio original', async () => {
    tema({
      consulta: 'concluida',
      consultaInicio: '2026-09-01T00:00:00.000Z',
      consultaCierre: '2026-09-30T00:00:00.000Z',
    })
    const r = await cambiarEtapaConsulta('abierta', USUARIO, AHORA)
    expect(r).toEqual({
      ok: true,
      estado: { etapa: 'abierta', inicio: '2026-09-01T00:00:00.000Z', cierre: null },
    })
  })

  it('deshacer el inicio borra las dos fechas', async () => {
    tema({ consulta: 'abierta', consultaInicio: '2026-09-01T00:00:00.000Z' })
    const r = await cambiarEtapaConsulta('pendiente', USUARIO, AHORA)
    expect(r).toEqual({ ok: true, estado: { etapa: 'pendiente', inicio: null, cierre: null } })
  })

  it('una transición no permitida se rechaza y no guarda nada', async () => {
    tema({ consulta: 'concluida' })
    const r = await cambiarEtapaConsulta('pendiente', USUARIO, AHORA)
    expect(r.ok).toBe(false)
    expect(guardado).toEqual([])
  })

  it('pedir la etapa en la que ya está no cambia nada ni ensucia la bitácora', async () => {
    tema({ consulta: 'abierta', consultaInicio: '2026-09-01T00:00:00.000Z' })
    const r = await cambiarEtapaConsulta('abierta', USUARIO, AHORA)
    expect(r.ok).toBe(true)
    expect(guardado).toEqual([])
  })
})
