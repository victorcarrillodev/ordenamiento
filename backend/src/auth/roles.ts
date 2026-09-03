/**
 * Roles y quién puede hacer qué sobre las cuentas.
 *
 * Tres niveles:
 *
 *  · `root`   — dueño del sistema. Manda sobre todas las cuentas, incluidas
 *               las de otros root. No se le puede tocar desde una cuenta de
 *               menor rango.
 *  · `admin`  — opera el panel: participaciones, contenido y cuentas de
 *               ciudadanía y de otros administradores. No puede tocar a un
 *               root ni ascender a nadie a root, porque si pudiera, el rango
 *               dejaría de significar nada.
 *  · `user`   — ciudadanía. No entra al panel.
 *
 * Las reglas viven aquí y no repartidas por los endpoints: una comprobación
 * de permisos duplicada es una comprobación que tarde o temprano se olvida en
 * uno de los sitios.
 */

export const ROLES = ['root', 'admin', 'user'] as const
export type Rol = (typeof ROLES)[number]

export function esRolValido(valor: unknown): valor is Rol {
  return typeof valor === 'string' && (ROLES as readonly string[]).includes(valor)
}

/** Normaliza lo que venga de la base o de un formulario. */
export function comoRol(valor: unknown): Rol {
  return esRolValido(valor) ? valor : 'user'
}

export function esRoot(rol: unknown): boolean {
  return rol === 'root'
}

/** ¿Puede entrar al panel de administración? */
export function puedeEntrarAlPanel(rol: unknown): boolean {
  return rol === 'root' || rol === 'admin'
}

/** ¿Puede gestionar cuentas (altas, bajas, cambios de rol y de contraseña)? */
export function puedeGestionarCuentas(rol: unknown): boolean {
  return puedeEntrarAlPanel(rol)
}

export type MotivoDenegado =
  | 'sin_permiso'
  | 'solo_root_sobre_root'
  | 'solo_root_asigna_root'
  | 'ultimo_root'
  | 'no_puede_autodegradarse'

export type Veredicto = { permitido: true } | { permitido: false; motivo: MotivoDenegado }

const OK: Veredicto = { permitido: true }
const no = (motivo: MotivoDenegado): Veredicto => ({ permitido: false, motivo })

interface Actor {
  id: string
  role: string
}

interface Objetivo {
  id: string
  role: string
}

/**
 * ¿Puede `actor` cambiar la contraseña de `objetivo` sin conocer la anterior?
 *
 * Esto es lo que hace un administrador en cualquier sistema profesional: la
 * persona perdió el acceso y alguien con rango se lo devuelve. No sustituye al
 * flujo de «olvidé mi contraseña» —ahí quien manda es el dueño del buzón—,
 * sino que cubre el caso en que ni el correo está disponible.
 */
export function puedeCambiarPassword(actor: Actor, objetivo: Objetivo): Veredicto {
  if (!puedeGestionarCuentas(actor.role)) return no('sin_permiso')
  // Un admin no puede apoderarse de una cuenta root cambiándole la contraseña:
  // sería ascender a root por la puerta de atrás.
  if (esRoot(objetivo.role) && !esRoot(actor.role)) return no('solo_root_sobre_root')
  return OK
}

/** ¿Puede `actor` crear una cuenta con el rol `rolNuevo`? */
export function puedeCrearConRol(actor: Actor, rolNuevo: Rol): Veredicto {
  if (!puedeGestionarCuentas(actor.role)) return no('sin_permiso')
  if (esRoot(rolNuevo) && !esRoot(actor.role)) return no('solo_root_asigna_root')
  return OK
}

/**
 * ¿Puede `actor` cambiarle el rol a `objetivo`?
 *
 * `rootsRestantes` es cuántas cuentas root quedarían si este cambio se
 * aplicara. Quedarse sin ninguna deja el sistema sin dueño y sin forma de
 * recuperarlo desde el panel.
 */
export function puedeCambiarRol(
  actor: Actor,
  objetivo: Objetivo,
  rolNuevo: Rol,
  rootsActuales: number,
): Veredicto {
  if (!puedeGestionarCuentas(actor.role)) return no('sin_permiso')
  if (esRoot(objetivo.role) && !esRoot(actor.role)) return no('solo_root_sobre_root')
  if (esRoot(rolNuevo) && !esRoot(actor.role)) return no('solo_root_asigna_root')

  // Degradar al último root deja el sistema huérfano.
  if (esRoot(objetivo.role) && !esRoot(rolNuevo) && rootsActuales <= 1) return no('ultimo_root')

  // Un root no se quita a sí mismo el rango de un clic; primero nombra a otro.
  if (esRoot(actor.role) && actor.id === objetivo.id && !esRoot(rolNuevo)) {
    return no('no_puede_autodegradarse')
  }

  return OK
}

/** ¿Puede `actor` borrar la cuenta de `objetivo`? */
export function puedeEliminar(actor: Actor, objetivo: Objetivo, rootsActuales: number): Veredicto {
  if (!puedeGestionarCuentas(actor.role)) return no('sin_permiso')
  if (esRoot(objetivo.role) && !esRoot(actor.role)) return no('solo_root_sobre_root')
  if (esRoot(objetivo.role) && rootsActuales <= 1) return no('ultimo_root')
  return OK
}

/** Etiqueta legible del rol, la misma en el panel y en los correos. */
export function etiquetaDeRol(rol: unknown): string {
  if (rol === 'root') return 'Root'
  if (rol === 'admin') return 'Administrador'
  return 'Ciudadano'
}
