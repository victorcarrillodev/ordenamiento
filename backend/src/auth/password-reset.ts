import { sql } from '../db/pool.ts'
import { longitudDeContrasenaValida, PASSWORD_MIN_LENGTH, updateUserPassword } from './auth.ts'
import { formaValida, generarToken, hashToken, hashesIguales } from './tokens.ts'

/**
 * Recuperación de contraseña por correo. La mecánica del token (aleatoriedad,
 * hash en reposo, comparación en tiempo constante) vive en `tokens.ts`, que se
 * comparte con la confirmación de cambio de correo.
 */

/** Minutos de validez del enlace. Corto a propósito: es un poder total sobre la cuenta. */
export const RESET_TTL_MINUTOS = 60

export interface UsuarioRecuperacion {
  id: string
  name: string
  email: string
}

/**
 * Fallo tipado del consumo de un token. `invalido` cubre a propósito tanto
 * "no existe" como "ya se usó": distinguirlos no ayuda a quien restablece y
 * sí le diría a un atacante que un token que probó fue real alguna vez.
 */
export type ResultadoReset =
  | { ok: true; usuario: UsuarioRecuperacion }
  | { ok: false; motivo: 'invalido' | 'expirado' | 'password_corta' }

interface FilaReset {
  id: string
  user_id: string
  token_hash: string
  expirado: boolean
  name: string
  email: string
}

async function buscarToken(token: string): Promise<FilaReset | null> {
  if (!formaValida(token)) return null
  const hash = hashToken(token)
  const rows = await sql<FilaReset[]>`--sql
    SELECT pr.id::text          AS id,
           pr.user_id::text     AS user_id,
           pr.token_hash        AS token_hash,
           pr.expires_at < now() AS expirado,
           u.name               AS name,
           u.email              AS email
    FROM password_resets pr
    JOIN users u ON u.id = pr.user_id
    WHERE pr.token_hash = ${hash} AND pr.used_at IS NULL
  `
  const fila = rows[0]
  if (!fila || !hashesIguales(fila.token_hash, hash)) return null
  return fila
}

/**
 * Emite un enlace de recuperación para `email`, o null si no hay cuenta con
 * ese correo. Quien llama NO debe revelar ese null al usuario final: la
 * respuesta pública es siempre la misma, o el formulario se convierte en un
 * oráculo para averiguar qué correos tienen cuenta.
 */
export async function crearSolicitudRecuperacion(
  email: string,
): Promise<{ token: string; usuario: UsuarioRecuperacion; expiraEn: Date } | null> {
  const rows = await sql<Array<{ id: string; name: string; email: string }>>`--sql
    SELECT id::text AS id, name, email FROM users WHERE email = ${email.trim().toLowerCase()}
  `
  const usuario = rows[0]
  if (!usuario) return null

  // Solo el último enlace enviado sigue vivo: pedir uno nuevo invalida los
  // anteriores, así un correo viejo reenviado o filtrado ya no sirve.
  await sql`--sql
    UPDATE password_resets SET used_at = now()
    WHERE user_id = ${usuario.id} AND used_at IS NULL
  `

  const token = generarToken()
  const expiraEn = new Date(Date.now() + RESET_TTL_MINUTOS * 60_000)
  await sql`--sql
    INSERT INTO password_resets (user_id, token_hash, expires_at)
    VALUES (${usuario.id}, ${hashToken(token)}, ${expiraEn})
  `

  // Limpieza oportunista: sin esto la tabla solo crece. Se hace aquí y no en
  // un cron porque el backend no tiene planificador propio.
  await sql`--sql
    DELETE FROM password_resets WHERE expires_at < now() - INTERVAL '7 days'
  `

  return { token, usuario, expiraEn }
}

/**
 * ¿Sirve todavía este token? Se usa para decidir si mostrar el formulario de
 * nueva contraseña o un aviso de enlace caducado, sin cambiar nada.
 */
export async function tokenRecuperacionValido(
  token: string,
): Promise<
  | { valido: true; usuario: UsuarioRecuperacion }
  | { valido: false; motivo: 'invalido' | 'expirado' }
> {
  const fila = await buscarToken(token)
  if (!fila) return { valido: false, motivo: 'invalido' }
  if (fila.expirado) return { valido: false, motivo: 'expirado' }
  return { valido: true, usuario: { id: fila.user_id, name: fila.name, email: fila.email } }
}

/**
 * Consume el token y cambia la contraseña. El token queda marcado como usado
 * en la misma transacción que el cambio, así dos peticiones simultáneas con
 * el mismo enlace no pueden aplicarse las dos.
 */
export async function restablecerConToken(
  token: string,
  nuevaPassword: string,
): Promise<ResultadoReset> {
  // Cubre la mínima y también la máxima: sin tope, restablecer con una
  // contraseña gigante fuerza un hash argon2id de coste arbitrario.
  if (!longitudDeContrasenaValida(nuevaPassword)) {
    return { ok: false, motivo: 'password_corta' }
  }

  const fila = await buscarToken(token)
  if (!fila) return { ok: false, motivo: 'invalido' }
  if (fila.expirado) return { ok: false, motivo: 'expirado' }

  // Marcar primero y comprobar que esta petición fue la que lo marcó: si otra
  // llegó antes, `used_at` ya no es NULL y el UPDATE no devuelve filas.
  const consumido = await sql<{ id: string }[]>`--sql
    UPDATE password_resets SET used_at = now()
    WHERE id = ${fila.id} AND used_at IS NULL
    RETURNING id::text AS id
  `
  if (consumido.length === 0) return { ok: false, motivo: 'invalido' }

  const actualizado = await updateUserPassword(fila.user_id, nuevaPassword)
  if (!actualizado) return { ok: false, motivo: 'invalido' }

  return {
    ok: true,
    usuario: { id: fila.user_id, name: fila.name, email: fila.email },
  }
}

/** Reexportada para los callers que ya la importaban desde este módulo. */
export { PASSWORD_MIN_LENGTH }
