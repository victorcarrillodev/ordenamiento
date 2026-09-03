/**
 * Herramienta de consola para la cuenta root.
 *
 * Cambia contraseñas y rangos SIN iniciar sesión en el portal. Es la respuesta
 * al caso «me quedé fuera y ni el correo de recuperación me sirve».
 *
 * Por qué esto y no un endpoint web: para ejecutarlo hay que tener acceso a la
 * shell del servidor, y ese acceso ES la autenticación. Una URL que hiciera lo
 * mismo estaría expuesta a todo internet, y quien la encontrara se quedaría
 * con el sistema entero y con los datos personales de las participaciones.
 *
 * Uso (desde backend/, o dentro del contenedor):
 *
 *   bun run root -- password <correo> <contraseña-nueva>
 *   bun run root -- promover <correo>          # lo vuelve root
 *   bun run root -- listar                     # cuentas con rango
 *
 * Dentro de Docker:
 *   docker compose exec backend bun run root -- password ana@x.mx nueva-clave
 */
import { hashPassword, PASSWORD_MAX_LENGTH, PASSWORD_MIN_LENGTH } from './auth/auth.ts'
import { etiquetaDeRol } from './auth/roles.ts'
import { sql } from './db/pool.ts'

function uso(): never {
  console.log(`
Herramienta de consola de la cuenta root

  bun run root -- password <correo> <contraseña>   Cambia la contraseña
  bun run root -- promover <correo>                Otorga el rango root
  bun run root -- listar                           Lista las cuentas

La contraseña debe tener entre ${PASSWORD_MIN_LENGTH} y ${PASSWORD_MAX_LENGTH} caracteres.
`)
  process.exit(1)
}

async function cambiarPassword(correo: string, password: string): Promise<void> {
  if (password.length < PASSWORD_MIN_LENGTH || password.length > PASSWORD_MAX_LENGTH) {
    console.error(
      `[root] La contraseña debe tener entre ${PASSWORD_MIN_LENGTH} y ${PASSWORD_MAX_LENGTH} caracteres.`,
    )
    process.exit(1)
  }

  // `sessions_valid_from` se adelanta igual que en el cambio desde el panel:
  // si la cuenta estaba comprometida, esto expulsa las sesiones abiertas.
  const filas = await sql<{ email: string; role: string }[]>`--sql
    UPDATE users
       SET password_hash = ${await hashPassword(password)},
           sessions_valid_from = ${new Date()}
     WHERE email = ${correo.trim().toLowerCase()}
     RETURNING email, role
  `

  if (filas.length === 0) {
    console.error(`[root] No existe ninguna cuenta con el correo ${correo}`)
    process.exit(1)
  }

  console.log(
    `[root] Contraseña actualizada para ${filas[0].email} (${etiquetaDeRol(filas[0].role)}).`,
  )
  console.log('[root] Sus sesiones abiertas quedaron cerradas.')
}

async function promover(correo: string): Promise<void> {
  const filas = await sql<{ email: string }[]>`--sql
    UPDATE users SET role = 'root' WHERE email = ${correo.trim().toLowerCase()} RETURNING email
  `
  if (filas.length === 0) {
    console.error(`[root] No existe ninguna cuenta con el correo ${correo}`)
    process.exit(1)
  }
  console.log(`[root] ${filas[0].email} ahora tiene rango root.`)
}

async function listar(): Promise<void> {
  const filas = await sql<Array<{ email: string; name: string; role: string }>>`--sql
    SELECT email, name, role FROM users
    ORDER BY CASE role WHEN 'root' THEN 0 WHEN 'admin' THEN 1 ELSE 2 END, name
  `
  if (filas.length === 0) {
    console.log('[root] No hay ninguna cuenta registrada.')
    return
  }
  console.log(`\n[root] ${filas.length} cuenta(s):\n`)
  for (const f of filas) {
    console.log(`  ${etiquetaDeRol(f.role).padEnd(14)} ${f.email.padEnd(38)} ${f.name}`)
  }
  console.log('')
}

const [orden, ...args] = process.argv.slice(2)

try {
  if (orden === 'password') {
    if (args.length < 2) uso()
    await cambiarPassword(args[0], args.slice(1).join(' '))
  } else if (orden === 'promover') {
    if (args.length < 1) uso()
    await promover(args[0])
  } else if (orden === 'listar') {
    await listar()
  } else {
    uso()
  }
} catch (err) {
  console.error('[root] Falló la operación:', err instanceof Error ? err.message : err)
  process.exit(1)
} finally {
  await sql.end({ timeout: 5 }).catch(() => {})
}
