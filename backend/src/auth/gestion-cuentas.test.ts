/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, expect, it, spyOn, beforeEach, afterEach } from 'bun:test'

import { handleRequest } from '../app.ts'
import * as auth from './auth.ts'
import * as users from '../services/users.ts'

/**
 * Endpoints de gestión de cuentas.
 *
 * Lo que se comprueba aquí no es que funcionen, sino que NO funcionen cuando
 * no deben: un administrador no puede apoderarse de una cuenta root, y nadie
 * puede dejar el sistema sin ninguna.
 */

const ROOT = {
  id: '550e8400-e29b-41d4-a716-446655440001',
  name: 'Root',
  role: 'root',
  email: 'root@x.mx',
}
const ADMIN = {
  id: '550e8400-e29b-41d4-a716-446655440002',
  name: 'Admin',
  role: 'admin',
  email: 'admin@x.mx',
}
const OBJETIVO_ROOT = {
  id: '550e8400-e29b-41d4-a716-4466554400aa',
  role: 'root',
  email: 'otro-root@x.mx',
  name: 'Otro Root',
}
const OBJETIVO_ADMIN = {
  id: '550e8400-e29b-41d4-a716-4466554400bb',
  role: 'admin',
  email: 'otro-admin@x.mx',
  name: 'Otro Admin',
}

function req(path: string, method = 'GET', body?: unknown) {
  return new Request(`http://localhost${path}`, {
    method,
    headers: { cookie: 'ordenamiento_session=token', 'content-type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  })
}

let verifySpy: any
let userSpy: any
let cuentaSpy: any
let rootsSpy: any
let passwordSpy: any
let rolSpy: any
let borrarSpy: any

/** Quién está autenticado en la petición. */
function sesion(quien: typeof ROOT) {
  userSpy.mockImplementation(async () => quien as any)
}

beforeEach(() => {
  verifySpy = spyOn(auth as any, 'verifySessionToken').mockImplementation(async () => ROOT.id)
  userSpy = spyOn(auth as any, 'getUserById').mockImplementation(async () => ROOT as any)
  cuentaSpy = spyOn(users as any, 'obtenerCuenta').mockImplementation(async () => OBJETIVO_ADMIN)
  rootsSpy = spyOn(users as any, 'contarRoots').mockImplementation(async () => 2)
  passwordSpy = spyOn(auth as any, 'updateUserPassword').mockImplementation(async () => true)
  rolSpy = spyOn(users as any, 'cambiarRol').mockImplementation(async () => true)
  borrarSpy = spyOn(users as any, 'eliminarUsuario').mockImplementation(async () => true)
})

afterEach(() => {
  for (const s of [verifySpy, userSpy, cuentaSpy, rootsSpy, passwordSpy, rolSpy, borrarSpy]) {
    s.mockRestore()
  }
})

describe('Restablecer la contraseña de otra cuenta', () => {
  it('root puede sobre una cuenta root', async () => {
    sesion(ROOT)
    cuentaSpy.mockImplementation(async () => OBJETIVO_ROOT)

    const res = await handleRequest(
      req(`/api/users/${OBJETIVO_ROOT.id}/password`, 'POST', { password: 'contrasena-nueva' }),
    )

    expect(res.status).toBe(200)
    expect(passwordSpy).toHaveBeenCalled()
  })

  it('admin NO puede sobre una cuenta root', async () => {
    // Cambiarle la contraseña a root es apoderarse de root.
    sesion(ADMIN)
    cuentaSpy.mockImplementation(async () => OBJETIVO_ROOT)

    const res = await handleRequest(
      req(`/api/users/${OBJETIVO_ROOT.id}/password`, 'POST', { password: 'contrasena-nueva' }),
    )

    expect(res.status).toBe(403)
    expect(passwordSpy).not.toHaveBeenCalled()
    expect(((await res.json()) as any).motivo).toBe('solo_root_sobre_root')
  })

  it('admin sí puede sobre otro admin', async () => {
    sesion(ADMIN)
    const res = await handleRequest(
      req(`/api/users/${OBJETIVO_ADMIN.id}/password`, 'POST', { password: 'contrasena-nueva' }),
    )
    expect(res.status).toBe(200)
  })

  it('rechaza una contraseña fuera de rango', async () => {
    sesion(ROOT)
    passwordSpy.mockImplementation(async () => {
      throw new Error('PASSWORD_LONGITUD_INVALIDA')
    })
    const res = await handleRequest(
      req(`/api/users/${OBJETIVO_ADMIN.id}/password`, 'POST', { password: 'corta' }),
    )
    expect(res.status).toBe(422)
  })

  it('exige un id con forma de UUID', async () => {
    sesion(ROOT)
    const res = await handleRequest(
      req('/api/users/123/password', 'POST', { password: 'x'.repeat(12) }),
    )
    expect(res.status).toBe(400)
    expect(passwordSpy).not.toHaveBeenCalled()
  })

  it('sin sesión no pasa', async () => {
    userSpy.mockImplementation(async () => null)
    const res = await handleRequest(
      req(`/api/users/${OBJETIVO_ADMIN.id}/password`, 'POST', { password: 'contrasena-nueva' }),
    )
    expect(res.status).toBe(403)
    expect(passwordSpy).not.toHaveBeenCalled()
  })
})

describe('Cambiar el rango de una cuenta', () => {
  it('admin no puede repartir el rango root', async () => {
    sesion(ADMIN)
    const res = await handleRequest(
      req(`/api/users/${OBJETIVO_ADMIN.id}`, 'PATCH', { role: 'root' }),
    )
    expect(res.status).toBe(403)
    expect(rolSpy).not.toHaveBeenCalled()
  })

  it('no se puede degradar al último root', async () => {
    sesion(ROOT)
    cuentaSpy.mockImplementation(async () => OBJETIVO_ROOT)
    rootsSpy.mockImplementation(async () => 1)

    const res = await handleRequest(
      req(`/api/users/${OBJETIVO_ROOT.id}`, 'PATCH', { role: 'admin' }),
    )

    expect(res.status).toBe(409)
    expect(((await res.json()) as any).motivo).toBe('ultimo_root')
    expect(rolSpy).not.toHaveBeenCalled()
  })

  it('rechaza un rol inventado en vez de aceptarlo tal cual', async () => {
    sesion(ROOT)
    const res = await handleRequest(
      req(`/api/users/${OBJETIVO_ADMIN.id}`, 'PATCH', { role: 'superadmin' }),
    )
    expect(res.status).toBe(422)
    expect(rolSpy).not.toHaveBeenCalled()
  })

  it('root asciende a otra cuenta', async () => {
    sesion(ROOT)
    const res = await handleRequest(
      req(`/api/users/${OBJETIVO_ADMIN.id}`, 'PATCH', { role: 'root' }),
    )
    expect(res.status).toBe(200)
    expect(rolSpy).toHaveBeenCalled()
  })
})

describe('Eliminar cuentas', () => {
  it('admin no borra a un root', async () => {
    sesion(ADMIN)
    cuentaSpy.mockImplementation(async () => OBJETIVO_ROOT)
    const res = await handleRequest(req(`/api/users/${OBJETIVO_ROOT.id}`, 'DELETE'))
    expect(res.status).toBe(403)
    expect(borrarSpy).not.toHaveBeenCalled()
  })

  it('nadie borra al último root', async () => {
    sesion(ROOT)
    cuentaSpy.mockImplementation(async () => OBJETIVO_ROOT)
    rootsSpy.mockImplementation(async () => 1)
    const res = await handleRequest(req(`/api/users/${OBJETIVO_ROOT.id}`, 'DELETE'))
    expect(res.status).toBe(409)
    expect(borrarSpy).not.toHaveBeenCalled()
  })

  it('root borra a un admin', async () => {
    sesion(ROOT)
    const res = await handleRequest(req(`/api/users/${OBJETIVO_ADMIN.id}`, 'DELETE'))
    expect(res.status).toBe(200)
    expect(borrarSpy).toHaveBeenCalled()
  })

  it('404 si la cuenta no existe, sin borrar nada', async () => {
    sesion(ROOT)
    cuentaSpy.mockImplementation(async () => null)
    const res = await handleRequest(req(`/api/users/${OBJETIVO_ADMIN.id}`, 'DELETE'))
    expect(res.status).toBe(404)
    expect(borrarSpy).not.toHaveBeenCalled()
  })
})

describe('Crear cuentas', () => {
  it('admin no puede crear una cuenta root', async () => {
    sesion(ADMIN)
    const registrar = spyOn(auth as any, 'registerUser').mockImplementation(async () => ({
      id: 'x',
    }))

    const res = await handleRequest(
      req('/api/users', 'POST', {
        email: 'nuevo@x.mx',
        name: 'Nuevo',
        password: 'contrasena-larga',
        role: 'root',
      }),
    )

    expect(res.status).toBe(403)
    expect(registrar).not.toHaveBeenCalled()
    registrar.mockRestore()
  })

  it('un rol inventado no asciende a nadie: cae a ciudadanía', async () => {
    sesion(ADMIN)
    const registrar = spyOn(auth as any, 'registerUser').mockImplementation(async () => ({
      id: 'x',
    }))

    await handleRequest(
      req('/api/users', 'POST', {
        email: 'nuevo@x.mx',
        name: 'Nuevo',
        password: 'contrasena-larga',
        role: 'root ',
      }),
    )

    const alta = registrar.mock.calls[0][0] as { role: string }
    expect(alta.role).toBe('user')
    registrar.mockRestore()
  })
})
