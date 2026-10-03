import { afterEach, beforeEach, describe, expect, it, spyOn } from 'bun:test'

import * as customizations from './customizations.ts'
import {
  cambiarEtapaConsulta,
  esEtapaConsulta,
  leerEstadoConsulta,
  puedePasarA,
  recibeParticipaciones,
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
