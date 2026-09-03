/**
 * Roles, en el lado del navegador.
 *
 * Espejo de backend/src/auth/roles.ts. Aquí solo sirve para NO enseñar
 * botones que el servidor va a rechazar; quien decide de verdad es el
 * backend, porque estas comprobaciones viven en una página que cualquiera
 * puede editar desde las herramientas de desarrollo.
 */

export const ROLES = ['root', 'admin', 'user'] as const
export type Rol = (typeof ROLES)[number]

export function comoRol(valor: unknown): Rol {
  return valor === 'root' || valor === 'admin' ? valor : 'user'
}

export function esRoot(rol: unknown): boolean {
  return rol === 'root'
}

/** ¿Entra al panel de administración? */
export function puedeEntrarAlPanel(rol: unknown): boolean {
  return rol === 'root' || rol === 'admin'
}

/** Etiqueta legible, la misma que usa el backend. */
export function etiquetaDeRol(rol: unknown): string {
  if (rol === 'root') return 'Root'
  if (rol === 'admin') return 'Administrador'
  return 'Ciudadano'
}

/** Clase del distintivo de rol en las tablas. */
export function claseDeRol(rol: unknown): string {
  if (rol === 'root') return 'badge badge--root'
  if (rol === 'admin') return 'badge procedente'
  return 'badge en-proceso'
}

/**
 * ¿Puede quien mira actuar sobre esta cuenta? Solo un root manda sobre otro
 * root; para el resto basta con entrar al panel.
 */
export function puedeActuarSobre(rolActor: unknown, rolObjetivo: unknown): boolean {
  if (!puedeEntrarAlPanel(rolActor)) return false
  return esRoot(rolObjetivo) ? esRoot(rolActor) : true
}
