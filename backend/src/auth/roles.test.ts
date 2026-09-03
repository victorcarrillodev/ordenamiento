import { describe, expect, it } from 'bun:test'

import {
  comoRol,
  esRoot,
  etiquetaDeRol,
  puedeCambiarPassword,
  puedeCambiarRol,
  puedeCrearConRol,
  puedeEliminar,
  puedeEntrarAlPanel,
} from './roles.ts'

const root = { id: 'r1', role: 'root' }
const otroRoot = { id: 'r2', role: 'root' }
const admin = { id: 'a1', role: 'admin' }
const otroAdmin = { id: 'a2', role: 'admin' }
const ciudadano = { id: 'c1', role: 'user' }

describe('Acceso al panel', () => {
  it('entran root y admin; la ciudadanía no', () => {
    expect(puedeEntrarAlPanel('root')).toBe(true)
    expect(puedeEntrarAlPanel('admin')).toBe(true)
    expect(puedeEntrarAlPanel('user')).toBe(false)
    expect(puedeEntrarAlPanel('inventado')).toBe(false)
    expect(puedeEntrarAlPanel(undefined)).toBe(false)
  })
})

describe('comoRol', () => {
  it('cae a ciudadanía ante cualquier valor que no sea un rol', () => {
    expect(comoRol('root')).toBe('root')
    expect(comoRol('admin')).toBe('admin')
    // Lo que venga de un formulario no decide el rango.
    expect(comoRol('superadmin')).toBe('user')
    expect(comoRol(undefined)).toBe('user')
    expect(comoRol({ role: 'root' })).toBe('user')
  })
})

describe('Cambiar la contraseña de otra cuenta', () => {
  it('root puede sobre cualquiera, incluidos otros root', () => {
    expect(puedeCambiarPassword(root, ciudadano).permitido).toBe(true)
    expect(puedeCambiarPassword(root, admin).permitido).toBe(true)
    expect(puedeCambiarPassword(root, otroRoot).permitido).toBe(true)
  })

  it('admin puede sobre ciudadanía y otros admin', () => {
    expect(puedeCambiarPassword(admin, ciudadano).permitido).toBe(true)
    expect(puedeCambiarPassword(admin, otroAdmin).permitido).toBe(true)
  })

  it('admin NO puede sobre un root', () => {
    // Cambiarle la contraseña a root sería ascender a root por la puerta de
    // atrás: se entra con ella y ya se manda sobre todo.
    const v = puedeCambiarPassword(admin, root)
    expect(v.permitido).toBe(false)
    expect(v.permitido === false && v.motivo).toBe('solo_root_sobre_root')
  })

  it('la ciudadanía no puede sobre nadie', () => {
    expect(puedeCambiarPassword(ciudadano, ciudadano).permitido).toBe(false)
    expect(puedeCambiarPassword(ciudadano, admin).permitido).toBe(false)
  })
})

describe('Crear cuentas', () => {
  it('solo root crea otros root', () => {
    expect(puedeCrearConRol(root, 'root').permitido).toBe(true)
    const v = puedeCrearConRol(admin, 'root')
    expect(v.permitido).toBe(false)
    expect(v.permitido === false && v.motivo).toBe('solo_root_asigna_root')
  })

  it('admin crea administradores y ciudadanía', () => {
    expect(puedeCrearConRol(admin, 'admin').permitido).toBe(true)
    expect(puedeCrearConRol(admin, 'user').permitido).toBe(true)
  })
})

describe('Cambiar el rol de una cuenta', () => {
  it('admin no toca a un root ni reparte el rango de root', () => {
    expect(puedeCambiarRol(admin, root, 'user', 2).permitido).toBe(false)
    expect(puedeCambiarRol(admin, ciudadano, 'root', 2).permitido).toBe(false)
  })

  it('no se puede degradar al último root', () => {
    // Dejaría el sistema sin dueño y sin forma de recuperarlo desde el panel.
    const v = puedeCambiarRol(root, otroRoot, 'admin', 1)
    expect(v.permitido).toBe(false)
    expect(v.permitido === false && v.motivo).toBe('ultimo_root')
    // Con dos root, sí.
    expect(puedeCambiarRol(root, otroRoot, 'admin', 2).permitido).toBe(true)
  })

  it('un root no se degrada a sí mismo de un clic', () => {
    const v = puedeCambiarRol(root, root, 'admin', 3)
    expect(v.permitido).toBe(false)
    expect(v.permitido === false && v.motivo).toBe('no_puede_autodegradarse')
  })

  it('root asciende a quien quiera', () => {
    expect(puedeCambiarRol(root, ciudadano, 'admin', 1).permitido).toBe(true)
    expect(puedeCambiarRol(root, admin, 'root', 1).permitido).toBe(true)
  })
})

describe('Eliminar cuentas', () => {
  it('admin no borra a un root', () => {
    expect(puedeEliminar(admin, root, 2).permitido).toBe(false)
  })

  it('nadie borra al último root, ni el propio root', () => {
    const v = puedeEliminar(root, otroRoot, 1)
    expect(v.permitido).toBe(false)
    expect(v.permitido === false && v.motivo).toBe('ultimo_root')
  })

  it('root borra a cualquiera mientras quede otro root', () => {
    expect(puedeEliminar(root, otroRoot, 2).permitido).toBe(true)
    expect(puedeEliminar(root, admin, 1).permitido).toBe(true)
    expect(puedeEliminar(admin, ciudadano, 1).permitido).toBe(true)
  })
})

describe('Etiquetas', () => {
  it('nombra los tres rangos', () => {
    expect(etiquetaDeRol('root')).toBe('Root')
    expect(etiquetaDeRol('admin')).toBe('Administrador')
    expect(etiquetaDeRol('user')).toBe('Ciudadano')
    expect(esRoot('root')).toBe(true)
    expect(esRoot('admin')).toBe(false)
  })
})
