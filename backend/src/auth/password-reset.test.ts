import { describe, expect, it, spyOn, beforeEach, afterEach } from 'bun:test'
import { createHash } from 'node:crypto'

import * as pool from '../db/pool.ts'
import * as auth from './auth.ts'
import {
  PASSWORD_MIN_LENGTH,
  RESET_TTL_MINUTOS,
  crearSolicitudRecuperacion,
  restablecerConToken,
  tokenRecuperacionValido,
} from './password-reset.ts'

const USUARIO = {
  id: '550e8400-e29b-41d4-a716-446655440099',
  name: 'Ana Ruiz',
  email: 'ana@tlaquepaque.gob.mx',
}

const sha256 = (v: string) => createHash('sha256').update(v).digest('hex')

/** Consultas ejecutadas en el test actual: `{ sql, valores }` por llamada. */
let consultas: Array<{ sql: string; valores: unknown[] }>
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let sqlMock: any

/**
 * Enruta cada consulta por su texto. `filas` decide qué devuelven las dos
 * lecturas que hace el módulo: la del usuario por correo y la del token.
 */
function mockSql(filas: { usuario?: unknown[]; token?: unknown[]; consumo?: unknown[] } = {}) {
  sqlMock.mockImplementation(async (strings: TemplateStringsArray, ...valores: unknown[]) => {
    const texto = strings.join('?')
    consultas.push({ sql: texto, valores })
    if (texto.includes('FROM users WHERE email')) return filas.usuario ?? []
    if (texto.includes('FROM password_resets pr')) return filas.token ?? []
    if (texto.includes('WHERE id =') && texto.includes('RETURNING')) return filas.consumo ?? []
    return []
  })
}

beforeEach(() => {
  consultas = []
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  sqlMock = spyOn(pool as any, 'sql')
})

afterEach(() => {
  sqlMock.mockRestore()
})

describe('crearSolicitudRecuperacion', () => {
  it('devuelve null y no emite token si el correo no tiene cuenta', async () => {
    mockSql({ usuario: [] })

    const resultado = await crearSolicitudRecuperacion('nadie@ejemplo.com')

    expect(resultado).toBeNull()
    expect(consultas.some((c) => c.sql.includes('INSERT INTO password_resets'))).toBe(false)
  })

  it('normaliza el correo antes de buscarlo', async () => {
    mockSql({ usuario: [USUARIO] })

    await crearSolicitudRecuperacion('  ANA@Tlaquepaque.Gob.MX  ')

    const busqueda = consultas.find((c) => c.sql.includes('FROM users WHERE email'))
    expect(busqueda?.valores[0]).toBe('ana@tlaquepaque.gob.mx')
  })

  it('guarda el SHA-256 del token, nunca el token en claro', async () => {
    mockSql({ usuario: [USUARIO] })

    const resultado = await crearSolicitudRecuperacion(USUARIO.email)

    expect(resultado).not.toBeNull()
    const insert = consultas.find((c) => c.sql.includes('INSERT INTO password_resets'))
    expect(insert).toBeDefined()
    const [userId, hash, expira] = insert!.valores as [string, string, Date]
    expect(userId).toBe(USUARIO.id)
    expect(hash).toBe(sha256(resultado!.token))
    expect(hash).not.toBe(resultado!.token)
    // El token en claro no aparece en NINGUNA consulta.
    const todo = JSON.stringify(consultas)
    expect(todo.includes(resultado!.token)).toBe(false)
    // Vence dentro del margen esperado (con holgura por el tiempo del test).
    const minutos = (expira.getTime() - Date.now()) / 60_000
    expect(minutos).toBeGreaterThan(RESET_TTL_MINUTOS - 1)
    expect(minutos).toBeLessThanOrEqual(RESET_TTL_MINUTOS)
  })

  it('invalida los enlaces anteriores del mismo usuario', async () => {
    mockSql({ usuario: [USUARIO] })

    await crearSolicitudRecuperacion(USUARIO.email)

    const invalidacion = consultas.find(
      (c) => c.sql.includes('UPDATE password_resets') && c.sql.includes('used_at IS NULL'),
    )
    expect(invalidacion).toBeDefined()
    expect(invalidacion!.valores[0]).toBe(USUARIO.id)
  })

  it('emite tokens distintos en cada solicitud', async () => {
    mockSql({ usuario: [USUARIO] })

    const a = await crearSolicitudRecuperacion(USUARIO.email)
    const b = await crearSolicitudRecuperacion(USUARIO.email)

    expect(a!.token).not.toBe(b!.token)
    expect(a!.token.length).toBeGreaterThanOrEqual(32)
  })
})

describe('tokenRecuperacionValido', () => {
  it('rechaza un token con forma inválida sin consultar la base', async () => {
    mockSql({ token: [] })

    const estado = await tokenRecuperacionValido("' OR 1=1 --")

    expect(estado).toEqual({ valido: false, motivo: 'invalido' })
    expect(consultas).toHaveLength(0)
  })

  it('rechaza un token que no existe', async () => {
    mockSql({ token: [] })

    const estado = await tokenRecuperacionValido('a'.repeat(43))

    expect(estado).toEqual({ valido: false, motivo: 'invalido' })
  })

  it('distingue un enlace vencido de uno inválido', async () => {
    const token = 'b'.repeat(43)
    mockSql({
      token: [
        {
          id: 'r1',
          user_id: USUARIO.id,
          token_hash: sha256(token),
          expirado: true,
          name: USUARIO.name,
          email: USUARIO.email,
        },
      ],
    })

    expect(await tokenRecuperacionValido(token)).toEqual({ valido: false, motivo: 'expirado' })
  })

  it('acepta un enlace vigente', async () => {
    const token = 'c'.repeat(43)
    mockSql({
      token: [
        {
          id: 'r1',
          user_id: USUARIO.id,
          token_hash: sha256(token),
          expirado: false,
          name: USUARIO.name,
          email: USUARIO.email,
        },
      ],
    })

    expect(await tokenRecuperacionValido(token)).toEqual({ valido: true, usuario: USUARIO })
  })

  it('busca por el hash del token, no por el token', async () => {
    const token = 'd'.repeat(43)
    mockSql({ token: [] })

    await tokenRecuperacionValido(token)

    expect(consultas[0].valores[0]).toBe(sha256(token))
  })
})

describe('restablecerConToken', () => {
  const token = 'e'.repeat(43)
  const filaVigente = {
    id: 'r1',
    user_id: USUARIO.id,
    token_hash: sha256(token),
    expirado: false,
    name: USUARIO.name,
    email: USUARIO.email,
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let updateSpy: any

  beforeEach(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    updateSpy = spyOn(auth as any, 'updateUserPassword').mockResolvedValue(true)
  })

  afterEach(() => {
    updateSpy.mockRestore()
  })

  it('rechaza una contraseña corta sin tocar la base', async () => {
    mockSql({ token: [filaVigente] })

    const resultado = await restablecerConToken(token, 'a'.repeat(PASSWORD_MIN_LENGTH - 1))

    expect(resultado).toEqual({ ok: false, motivo: 'password_corta' })
    expect(consultas).toHaveLength(0)
    expect(updateSpy).not.toHaveBeenCalled()
  })

  it('rechaza un enlace vencido sin cambiar la contraseña', async () => {
    mockSql({ token: [{ ...filaVigente, expirado: true }] })

    const resultado = await restablecerConToken(token, 'contrasena-larga')

    expect(resultado).toEqual({ ok: false, motivo: 'expirado' })
    expect(updateSpy).not.toHaveBeenCalled()
  })

  it('consume el enlace y cambia la contraseña', async () => {
    mockSql({ token: [filaVigente], consumo: [{ id: 'r1' }] })

    const resultado = await restablecerConToken(token, 'contrasena-larga')

    expect(resultado).toEqual({ ok: true, usuario: USUARIO })
    expect(updateSpy).toHaveBeenCalledWith(USUARIO.id, 'contrasena-larga')
    const consumo = consultas.find(
      (c) => c.sql.includes('UPDATE password_resets') && c.sql.includes('RETURNING'),
    )
    expect(consumo).toBeDefined()
  })

  it('no cambia la contraseña si otra petición ya consumió el enlace', async () => {
    // El UPDATE ... WHERE used_at IS NULL no devuelve filas: llegó segundo.
    mockSql({ token: [filaVigente], consumo: [] })

    const resultado = await restablecerConToken(token, 'contrasena-larga')

    expect(resultado).toEqual({ ok: false, motivo: 'invalido' })
    expect(updateSpy).not.toHaveBeenCalled()
  })
})
