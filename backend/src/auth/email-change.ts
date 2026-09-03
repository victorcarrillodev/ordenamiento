import { sql } from '../db/pool.ts'
import { formaValida, generarToken, hashToken, hashesIguales } from './tokens.ts'

/**
 * Cambio de correo verificado en la dirección NUEVA.
 *
 * El orden importa: `users.email` no se toca hasta que alguien demuestra que
 * puede leer el buzón nuevo. Si se cambiara al vuelo, un error de tecleo (o
 * alguien con la sesión ajena abierta) dejaría la cuenta atada a una dirección
 * inalcanzable, y con ella la recuperación de contraseña — es decir, la cuenta
 * perdida para siempre.
 */

/** Minutos de validez del enlace de confirmación. */
export const EMAIL_TTL_MINUTOS = 60

export type MotivoCambioEmail =
  | 'email_invalido'
  | 'email_igual'
  | 'email_ocupado'
  | 'password_incorrecta'
  | 'usuario_no_encontrado'

export type ResultadoSolicitud =
  | { ok: true; token: string; nuevoEmail: string; nombre: string; emailActual: string }
  | { ok: false; motivo: MotivoCambioEmail }

export type ResultadoConfirmacion =
  | { ok: true; userId: string; nombre: string; emailAnterior: string; emailNuevo: string }
  | { ok: false; motivo: 'invalido' | 'expirado' | 'email_ocupado' }

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function normalizar(email: string): string {
  return email.trim().toLowerCase()
}

async function emailOcupadoPorOtro(email: string, userId: string): Promise<boolean> {
  const filas = await sql<{ id: string }[]>`--sql
    SELECT id::text AS id FROM users WHERE email = ${email} AND id <> ${userId}
  `
  return filas.length > 0
}

/**
 * Registra la intención de cambiar de correo y devuelve el token que hay que
 * enviar a la dirección nueva. Exige la contraseña actual: sin eso, una sesión
 * olvidada en un equipo compartido bastaría para quedarse con la cuenta.
 */
export async function solicitarCambioEmail(input: {
  userId: string
  nuevoEmail: string
  passwordActual: string
  verificarPassword: (userId: string, password: string) => Promise<boolean>
}): Promise<ResultadoSolicitud> {
  const nuevoEmail = normalizar(input.nuevoEmail)
  if (!nuevoEmail || !EMAIL_RE.test(nuevoEmail)) {
    return { ok: false, motivo: 'email_invalido' }
  }

  const filas = await sql<Array<{ name: string; email: string }>>`--sql
    SELECT name, email FROM users WHERE id = ${input.userId}
  `
  const usuario = filas[0]
  if (!usuario) return { ok: false, motivo: 'usuario_no_encontrado' }

  if (normalizar(usuario.email) === nuevoEmail) {
    return { ok: false, motivo: 'email_igual' }
  }

  // La contraseña se comprueba antes que la disponibilidad del correo: quien
  // no acredita ser el dueño de la cuenta tampoco debe poder usar el
  // formulario para averiguar qué direcciones están registradas.
  if (!(await input.verificarPassword(input.userId, input.passwordActual))) {
    return { ok: false, motivo: 'password_incorrecta' }
  }

  if (await emailOcupadoPorOtro(nuevoEmail, input.userId)) {
    return { ok: false, motivo: 'email_ocupado' }
  }

  // Solo la última solicitud sigue viva.
  await sql`--sql
    UPDATE email_changes SET used_at = now()
    WHERE user_id = ${input.userId} AND used_at IS NULL
  `

  const token = generarToken()
  const expira = new Date(Date.now() + EMAIL_TTL_MINUTOS * 60_000)
  await sql`--sql
    INSERT INTO email_changes (user_id, nuevo_email, token_hash, expires_at)
    VALUES (${input.userId}, ${nuevoEmail}, ${hashToken(token)}, ${expira})
  `
  await sql`--sql
    DELETE FROM email_changes WHERE expires_at < now() - INTERVAL '7 days'
  `

  return {
    ok: true,
    token,
    nuevoEmail,
    nombre: usuario.name,
    emailActual: usuario.email,
  }
}

interface FilaCambio {
  id: string
  user_id: string
  nuevo_email: string
  token_hash: string
  expirado: boolean
  nombre: string
  email_actual: string
}

async function buscarCambio(token: string): Promise<FilaCambio | null> {
  if (!formaValida(token)) return null
  const hash = hashToken(token)
  const filas = await sql<FilaCambio[]>`--sql
    SELECT ec.id::text            AS id,
           ec.user_id::text       AS user_id,
           ec.nuevo_email         AS nuevo_email,
           ec.token_hash          AS token_hash,
           ec.expires_at < now()  AS expirado,
           u.name                 AS nombre,
           u.email                AS email_actual
    FROM email_changes ec
    JOIN users u ON u.id = ec.user_id
    WHERE ec.token_hash = ${hash} AND ec.used_at IS NULL
  `
  const fila = filas[0]
  if (!fila || !hashesIguales(fila.token_hash, hash)) return null
  return fila
}

/** Aplica el cambio. El enlace se marca usado antes de tocar `users`. */
export async function confirmarCambioEmail(token: string): Promise<ResultadoConfirmacion> {
  const fila = await buscarCambio(token)
  if (!fila) return { ok: false, motivo: 'invalido' }
  if (fila.expirado) return { ok: false, motivo: 'expirado' }

  // Alguien pudo registrar esa dirección entre la solicitud y la confirmación.
  if (await emailOcupadoPorOtro(fila.nuevo_email, fila.user_id)) {
    return { ok: false, motivo: 'email_ocupado' }
  }

  const consumido = await sql<{ id: string }[]>`--sql
    UPDATE email_changes SET used_at = now()
    WHERE id = ${fila.id} AND used_at IS NULL
    RETURNING id::text AS id
  `
  if (consumido.length === 0) return { ok: false, motivo: 'invalido' }

  const actualizado = await sql<{ id: string }[]>`--sql
    UPDATE users SET email = ${fila.nuevo_email}
    WHERE id = ${fila.user_id}
    RETURNING id::text AS id
  `
  if (actualizado.length === 0) return { ok: false, motivo: 'invalido' }

  return {
    ok: true,
    userId: fila.user_id,
    nombre: fila.nombre,
    emailAnterior: fila.email_actual,
    emailNuevo: fila.nuevo_email,
  }
}
