import { afterEach, expect, it, spyOn } from 'bun:test'
import { sql } from '../db/pool.ts'
import { cambiarRol, eliminarUsuario } from './users.ts'

let restaurar: (() => void) | undefined
afterEach(() => restaurar?.())

function base(actorRol: string, objetivoRol: string, roots: number) {
  const pedidos: string[] = []
  const tx = async (partes: TemplateStringsArray, ...args: unknown[]) => {
    const texto = partes.join('?')
    pedidos.push(texto)
    if (texto.includes('LOCK TABLE')) return []
    if (texto.includes('count(*)')) return [{ n: String(roots) }]
    if (texto.includes('SELECT id::text AS id, role')) {
      return [
        {
          id: args[0],
          role: args[0] === 'actor' ? actorRol : objetivoRol,
          email: 'ejemplo@example.com',
          name: 'Ejemplo',
        },
      ]
    }
    return [{ id: 'objetivo' }]
  }
  const begin = spyOn(sql, 'begin').mockImplementation((async (fn: (db: unknown) => unknown) =>
    fn(tx)) as never)
  restaurar = () => begin.mockRestore()
  return pedidos
}

it('bloquea antes de releer permisos y conserva el último root aunque el endpoint lo hubiera visto antes', async () => {
  const pedidos = base('root', 'root', 1)
  expect(await eliminarUsuario('objetivo', 'actor')).toBe(false)
  expect(pedidos[0]).toContain('LOCK TABLE users')
  expect(pedidos.some((p) => p.includes('DELETE'))).toBe(false)
  expect(await cambiarRol('objetivo', 'admin', 'actor')).toBe(false)
  expect(pedidos.some((p) => p.includes('UPDATE'))).toBe(false)
})

it('un admin no puede borrar una cuenta que fue promovida a root mientras esperaba', async () => {
  const pedidos = base('admin', 'root', 2)
  expect(await eliminarUsuario('objetivo', 'actor')).toBe(false)
  expect(pedidos.some((p) => p.includes('DELETE'))).toBe(false)
})

it('borra la cuenta autorizada con una sola sentencia sobre users, conservando el contenido por sus referencias', async () => {
  const pedidos = base('root', 'admin', 1)
  expect(await eliminarUsuario('objetivo', 'actor')).toBe(true)
  expect(pedidos.filter((p) => p.includes('DELETE'))).toEqual([
    'DELETE FROM users WHERE id = ? RETURNING id::text AS id',
  ])
})
