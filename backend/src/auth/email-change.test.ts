/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, expect, it, spyOn, beforeEach, afterEach } from 'bun:test'
import { createHash } from 'node:crypto'

import * as pool from '../db/pool.ts'
import { confirmarCambioEmail, solicitarCambioEmail } from './email-change.ts'

const USUARIO = { id: 'u1', name: 'Ana Ruiz', email: 'ana@tlaquepaque.gob.mx' }
const sha256 = (v: string) => createHash('sha256').update(v).digest('hex')

let consultas: Array<{ sql: string; valores: unknown[] }>
let sqlMock: any

/**
 * `filas` decide qué devuelve cada lectura del módulo: el usuario por id, la
 * comprobación de correo ocupado, la búsqueda del token y su consumo.
 */
function mockSql(
  filas: {
    usuario?: unknown[]
    ocupado?: unknown[]
    token?: unknown[]
    consumo?: unknown[]
    actualizacion?: unknown[]
  } = {},
) {
  sqlMock.mockImplementation(async (strings: TemplateStringsArray, ...valores: unknown[]) => {
    const texto = strings.join('?')
    consultas.push({ sql: texto, valores })
    if (texto.includes('FROM users WHERE id')) return filas.usuario ?? []
    if (texto.includes('WHERE email =') && texto.includes('id <> ')) return filas.ocupado ?? []
    if (texto.includes('FROM email_changes ec')) return filas.token ?? []
    if (texto.includes('UPDATE email_changes') && texto.includes('RETURNING')) {
      return filas.consumo ?? []
    }
    if (texto.includes('UPDATE users SET email')) return filas.actualizacion ?? []
    return []
  })
}

const siempreValida = async () => true
const nuncaValida = async () => false

beforeEach(() => {
  consultas = []
  sqlMock = spyOn(pool as any, 'sql')
})

afterEach(() => {
  sqlMock.mockRestore()
})

describe('solicitarCambioEmail', () => {
  const base = {
    userId: USUARIO.id,
    nuevoEmail: 'nueva@tlaquepaque.gob.mx',
    passwordActual: 'secreta-larga',
    verificarPassword: siempreValida,
  }

  it('rechaza un correo mal formado antes de consultar nada', async () => {
    mockSql({ usuario: [USUARIO] })
    const r = await solicitarCambioEmail({ ...base, nuevoEmail: 'sin-arroba' })
    expect(r).toEqual({ ok: false, motivo: 'email_invalido' })
    expect(consultas).toHaveLength(0)
  })

  it('rechaza cambiar al mismo correo que ya tiene', async () => {
    mockSql({ usuario: [USUARIO] })
    const r = await solicitarCambioEmail({ ...base, nuevoEmail: '  ANA@Tlaquepaque.Gob.MX ' })
    expect(r).toEqual({ ok: false, motivo: 'email_igual' })
  })

  it('exige la contraseña actual: sin ella no emite token', async () => {
    mockSql({ usuario: [USUARIO] })
    const r = await solicitarCambioEmail({ ...base, verificarPassword: nuncaValida })
    expect(r).toEqual({ ok: false, motivo: 'password_incorrecta' })
    expect(consultas.some((c) => c.sql.includes('INSERT INTO email_changes'))).toBe(false)
  })

  it('comprueba la contraseña ANTES de mirar si el correo está libre', async () => {
    // Si el orden fuera al revés, cualquiera con la sesión de otro podría usar
    // el formulario para averiguar qué direcciones están registradas.
    mockSql({ usuario: [USUARIO], ocupado: [{ id: 'otro' }] })
    const r = await solicitarCambioEmail({ ...base, verificarPassword: nuncaValida })
    expect(r).toEqual({ ok: false, motivo: 'password_incorrecta' })
  })

  it('rechaza un correo que ya usa otra cuenta', async () => {
    mockSql({ usuario: [USUARIO], ocupado: [{ id: 'otro' }] })
    const r = await solicitarCambioEmail(base)
    expect(r).toEqual({ ok: false, motivo: 'email_ocupado' })
  })

  it('guarda el hash del token, nunca el token, y no toca users.email', async () => {
    mockSql({ usuario: [USUARIO] })
    const r = await solicitarCambioEmail(base)

    expect(r.ok).toBe(true)
    if (!r.ok) return
    const insert = consultas.find((c) => c.sql.includes('INSERT INTO email_changes'))
    expect(insert).toBeDefined()
    const [userId, nuevo, hash] = insert!.valores as [string, string, string]
    expect(userId).toBe(USUARIO.id)
    expect(nuevo).toBe('nueva@tlaquepaque.gob.mx')
    expect(hash).toBe(sha256(r.token))
    expect(JSON.stringify(consultas).includes(r.token)).toBe(false)
    // El correo de la cuenta sigue intacto hasta la confirmación.
    expect(consultas.some((c) => c.sql.includes('UPDATE users SET email'))).toBe(false)
  })

  it('invalida las solicitudes anteriores del mismo usuario', async () => {
    mockSql({ usuario: [USUARIO] })
    await solicitarCambioEmail(base)
    const previas = consultas.find(
      (c) => c.sql.includes('UPDATE email_changes') && c.sql.includes('used_at IS NULL'),
    )
    expect(previas?.valores[0]).toBe(USUARIO.id)
  })
})

describe('confirmarCambioEmail', () => {
  const token = 'b'.repeat(43)
  const fila = {
    id: 'ec1',
    user_id: USUARIO.id,
    nuevo_email: 'nueva@tlaquepaque.gob.mx',
    token_hash: sha256(token),
    expirado: false,
    nombre: USUARIO.name,
    email_actual: USUARIO.email,
  }

  it('rechaza un token con forma inválida sin consultar la base', async () => {
    mockSql({})
    expect(await confirmarCambioEmail("' OR 1=1 --")).toEqual({ ok: false, motivo: 'invalido' })
    expect(consultas).toHaveLength(0)
  })

  it('rechaza un enlace vencido sin cambiar el correo', async () => {
    mockSql({ token: [{ ...fila, expirado: true }] })
    expect(await confirmarCambioEmail(token)).toEqual({ ok: false, motivo: 'expirado' })
    expect(consultas.some((c) => c.sql.includes('UPDATE users SET email'))).toBe(false)
  })

  it('rechaza si la dirección se ocupó entre la solicitud y la confirmación', async () => {
    mockSql({ token: [fila], ocupado: [{ id: 'otro' }] })
    expect(await confirmarCambioEmail(token)).toEqual({ ok: false, motivo: 'email_ocupado' })
    expect(consultas.some((c) => c.sql.includes('UPDATE users SET email'))).toBe(false)
  })

  it('aplica el cambio y devuelve ambas direcciones para poder avisar', async () => {
    mockSql({ token: [fila], consumo: [{ id: 'ec1' }], actualizacion: [{ id: USUARIO.id }] })

    const r = await confirmarCambioEmail(token)

    expect(r).toEqual({
      ok: true,
      userId: USUARIO.id,
      nombre: USUARIO.name,
      emailAnterior: USUARIO.email,
      emailNuevo: 'nueva@tlaquepaque.gob.mx',
    })
  })

  it('no aplica nada si otra petición consumió el enlace primero', async () => {
    mockSql({ token: [fila], consumo: [] })
    expect(await confirmarCambioEmail(token)).toEqual({ ok: false, motivo: 'invalido' })
    expect(consultas.some((c) => c.sql.includes('UPDATE users SET email'))).toBe(false)
  })

  it('busca por el hash del token, no por el token', async () => {
    mockSql({ token: [] })
    await confirmarCambioEmail(token)
    expect(consultas[0].valores[0]).toBe(sha256(token))
  })
})
