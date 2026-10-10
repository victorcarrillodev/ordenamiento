import { sql } from '../db/pool.ts'
import type { AvatarValidado } from '../services/avatar.ts'
import {
  hashPassword,
  longitudDeContrasenaValida,
  PASSWORD_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
} from './auth.ts'
import { formaValida, generarToken, hashToken, hashesIguales } from './tokens.ts'

/**
 * Primer acceso de las cuentas que da de alta un root.
 *
 * El root crea la cuenta con nombre, correo y una contraseña PROVISIONAL que él
 * escribe. La persona recibe un correo con un enlace a su panel de configuración,
 * donde captura su nombre(s) y apellidos, elige su contraseña y, si quiere, su foto.
 * Hasta que lo hace la cuenta está «por configurar» (`users.setup_pending`) y no
 * puede iniciar sesión: ni con la contraseña provisional ni con otra que obtenga
 * por «olvidé mi contraseña». Se llega al panel de configuración de dos maneras
 * equivalentes:
 *
 *  · con el enlace del correo, que vale `INVITACION_TTL_DIAS` días y un solo uso;
 *  · iniciando sesión con la contraseña provisional (que el root entrega por otro
 *    medio): en vez de abrir la sesión se emite un enlace de corta vida que lleva
 *    al mismo panel.
 *
 * La contraseña provisional NUNCA viaja en el correo. La mecánica del token
 * (aleatoriedad, hash en reposo, comparación en tiempo constante) es la de
 * `tokens.ts`, compartida con la recuperación de contraseña.
 */

/** Días que vale la invitación: el enlace del correo y la contraseña provisional. */
export const INVITACION_TTL_DIAS = 7

/** Minutos que vale el enlace que se emite al entrar con la contraseña provisional. */
export const ENTRADA_PROVISIONAL_TTL_MINUTOS = 60

const DIA_MS = 24 * 60 * 60 * 1000

/** Largo máximo de cada parte del nombre; juntas (con el espacio) caben de sobra en los 120 de `users.name`. */
export const NOMBRE_MAX = 50
export const NOMBRE_MIN = 2

export interface UsuarioPorConfigurar {
  id: string
  name: string
  email: string
  role: string
}

/** Fecha hasta la que vale una invitación emitida ahora. */
export function vigenciaDeInvitacion(ahora: number = Date.now()): Date {
  return new Date(ahora + INVITACION_TTL_DIAS * DIA_MS)
}

// ---------------------------------------------------------------------------
// Estado de la cuenta
// ---------------------------------------------------------------------------

/**
 * ¿Debe esta cuenta pasar por el panel de configuración, y todavía puede? Lo
 * consulta el inicio de sesión: `vencida` es que la contraseña provisional ya no
 * sirve y hace falta que un root reenvíe la invitación.
 */
export async function estadoDeConfiguracion(
  userId: string,
): Promise<{ pendiente: boolean; vencida: boolean }> {
  const filas = await sql<Array<{ pendiente: boolean; vencida: boolean }>>`--sql
    SELECT setup_pending AS pendiente,
           (setup_pending AND setup_expires_at IS NOT NULL AND setup_expires_at < now()) AS vencida
    FROM users WHERE id = ${userId}
  `
  return filas[0] ?? { pendiente: false, vencida: false }
}

// ---------------------------------------------------------------------------
// Enlaces de configuración
// ---------------------------------------------------------------------------

/**
 * Emite un enlace de configuración para la cuenta. Con `invalidarAnteriores`
 * (lo que hace «reenviar la invitación») los enlaces que siguieran vivos dejan
 * de servir, así un correo viejo reenviado o filtrado ya no abre nada. El que se
 * emite al entrar con la contraseña provisional NO invalida los demás: quien
 * entra, no termina y más tarde abre el correo, debe poder seguir con él.
 */
export async function emitirEnlaceDeConfiguracion(
  userId: string,
  opciones: { vigenciaMs: number; invalidarAnteriores: boolean },
): Promise<{ token: string; expiraEn: Date }> {
  if (opciones.invalidarAnteriores) {
    await sql`--sql
      UPDATE account_setups SET used_at = now()
      WHERE user_id = ${userId} AND used_at IS NULL
    `
  }

  const token = generarToken()
  const expiraEn = new Date(Date.now() + opciones.vigenciaMs)
  await sql`--sql
    INSERT INTO account_setups (user_id, token_hash, expires_at)
    VALUES (${userId}, ${hashToken(token)}, ${expiraEn})
  `

  // Limpieza oportunista: el backend no tiene planificador propio y sin esto la
  // tabla solo crece.
  await sql`--sql
    DELETE FROM account_setups WHERE expires_at < now() - INTERVAL '30 days'
  `

  return { token, expiraEn }
}

/**
 * Reenvía la invitación de una cuenta que sigue por configurar: renueva la
 * vigencia de la contraseña provisional y emite un enlace nuevo (los anteriores
 * dejan de servir). Devuelve null si la cuenta no existe o ya está configurada.
 */
export async function renovarInvitacion(
  userId: string,
): Promise<{ token: string; usuario: UsuarioPorConfigurar; expiraEn: Date } | null> {
  const expiraEn = vigenciaDeInvitacion()
  const filas = await sql<UsuarioPorConfigurar[]>`--sql
    UPDATE users SET setup_expires_at = ${expiraEn}
    WHERE id = ${userId} AND setup_pending
    RETURNING id::text AS id, name, email, role
  `
  const usuario = filas[0]
  if (!usuario) return null

  const { token } = await emitirEnlaceDeConfiguracion(userId, {
    vigenciaMs: INVITACION_TTL_DIAS * DIA_MS,
    invalidarAnteriores: true,
  })
  return { token, usuario, expiraEn }
}

/**
 * Cuando un root restablece la contraseña de una cuenta por configurar, esa
 * contraseña es la provisional nueva: se renueva su vigencia para que sirva.
 * No hace nada en una cuenta ya configurada.
 */
export async function renovarVigenciaProvisional(userId: string): Promise<void> {
  await sql`--sql
    UPDATE users SET setup_expires_at = ${vigenciaDeInvitacion()}
    WHERE id = ${userId} AND setup_pending
  `
}

interface FilaEnlace extends UsuarioPorConfigurar {
  enlace_id: string
  token_hash: string
  expirado: boolean
}

async function buscarEnlace(token: string): Promise<FilaEnlace | null> {
  if (!formaValida(token)) return null
  const hash = hashToken(token)
  const filas = await sql<FilaEnlace[]>`--sql
    SELECT s.id::text           AS enlace_id,
           s.token_hash         AS token_hash,
           s.expires_at < now() AS expirado,
           u.id::text           AS id,
           u.name               AS name,
           u.email              AS email,
           u.role               AS role
    FROM account_setups s
    JOIN users u ON u.id = s.user_id
    WHERE s.token_hash = ${hash} AND s.used_at IS NULL AND u.setup_pending
  `
  const fila = filas[0]
  if (!fila || !hashesIguales(fila.token_hash, hash)) return null
  return fila
}

/**
 * ¿Sirve todavía este enlace? Decide entre mostrar el formulario o el aviso de
 * enlace vencido, sin cambiar nada: abrir el enlace no lo gasta (los
 * previsualizadores de enlaces de los clientes de correo también lo abren).
 */
export async function enlaceDeConfiguracionValido(
  token: string,
): Promise<
  | { valido: true; usuario: UsuarioPorConfigurar }
  | { valido: false; motivo: 'invalido' | 'expirado' }
> {
  const fila = await buscarEnlace(token)
  if (!fila) return { valido: false, motivo: 'invalido' }
  if (fila.expirado) return { valido: false, motivo: 'expirado' }
  return {
    valido: true,
    usuario: { id: fila.id, name: fila.name, email: fila.email, role: fila.role },
  }
}

// ---------------------------------------------------------------------------
// Datos del panel de configuración
// ---------------------------------------------------------------------------

export interface DatosDeConfiguracion {
  nombres: string
  apellidos: string
  password: string
}

export type CamposConError = Partial<
  Record<'nombres' | 'apellidos' | 'password' | 'confirmacion', string>
>

/** Quita espacios de los extremos y junta los repetidos: «  Ana   María » → «Ana María». */
function limpiarNombre(valor: unknown): string {
  return typeof valor === 'string' ? valor.trim().replace(/\s+/g, ' ') : ''
}

/** Sin ángulos ni caracteres de control: nada de lo que un nombre necesita. */
function tieneCaracteresProhibidos(valor: string): boolean {
  return Array.from(valor).some((caracter) => {
    const codigo = caracter.codePointAt(0) ?? 0
    return codigo < 32 || codigo === 127 || caracter === '<' || caracter === '>'
  })
}

function errorDeNombre(valor: string, que: string): string | null {
  if (valor.length < NOMBRE_MIN || valor.length > NOMBRE_MAX) {
    return `${que} debe tener entre ${NOMBRE_MIN} y ${NOMBRE_MAX} caracteres.`
  }
  if (tieneCaracteresProhibidos(valor)) return `${que} tiene caracteres que no se admiten.`
  return null
}

/**
 * Revisa lo que escribió la persona en el panel de configuración, sin tocar la
 * base: quien llama responde con los errores por campo y el enlace sigue vivo
 * para que corrija y vuelva a enviar.
 */
export function validarDatosDeConfiguracion(entrada: {
  nombres: unknown
  apellidos: unknown
  password: unknown
  confirmacion: unknown
}): { ok: true; datos: DatosDeConfiguracion } | { ok: false; campos: CamposConError } {
  const nombres = limpiarNombre(entrada.nombres)
  const apellidos = limpiarNombre(entrada.apellidos)
  const campos: CamposConError = {}

  const errorNombres = errorDeNombre(nombres, 'El nombre')
  if (errorNombres) campos.nombres = errorNombres
  const errorApellidos = errorDeNombre(apellidos, 'Los apellidos')
  if (errorApellidos) campos.apellidos = errorApellidos

  const password = typeof entrada.password === 'string' ? entrada.password : ''
  if (!longitudDeContrasenaValida(password)) {
    campos.password = `La contraseña debe tener entre ${PASSWORD_MIN_LENGTH} y ${PASSWORD_MAX_LENGTH} caracteres.`
  } else if (entrada.confirmacion !== password) {
    campos.confirmacion = 'Las contraseñas no coinciden.'
  }

  if (Object.keys(campos).length > 0) return { ok: false, campos }
  return { ok: true, datos: { nombres, apellidos, password } }
}

export type ResultadoConfiguracion =
  | { ok: true; usuario: UsuarioPorConfigurar }
  | { ok: false; motivo: 'invalido' | 'expirado' | 'password_provisional' }

/**
 * Completa el primer acceso: guarda el nombre, deja la contraseña que eligió la
 * persona, quita el estado «por configurar» y, si mandó foto, la registra.
 *
 * Todo ocurre en una transacción y la cuenta se «consume» con un UPDATE
 * condicionado a que siga por configurar: dos envíos simultáneos con el mismo
 * enlace no pueden aplicarse los dos (el segundo espera la fila, la encuentra ya
 * configurada y no actualiza nada).
 *
 * La contraseña nueva no puede ser la provisional: la provisional la conoce
 * quien dio de alta la cuenta, y el objetivo del panel es que deje de servir.
 *
 * `rutaAvatar` es el archivo que ya se escribió en disco; si esta función falla
 * o devuelve `ok: false`, quien llama debe borrarlo.
 */
export async function completarConfiguracion(
  token: string,
  datos: DatosDeConfiguracion,
  avatar?: { validado: AvatarValidado; ruta: string },
): Promise<ResultadoConfiguracion> {
  const enlace = await buscarEnlace(token)
  if (!enlace) return { ok: false, motivo: 'invalido' }
  if (enlace.expirado) return { ok: false, motivo: 'expirado' }

  const actual = await sql<Array<{ password_hash: string }>>`--sql
    SELECT password_hash FROM users WHERE id = ${enlace.id}
  `
  if (actual[0] && (await Bun.password.verify(datos.password, actual[0].password_hash))) {
    return { ok: false, motivo: 'password_provisional' }
  }

  const password_hash = await hashPassword(datos.password)
  const nombreCompleto = `${datos.nombres} ${datos.apellidos}`

  return sql.begin(async (tx): Promise<ResultadoConfiguracion> => {
    const filas = await tx<UsuarioPorConfigurar[]>`--sql
      UPDATE users
         SET name = ${nombreCompleto},
             password_hash = ${password_hash},
             setup_pending = false,
             setup_expires_at = NULL,
             -- Sellado con el reloj de la aplicación (el mismo que firma las
             -- cookies): ver updateUserPassword en auth.ts.
             sessions_valid_from = ${new Date()}
       WHERE id = ${enlace.id}
         AND setup_pending
         AND EXISTS (
           SELECT 1 FROM account_setups s
           WHERE s.id = ${enlace.enlace_id} AND s.used_at IS NULL AND s.expires_at > now()
         )
       RETURNING id::text AS id, name, email, role
    `
    const usuario = filas[0]
    if (!usuario) return { ok: false, motivo: 'invalido' }

    // Ningún otro enlace de esta cuenta debe quedar vivo.
    await tx`--sql
      UPDATE account_setups SET used_at = now()
      WHERE user_id = ${usuario.id} AND used_at IS NULL
    `

    if (avatar) {
      await tx`--sql
        UPDATE users
           SET avatar_ruta = ${avatar.ruta},
               avatar_nombre = ${avatar.validado.nombreOriginal},
               avatar_mime = ${avatar.validado.mime}
         WHERE id = ${usuario.id}
      `
    }

    return { ok: true, usuario }
  })
}
