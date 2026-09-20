import { getAttachment } from './routes/attachments.ts'
import { readFile, rm } from 'node:fs/promises'
import { join, isAbsolute } from 'node:path'
import {
  canonicalMimeFor,
  contentDispositionHeader,
  getExtension,
  isImageExtension,
  shouldServeInline,
  validateUpload,
} from './services/upload-guard.ts'

import {
  clearLoginAttempts,
  clearSessionCookie,
  createSessionToken,
  getUserById,
  isLoginRateLimited,
  recordLoginFailure,
  registerUser,
  sessionCookie,
  sessionIssuedAt,
  updateUserName,
  updateUserPassword,
  verifyCredentials,
  verifyPasswordById,
  verifySessionToken,
  type SessionUser,
} from './auth/auth.ts'
import {
  confirmarCambioEmail,
  solicitarCambioEmail,
  EMAIL_TTL_MINUTOS,
} from './auth/email-change.ts'
import {
  crearSolicitudRecuperacion,
  restablecerConToken,
  tokenRecuperacionValido,
  PASSWORD_MIN_LENGTH,
  RESET_TTL_MINUTOS,
} from './auth/password-reset.ts'
import {
  comoRol,
  esRolValido,
  puedeCambiarPassword,
  puedeCambiarRol,
  puedeCrearConRol,
  puedeEliminar,
  puedeEntrarAlPanel,
  type Veredicto,
} from './auth/roles.ts'
import { migrate } from './db/migrate.ts'
import { handleCreateParticipation } from './routes/participations.ts'
import {
  deleteParticipation,
  getParticipation,
  listParticipations,
  marcarNotificada,
  registrarResolucion,
  type Estado,
  type Etapa,
  type Origen,
} from './services/participations.ts'
import { guardarArchivos } from './services/upload.ts'
import {
  actualizarActividad,
  actualizarArchivo,
  crearActividad,
  eliminarActividad,
  eliminarArchivo,
  esEstadoActividad,
  esEstadoPublicacion,
  esFasePrograma,
  esFotoWeb,
  esTipoArchivo,
  existeArchivo,
  hoyEnMexico,
  listarAvances,
  listarCalendario,
  listarDocumentosPublicos,
  listarGestion,
  listarProximas,
  MAX_ARCHIVOS_POR_ENVIO,
  obtenerActividadGestion,
  obtenerActividadPublica,
  obtenerArchivo,
  obtenerAvisoVigente,
  rangoDeMes,
  resumenActividades,
  rutaEnUploads,
  TIPO_FOTOGRAFIA,
  validarActividad,
  type ArchivoEnDisco,
  type TipoArchivo,
} from './services/actividades.ts'
import {
  listIndicadores,
  createIndicador,
  updateIndicador,
  deleteIndicador,
  validarIndicador,
} from './services/indicadores.ts'
import { nombreEnDisco, sanitizarNombre } from './files/nombres.ts'
import { MAX_TOTAL_BYTES } from './files/limits.ts'
import { exportTableToXlsx, isExportable } from './services/export.ts'
import { participationDocx } from './services/word.ts'
import {
  enviarParticipacion,
  enviarResolucionParticipacion,
  enviarAviso,
  enviarCorreoPrueba,
  enviarCorreoRecuperacion,
  enviarConfirmacionCorreoNuevo,
  enviarAvisoCorreoCambiado,
  mailConfigurado,
} from './services/mail.ts'
import {
  actualizarCuenta,
  cambiarRol,
  contarRoots,
  eliminarUsuario,
  listarUsuarios,
  obtenerCuenta,
} from './services/users.ts'
import {
  listarSesiones,
  registrarActividad,
  registrarCierreSesion,
  registrarInicioSesion,
  resumenSesiones,
} from './services/sesiones.ts'
import {
  getCustomizations,
  saveCustomizations,
  listAuditLogs,
  restoreAuditSnapshot,
  saveUploadedBrandingImage,
  DEFAULT_THEME_CONFIG,
} from './services/customizations.ts'
import { sql } from './db/pool.ts'
import { json, bodyTooLarge, clientIp, rateLimit, logger } from './utils.ts'

/** Rate limiter para participaciones. Admins están exentos, otros tienen 10 POSTs por minuto */
export function participationRateLimited(
  role: string | undefined,
  clientIpAddr: string,
  nowMs?: number,
): boolean {
  // Los admins están exentos
  // Exentos quienes capturan desde el panel (admin y root).
  if (puedeEntrarAlPanel(role)) {
    return false
  }

  // Usuarios públicos o con rol 'user' están limitados a 10 POSTs por minuto
  return rateLimit(clientIpAddr, 10, 60_000, nowMs)
}

const UPLOAD_DIR = join(process.cwd(), 'uploads')
const BRANDING_DIR = join(process.cwd(), 'uploads', 'branding')

function readCookie(cookieHeader: string | null, name: string): string | null {
  if (!cookieHeader) return null
  for (const part of cookieHeader.split(';')) {
    const [k, ...rest] = part.trim().split('=')
    if (k === name) return decodeURIComponent(rest.join('='))
  }
  return null
}

/**
 * Origen público del portal para el enlace del correo de recuperación.
 * Se toma de la configuración del servidor y NUNCA de las cabeceras de la
 * petición (`Host`, `Origin`, `X-Forwarded-Host`): esas las controla quien
 * llama, y un `Host` falsificado convertiría el correo de restablecimiento en
 * un enlace de phishing hacia el dominio del atacante.
 */
const APP_PUBLIC_URL = (process.env.APP_PUBLIC_URL ?? 'http://localhost:44100').replace(/\/+$/, '')
const APP_BASE_PATH = (process.env.BASE_PATH ?? '/ordena').replace(/\/+$/, '')

/**
 * Límites de la recuperación de contraseña, por ventana de 15 minutos.
 *
 * El control real es `POR_CORREO`: acota tanto el bombardeo a un buzón como el
 * gasto de SMTP, porque un correo sin cuenta no envía nada. `GLOBAL` es solo un
 * cortafuegos ante un abuso masivo, y por eso se deja holgado: si fuera
 * estrecho, treinta peticiones bastarían para dejar sin recuperación a todo el
 * municipio durante un cuarto de hora.
 */
const RESET_WINDOW_MS = 15 * 60 * 1000
const RESET_MAX_POR_CORREO = 3
const RESET_MAX_GLOBAL = 200
const RESET_MAX_INTENTOS = 20

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function urlRestablecer(token: string): string {
  return `${APP_PUBLIC_URL}${APP_BASE_PATH}/restablecer?token=${encodeURIComponent(token)}`
}

function urlConfirmarCorreo(token: string): string {
  return `${APP_PUBLIC_URL}${APP_BASE_PATH}/confirmar-correo?token=${encodeURIComponent(token)}`
}

/**
 * Datos del navegador para la bitácora de sesiones. El backend solo habla con
 * el contenedor `web`, así que la IP real llega reenviada en `x-forwarded-for`
 * (ver backendFetch en app/backend.ts); es informativa, no una credencial.
 */
function datosCliente(request: Request): { ip: string; userAgent: string } {
  return {
    ip: clientIp(request, null).slice(0, 60),
    userAgent: (request.headers.get('user-agent') ?? '').slice(0, 300),
  }
}

/** Anota la sesión sin bloquear la respuesta: la bitácora nunca frena el panel. */
function anotarSesion(promesa: Promise<unknown>, etiqueta: string): void {
  void promesa.catch((err) => logger.error(etiqueta, err))
}

async function currentUser(request: Request): Promise<SessionUser | null> {
  const token = readCookie(request.headers.get('cookie'), 'ordenamiento_session')
  if (!token) return null
  const userId = await verifySessionToken(token)
  if (!userId) return null

  const user = await getUserById(userId)
  if (!user) return null

  // Sesión anterior a un cambio de contraseña: se descarta. Sin esto,
  // recuperar la cuenta no expulsaría a quien ya estuviera dentro con la
  // contraseña anterior, que es justo el caso para el que existe el flujo.
  // `sessionsValidFrom` vale 0 mientras la cuenta nunca haya restablecido.
  const emitido = sessionIssuedAt(token)
  const corte = user.sessionsValidFrom ?? 0
  if (corte > 0 && (emitido === null || emitido < corte)) return null

  // Señal de vida para la bitácora. El servicio ya limita la frecuencia de
  // escritura, y va sin `await` para no sumar una ida a la base a cada
  // petición del panel.
  if (emitido !== null) {
    void registrarActividad(user.id, emitido).catch(() => {})
  }

  return user
}

function isEstado(v: string): v is Estado {
  return v === 'En proceso' || v === 'Procedente' || v === 'No procedente'
}

function isOrigen(v: string): v is Origen {
  return v === 'digital' || v === 'fisica'
}

function isEtapa(v: string): v is Etapa {
  return v === 'En proceso' || v === 'Dictaminada' || v === 'Notificada'
}

function safePositiveInt(v: string | null, fallback: number): number {
  const n = Number(v)
  return Number.isInteger(n) && n > 0 ? n : fallback
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
function isUuid(v: string): boolean {
  return UUID_RE.test(v)
}

function requireUuidParam(id: string): Response | null {
  return isUuid(id) ? null : json({ error: 'id inválido' }, 400)
}

/** Campos de texto del formulario de una actividad (ver `validarActividad`). */
const CAMPOS_ACTIVIDAD = [
  'titulo',
  'fase',
  'tipo',
  'estado',
  'fecha',
  'hora_inicio',
  'hora_fin',
  'lugar',
  'direccion',
  'latitud',
  'longitud',
  'descripcion',
  'resultados',
  'acuerdos',
  'publicacion',
  'aviso_activo',
  'aviso_titulo',
  'aviso_descripcion',
  'aviso_inicio',
  'aviso_fin',
] as const

const MENSAJE_FOTO_NO_WEB = 'Las fotografías deben ser imágenes JPG, PNG, WEBP o GIF.'

/**
 * Alta (`id` null) o edición del MISMO registro de una actividad. Llega en
 * multipart: los campos de texto más un par `archivo` + `archivo_tipo` por
 * cada archivo, en el mismo orden. Los archivos se escriben a disco antes de
 * la transacción y se borran si la base de datos falla, para no dejar huérfanos.
 */
async function guardarActividad(
  request: Request,
  id: string | null,
  creadoPor: string,
): Promise<Response> {
  if (bodyTooLarge(request, MAX_TOTAL_BYTES + 1024 * 1024)) {
    return json({ error: 'El envío supera el tamaño máximo permitido' }, 413)
  }
  let form: FormData
  try {
    form = await request.formData()
  } catch {
    return json({ error: 'Formulario inválido' }, 400)
  }

  const campos: Record<string, string> = {}
  for (const clave of CAMPOS_ACTIVIDAD) {
    const valor = form.get(clave)
    if (typeof valor === 'string') campos[clave] = valor
  }
  const validacion = validarActividad(campos, hoyEnMexico())
  if (!validacion.ok) return json({ error: validacion.error }, 400)

  const entradas = form.getAll('archivo')
  const tipos = form.getAll('archivo_tipo')
  if (entradas.length !== tipos.length) {
    return json({ error: 'Cada archivo debe llevar su tipo' }, 400)
  }
  const porGuardar: Array<{ file: File; tipo: TipoArchivo }> = []
  for (const [i, file] of entradas.entries()) {
    if (!(file instanceof File) || file.size === 0) continue
    const tipo = tipos[i]
    if (!esTipoArchivo(tipo)) return json({ error: 'Tipo de archivo inválido' }, 400)
    if (tipo === TIPO_FOTOGRAFIA && !esFotoWeb(file.name)) {
      return json({ error: MENSAJE_FOTO_NO_WEB }, 415)
    }
    porGuardar.push({ file, tipo })
  }
  if (porGuardar.length > MAX_ARCHIVOS_POR_ENVIO) {
    return json({ error: `Máximo ${MAX_ARCHIVOS_POR_ENVIO} archivos por envío` }, 400)
  }

  let escritos: string[] = []
  try {
    const guardados = await guardarArchivos(porGuardar.map((a) => a.file))
    escritos = guardados.escritos
    const nuevos = guardados.archivos.map((a, i) => ({ ...a, tipo: porGuardar[i].tipo }))

    if (id === null) {
      const nuevoId = await sql.begin((tx) =>
        crearActividad(tx, validacion.datos, nuevos, creadoPor),
      )
      escritos = []
      return json({ ok: true, id: nuevoId }, 201)
    }

    const existe = await sql.begin((tx) => actualizarActividad(tx, id, validacion.datos, nuevos))
    if (!existe) return json({ error: 'No encontrado' }, 404)
    escritos = []
    return json({ ok: true, id })
  } catch (err) {
    const status = (err as { status?: number }).status
    if (status && status >= 400 && status < 500) {
      return json({ error: (err as Error).message }, status)
    }
    throw err
  } finally {
    await Promise.allSettled(escritos.map((ruta) => rm(ruta, { force: true })))
  }
}

const MENSAJE_RESPALDO_INEXISTENTE = 'El documento de respaldo no existe'

/**
 * El documento de respaldo de un indicador es un archivo de alguna actividad.
 * Sin esta comprobación un id inexistente llegaba a la llave foránea y la
 * petición acababa en 500 en vez de explicar qué pasó.
 */
async function validarRespaldo(id: string | null | undefined): Promise<Response | null> {
  if (!id) return null
  if (!isUuid(String(id)) || !(await existeArchivo(String(id)))) {
    return json({ error: MENSAJE_RESPALDO_INEXISTENTE }, 400)
  }
  return null
}

/**
 * El archivo pudo borrarse entre `validarRespaldo` y el guardado: entonces la
 * llave foránea tiene la última palabra, y eso también es un 400.
 */
function esRespaldoBorrado(error: unknown): boolean {
  const { code, constraint_name } = error as { code?: string; constraint_name?: string }
  return code === '23503' && constraint_name === 'indicadores_documento_respaldo_id_fkey'
}

/** Sirve un archivo de actividad con las cabeceras de seguridad del proyecto. */
async function responderArchivoActividad(
  archivo: ArchivoEnDisco,
  descarga: boolean,
): Promise<Response> {
  const ruta = rutaEnUploads(archivo.ruta)
  if (!ruta) return json({ error: 'Acceso a archivo no autorizado' }, 403)
  let contenido: Buffer
  try {
    contenido = await readFile(ruta)
  } catch {
    return json({ error: 'Archivo en disco no disponible' }, 404)
  }
  const ext = getExtension(archivo.nombre)
  // Solo se muestran en línea los formatos inertes; el resto se descarga.
  const modo = descarga || !shouldServeInline(ext) ? 'attachment' : 'inline'
  return new Response(new Uint8Array(contenido), {
    headers: {
      'content-type': canonicalMimeFor(ext) ?? 'application/octet-stream',
      'content-disposition': contentDispositionHeader(modo, archivo.nombre),
      'content-length': String(contenido.byteLength),
      'x-content-type-options': 'nosniff',
      'content-security-policy': "default-src 'none'; frame-ancestors 'self'",
      'cross-origin-resource-policy': 'same-origin',
      // El archivo de un borrador solo lo ve el panel: ningún caché intermedio
      // debe guardarlo y entregárselo después a otra persona.
      'cache-control': archivo.publicado ? 'public, max-age=300' : 'private, no-store',
    },
  })
}

/**
 * Router manual del backend — DECISIÓN A2 (2026-08-28, Arquitecto)
 *
 * Se evaluó migrar `handleRequest` (hoy ~800 líneas, 24 ramas `if (method+pathname)`)
 * hacia un router tipado al estilo `remix/router` sin nuevas dependencias.
 *
 * Decisión: (a) MANTENER el router manual y documentarlo como aceptable.
 * Razones:
 *  - Backend sin framework: usa el `fetch` nativo de Bun/Node. `matchPath` (15 líneas)
 *    + `handleRequest` son zero-deps, predecibles, fáciles de auditar y sin DSL que aprender.
 *  - El frontend sí necesita `remix/router` por `href` tipados, navegación y data-loading
 *    en React; el backend solo despacha (auth guards + validación + servicio), no navega.
 *  - Extraer a `backend/src/router.ts` con tabla `Array<{method, pattern, handler}>`
 *    no reduce complejidad ciclomática, solo la mueve; el hot-spot CRAP (alta complejidad +
 *    22 commits en `app.ts`) se mitiga mejor podando rutas huérfanas (A1) que añadiendo
 *    indirección ahora.
 *  - Umbral de refactor: si el número de rutas supera ~40 o aparecen middlewares
 *    componibles (rate-limit por ruta, validación por esquema), entonces migrar a una
 *    tabla tipada mínima sin deps: `type Route = {method, pattern, auth: 'admin'|'auth'|null,
 *    handler}`. Hasta entonces, se deja como está y se monitoriza.
 *
 * Si se reintroduce búsqueda, usar el flujo canónico `GET /api/participations?q=...`
 * con ranking en vez de resucitar `GET /api/search` aislado.
 */
function matchPath(pathname: string, pattern: string): Record<string, string> | null {
  const pathParts = pathname.split('/').filter(Boolean)
  const patternParts = pattern.split('/').filter(Boolean)
  if (pathParts.length !== patternParts.length) return null

  const params: Record<string, string> = {}
  for (let i = 0; i < patternParts.length; i++) {
    const p = patternParts[i]
    if (p.startsWith(':')) {
      params[p.slice(1)] = pathParts[i]
    } else if (p !== pathParts[i]) {
      return null
    }
  }
  return params
}

export async function handleRequest(request: Request): Promise<Response> {
  const url = new URL(request.url)
  const { pathname } = url
  const method = request.method

  // ── Health ───────────────────────────────────────────────────────────
  if (method === 'GET' && pathname === '/api/health') {
    return json({ ok: true, service: 'ordenamiento-backend' })
  }

  /**
   * Los endpoints de autenticación reciben JSON pequeño (un correo, una
   * contraseña, un token). Se corta antes de bufferizarlo: sin este tope,
   * `request.json()` traga lo que llegue, y con una contraseña de megabytes
   * detrás cada petición cuesta un hash argon2id de 64 MB.
   */
  const AUTH_BODY_MAX = 8 * 1024
  const cuerpoDeAuthExcedido = (): Response | null =>
    bodyTooLarge(request, AUTH_BODY_MAX) ? json({ error: 'Petición demasiado grande' }, 413) : null

  // ── Auth ─────────────────────────────────────────────────────────────
  // No hay alta pública de cuentas. Participar en la consulta no requiere
  // cuenta (ver handleCreateParticipation) y las del panel las crea un
  // administrador vía POST /api/users. Un registro abierto solo permitía a
  // cualquiera llenar de cuentas el sistema del municipio, y cada alta cuesta
  // un hash argon2id, que es caro a propósito.

  if (method === 'POST' && pathname === '/api/auth/login') {
    const excedido = cuerpoDeAuthExcedido()
    if (excedido) return excedido
    const body = (await request.json().catch(() => ({}))) as { email?: string; password?: string }
    if (!body.email || !body.password) {
      return json({ error: 'Faltan datos: email, password' }, 400)
    }
    if (isLoginRateLimited(body.email)) {
      return json({ error: 'Demasiados intentos fallidos. Intenta de nuevo más tarde.' }, 429)
    }
    const user = await verifyCredentials(body.email, body.password)
    if (!user) {
      recordLoginFailure(body.email)
      return json({ error: 'Credenciales inválidas' }, 401)
    }
    clearLoginAttempts(body.email)

    const token = await createSessionToken(user.id)
    const emitido = sessionIssuedAt(token)
    if (emitido !== null) {
      anotarSesion(
        registrarInicioSesion(user.id, emitido, datosCliente(request)),
        'sesiones.inicio',
      )
    }
    return json(
      { user: { id: user.id, name: user.name, role: user.role } },
      { headers: { 'set-cookie': sessionCookie(token) } },
    )
  }

  // ── Recuperación de contraseña ───────────────────────────────────────
  // Dos pasos: pedir el enlace (`forgot-password`) y canjearlo por una
  // contraseña nueva (`reset-password`). Ninguno de los dos exige sesión, así
  // que ambos van ANTES del guard `currentUser` de más abajo.

  if (method === 'POST' && pathname === '/api/auth/forgot-password') {
    const excedido = cuerpoDeAuthExcedido()
    if (excedido) return excedido
    const body = (await request.json().catch(() => ({}))) as { email?: string }
    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : ''
    if (!email || !EMAIL_RE.test(email)) {
      return json({ error: 'Correo electrónico inválido' }, 400)
    }

    // Se comprueba ANTES de buscar la cuenta: es un fallo de configuración del
    // servidor, igual para un correo que exista y para uno que no, así que
    // decirlo no revela nada sobre la cuenta.
    if (!mailConfigurado()) {
      return json({ error: 'El envío de correo no está configurado en el servidor' }, 503)
    }

    // Límite por correo (evita usar el formulario para bombardear un buzón)
    // más un tope global del endpoint (evita usarlo para quemar la cuota SMTP
    // probando muchos correos distintos).
    if (
      rateLimit(`forgot:${email}`, RESET_MAX_POR_CORREO, RESET_WINDOW_MS) ||
      rateLimit('forgot:global', RESET_MAX_GLOBAL, RESET_WINDOW_MS)
    ) {
      return json({ error: 'Demasiadas solicitudes. Intenta de nuevo en unos minutos.' }, 429)
    }

    const solicitud = await crearSolicitudRecuperacion(email)

    // Respuesta idéntica exista o no la cuenta: si el 200 solo llegara para
    // correos registrados, este formulario sería un buscador de cuentas
    // válidas para cualquiera. Lo mismo vale si el envío falla: se registra en
    // el log del servidor, pero hacia fuera la respuesta no cambia.
    if (solicitud) {
      // El envío NO se espera a propósito. Esperarlo haría que la respuesta
      // tardara lo que tarda el viaje SMTP solo cuando la cuenta existe, y ese
      // retraso sería por sí mismo la respuesta a «¿este correo está
      // registrado?», justo lo que el cuerpo idéntico intenta ocultar.
      // Un fallo de envío queda en el log del servidor.
      void enviarCorreoRecuperacion({
        para: solicitud.usuario.email,
        nombre: solicitud.usuario.name,
        url: urlRestablecer(solicitud.token),
        expiraMinutos: RESET_TTL_MINUTOS,
      }).catch((err) => logger.error('auth.forgot-password.envio', err))
    }

    return json({ ok: true, expiraMinutos: RESET_TTL_MINUTOS })
  }

  // Comprueba si un enlace sigue vivo, para decidir entre mostrar el
  // formulario de nueva contraseña o el aviso de enlace caducado.
  if (method === 'GET' && pathname === '/api/auth/reset-password') {
    const token = url.searchParams.get('token') ?? ''
    if (!token) return json({ valido: false, motivo: 'invalido' }, 400)
    if (rateLimit(`reset-check:${token.slice(0, 16)}`, RESET_MAX_INTENTOS, RESET_WINDOW_MS)) {
      return json({ error: 'Demasiados intentos. Intenta de nuevo en unos minutos.' }, 429)
    }
    const estado = await tokenRecuperacionValido(token)
    return json(estado, estado.valido ? 200 : 410)
  }

  if (method === 'POST' && pathname === '/api/auth/reset-password') {
    const excedido = cuerpoDeAuthExcedido()
    if (excedido) return excedido
    const body = (await request.json().catch(() => ({}))) as { token?: string; password?: string }
    const token = typeof body.token === 'string' ? body.token : ''
    const password = typeof body.password === 'string' ? body.password : ''
    if (!token) return json({ error: 'Enlace inválido', motivo: 'invalido' }, 400)

    // Acota los intentos contra un mismo enlace. El token es de 256 bits, así
    // que no es adivinable; esto solo evita que se martillee el endpoint.
    if (rateLimit(`reset:${token.slice(0, 16)}`, RESET_MAX_INTENTOS, RESET_WINDOW_MS)) {
      return json({ error: 'Demasiados intentos. Intenta de nuevo en unos minutos.' }, 429)
    }

    const resultado = await restablecerConToken(token, password)
    if (!resultado.ok) {
      if (resultado.motivo === 'password_corta') {
        return json(
          {
            error: `La contraseña debe tener al menos ${PASSWORD_MIN_LENGTH} caracteres`,
            motivo: resultado.motivo,
          },
          422,
        )
      }
      const mensaje =
        resultado.motivo === 'expirado'
          ? 'El enlace de recuperación ya venció. Solicita uno nuevo.'
          : 'El enlace de recuperación no es válido o ya se usó.'
      return json({ error: mensaje, motivo: resultado.motivo }, 410)
    }

    // Quien acaba de demostrar que controla el buzón no debe seguir bloqueado
    // por los intentos fallidos de otro: si no, un atacante puede dejar una
    // cuenta inaccesible durante 15 minutos aunque su dueño la recupere.
    clearLoginAttempts(resultado.usuario.email)

    // Sin `set-cookie`: restablecer la contraseña NO inicia sesión. Quien
    // llegue al enlace debe volver a autenticarse con la contraseña nueva.
    return json({ ok: true, email: resultado.usuario.email })
  }

  // Confirmación del cambio de correo. Es POST y no GET a propósito: los
  // antivirus y los previsualizadores de enlaces de muchos clientes de correo
  // visitan las URL de los mensajes, y con un GET quemarían el enlace antes de
  // que el destinatario lo abriera. La página del portal muestra un botón.
  if (method === 'POST' && pathname === '/api/auth/confirm-email') {
    const excedido = cuerpoDeAuthExcedido()
    if (excedido) return excedido
    const body = (await request.json().catch(() => ({}))) as { token?: string }
    const token = typeof body.token === 'string' ? body.token : ''
    if (!token) return json({ error: 'Enlace inválido', motivo: 'invalido' }, 400)

    if (rateLimit(`confirm-email:${token.slice(0, 16)}`, RESET_MAX_INTENTOS, RESET_WINDOW_MS)) {
      return json({ error: 'Demasiados intentos. Intenta de nuevo en unos minutos.' }, 429)
    }

    const resultado = await confirmarCambioEmail(token)
    if (!resultado.ok) {
      const mensajes: Record<string, string> = {
        expirado: 'El enlace de confirmación ya venció. Solicita el cambio otra vez.',
        email_ocupado: 'Ese correo quedó registrado por otra cuenta mientras tanto.',
        invalido: 'El enlace de confirmación no es válido o ya se usó.',
      }
      return json(
        { error: mensajes[resultado.motivo], motivo: resultado.motivo },
        resultado.motivo === 'email_ocupado' ? 409 : 410,
      )
    }

    // Aviso a la dirección anterior: es el único buzón que un atacante que
    // hubiera pedido el cambio ya no controla. No se espera el envío.
    void enviarAvisoCorreoCambiado({
      para: resultado.emailAnterior,
      nombre: resultado.nombre,
      emailNuevo: resultado.emailNuevo,
    }).catch((err) => logger.error('auth.confirm-email.aviso', err))

    return json({ ok: true, email: resultado.emailNuevo })
  }

  if (method === 'POST' && pathname === '/api/auth/logout') {
    // Se cierra la fila de la bitácora ANTES de invalidar la cookie: después
    // ya no habría forma de saber qué sesión terminó.
    const tokenSalida = readCookie(request.headers.get('cookie'), 'ordenamiento_session')
    if (tokenSalida) {
      const salienteId = await verifySessionToken(tokenSalida)
      const emitido = sessionIssuedAt(tokenSalida)
      if (salienteId && emitido !== null) {
        anotarSesion(registrarCierreSesion(salienteId, emitido), 'sesiones.cierre')
      }
    }
    return json({ ok: true }, { headers: { 'set-cookie': clearSessionCookie() } })
  }

  if (method === 'GET' && pathname === '/api/auth/me') {
    const user = await currentUser(request)
    return json({ user })
  }

  // ── Rutas protegidas ─────────────────────────────────────────────────
  const user = await currentUser(request)
  const requireAuth = (): Response | null => (user ? null : json({ error: 'No autenticado' }, 401))
  // `root` está por encima de `admin`: donde entra un administrador, entra él.
  const requireAdmin = (): Response | null =>
    puedeEntrarAlPanel(user?.role) ? null : json({ error: 'Requiere rol admin' }, 403)

  // Listado con filtros + paginación — expone PII de participantes: solo admin.
  if (method === 'GET' && pathname === '/api/participations') {
    const authError = requireAdmin()
    if (authError) return authError

    const origen = url.searchParams.get('origen')
    const estado = url.searchParams.get('estado')
    const etapa = url.searchParams.get('etapa')
    if (origen && !isOrigen(origen)) return json({ error: 'origen inválido' }, 400)
    if (estado && !isEstado(estado)) return json({ error: 'estado inválido' }, 400)
    if (etapa && !isEtapa(etapa)) return json({ error: 'etapa inválida' }, 400)

    // Fechas: solo se aceptan ISO 8601 válidos; un valor mal formado devuelve 400
    // en vez de un 500 del motor al castear a timestamptz.
    const desdeRaw = url.searchParams.get('desde')
    const hastaRaw = url.searchParams.get('hasta')
    const validarFecha = (v: string | null): string | undefined => {
      if (!v) return undefined
      const t = Date.parse(v)
      return Number.isNaN(t) ? (undefined as unknown as string) : v
    }
    const desde = validarFecha(desdeRaw)
    const hasta = validarFecha(hastaRaw)
    if (desdeRaw && desde === undefined) return json({ error: 'desde inválido (ISO 8601)' }, 400)
    if (hastaRaw && hasta === undefined) return json({ error: 'hasta inválido (ISO 8601)' }, 400)

    const result = await listParticipations({
      origen: (origen as Origen | undefined) ?? undefined,
      estado: (estado as Estado | undefined) ?? undefined,
      etapa: (etapa as Etapa | undefined) ?? undefined,
      folio: url.searchParams.get('folio') ?? undefined,
      nombre: url.searchParams.get('nombre') ?? undefined,
      colonia: url.searchParams.get('colonia') ?? undefined,
      desde: desde,
      hasta: hasta,
      q: url.searchParams.get('q') ?? undefined,
      page: safePositiveInt(url.searchParams.get('page'), 1),
      limit: safePositiveInt(url.searchParams.get('limit'), 10),
    })

    return json(result)
  }

  // Detalle — expone PII de un participante: solo admin.
  const detailMatch = method === 'GET' ? matchPath(pathname, '/api/participations/:id') : null
  if (detailMatch) {
    const authError = requireAdmin()
    if (authError) return authError
    const err = requireUuidParam(detailMatch.id)
    if (err) return err
    const participation = await getParticipation(detailMatch.id)
    if (!participation) return json({ error: 'No encontrado' }, 404)
    return json(participation)
  }

  // Crear participación: digital = público (ciudadano, sin sesión); física = admin
  if (method === 'POST' && pathname === '/api/participations') {
    return handleCreateParticipation(request, user)
  }

  // Dictaminar una participación y, opcionalmente, notificar al ciudadano.
  const resolucionMatch =
    method === 'POST' ? matchPath(pathname, '/api/participations/:id/resolucion') : null
  if (resolucionMatch) {
    const authError = requireAdmin()
    if (authError) return authError

    const id = resolucionMatch.id
    const err = requireUuidParam(id)
    if (err) return err

    const body = (await request.json()) as {
      estado?: string
      motivo?: string
      direccion?: string
      cita?: string
      notificar?: boolean
      para?: string
    }

    if (!body.estado || !isEstado(body.estado)) return json({ error: 'estado inválido' }, 400)
    if (body.estado === 'En proceso') {
      return json({ error: 'Para dictaminar elige Procedente o No procedente' }, 400)
    }

    const guardada = await registrarResolucion(id, {
      estado: body.estado,
      motivo: (body.motivo ?? '').trim(),
      direccion: (body.direccion ?? '').trim(),
      cita: (body.cita ?? '').trim(),
      resueltoPor: user?.id,
    })
    if (!guardada) return json({ error: 'No encontrado' }, 404)

    if (!body.notificar) return json({ ok: true, notificado: false })

    // El dictamen ya está guardado. Si el correo falla se responde 200 con
    // `notificado: false` y el motivo: el panel deja reintentar el envío sin
    // volver a capturar nada.
    if (!mailConfigurado())
      return json({ ok: true, notificado: false, motivo: 'SMTP_NO_CONFIGURADO' })

    const destino =
      (body.para ?? '').trim() ||
      String(((await getParticipation(id)) as { correo?: string } | null)?.correo ?? '').trim()
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(destino) || /[\r\n<>]/.test(destino)) {
      return json({ ok: true, notificado: false, motivo: 'SIN_CORREO' })
    }

    try {
      await enviarResolucionParticipacion(id, destino)
      await marcarNotificada(id, destino)
      return json({ ok: true, notificado: true, para: destino })
    } catch (err) {
      logger.error('app.enviarResolucion', err)
      return json({ ok: true, notificado: false, motivo: 'ENVIO_FALLIDO' })
    }
  }

  // Eliminar
  const deleteMatch = method === 'DELETE' ? matchPath(pathname, '/api/participations/:id') : null
  if (deleteMatch) {
    const authError = requireAdmin()
    if (authError) return authError
    const err = requireUuidParam(deleteMatch.id)
    if (err) return err
    if (!(await deleteParticipation(deleteMatch.id))) {
      return json({ error: 'No encontrado' }, 404)
    }
    return json({ ok: true })
  }

  // Ver / descargar adjunto
  const attachMatch =
    method === 'GET' ? matchPath(pathname, '/api/participations/:id/attachments/:aid') : null
  if (attachMatch) {
    // Descarga el archivo adjunto de un participante: solo admin.
    const authError = requireAdmin()
    if (authError) return authError
    const errId = requireUuidParam(attachMatch.id)
    if (errId) return errId
    const errAid = requireUuidParam(attachMatch.aid)
    if (errAid) return errAid
    return getAttachment(request, { id: attachMatch.id, aid: attachMatch.aid }, UPLOAD_DIR)
  }

  // Descargar Word (.docx) con los datos — autenticado
  const wordMatch = method === 'GET' ? matchPath(pathname, '/api/participations/:id/word') : null
  if (wordMatch) {
    // Exporta los datos completos (PII) de un participante a Word: solo admin.
    const authError = requireAdmin()
    if (authError) return authError
    const err = requireUuidParam(wordMatch.id)
    if (err) return err
    const rows = await sql<
      Array<{
        id: string
        folio: string
        origen: string
        nombre: string
        correo: string
        calle: string
        numero: string
        colonia: string
        municipio: string
        institucion: string
        ocupacion: string
        latitud: string
        longitud: string
        observacion: string
        estado: string
        domicilio: string
        municipio_participante: string
        fuente: string
        genero: string
        tematica: string
        created_at: Date
      }>
    >`
      SELECT id::text AS id, folio, origen, nombre, correo, calle, numero, colonia, municipio,
             domicilio, municipio_participante,
             institucion, ocupacion, latitud, longitud, observacion, estado,
             fuente, genero, tematica, created_at
      FROM participations WHERE id = ${wordMatch.id}
    `
    if (rows.length === 0) return json({ error: 'No encontrado' }, 404)
    const buffer = await participationDocx(rows[0])
    return new Response(new Uint8Array(buffer), {
      headers: {
        'content-type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'content-disposition': `attachment; filename="participacion-${rows[0].folio}.docx"`,
      },
    })
  }

  // Enviar participación por correo — autenticado
  if (method === 'POST' && pathname === '/api/participations/enviar') {
    // Envía los datos (PII) de un participante por correo: solo admin.
    const authError = requireAdmin()
    if (authError) return authError
    const body = (await request.json()) as { id?: string; para?: string }
    if (!body.id || !body.para) return json({ error: 'Faltan datos: id, para' }, 400)
    const err = requireUuidParam(String(body.id))
    if (err) return err
    if (
      /[\r\n]/.test(String(body.para)) ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(body.para).trim()) ||
      /[<>]/.test(String(body.para))
    ) {
      return json({ error: 'Correo destino inválido' }, 400)
    }
    if (!mailConfigurado()) {
      return json({ error: 'Correo no configurado: define SMTP_HOST, SMTP_USER y SMTP_PASS' }, 503)
    }
    try {
      const r = await enviarParticipacion(String(body.id), body.para)
      return json({ ok: true, ...r })
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      if (msg === 'NO_ENCONTRADA') return json({ error: 'Participación no encontrada' }, 404)
      return json({ error: `No se pudo enviar: ${msg}` }, 502)
    }
  }

  // Enviar correo de prueba SMTP — admin
  if (method === 'POST' && pathname === '/api/mail/test') {
    const authError = requireAdmin()
    if (authError) return authError
    const body = (await request.json()) as { para?: string }
    const destino = (body.para ?? '').trim()
    if (!destino) return json({ error: 'Falta datos: para' }, 400)
    // Anti-CRLF/XSS: el destino es header `To:` de SMTP y se refleja en JSON (`para`).
    // Rechaza \r\n y valida formato email básico; complementa el filtro del frontend
    // porque el backend es el guarda definitivo (bypass directo vía curl).
    if (
      /[\r\n]/.test(destino) ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(destino) ||
      /[<>]/.test(destino)
    ) {
      return json({ error: 'Correo destino inválido' }, 400)
    }
    if (!mailConfigurado()) {
      return json({ error: 'Correo no configurado: define SMTP_HOST, SMTP_USER y SMTP_PASS' }, 503)
    }
    try {
      const r = await enviarCorreoPrueba(destino)
      return json({ ok: true, para: destino, ...r })
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      return json({ error: `No se pudo enviar prueba: ${msg}` }, 502)
    }
  }

  // ── Exportación a Excel (.xlsx) — solo admin ────────────────────────
  const exportMatch = method === 'GET' ? matchPath(pathname, '/api/export/:tabla') : null
  if (exportMatch) {
    const authError = requireAdmin()
    if (authError) return authError
    const tabla = exportMatch.tabla.replace(/\.xlsx$/i, '')
    if (!isExportable(tabla)) return json({ error: 'Tabla no exportable' }, 400)
    const buffer = await exportTableToXlsx(tabla)
    return new Response(new Uint8Array(buffer), {
      headers: {
        'content-type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'content-disposition': `attachment; filename="${tabla}.xlsx"`,
      },
    })
  }

  // ── Mi cuenta — avatar (auth) ANTES de /api/users exacto para que no colisione ──
  if (method === 'GET' && pathname === '/api/users/me/avatar') {
    const authError = requireAuth()
    if (authError) return authError
    const { getUserAvatar } = await import('./services/users.ts')
    const img = await getUserAvatar(user!.id)
    if (!img) return json({ error: 'Sin avatar' }, 404)
    const ruta = isAbsolute(img.ruta) ? img.ruta : join(UPLOAD_DIR, img.ruta)
    if (!ruta.startsWith(UPLOAD_DIR) && !ruta.startsWith(BRANDING_DIR)) {
      return json({ error: 'Acceso a archivo no autorizado' }, 403)
    }
    let file: Buffer
    try {
      file = await readFile(ruta)
    } catch {
      return json({ error: 'Archivo en disco no disponible' }, 404)
    }
    const ext = getExtension(img.nombre)
    return new Response(new Uint8Array(file), {
      headers: {
        'content-type': canonicalMimeFor(ext) ?? 'application/octet-stream',
        'content-disposition': contentDispositionHeader('inline', img.nombre),
        'x-content-type-options': 'nosniff',
        'content-security-policy': "default-src 'none'; frame-ancestors 'self'",
      },
    })
  }

  if (method === 'POST' && pathname === '/api/users/me/avatar') {
    const authError = requireAuth()
    if (authError) return authError
    let escritos: string[] = []
    try {
      // Validación 5MB inline antes de validateUpload (el límite general de adjuntos es mayor).
      const form = await request.formData()
      const raw = form.get('avatar') as unknown as File | null
      if (!(raw instanceof File) || raw.size === 0) {
        return json({ error: 'No se recibió ninguna imagen' }, 400)
      }
      if (raw.size > 5 * 1024 * 1024) {
        return json({ error: 'Archivo demasiado grande (máx 5 MB)' }, 413)
      }
      const buf = Buffer.from(await raw.arrayBuffer())
      const verdict = validateUpload({ filename: String(raw.name), buffer: buf })
      if (!verdict.ok) {
        return json(
          { error: `Archivo rechazado (${sanitizarNombre(String(raw.name))}): ${verdict.reason}` },
          415,
        )
      }
      if (!isImageExtension(getExtension(String(raw.name)))) {
        return json({ error: 'El archivo debe ser una imagen (JPG, PNG, WEBP o GIF)' }, 415)
      }
      // Escribir a disco (reusando helpers de nombres)
      const { mkdir, writeFile } = await import('node:fs/promises')
      await mkdir(UPLOAD_DIR, { recursive: true })
      const disco = nombreEnDisco(String(raw.name))
      const ruta = join(UPLOAD_DIR, disco)
      await writeFile(ruta, buf)
      escritos = [ruta]
      const archivo = {
        nombreOriginal: sanitizarNombre(String(raw.name)),
        mime: verdict.safeMime!,
        size: raw.size,
        rutaLocal: ruta,
      }
      const { setUserAvatar } = await import('./services/users.ts')
      const saved = await setUserAvatar(user!.id, archivo)
      if (!saved) {
        await Promise.allSettled(escritos.map((f) => rm(f, { force: true })))
        return json({ error: 'No encontrado' }, 404)
      }
      return json({ ok: true, avatar_ruta: saved.avatar_ruta })
    } catch (e) {
      await Promise.allSettled(escritos.map((f) => rm(f, { force: true })))
      const status = (e as { status?: number }).status
      if (status) return json({ error: (e as Error).message }, status)
      throw e
    }
  }

  if (method === 'GET' && pathname === '/api/users/me') {
    const authError = requireAuth()
    if (authError) return authError
    const { getUserProfile } = await import('./services/users.ts')
    const profile = await getUserProfile(user!.id)
    if (!profile) return json({ error: 'No encontrado' }, 404)
    return json({ user: profile })
  }

  // Renombrar la propia cuenta. No exige contraseña: el nombre es una
  // etiqueta, no una credencial, y cambiarlo no da acceso a nada.
  if (method === 'POST' && pathname === '/api/users/me') {
    const authError = requireAuth()
    if (authError) return authError
    const body = (await request.json().catch(() => ({}))) as { name?: string }
    const name = typeof body.name === 'string' ? body.name : ''
    if (name.trim().length < 2) {
      return json({ error: 'El nombre debe tener al menos 2 caracteres' }, 422)
    }
    if (name.length > 120) {
      return json({ error: 'El nombre no puede pasar de 120 caracteres' }, 422)
    }
    const guardado = await updateUserName(user!.id, name)
    if (!guardado) return json({ error: 'No se pudo guardar el nombre' }, 400)
    return json({ ok: true, name: guardado })
  }

  // Cambiar el correo de acceso. Manda confirmación a la dirección NUEVA y no
  // toca `users.email` hasta que se confirme.
  if (method === 'POST' && pathname === '/api/users/me/email') {
    const authError = requireAuth()
    if (authError) return authError

    if (!mailConfigurado()) {
      return json(
        {
          error: 'El envío de correo no está configurado: no se puede verificar la dirección nueva',
        },
        503,
      )
    }

    const body = (await request.json().catch(() => ({}))) as {
      email?: string
      password?: string
    }

    if (rateLimit(`email-change:${user!.id}`, RESET_MAX_POR_CORREO, RESET_WINDOW_MS)) {
      return json({ error: 'Demasiadas solicitudes. Intenta de nuevo en unos minutos.' }, 429)
    }

    const resultado = await solicitarCambioEmail({
      userId: user!.id,
      nuevoEmail: String(body.email ?? ''),
      passwordActual: String(body.password ?? ''),
      verificarPassword: verifyPasswordById,
    })

    if (!resultado.ok) {
      const mensajes: Record<string, string> = {
        email_invalido: 'Escribe un correo electrónico válido',
        email_igual: 'Ese ya es el correo de tu cuenta',
        email_ocupado: 'Ese correo ya está registrado por otra cuenta',
        password_incorrecta: 'La contraseña actual no es correcta',
        usuario_no_encontrado: 'No se encontró la cuenta',
      }
      const status = resultado.motivo === 'password_incorrecta' ? 401 : 422
      return json({ error: mensajes[resultado.motivo], motivo: resultado.motivo }, status)
    }

    try {
      await enviarConfirmacionCorreoNuevo({
        para: resultado.nuevoEmail,
        nombre: resultado.nombre,
        url: urlConfirmarCorreo(resultado.token),
        expiraMinutos: EMAIL_TTL_MINUTOS,
        emailAnterior: resultado.emailActual,
      })
    } catch (err) {
      // Aquí sí importa avisar del fallo: quien lo pidió está autenticado y
      // esperando el correo, así que no hay nada que ocultar y sí que corregir.
      logger.error('users.me.email.envio', err)
      return json({ error: 'No se pudo enviar el correo de confirmación' }, 502)
    }

    return json({ ok: true, pendiente: resultado.nuevoEmail, expiraMinutos: EMAIL_TTL_MINUTOS })
  }

  // ── Bitácora de sesiones — solo admin ────────────────────────────────
  // Expone cuándo entró cada cuenta y desde dónde: es información de
  // vigilancia sobre personas, no un dato operativo cualquiera.
  if (method === 'GET' && pathname === '/api/sessions') {
    const authError = requireAdmin()
    if (authError) return authError

    const usuarioParam = url.searchParams.get('user_id')
    if (usuarioParam && !isUuid(usuarioParam)) {
      return json({ error: 'user_id inválido' }, 400)
    }
    const rawPage = Number(url.searchParams.get('page'))
    const rawLimit = Number(url.searchParams.get('limit'))
    const page = Number.isInteger(rawPage) && rawPage > 0 ? rawPage : 1
    const limit = Number.isInteger(rawLimit) && rawLimit > 0 ? rawLimit : 25

    const usuarioId = usuarioParam ?? undefined
    const [pagina, resumen] = await Promise.all([
      listarSesiones({ usuarioId, limit, page }),
      resumenSesiones(usuarioId),
    ])

    return json({ items: pagina.items, total: pagina.total, page, limit, resumen })
  }

  // ── Cuentas de usuario (root y admin) ────────────────────────────────
  // Quién puede hacer qué sobre quién está en auth/roles.ts. Aquí solo se
  // traduce el veredicto a una respuesta HTTP.

  /** Traduce un veredicto denegado al status y mensaje que le corresponde. */
  const denegado = (veredicto: Veredicto): Response | null => {
    if (veredicto.permitido) return null
    const mensajes: Record<string, [string, number]> = {
      sin_permiso: ['No tienes permiso para gestionar cuentas', 403],
      solo_root_sobre_root: ['Solo una cuenta root puede modificar a otra cuenta root', 403],
      solo_root_asigna_root: ['Solo una cuenta root puede otorgar el rango root', 403],
      ultimo_root: ['No se puede dejar el sistema sin ninguna cuenta root', 409],
      no_puede_autodegradarse: [
        'No puedes quitarte a ti mismo el rango root: nombra antes a otra cuenta',
        409,
      ],
    }
    const [mensaje, status] = mensajes[veredicto.motivo] ?? ['Operación no permitida', 403]
    return json({ error: mensaje, motivo: veredicto.motivo }, status)
  }

  if (method === 'GET' && pathname === '/api/users') {
    const authError = requireAdmin()
    if (authError) return authError
    return json({ users: await listarUsuarios() })
  }

  if (method === 'POST' && pathname === '/api/users') {
    const authError = requireAdmin()
    if (authError) return authError
    const body = (await request.json().catch(() => ({}))) as {
      email?: string
      name?: string
      password?: string
      role?: string
    }
    if (!body.email || !body.name || !body.password) {
      return json({ error: 'Faltan datos: email, name, password' }, 400)
    }

    // `comoRol` descarta cualquier valor que no sea un rango conocido: el rol
    // no puede salir tal cual de un formulario.
    const rol = comoRol(body.role)
    const veredicto = denegado(puedeCrearConRol(user!, rol))
    if (veredicto) return veredicto

    try {
      const { id } = await registerUser({
        email: body.email,
        name: body.name,
        password: body.password,
        role: rol,
      })
      return json({ ok: true, id }, 201)
    } catch (err) {
      if (err instanceof Error && err.message === 'EMAIL_TAKEN') {
        return json({ error: 'El correo ya está registrado' }, 409)
      }
      if (err instanceof Error && err.message === 'PASSWORD_LONGITUD_INVALIDA') {
        return json({ error: 'La contraseña no tiene una longitud válida' }, 422)
      }
      throw err
    }
  }

  // Restablecer la contraseña de otra cuenta sin conocer la anterior. Es lo
  // que hace un administrador cuando alguien perdió el acceso y ni siquiera
  // puede usar el correo de recuperación.
  const passwordMatch = method === 'POST' ? matchPath(pathname, '/api/users/:id/password') : null
  if (passwordMatch) {
    const authError = requireAdmin()
    if (authError) return authError
    const idError = requireUuidParam(passwordMatch.id)
    if (idError) return idError

    const objetivo = await obtenerCuenta(passwordMatch.id)
    if (!objetivo) return json({ error: 'Cuenta no encontrada' }, 404)

    const veredicto = denegado(puedeCambiarPassword(user!, objetivo))
    if (veredicto) return veredicto

    const body = (await request.json().catch(() => ({}))) as { password?: string }
    try {
      // `updateUserPassword` adelanta también el corte de sesiones: cambiar la
      // contraseña de alguien lo saca de las sesiones que tuviera abiertas,
      // que es justo lo que se quiere si la cuenta estaba comprometida.
      const ok = await updateUserPassword(passwordMatch.id, String(body.password ?? ''))
      if (!ok) return json({ error: 'Cuenta no encontrada' }, 404)
    } catch (err) {
      if (err instanceof Error && err.message === 'PASSWORD_LONGITUD_INVALIDA') {
        return json({ error: 'La contraseña no tiene una longitud válida' }, 422)
      }
      throw err
    }

    logger.info('users.password.reset', `${user!.email} restableció la de ${objetivo.email}`)
    return json({ ok: true, email: objetivo.email })
  }

  const usuarioPatchMatch = method === 'PATCH' ? matchPath(pathname, '/api/users/:id') : null
  if (usuarioPatchMatch) {
    const authError = requireAdmin()
    if (authError) return authError
    const idError = requireUuidParam(usuarioPatchMatch.id)
    if (idError) return idError

    const objetivo = await obtenerCuenta(usuarioPatchMatch.id)
    if (!objetivo) return json({ error: 'Cuenta no encontrada' }, 404)

    const body = (await request.json().catch(() => ({}))) as {
      name?: string
      email?: string
      role?: string
    }

    if (body.role !== undefined) {
      if (!esRolValido(body.role)) return json({ error: 'Rol inválido' }, 422)
      const veredicto = denegado(puedeCambiarRol(user!, objetivo, body.role, await contarRoots()))
      if (veredicto) return veredicto
      await cambiarRol(usuarioPatchMatch.id, body.role)
    }

    if (body.name !== undefined || body.email !== undefined) {
      // Cambiar los datos de una cuenta root exige ser root, igual que su
      // contraseña: si no, un admin le cambia el correo y se la queda.
      const veredicto = denegado(puedeCambiarPassword(user!, objetivo))
      if (veredicto) return veredicto

      if (body.name !== undefined && body.name.trim().length < 2) {
        return json({ error: 'El nombre debe tener al menos 2 caracteres' }, 422)
      }
      const resultado = await actualizarCuenta(usuarioPatchMatch.id, {
        name: body.name,
        email: body.email,
      })
      if (!resultado.ok) {
        return resultado.motivo === 'email_ocupado'
          ? json({ error: 'Ese correo ya está registrado por otra cuenta' }, 409)
          : json({ error: 'Cuenta no encontrada' }, 404)
      }
    }

    return json({ ok: true })
  }

  const usuarioDeleteMatch = method === 'DELETE' ? matchPath(pathname, '/api/users/:id') : null
  if (usuarioDeleteMatch) {
    const authError = requireAdmin()
    if (authError) return authError
    const idError = requireUuidParam(usuarioDeleteMatch.id)
    if (idError) return idError

    const objetivo = await obtenerCuenta(usuarioDeleteMatch.id)
    if (!objetivo) return json({ error: 'Cuenta no encontrada' }, 404)

    const veredicto = denegado(puedeEliminar(user!, objetivo, await contarRoots()))
    if (veredicto) return veredicto

    await eliminarUsuario(usuarioDeleteMatch.id)
    logger.info('users.delete', `${user!.email} eliminó la cuenta ${objetivo.email}`)
    return json({ ok: true })
  }

  // ── Stats para el dashboard — solo admin ─────────────────────────────
  if (method === 'GET' && pathname === '/api/stats') {
    const authError = requireAdmin()
    if (authError) return authError
    const origenParam = url.searchParams.get('origen')
    if (origenParam && !isOrigen(origenParam)) return json({ error: 'origen inválido' }, 400)
    const filtroOrigen = origenParam as Origen | null
    const [
      users,
      digital,
      fisica,
      estados,
      fuente,
      genero,
      tematica,
      cntIndicadores,
      partMes,
      actividades,
    ] = await Promise.all([
      sql<{ n: string }[]>`SELECT count(*)::text AS n FROM users`,
      sql<{ n: string }[]>`SELECT count(*)::text AS n FROM participations WHERE origen = 'digital'`,
      sql<{ n: string }[]>`SELECT count(*)::text AS n FROM participations WHERE origen = 'fisica'`,
      filtroOrigen
        ? sql<
            { estado: string; n: string }[]
          >`SELECT estado, count(*)::text AS n FROM participations WHERE origen = ${filtroOrigen} GROUP BY estado`
        : sql<
            { estado: string; n: string }[]
          >`SELECT estado, count(*)::text AS n FROM participations GROUP BY estado`,
      filtroOrigen
        ? sql<
            { k: string; n: string }[]
          >`SELECT fuente AS k, count(*)::text AS n FROM participations WHERE origen = ${filtroOrigen} GROUP BY fuente ORDER BY count(*) DESC`
        : sql<
            { k: string; n: string }[]
          >`SELECT fuente AS k, count(*)::text AS n FROM participations GROUP BY fuente ORDER BY count(*) DESC`,
      filtroOrigen
        ? sql<
            { k: string; n: string }[]
          >`SELECT genero AS k, count(*)::text AS n FROM participations WHERE origen = ${filtroOrigen} GROUP BY genero ORDER BY count(*) DESC`
        : sql<
            { k: string; n: string }[]
          >`SELECT genero AS k, count(*)::text AS n FROM participations GROUP BY genero ORDER BY count(*) DESC`,
      filtroOrigen
        ? sql<
            { k: string; n: string }[]
          >`SELECT tematica AS k, count(*)::text AS n FROM participations WHERE origen = ${filtroOrigen} GROUP BY tematica ORDER BY count(*) DESC`
        : sql<
            { k: string; n: string }[]
          >`SELECT tematica AS k, count(*)::text AS n FROM participations GROUP BY tematica ORDER BY count(*) DESC`,
      sql<{ n: string }[]>`SELECT count(*)::text AS n FROM indicadores`,
      // La serie por mes también respeta `origen`: sin esto, la pestaña
      // «Digitales» mostraba una gráfica mensual con las físicas incluidas.
      filtroOrigen
        ? sql<{ mes: string; n: string }[]>`
            SELECT to_char(date_trunc('month', created_at),'YYYY-MM') AS mes, count(*)::text AS n
            FROM participations WHERE origen = ${filtroOrigen} GROUP BY 1 ORDER BY 1 ASC
          `
        : sql<{ mes: string; n: string }[]>`
            SELECT to_char(date_trunc('month', created_at),'YYYY-MM') AS mes, count(*)::text AS n
            FROM participations GROUP BY 1 ORDER BY 1 ASC
          `,
      resumenActividades(),
    ])
    const tu: Array<[string, number]> = fuente.filter((r) => r.k).map((r) => [r.k, Number(r.n)])
    const tg: Array<[string, number]> = genero.filter((r) => r.k).map((r) => [r.k, Number(r.n)])
    const tt: Array<[string, number]> = tematica.filter((r) => r.k).map((r) => [r.k, Number(r.n)])
    return json({
      usuarios: Number(users[0].n),
      digitales: Number(digital[0].n),
      fisicas: Number(fisica[0].n),
      resultado: estados.map((r) => ({ estado: r.estado, total: Number(r.n) })),
      fuente: tu,
      genero: tg,
      tematica: tt,
      contenido: {
        actividades: actividades.total,
        proximas: actividades.proximas,
        realizadas: actividades.realizadas,
        borradores: actividades.borradores,
        avisosVigentes: actividades.avisosVigentes,
        indicadores: Number(cntIndicadores[0].n),
      },
      participacionesPorMes: partMes.map((r) => ({ mes: r.mes, total: Number(r.n) })),
      proximaActividad: actividades.proxima,
      avisos: actividades.avisos,
    })
  }

  // ── Personalización y Marca (Theme Settings & Audit) ─────────────
  if (method === 'GET' && pathname === '/api/settings/theme') {
    const theme = await getCustomizations()
    return json({ ok: true, theme })
  }

  if (method === 'POST' && pathname === '/api/settings/theme') {
    const authError = requireAdmin()
    if (authError) return authError
    const body = (await request.json()) as {
      config?: Partial<typeof DEFAULT_THEME_CONFIG>
      motivo?: string
      section?: 'usuario' | 'panel' | 'general'
    }
    if (!body.config) return json({ error: 'Falta config' }, 400)
    const motivo = (body.motivo ?? '').trim()
    if (!motivo) return json({ error: 'Debes indicar el motivo del cambio por seguridad' }, 400)

    const updated = await saveCustomizations({
      config: body.config,
      user: {
        id: user!.id,
        name: user!.name,
        email: user!.email,
      },
      motivo,
      section: body.section,
    })
    return json({ ok: true, theme: updated })
  }

  if (method === 'GET' && pathname === '/api/settings/audit') {
    const authError = requireAdmin()
    if (authError) return authError
    const logs = await listAuditLogs()
    return json({ ok: true, logs })
  }

  const restoreMatch = method === 'POST' ? matchPath(pathname, '/api/settings/restore/:id') : null
  if (restoreMatch) {
    const authError = requireAdmin()
    if (authError) return authError
    const err = requireUuidParam(restoreMatch.id)
    if (err) return err
    const body = (await request.json().catch(() => ({}))) as { motivo?: string }
    const restored = await restoreAuditSnapshot(
      restoreMatch.id,
      {
        id: user!.id,
        name: user!.name,
        email: user!.email,
      },
      body.motivo || 'Restauración de versión anterior',
    )
    if (!restored) return json({ error: 'Registro de auditoría no encontrado' }, 404)
    return json({ ok: true, theme: restored })
  }

  if (method === 'POST' && pathname === '/api/settings/upload') {
    const authError = requireAdmin()
    if (authError) return authError
    // Tolerancia a picos: cortar cuerpos gigantes antes de bufferizar.
    if (bodyTooLarge(request, 21 * 1024 * 1024)) {
      return json({ error: 'La imagen excede el límite de 20 MB' }, 413)
    }
    const form = await request.formData()
    const file = (form.get('file') ?? form.get('imagen')) as unknown as File | null
    if (!file || !(file instanceof File) || file.size === 0) {
      return json({ error: 'No se envió ninguna imagen válida' }, 400)
    }
    if (file.size > 20 * 1024 * 1024) {
      return json({ error: 'La imagen excede el límite de 20 MB' }, 413)
    }
    const buffer = Buffer.from(await file.arrayBuffer())
    // Solo imágenes reales (firma binaria), nunca SVG/HTML activo.
    const verdict = validateUpload({ filename: String(file.name), buffer })
    if (!verdict.ok) {
      return json({ error: `Imagen rechazada: ${verdict.reason}` }, 400)
    }
    if (!isImageExtension(verdict.ext!)) {
      return json({ error: 'Solo se aceptan imágenes (jpg, png, webp, gif)' }, 400)
    }
    const res = await saveUploadedBrandingImage(buffer, file.name)
    return json({ ok: true, url: res.url, filename: res.filename }, 201)
  }

  const brandingAssetMatch =
    method === 'GET' ? matchPath(pathname, '/api/settings/assets/:file') : null
  if (brandingAssetMatch) {
    const filename = brandingAssetMatch.file.replace(/[^a-zA-Z0-9_.-]/g, '')
    const fullPath = join(BRANDING_DIR, filename)
    try {
      const fileBytes = await readFile(fullPath)
      const ext = filename.split('.').pop()?.toLowerCase() ?? ''
      let mime = 'application/octet-stream'
      if (ext === 'png') mime = 'image/png'
      else if (ext === 'jpg' || ext === 'jpeg') mime = 'image/jpeg'
      else if (ext === 'webp') mime = 'image/webp'
      else if (ext === 'svg') mime = 'image/svg+xml'
      else if (ext === 'gif') mime = 'image/gif'
      else if (ext === 'ico') mime = 'image/x-icon'

      return new Response(new Uint8Array(fileBytes), {
        headers: {
          'content-type': mime,
          'cache-control': 'public, max-age=86400',
          'x-content-type-options': 'nosniff',
        },
      })
    } catch {
      return json({ error: 'Archivo no encontrado' }, 404)
    }
  }

  // ── Actividades y avances del Programa ─────────────────────────────────
  // Un solo registro por actividad (ver services/actividades.ts). Lo público
  // solo ve lo publicado; el panel lo ve todo por /api/actividades/gestion.
  // Las rutas fijas van ANTES de `/api/actividades/:id`: el router compara
  // por segmentos y `/api/actividades/aviso` casaría como si «aviso» fuera un id.

  if (method === 'GET' && pathname === '/api/actividades') {
    const vista = url.searchParams.get('vista')
    if (vista === 'proximas') {
      const limite = Math.min(safePositiveInt(url.searchParams.get('limite'), 0), 50)
      return json({ actividades: await listarProximas(limite || undefined) })
    }
    if (vista === 'avances') {
      const fase = url.searchParams.get('fase') ?? ''
      if (fase && !esFasePrograma(fase)) return json({ error: 'fase inválida' }, 400)
      return json({ actividades: await listarAvances(esFasePrograma(fase) ? fase : undefined) })
    }
    if (vista === 'calendario') {
      const actividades = await listarCalendario(url.searchParams.get('mes') ?? '')
      if (!actividades) return json({ error: 'mes inválido: usa YYYY-MM' }, 400)
      return json({ actividades })
    }
    return json({ error: 'vista inválida: proximas, avances o calendario' }, 400)
  }

  if (method === 'GET' && pathname === '/api/actividades/aviso') {
    return json({ aviso: await obtenerAvisoVigente() })
  }

  // Repositorio público: los archivos de las actividades publicadas.
  if (method === 'GET' && pathname === '/api/actividades/documentos') {
    const tipo = url.searchParams.get('tipo') ?? ''
    const fase = url.searchParams.get('fase') ?? ''
    if (tipo && !esTipoArchivo(tipo)) return json({ error: 'tipo inválido' }, 400)
    if (fase && !esFasePrograma(fase)) return json({ error: 'fase inválida' }, 400)
    return json({
      documentos: await listarDocumentosPublicos({
        tipo: esTipoArchivo(tipo) ? tipo : undefined,
        fase: esFasePrograma(fase) ? fase : undefined,
      }),
    })
  }

  if (method === 'GET' && pathname === '/api/actividades/gestion') {
    const authError = requireAdmin()
    if (authError) return authError
    const filtro = (clave: string) => url.searchParams.get(clave) ?? ''
    const [estado, publicacion, fase, mes] = ['estado', 'publicacion', 'fase', 'mes'].map(filtro)
    if (estado && !esEstadoActividad(estado)) return json({ error: 'estado inválido' }, 400)
    if (publicacion && !esEstadoPublicacion(publicacion)) {
      return json({ error: 'publicación inválida' }, 400)
    }
    if (fase && !esFasePrograma(fase)) return json({ error: 'fase inválida' }, 400)
    if (mes && !rangoDeMes(mes)) return json({ error: 'mes inválido: usa YYYY-MM' }, 400)
    // El resumen va sin filtros: son las cifras de la cabecera del módulo.
    const [actividades, resumen] = await Promise.all([
      listarGestion({
        estado: esEstadoActividad(estado) ? estado : undefined,
        publicacion: esEstadoPublicacion(publicacion) ? publicacion : undefined,
        fase: esFasePrograma(fase) ? fase : undefined,
        mes: mes || undefined,
      }),
      resumenActividades(),
    ])
    return json({ actividades, resumen })
  }

  const gestionMatch = method === 'GET' ? matchPath(pathname, '/api/actividades/gestion/:id') : null
  if (gestionMatch) {
    const authError = requireAdmin()
    if (authError) return authError
    const err = requireUuidParam(gestionMatch.id)
    if (err) return err
    const actividad = await obtenerActividadGestion(gestionMatch.id)
    if (!actividad) return json({ error: 'No encontrado' }, 404)
    return json({ actividad })
  }

  // Un archivo de una actividad. Los de borradores u ocultas solo los sirve a
  // quien entra al panel: el enlace de un borrador no debe abrirlo cualquiera.
  const archivoGet = method === 'GET' ? matchPath(pathname, '/api/actividades/archivos/:aid') : null
  if (archivoGet) {
    const err = requireUuidParam(archivoGet.aid)
    if (err) return err
    const archivo = await obtenerArchivo(archivoGet.aid, {
      incluirNoPublicados: puedeEntrarAlPanel(user?.role),
    })
    if (!archivo) return json({ error: 'Archivo no encontrado' }, 404)
    return responderArchivoActividad(archivo, url.searchParams.get('download') === '1')
  }

  const archivoPatch =
    method === 'PATCH' ? matchPath(pathname, '/api/actividades/archivos/:aid') : null
  if (archivoPatch) {
    const authError = requireAdmin()
    if (authError) return authError
    const err = requireUuidParam(archivoPatch.aid)
    if (err) return err
    const body = (await request.json().catch(() => ({}))) as { tipo?: unknown; titulo?: unknown }
    if (!esTipoArchivo(body.tipo)) return json({ error: 'Tipo de archivo inválido' }, 400)
    const resultado = await actualizarArchivo(archivoPatch.aid, {
      tipo: body.tipo,
      titulo: typeof body.titulo === 'string' ? body.titulo : '',
    })
    if (resultado === 'no_encontrado') return json({ error: 'No encontrado' }, 404)
    if (resultado === 'no_es_foto') return json({ error: MENSAJE_FOTO_NO_WEB }, 415)
    return json({ ok: true })
  }

  const archivoDelete =
    method === 'DELETE' ? matchPath(pathname, '/api/actividades/archivos/:aid') : null
  if (archivoDelete) {
    const authError = requireAdmin()
    if (authError) return authError
    const err = requireUuidParam(archivoDelete.aid)
    if (err) return err
    if (!(await eliminarArchivo(archivoDelete.aid))) return json({ error: 'No encontrado' }, 404)
    return json({ ok: true })
  }

  // Enviar el aviso de una actividad por correo — admin
  const avisoEnviar =
    method === 'POST' ? matchPath(pathname, '/api/actividades/:id/aviso/enviar') : null
  if (avisoEnviar) {
    const authError = requireAdmin()
    if (authError) return authError
    const err = requireUuidParam(avisoEnviar.id)
    if (err) return err
    const body = (await request.json().catch(() => ({}))) as { para?: unknown }
    const para = typeof body.para === 'string' ? body.para.trim() : ''
    // El destino acaba en la cabecera `To:`: sin saltos de línea ni `<>`.
    if (!para || /[\r\n<>]/.test(para) || !EMAIL_RE.test(para)) {
      return json({ error: 'Correo destino inválido' }, 400)
    }
    if (!mailConfigurado()) {
      return json({ error: 'Correo no configurado: define SMTP_HOST, SMTP_USER y SMTP_PASS' }, 503)
    }
    try {
      const r = await enviarAviso(avisoEnviar.id, para, `${APP_PUBLIC_URL}${APP_BASE_PATH}`)
      return json({ ok: true, ...r })
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      if (msg === 'NO_ENCONTRADO') return json({ error: 'Actividad no encontrada' }, 404)
      return json({ error: `No se pudo enviar: ${msg}` }, 502)
    }
  }

  if (method === 'POST' && pathname === '/api/actividades') {
    const authError = requireAdmin()
    if (authError) return authError
    return guardarActividad(request, null, user!.id)
  }

  // Ficha pública: solo publicadas. El panel usa /api/actividades/gestion/:id.
  const actividadGet = method === 'GET' ? matchPath(pathname, '/api/actividades/:id') : null
  if (actividadGet) {
    const err = requireUuidParam(actividadGet.id)
    if (err) return err
    const actividad = await obtenerActividadPublica(actividadGet.id)
    if (!actividad) return json({ error: 'No encontrado' }, 404)
    return json({ actividad })
  }

  const actividadPut = method === 'PUT' ? matchPath(pathname, '/api/actividades/:id') : null
  if (actividadPut) {
    const authError = requireAdmin()
    if (authError) return authError
    const err = requireUuidParam(actividadPut.id)
    if (err) return err
    return guardarActividad(request, actividadPut.id, user!.id)
  }

  const actividadDelete = method === 'DELETE' ? matchPath(pathname, '/api/actividades/:id') : null
  if (actividadDelete) {
    const authError = requireAdmin()
    if (authError) return authError
    const err = requireUuidParam(actividadDelete.id)
    if (err) return err
    if (!(await eliminarActividad(actividadDelete.id))) return json({ error: 'No encontrado' }, 404)
    return json({ ok: true })
  }

  // ── Seguimiento y evaluación — Indicadores (público) ──────────────────
  if (method === 'GET' && pathname === '/api/indicadores') {
    const indicadores = await listIndicadores()
    return json({ indicadores })
  }

  // ── Seguimiento y evaluación — Indicadores (admin escritura) ──────────
  if (method === 'POST' && pathname === '/api/indicadores') {
    const authError = requireAdmin()
    if (authError) return authError
    const validacion = validarIndicador(await request.json().catch(() => null))
    if (!validacion.ok) return json({ error: validacion.error }, 400)
    const { mediciones, ...campos } = validacion.datos
    if (!campos.nombre) return json({ error: 'Falta nombre' }, 400)
    const respaldoInvalido = await validarRespaldo(campos.documento_respaldo_id)
    if (respaldoInvalido) return respaldoInvalido
    try {
      const result = await sql.begin(async (tx) => {
        return createIndicador(
          tx,
          { ...campos, nombre: campos.nombre!, creadoPor: user?.id },
          mediciones ?? [],
        )
      })
      return json({ ok: true, id: result.id }, 201)
    } catch (e) {
      if (esRespaldoBorrado(e)) return json({ error: MENSAJE_RESPALDO_INEXISTENTE }, 400)
      throw e
    }
  }

  const indicadorPutMatch = method === 'PUT' ? matchPath(pathname, '/api/indicadores/:id') : null
  if (indicadorPutMatch) {
    const authError = requireAdmin()
    if (authError) return authError
    const err = requireUuidParam(indicadorPutMatch.id)
    if (err) return err
    const validacion = validarIndicador(await request.json().catch(() => null))
    if (!validacion.ok) return json({ error: validacion.error }, 400)
    const { mediciones, ...campos } = validacion.datos
    const respaldoInvalido = await validarRespaldo(campos.documento_respaldo_id)
    if (respaldoInvalido) return respaldoInvalido
    try {
      // En una transacción: reemplazar las mediciones las borra antes de
      // volver a insertarlas, y un fallo a medias dejaría al indicador sin ellas.
      const ok = await sql.begin(async (tx) =>
        updateIndicador(tx, indicadorPutMatch.id, campos, mediciones),
      )
      if (!ok) return json({ error: 'No encontrado' }, 404)
      return json({ ok: true })
    } catch (e) {
      if (esRespaldoBorrado(e)) return json({ error: MENSAJE_RESPALDO_INEXISTENTE }, 400)
      throw e
    }
  }

  const indicadorDeleteMatch =
    method === 'DELETE' ? matchPath(pathname, '/api/indicadores/:id') : null
  if (indicadorDeleteMatch) {
    const authError = requireAdmin()
    if (authError) return authError
    const err = requireUuidParam(indicadorDeleteMatch.id)
    if (err) return err
    if (!(await deleteIndicador(indicadorDeleteMatch.id)))
      return json({ error: 'No encontrado' }, 404)
    return json({ ok: true })
  }

  return json({ error: 'No encontrado' }, 404)
}

export async function init(): Promise<void> {
  await migrate()

  // Los archivos de seed están gitignorados (contienen datos de ejemplo y
  // contraseñas temporales). Si no existen en este checkout, se omiten sin
  // error. Para crear el admin ROOT, define ROOT_PASSWORD en el .env.
  try {
    const seed = await import('./seed.ts')
    await seed.seedRootAdmin()
  } catch (err) {
    console.warn('[init] seedRootAdmin omitido:', err instanceof Error ? err.message : err)
  }
  try {
    const seed = await import('./seed.ts')
    await seed.seedExtraAdmins()
  } catch {
    // opcional: no hay seed-admins.json
  }
  try {
    const seedDemo = await import('./seed-demo.ts')
    await seedDemo.seedDemoData()
  } catch {
    // opcional: no hay seed-demo.ts
  }

  console.log('[server] listo para recibir requests')
}
