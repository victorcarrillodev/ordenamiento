import { expect, it } from 'vitest'
import { duracionConsulta, fechaParaCampo, instanteDeConsulta } from './periodo-consulta.ts'
import { avisoSinRecepcion, etapaDeConsulta } from '../data/consulta.ts'

it('interpreta y muestra la hora de Tlaquepaque sin depender del equipo', () => {
  expect(instanteDeConsulta('2026-11-01T09:00')).toBe('2026-11-01T15:00:00.000Z')
  expect(fechaParaCampo('2026-11-01T15:00:00Z')).toBe('2026-11-01T09:00')
  expect(instanteDeConsulta('2026-02-31T09:00')).toBeNull()
  expect(duracionConsulta('2026-11-01T15:00:00Z', '2026-11-03T16:30:00Z')).toBe(
    '2 días, 1 hora y 30 minutos',
  )
})

it('el portal calcula los límites con la misma regla aunque el tema esté en caché', () => {
  const theme = {
    programa: {
      consulta: 'pendiente',
      consultaProgramacion: { inicio: '2026-11-01T15:00:00Z', cierre: '2026-11-02T15:00:00Z' },
    },
  }
  expect(etapaDeConsulta(theme, new Date('2026-11-01T14:59:59Z'))).toBe('pendiente')
  expect(etapaDeConsulta(theme, new Date('2026-11-01T15:00:00Z'))).toBe('abierta')
  expect(etapaDeConsulta(theme, new Date('2026-11-02T15:00:00Z'))).toBe('concluida')
})

it('usa los mensajes del Word por defecto y permite cambiarlos desde el tema', () => {
  expect(avisoSinRecepcion('pendiente')?.titulo).toBe('La consulta pública aún no ha iniciado')
  expect(avisoSinRecepcion('concluida')?.texto).toContain(
    'Puede consultar las participaciones publicadas',
  )
  expect(avisoSinRecepcion('abierta')).toBeNull()
  expect(
    avisoSinRecepcion('pendiente', {
      usuario: { textos: { consultaPendienteTitulo: 'Próximamente' } },
    })?.titulo,
  ).toBe('Próximamente')
  expect(
    avisoSinRecepcion('pendiente', { usuario: { textos: { consultaPendienteTitulo: '' } } })
      ?.titulo,
  ).toBe('La consulta pública aún no ha iniciado')
})
