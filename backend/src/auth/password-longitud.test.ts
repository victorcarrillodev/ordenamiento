/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, expect, it, spyOn, beforeEach, afterEach } from 'bun:test'

import * as pool from '../db/pool.ts'
import {
  PASSWORD_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
  hashPassword,
  longitudDeContrasenaValida,
  verifyCredentials,
  verifyPasswordById,
} from './auth.ts'

/**
 * Longitud de contraseña y coste de verificación.
 *
 * argon2id no tiene límite propio y cada hash cuesta 64 MB de memoria a
 * propósito: sin tope, una contraseña de megabytes convierte cualquier intento
 * de acceso en una forma barata de tumbar el servidor.
 */

let sqlMock: any

beforeEach(() => {
  sqlMock = spyOn(pool as any, 'sql').mockImplementation(async () => [])
})

afterEach(() => {
  sqlMock.mockRestore()
})

describe('longitudDeContrasenaValida', () => {
  it('acepta el rango admitido y nada más', () => {
    expect(longitudDeContrasenaValida('a'.repeat(PASSWORD_MIN_LENGTH))).toBe(true)
    expect(longitudDeContrasenaValida('a'.repeat(PASSWORD_MAX_LENGTH))).toBe(true)
    expect(longitudDeContrasenaValida('a'.repeat(PASSWORD_MIN_LENGTH - 1))).toBe(false)
    expect(longitudDeContrasenaValida('a'.repeat(PASSWORD_MAX_LENGTH + 1))).toBe(false)
  })

  it('rechaza lo que no es texto', () => {
    for (const v of [undefined, null, 12345678, {}, []]) {
      expect(longitudDeContrasenaValida(v)).toBe(false)
    }
  })
})

describe('hashPassword', () => {
  it('se niega a derivar un hash de una contraseña desmesurada', async () => {
    // Rechaza la promesa en vez de lanzar en síncrono: así un `.catch()` del
    // llamador sí lo atrapa.
    await expect(hashPassword('x'.repeat(PASSWORD_MAX_LENGTH + 1))).rejects.toThrow(
      'PASSWORD_LONGITUD_INVALIDA',
    )
  })

  it('deriva el hash de una contraseña dentro del rango', async () => {
    const hash = await hashPassword('contrasena-valida')
    expect(hash).toStartWith('$argon2id$')
  })
})

describe('verifyCredentials', () => {
  it('descarta una contraseña fuera de rango sin consultar la base', async () => {
    expect(await verifyCredentials('a@b.mx', 'x'.repeat(1_000_000))).toBeNull()
    expect(sqlMock).not.toHaveBeenCalled()
  })

  it('verifica también cuando la cuenta no existe, para no delatarla por el tiempo', async () => {
    // Devolver null al instante para un correo sin cuenta, y tardar lo que
    // cuesta argon2 para uno con cuenta, permite averiguar qué correos están
    // registrados aunque el mensaje de error sea idéntico.
    sqlMock.mockImplementation(async () => [])

    const inicio = performance.now()
    const resultado = await verifyCredentials('nadie@ejemplo.com', 'contrasena-larga')
    const transcurrido = performance.now() - inicio

    expect(resultado).toBeNull()
    // El hash señuelo cuesta tiempo real; sin él esto sería casi instantáneo.
    expect(transcurrido).toBeGreaterThan(5)
  })
})

describe('verifyPasswordById', () => {
  it('descarta una contraseña fuera de rango sin consultar la base', async () => {
    expect(await verifyPasswordById('u1', '')).toBe(false)
    expect(await verifyPasswordById('u1', 'x'.repeat(PASSWORD_MAX_LENGTH + 1))).toBe(false)
    expect(sqlMock).not.toHaveBeenCalled()
  })
})
