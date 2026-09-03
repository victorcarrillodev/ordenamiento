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
import {
  createReunion,
  deleteReunion,
  getProximaReunion,
  listReuniones,
} from './services/reuniones.ts'
import { listAvisos, createAviso, deleteAviso } from './services/avisos.ts'
import {
  listPoel,
  listPoelPublicas,
  createPoelSesion,
  deletePoelSesion,
  updatePoelSesion,
  setPoelImagen,
  getPoelImagen,
  listPoelArchivos,
  addPoelArchivo,
  getPoelArchivo,
  deletePoelArchivo,
  isCategoriaPoel,
} from './services/poel.ts'
import { subirArchivosDesdeForm } from './services/upload.ts'
import {
  listActividades,
  createActividad,
  updateActividad,
  deleteActividad,
} from './services/actividades.ts'
import {
  listDocumentos,
  getDocumento,
  createDocumento,
  updateDocumento,
  deleteDocumento,
  isTipoDocumento,
  isEtapaDoc,
} from './services/documentos.ts'
import {
  listIndicadores,
  createIndicador,
  updateIndicador,
  deleteIndicador,
} from './services/indicadores.ts'
import { validarAdjunto } from './files/limits.ts'
import { nombreEnDisco, sanitizarNombre } from './files/nombres.ts'
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
  if (role === 'admin') {
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

  // ── Auth ─────────────────────────────────────────────────────────────
  // Registro público (autoservicio). NUNCA confiar en un rol enviado por el
  // cliente aquí: esta ruta no exige sesión, así que aceptar `role` del body
  // permitiría que cualquiera se cree una cuenta admin. Crear administradores
  // solo es posible ya autenticado como admin, vía POST /api/users.
  if (method === 'POST' && pathname === '/api/auth/register') {
    const body = (await request.json()) as {
      email?: string
      name?: string
      password?: string
    }
    if (!body.email || !body.name || !body.password) {
      return json({ error: 'Faltan datos: email, name, password' }, 400)
    }
    try {
      const user = await registerUser({
        email: body.email,
        name: body.name,
        password: body.password,
        role: 'user',
      })
      const token = await createSessionToken(user.id)
      return json(
        { user: { id: user.id, name: body.name }, message: 'Registrado' },
        { headers: { 'set-cookie': sessionCookie(token) } },
      )
    } catch (err) {
      if (err instanceof Error && err.message === 'EMAIL_TAKEN') {
        return json({ error: 'El correo ya está registrado' }, 409)
      }
      throw err
    }
  }

  if (method === 'POST' && pathname === '/api/auth/login') {
    const body = (await request.json()) as { email?: string; password?: string }
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

    // Sin `set-cookie`: restablecer la contraseña NO inicia sesión. Quien
    // llegue al enlace debe volver a autenticarse con la contraseña nueva.
    return json({ ok: true, email: resultado.usuario.email })
  }

  // Confirmación del cambio de correo. Es POST y no GET a propósito: los
  // antivirus y los previsualizadores de enlaces de muchos clientes de correo
  // visitan las URL de los mensajes, y con un GET quemarían el enlace antes de
  // que el destinatario lo abriera. La página del portal muestra un botón.
  if (method === 'POST' && pathname === '/api/auth/confirm-email') {
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
  const requireAdmin = (): Response | null =>
    user?.role === 'admin' ? null : json({ error: 'Requiere rol admin' }, 403)

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
    const rows = await sql<
      Array<{ ruta_local: string; nombre_original: string; mime: string }>
    >`--sql
      SELECT ruta_local, nombre_original, mime
      FROM attachments
      WHERE id = ${attachMatch.aid} AND participation_id = ${attachMatch.id}
    `
    if (rows.length === 0) {
      return json({ error: 'Adjunto no encontrado' }, 404)
    }
    // Resuelve rutas relativas contra UPLOAD_DIR (datos viejos la guardaron relativa)
    const ruta = isAbsolute(rows[0].ruta_local)
      ? rows[0].ruta_local
      : join(UPLOAD_DIR, rows[0].ruta_local)

    // Guard de archivos: validación estricta de ruta contra path traversal
    if (!ruta.startsWith(UPLOAD_DIR) && !ruta.startsWith(BRANDING_DIR)) {
      return json({ error: 'Acceso a archivo no autorizado' }, 403)
    }

    let file: Buffer
    try {
      file = await readFile(ruta)
    } catch {
      return json({ error: 'Archivo en disco no disponible' }, 404)
    }
    const isDownload = url.searchParams.get('download') === '1'
    // Servido seguro: MIME derivado de la extensión whitelist (nunca el
    // declarado en la subida), descarga forzada salvo formatos inertes,
    // nosniff y filename saneado contra inyección de cabeceras (incluye
    // CR/LF y comillas, cubriendo el cleanFilename del guard previo).
    const ext = getExtension(rows[0].nombre_original || rows[0].ruta_local)
    const mime = canonicalMimeFor(ext) ?? 'application/octet-stream'
    const disposition = isDownload || !shouldServeInline(ext) ? 'attachment' : 'inline'
    return new Response(new Uint8Array(file), {
      headers: {
        'content-type': mime,
        'content-disposition': contentDispositionHeader(disposition, rows[0].nombre_original),
        'x-content-type-options': 'nosniff',
        'content-security-policy': "default-src 'none'; sandbox; frame-ancestors 'none'",
        'cross-origin-resource-policy': 'same-origin',
      },
    })
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

  // Enviar aviso oficial por correo — admin
  if (method === 'POST' && pathname === '/api/avisos/enviar') {
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
      const r = await enviarAviso(String(body.id), body.para)
      return json({ ok: true, ...r })
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      if (msg === 'NO_ENCONTRADO') return json({ error: 'Aviso no encontrado' }, 404)
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

  // ── Reuniones (bitácora) ─────────────────────────────────────────────
  if (method === 'GET' && pathname === '/api/reuniones') {
    const authError = requireAuth()
    if (authError) return authError
    return json({ reuniones: await listReuniones() })
  }

  if (method === 'POST' && pathname === '/api/reuniones') {
    const authError = requireAdmin()
    if (authError) return authError
    const body = (await request.json()) as {
      titulo?: string
      fecha?: string
      horaInicio?: string
      horaFin?: string
    }
    if (!body.titulo || !body.fecha) return json({ error: 'Faltan datos: titulo, fecha' }, 400)
    const reunion = await createReunion({
      titulo: body.titulo,
      fecha: body.fecha,
      horaInicio: body.horaInicio,
      horaFin: body.horaFin,
      creadoPor: user?.id,
    })
    return json({ ok: true, reunion }, 201)
  }

  const reunionDeleteMatch = method === 'DELETE' ? matchPath(pathname, '/api/reuniones/:id') : null
  if (reunionDeleteMatch) {
    const authError = requireAdmin()
    if (authError) return authError
    const err = requireUuidParam(reunionDeleteMatch.id)
    if (err) return err
    if (!(await deleteReunion(reunionDeleteMatch.id))) {
      return json({ error: 'No encontrado' }, 404)
    }
    return json({ ok: true })
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
      // Validación 5MB inline antes de validateUpload (validarAdjunto usa 50MB por defecto)
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

  // ── Usuarios (solo root/admin) ────────────────────────────────────────
  if (method === 'GET' && pathname === '/api/users') {
    const authError = requireAdmin()
    if (authError) return authError
    const users = await sql<
      Array<{ id: string; email: string; name: string; role: string; created_at: string }>
    >`
      SELECT id::text AS id, email, name, role, created_at::text AS created_at FROM users ORDER BY id
    `
    return json({ users })
  }

  if (method === 'POST' && pathname === '/api/users') {
    const authError = requireAdmin()
    if (authError) return authError
    const body = (await request.json()) as {
      email?: string
      name?: string
      password?: string
      role?: 'admin' | 'user'
    }
    if (!body.email || !body.name || !body.password) {
      return json({ error: 'Faltan datos: email, name, password' }, 400)
    }
    try {
      const { id } = await registerUser({
        email: body.email,
        name: body.name,
        password: body.password,
        role: body.role ?? 'user',
      })
      return json({ ok: true, id }, 201)
    } catch (err) {
      if (err instanceof Error && err.message === 'EMAIL_TAKEN') {
        return json({ error: 'El correo ya está registrado' }, 409)
      }
      throw err
    }
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
      cntActividades,
      cntDocumentos,
      cntIndicadores,
      cntPoel,
      cntReuniones,
      cntAvisos,
      partMes,
      proxima,
      ultAvisos,
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
      sql<{ n: string }[]>`SELECT count(*)::text AS n FROM actividades`,
      sql<{ n: string }[]>`SELECT count(*)::text AS n FROM documentos`,
      sql<{ n: string }[]>`SELECT count(*)::text AS n FROM indicadores`,
      sql<{ n: string }[]>`SELECT count(*)::text AS n FROM poel_sesiones`,
      sql<{ n: string }[]>`SELECT count(*)::text AS n FROM reuniones`,
      sql<{ n: string }[]>`SELECT count(*)::text AS n FROM avisos`,
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
      getProximaReunion(),
      listAvisos().then((a) => a.slice(0, 5)),
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
        actividades: Number(cntActividades[0].n),
        documentos: Number(cntDocumentos[0].n),
        indicadores: Number(cntIndicadores[0].n),
        poelSesiones: Number(cntPoel[0].n),
        reuniones: Number(cntReuniones[0].n),
        avisos: Number(cntAvisos[0].n),
      },
      participacionesPorMes: partMes.map((r) => ({ mes: r.mes, total: Number(r.n) })),
      proximaReunion: proxima,
      ultimosAvisos: ultAvisos,
    })
  }

  // ── Avisos (solo admin) ─────────────────────────────────────────────
  if (method === 'GET' && pathname === '/api/avisos') {
    const authError = requireAuth()
    if (authError) return authError
    return json({ avisos: await listAvisos() })
  }

  if (method === 'POST' && pathname === '/api/avisos') {
    const authError = requireAdmin()
    if (authError) return authError
    const body = (await request.json()) as { titulo?: string; descripcion?: string }
    if (!body.titulo) return json({ error: 'Falta titulo' }, 400)
    const aviso = await createAviso({
      titulo: body.titulo,
      descripcion: body.descripcion,
      creadoPor: user?.id,
    })
    return json({ ok: true, aviso }, 201)
  }

  const avisoDeleteMatch = method === 'DELETE' ? matchPath(pathname, '/api/avisos/:id') : null
  if (avisoDeleteMatch) {
    const authError = requireAdmin()
    if (authError) return authError
    const err = requireUuidParam(avisoDeleteMatch.id)
    if (err) return err
    if (!(await deleteAviso(avisoDeleteMatch.id))) return json({ error: 'No encontrado' }, 404)
    return json({ ok: true })
  }

  // ── Sesiones POEL públicas (sin auth, solo activas, sin campos sensibles) ──
  if (method === 'GET' && pathname === '/api/poel/sesiones') {
    return json({ sesiones: await listPoelPublicas() })
  }

  // ── Sesiones POEL (solo admin) ─────────────────────────────────────
  if (method === 'GET' && pathname === '/api/poel') {
    const authError = requireAuth()
    if (authError) return authError
    return json({ sesiones: await listPoel() })
  }

  if (method === 'POST' && pathname === '/api/poel') {
    const authError = requireAdmin()
    if (authError) return authError
    const body = (await request.json()) as {
      categoria?: string
      orden?: number
      titulo?: string
      descripcion?: string
      fecha?: string
      ubicacion?: string
      latitud?: string
      longitud?: string
    }
    if (!body.titulo) return json({ error: 'Falta titulo' }, 400)
    // Validación temprana — mantiene contrato 400 igual que !titulo, sin depender del throw del servicio
    if (!isCategoriaPoel(body.categoria ?? '')) return json({ error: 'categoría inválida' }, 400)
    try {
      const sesion = await createPoelSesion({
        categoria: body.categoria ?? '',
        orden: body.orden ?? 0,
        titulo: body.titulo,
        descripcion: body.descripcion,
        fecha: body.fecha || null,
        ubicacion: body.ubicacion ?? '',
        latitud: body.latitud ?? '',
        longitud: body.longitud ?? '',
      })
      return json({ ok: true, sesion }, 201)
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      const status = (err as { status?: number }).status ?? 500
      if (status >= 400 && status < 500) return json({ error: msg }, status)
      throw err
    }
  }

  // Editar una sesión POEL (update parcial: sirve tanto para el formulario
  // completo como para el botón de activar/desactivar).
  const poelUpdateMatch = method === 'PATCH' ? matchPath(pathname, '/api/poel/:id') : null
  if (poelUpdateMatch) {
    const authError = requireAdmin()
    if (authError) return authError
    const err = requireUuidParam(poelUpdateMatch.id)
    if (err) return err

    const body = (await request.json()) as Record<string, unknown>
    const texto = (k: string) => (typeof body[k] === 'string' ? (body[k] as string) : undefined)

    try {
      const sesion = await updatePoelSesion(poelUpdateMatch.id, {
        categoria: texto('categoria'),
        titulo: texto('titulo'),
        descripcion: texto('descripcion'),
        ubicacion: texto('ubicacion'),
        latitud: texto('latitud'),
        longitud: texto('longitud'),
        orden: typeof body.orden === 'number' ? body.orden : undefined,
        activo: typeof body.activo === 'boolean' ? body.activo : undefined,
        // `fecha` distingue ausente (no tocar) de null (borrar la fecha).
        fecha: 'fecha' in body ? (body.fecha as string | null) || null : undefined,
      })
      if (!sesion) return json({ error: 'No encontrado' }, 404)
      return json({ ok: true, sesion })
    } catch (e) {
      const status = (e as { status?: number }).status ?? 500
      if (status === 400) return json({ error: (e as Error).message }, 400)
      throw e
    }
  }

  // Subir la imagen de una sesión (multipart). Reutiliza el mismo guard de
  // archivos que los adjuntos ciudadanos: límites, magic bytes y nombre saneado.
  // ── Archivos de una sesión POEL ────────────────────────────────────
  // Acepta cualquier tipo permitido por el guard, no solo imágenes: la
  // sesión necesita colgar tanto fotos como actas, minutas o convocatorias.
  const poelArchivosGet = method === 'GET' ? matchPath(pathname, '/api/poel/:id/archivos') : null
  if (poelArchivosGet) {
    const err = requireUuidParam(poelArchivosGet.id)
    if (err) return err
    return json({ archivos: await listPoelArchivos(poelArchivosGet.id) })
  }

  const poelArchivoPost = method === 'POST' ? matchPath(pathname, '/api/poel/:id/archivos') : null
  if (poelArchivoPost) {
    const authError = requireAdmin()
    if (authError) return authError
    const err = requireUuidParam(poelArchivoPost.id)
    if (err) return err

    let escritos: string[] = []
    try {
      const subida = await subirArchivosDesdeForm(request, ['archivo'])
      escritos = subida.escritos
      if (subida.archivos.length === 0) return json({ error: 'No se recibió ningún archivo' }, 400)

      const guardados = []
      for (const archivo of subida.archivos) {
        // El tipo sale de la extensión, no de lo que declare el cliente: es
        // lo que separa "Imágenes" de "Documentos" en el sitio público.
        const tipo = isImageExtension(getExtension(archivo.nombreOriginal)) ? 'imagen' : 'documento'
        const fila = await addPoelArchivo(poelArchivoPost.id, tipo, archivo)
        if (!fila) {
          await Promise.allSettled(escritos.map((f) => rm(f, { force: true })))
          return json({ error: 'No encontrado' }, 404)
        }
        guardados.push(fila)
      }
      return json({ ok: true, archivos: guardados }, 201)
    } catch (e) {
      await Promise.allSettled(escritos.map((f) => rm(f, { force: true })))
      const status = (e as { status?: number }).status
      if (status) return json({ error: (e as Error).message }, status)
      throw e
    }
  }

  // Servir un archivo. Público como la imagen: son actas y fotos de sesiones,
  // contenido institucional sin datos personales.
  const poelArchivoGet = method === 'GET' ? matchPath(pathname, '/api/poel/archivos/:aid') : null
  if (poelArchivoGet) {
    const err = requireUuidParam(poelArchivoGet.aid)
    if (err) return err
    const arch = await getPoelArchivo(poelArchivoGet.aid)
    if (!arch) return json({ error: 'No encontrado' }, 404)

    const ruta = isAbsolute(arch.ruta) ? arch.ruta : join(UPLOAD_DIR, arch.ruta)
    if (!ruta.startsWith(UPLOAD_DIR)) {
      return json({ error: 'Acceso a archivo no autorizado' }, 403)
    }
    let file: Buffer
    try {
      file = await readFile(ruta)
    } catch {
      return json({ error: 'Archivo en disco no disponible' }, 404)
    }
    const ext = getExtension(arch.nombre)
    const descarga = url.searchParams.get('download') === '1'
    // Solo se muestran en línea los formatos inertes; el resto se descarga.
    const modo = descarga || !shouldServeInline(ext) ? 'attachment' : 'inline'
    return new Response(new Uint8Array(file), {
      headers: {
        'content-type': canonicalMimeFor(ext) ?? 'application/octet-stream',
        'content-disposition': contentDispositionHeader(modo, arch.nombre),
        'x-content-type-options': 'nosniff',
        'content-security-policy': "default-src 'none'; frame-ancestors 'self'",
      },
    })
  }

  const poelArchivoDelete =
    method === 'DELETE' ? matchPath(pathname, '/api/poel/archivos/:aid') : null
  if (poelArchivoDelete) {
    const authError = requireAdmin()
    if (authError) return authError
    const err = requireUuidParam(poelArchivoDelete.aid)
    if (err) return err

    const ruta = await deletePoelArchivo(poelArchivoDelete.aid)
    if (!ruta) return json({ error: 'No encontrado' }, 404)
    // El registro ya no está; si el fichero no se puede borrar no se falla la
    // petición, solo quedaría un huérfano en disco.
    const abs = isAbsolute(ruta) ? ruta : join(UPLOAD_DIR, ruta)
    if (abs.startsWith(UPLOAD_DIR)) await rm(abs, { force: true }).catch(() => {})
    return json({ ok: true })
  }

  const poelImagenPost = method === 'POST' ? matchPath(pathname, '/api/poel/:id/imagen') : null
  if (poelImagenPost) {
    const authError = requireAdmin()
    if (authError) return authError
    const err = requireUuidParam(poelImagenPost.id)
    if (err) return err

    let escritos: string[] = []
    try {
      const subida = await subirArchivosDesdeForm(request, ['imagen'])
      escritos = subida.escritos
      const archivo = subida.archivos[0]
      if (!archivo) return json({ error: 'No se recibió ninguna imagen' }, 400)

      // Solo imágenes: un PDF o un DWG no tienen sentido como portada.
      if (!isImageExtension(getExtension(archivo.nombreOriginal))) {
        await Promise.allSettled(escritos.map((f) => rm(f, { force: true })))
        return json({ error: 'El archivo debe ser una imagen (JPG, PNG, WEBP o GIF)' }, 415)
      }

      const sesion = await setPoelImagen(poelImagenPost.id, archivo)
      if (!sesion) {
        await Promise.allSettled(escritos.map((f) => rm(f, { force: true })))
        return json({ error: 'No encontrado' }, 404)
      }
      return json({ ok: true, sesion })
    } catch (e) {
      // Si algo falla, no dejar la imagen huérfana en disco.
      await Promise.allSettled(escritos.map((f) => rm(f, { force: true })))
      const status = (e as { status?: number }).status
      if (status) return json({ error: (e as Error).message }, status)
      throw e
    }
  }

  // Ver la imagen de una sesión. Es contenido institucional (fotos de talleres,
  // carteles), no PII, así que se sirve sin sesión: la consulta pública la usa.
  const poelImagenGet = method === 'GET' ? matchPath(pathname, '/api/poel/:id/imagen') : null
  if (poelImagenGet) {
    const err = requireUuidParam(poelImagenGet.id)
    if (err) return err
    const img = await getPoelImagen(poelImagenGet.id)
    if (!img) return json({ error: 'Sin imagen' }, 404)

    const ruta = isAbsolute(img.ruta) ? img.ruta : join(UPLOAD_DIR, img.ruta)
    if (!ruta.startsWith(UPLOAD_DIR)) {
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

  const poelDeleteMatch = method === 'DELETE' ? matchPath(pathname, '/api/poel/:id') : null
  if (poelDeleteMatch) {
    const authError = requireAdmin()
    if (authError) return authError
    const err = requireUuidParam(poelDeleteMatch.id)
    if (err) return err
    if (!(await deletePoelSesion(poelDeleteMatch.id))) {
      return json({ error: 'No encontrado' }, 404)
    }
    return json({ ok: true })
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

  // ── Portal POETDUM — Actividades (público listado/detalle) ───────────
  if (method === 'GET' && pathname === '/api/actividades') {
    const estado = url.searchParams.get('estado')
    try {
      const actividades = await listActividades({ estado })
      return json({ actividades })
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      const status = (err as { status?: number }).status ?? 400
      return json({ error: msg }, status)
    }
  }

  // Pública: foto de actividad (anti-traversal + headers de seguridad)
  const actividadFotoMatch =
    method === 'GET' ? matchPath(pathname, '/api/actividades/:id/fotos/:fid') : null
  if (actividadFotoMatch) {
    const errId = requireUuidParam(actividadFotoMatch.id)
    if (errId) return errId
    const errFid = requireUuidParam(actividadFotoMatch.fid)
    if (errFid) return errFid
    const rows = await sql<
      Array<{ ruta_local: string; nombre_original: string; mime: string }>
    >`--sql
      SELECT ruta_local, nombre_original, mime FROM actividad_fotos
      WHERE id = ${actividadFotoMatch.fid} AND actividad_id = ${actividadFotoMatch.id}
    `
    if (rows.length === 0) return json({ error: 'Foto no encontrada' }, 404)
    const ruta = isAbsolute(rows[0].ruta_local)
      ? rows[0].ruta_local
      : join(UPLOAD_DIR, rows[0].ruta_local)
    if (!ruta.startsWith(UPLOAD_DIR) && !ruta.startsWith(BRANDING_DIR)) {
      return json({ error: 'Acceso a archivo no autorizado' }, 403)
    }
    let file: Buffer
    try {
      file = await readFile(ruta)
    } catch {
      return json({ error: 'Archivo en disco no disponible' }, 404)
    }
    const isDownload = url.searchParams.get('download') === '1'
    const ext = getExtension(rows[0].nombre_original || rows[0].ruta_local)
    const mime = canonicalMimeFor(ext) ?? 'application/octet-stream'
    const disposition = isDownload || !shouldServeInline(ext) ? 'attachment' : 'inline'
    return new Response(new Uint8Array(file), {
      headers: {
        'content-type': mime,
        'content-disposition': contentDispositionHeader(disposition, rows[0].nombre_original),
        'x-content-type-options': 'nosniff',
        'content-security-policy': "default-src 'none'; sandbox; frame-ancestors 'none'",
        'cross-origin-resource-policy': 'same-origin',
      },
    })
  }

  // ── Portal POETDUM — Documentos (público listado) ────────────────────
  if (method === 'GET' && pathname === '/api/documentos') {
    const tipo = url.searchParams.get('tipo') ?? undefined
    const etapa = url.searchParams.get('etapa') ?? undefined
    try {
      if (tipo && !isTipoDocumento(tipo)) return json({ error: `tipo inválido: ${tipo}` }, 400)
      if (etapa && !isEtapaDoc(etapa)) return json({ error: `etapa inválida: ${etapa}` }, 400)
      const documentos = await listDocumentos({ tipo, etapa })
      return json({ documentos })
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      const status = (err as { status?: number }).status ?? 400
      return json({ error: msg }, status)
    }
  }

  // Pública: descarga archivo de documento
  const documentoArchivoMatch =
    method === 'GET' ? matchPath(pathname, '/api/documentos/:id/archivo') : null
  if (documentoArchivoMatch) {
    const errId = requireUuidParam(documentoArchivoMatch.id)
    if (errId) return errId
    const doc = await getDocumento(documentoArchivoMatch.id)
    if (!doc) return json({ error: 'Documento no encontrado' }, 404)
    const ruta = isAbsolute(doc.ruta_local) ? doc.ruta_local : join(UPLOAD_DIR, doc.ruta_local)
    if (!ruta.startsWith(UPLOAD_DIR) && !ruta.startsWith(BRANDING_DIR)) {
      return json({ error: 'Acceso a archivo no autorizado' }, 403)
    }
    let file: Buffer
    try {
      file = await readFile(ruta)
    } catch {
      return json({ error: 'Archivo en disco no disponible' }, 404)
    }
    const isDownload = url.searchParams.get('download') === '1'
    const ext = getExtension(doc.nombre_original || doc.ruta_local)
    const mime = canonicalMimeFor(ext) ?? 'application/octet-stream'
    const disposition = isDownload || !shouldServeInline(ext) ? 'attachment' : 'inline'
    return new Response(new Uint8Array(file), {
      headers: {
        'content-type': mime,
        'content-disposition': contentDispositionHeader(disposition, doc.nombre_original),
        'x-content-type-options': 'nosniff',
        'content-security-policy': "default-src 'none'; sandbox; frame-ancestors 'none'",
        'cross-origin-resource-policy': 'same-origin',
      },
    })
  }

  // ── Portal POETDUM — Indicadores (público) ───────────────────────────
  if (method === 'GET' && pathname === '/api/indicadores') {
    const indicadores = await listIndicadores()
    return json({ indicadores })
  }

  // ── Portal POETDUM — Actividades (admin escritura) ───────────────────
  if (method === 'POST' && pathname === '/api/actividades') {
    const authError = requireAdmin()
    if (authError) return authError
    if (bodyTooLarge(request, 21 * 1024 * 1024))
      return json({ error: 'Cuerpo demasiado grande' }, 413)
    const form = await request.formData()
    const titulo = String(form.get('titulo') ?? '').trim()
    const fecha = String(form.get('fecha') ?? '').trim()
    if (!titulo || !fecha) return json({ error: 'Faltan datos: titulo, fecha' }, 400)
    const estadoRaw = String(form.get('estado') ?? 'proxima').trim()
    if (estadoRaw && !['proxima', 'realizada', 'cancelada'].includes(estadoRaw)) {
      return json({ error: `estado inválido: ${estadoRaw}` }, 400)
    }
    const documentoIds = form
      .getAll('documentos')
      .map((v) => String(v).trim())
      .filter(Boolean)
    for (const did of documentoIds) {
      const err = requireUuidParam(did)
      if (err) return json({ error: `documento id inválido: ${did}` }, 400)
    }
    // Fotos: validar y escribir a disco (con rollback)
    const rawFotos = form.getAll('fotos').filter((e): e is File => e instanceof File && e.size > 0)
    const escritos: string[] = []
    const fotosParaDb: Array<{
      nombreOriginal: string
      mime: string
      size: number
      rutaLocal: string
    }> = []
    let persistido = false
    try {
      for (const file of rawFotos) {
        const v = validarAdjunto({ size: file.size, name: file.name }, rawFotos.length)
        if (!v.ok) return json({ error: v.reason }, v.codigo ?? 400)
        const buf = Buffer.from(await file.arrayBuffer())
        const verdict = validateUpload({ filename: file.name, buffer: buf })
        if (!verdict.ok)
          return json(
            { error: `Archivo rechazado (${sanitizarNombre(file.name)}): ${verdict.reason}` },
            415,
          )
        const { mkdir, writeFile } = await import('node:fs/promises')
        await mkdir(UPLOAD_DIR, { recursive: true })
        const disco = nombreEnDisco(file.name)
        const ruta = join(UPLOAD_DIR, disco)
        await writeFile(ruta, buf)
        escritos.push(ruta)
        fotosParaDb.push({
          nombreOriginal: sanitizarNombre(file.name),
          mime: verdict.safeMime!,
          size: file.size,
          rutaLocal: ruta,
        })
      }
      const result = await sql.begin(async (tx) => {
        return createActividad(
          tx,
          {
            titulo,
            fecha,
            hora_inicio: String(form.get('hora_inicio') ?? ''),
            hora_fin: String(form.get('hora_fin') ?? ''),
            lugar: String(form.get('lugar') ?? ''),
            descripcion: String(form.get('descripcion') ?? ''),
            estado: estadoRaw || 'proxima',
            resultados: String(form.get('resultados') ?? ''),
            creadoPor: user?.id,
          },
          fotosParaDb,
          documentoIds,
        )
      })
      persistido = true
      return json({ ok: true, id: result.id }, 201)
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      const status = (err as { status?: number }).status ?? 500
      if (status >= 400 && status < 500) return json({ error: msg }, status)
      throw err
    } finally {
      if (!persistido) await Promise.allSettled(escritos.map((p) => rm(p, { force: true })))
    }
  }

  const actividadPutMatch = method === 'PUT' ? matchPath(pathname, '/api/actividades/:id') : null
  if (actividadPutMatch) {
    const authError = requireAdmin()
    if (authError) return authError
    const err = requireUuidParam(actividadPutMatch.id)
    if (err) return err
    const contentType = request.headers.get('content-type') ?? ''
    let input: Record<string, string> = {}
    let fotosParaDb:
      Array<{ nombreOriginal: string; mime: string; size: number; rutaLocal: string }> | undefined
    let documentoIds: string[] | undefined
    const escritos: string[] = []
    let persistido = false
    try {
      if (contentType.includes('multipart/form-data')) {
        const form = await request.formData()
        for (const k of [
          'titulo',
          'fecha',
          'hora_inicio',
          'hora_fin',
          'lugar',
          'descripcion',
          'estado',
          'resultados',
        ]) {
          const v = form.get(k)
          if (v !== null) input[k] = String(v)
        }
        const docs = form.getAll('documentos')
        if (docs.length > 0) documentoIds = docs.map((v) => String(v).trim()).filter(Boolean)
        const rawFotos = form
          .getAll('fotos')
          .filter((e): e is File => e instanceof File && e.size > 0)
        if (rawFotos.length > 0) {
          fotosParaDb = []
          for (const file of rawFotos) {
            const v = validarAdjunto({ size: file.size, name: file.name }, rawFotos.length)
            if (!v.ok) return json({ error: v.reason }, v.codigo ?? 400)
            const buf = Buffer.from(await file.arrayBuffer())
            const verdict = validateUpload({ filename: file.name, buffer: buf })
            if (!verdict.ok)
              return json(
                { error: `Archivo rechazado (${sanitizarNombre(file.name)}): ${verdict.reason}` },
                415,
              )
            const { mkdir, writeFile } = await import('node:fs/promises')
            await mkdir(UPLOAD_DIR, { recursive: true })
            const disco = nombreEnDisco(file.name)
            const ruta = join(UPLOAD_DIR, disco)
            await writeFile(ruta, buf)
            escritos.push(ruta)
            fotosParaDb.push({
              nombreOriginal: sanitizarNombre(file.name),
              mime: verdict.safeMime!,
              size: file.size,
              rutaLocal: ruta,
            })
          }
        }
      } else {
        input = (await request.json().catch(() => ({}))) as Record<string, string>
      }
      if (input.estado && !['proxima', 'realizada', 'cancelada'].includes(input.estado)) {
        return json({ error: `estado inválido: ${input.estado}` }, 400)
      }
      if (documentoIds) {
        for (const did of documentoIds) {
          const e = requireUuidParam(did)
          if (e) return json({ error: `documento id inválido: ${did}` }, 400)
        }
      }
      const ok = await updateActividad(actividadPutMatch.id, input, fotosParaDb, documentoIds)
      if (!ok) return json({ error: 'No encontrado' }, 404)
      persistido = true
      return json({ ok: true })
    } finally {
      if (!persistido) await Promise.allSettled(escritos.map((p) => rm(p, { force: true })))
    }
  }

  const actividadDeleteMatch =
    method === 'DELETE' ? matchPath(pathname, '/api/actividades/:id') : null
  if (actividadDeleteMatch) {
    const authError = requireAdmin()
    if (authError) return authError
    const err = requireUuidParam(actividadDeleteMatch.id)
    if (err) return err
    if (!(await deleteActividad(actividadDeleteMatch.id)))
      return json({ error: 'No encontrado' }, 404)
    return json({ ok: true })
  }

  // ── Portal POETDUM — Documentos (admin escritura) ────────────────────
  if (method === 'POST' && pathname === '/api/documentos') {
    const authError = requireAdmin()
    if (authError) return authError
    if (bodyTooLarge(request, 21 * 1024 * 1024))
      return json({ error: 'Cuerpo demasiado grande' }, 413)
    const form = await request.formData()
    const titulo = String(form.get('titulo') ?? '').trim()
    const tipo = String(form.get('tipo') ?? '').trim()
    if (!titulo || !tipo) return json({ error: 'Faltan datos: titulo, tipo' }, 400)
    if (!isTipoDocumento(tipo)) return json({ error: `tipo inválido: ${tipo}` }, 400)
    const etapa = String(form.get('etapa') ?? 'En proceso').trim()
    if (etapa && !isEtapaDoc(etapa)) return json({ error: `etapa inválida: ${etapa}` }, 400)
    const raw = form.getAll('archivo').filter((e): e is File => e instanceof File && e.size > 0)
    // también acepta clave 'archivos' por compatibilidad
    const alt = form.getAll('archivos').filter((e): e is File => e instanceof File && e.size > 0)
    const files = raw.length > 0 ? raw : alt
    if (files.length === 0) return json({ error: 'Falta archivo' }, 400)
    const file = files[0]
    const lim = validarAdjunto({ size: file.size, name: file.name }, 1)
    if (!lim.ok) return json({ error: lim.reason }, lim.codigo ?? 400)
    const buf = Buffer.from(await file.arrayBuffer())
    const verdict = validateUpload({ filename: file.name, buffer: buf })
    if (!verdict.ok)
      return json(
        { error: `Archivo rechazado (${sanitizarNombre(file.name)}): ${verdict.reason}` },
        415,
      )
    const { mkdir, writeFile } = await import('node:fs/promises')
    await mkdir(UPLOAD_DIR, { recursive: true })
    const disco = nombreEnDisco(file.name)
    const ruta = join(UPLOAD_DIR, disco)
    await writeFile(ruta, buf)
    let persistido = false
    try {
      const result = await sql.begin(async (tx) => {
        return createDocumento(
          tx,
          {
            titulo,
            tipo,
            etapa: etapa || 'En proceso',
            fecha: String(form.get('fecha') ?? '') || null,
            descripcion: String(form.get('descripcion') ?? ''),
            creadoPor: user?.id,
          },
          {
            nombreOriginal: sanitizarNombre(file.name),
            mime: verdict.safeMime!,
            size: file.size,
            rutaLocal: ruta,
          },
        )
      })
      persistido = true
      return json({ ok: true, id: result.id }, 201)
    } finally {
      if (!persistido) await rm(ruta, { force: true }).catch(() => {})
    }
  }

  const documentoPutMatch = method === 'PUT' ? matchPath(pathname, '/api/documentos/:id') : null
  if (documentoPutMatch) {
    const authError = requireAdmin()
    if (authError) return authError
    const err = requireUuidParam(documentoPutMatch.id)
    if (err) return err
    const contentType = request.headers.get('content-type') ?? ''
    let input: Record<string, string> = {}
    let archivo:
      { nombreOriginal: string; mime: string; size: number; rutaLocal: string } | undefined
    const escritos: string[] = []
    let persistido = false
    try {
      if (contentType.includes('multipart/form-data')) {
        const form = await request.formData()
        for (const k of ['titulo', 'tipo', 'etapa', 'fecha', 'descripcion']) {
          const v = form.get(k)
          if (v !== null) input[k] = String(v)
        }
        const raw = [...form.getAll('archivo'), ...form.getAll('archivos')].filter(
          (e): e is File => e instanceof File && e.size > 0,
        )
        if (raw.length > 0) {
          const file = raw[0]
          const lim = validarAdjunto({ size: file.size, name: file.name }, 1)
          if (!lim.ok) return json({ error: lim.reason }, lim.codigo ?? 400)
          const buf = Buffer.from(await file.arrayBuffer())
          const verdict = validateUpload({ filename: file.name, buffer: buf })
          if (!verdict.ok)
            return json(
              { error: `Archivo rechazado (${sanitizarNombre(file.name)}): ${verdict.reason}` },
              415,
            )
          const { mkdir, writeFile } = await import('node:fs/promises')
          await mkdir(UPLOAD_DIR, { recursive: true })
          const disco = nombreEnDisco(file.name)
          const ruta = join(UPLOAD_DIR, disco)
          await writeFile(ruta, buf)
          escritos.push(ruta)
          archivo = {
            nombreOriginal: sanitizarNombre(file.name),
            mime: verdict.safeMime!,
            size: file.size,
            rutaLocal: ruta,
          }
        }
      } else {
        input = (await request.json().catch(() => ({}))) as Record<string, string>
      }
      if (input.tipo && !isTipoDocumento(input.tipo))
        return json({ error: `tipo inválido: ${input.tipo}` }, 400)
      if (input.etapa && !isEtapaDoc(input.etapa))
        return json({ error: `etapa inválida: ${input.etapa}` }, 400)
      // input.fecha puede ser '' → null
      const payload: Record<string, string | null> = { ...input }
      if (payload.fecha === '') payload.fecha = null as unknown as string
      const ok = await updateDocumento(documentoPutMatch.id, payload as never, archivo)
      if (!ok) {
        await Promise.allSettled(escritos.map((p) => rm(p, { force: true })))
        return json({ error: 'No encontrado' }, 404)
      }
      persistido = true
      return json({ ok: true })
    } finally {
      if (!persistido) await Promise.allSettled(escritos.map((p) => rm(p, { force: true })))
    }
  }

  const documentoDeleteMatch =
    method === 'DELETE' ? matchPath(pathname, '/api/documentos/:id') : null
  if (documentoDeleteMatch) {
    const authError = requireAdmin()
    if (authError) return authError
    const err = requireUuidParam(documentoDeleteMatch.id)
    if (err) return err
    if (!(await deleteDocumento(documentoDeleteMatch.id)))
      return json({ error: 'No encontrado' }, 404)
    return json({ ok: true })
  }

  // ── Portal POETDUM — Indicadores (admin escritura) ───────────────────
  if (method === 'POST' && pathname === '/api/indicadores') {
    const authError = requireAdmin()
    if (authError) return authError
    const body = (await request.json().catch(() => null)) as {
      nombre?: string
      descripcion?: string
      unidad?: string
      meta?: number | string | null
      fecha_evaluacion?: string
      resultado_texto?: string
      documento_respaldo_id?: string | null
      mediciones?: Array<{ periodo?: string; valor?: number | string }>
    } | null
    if (!body?.nombre) return json({ error: 'Falta nombre' }, 400)
    if (body.documento_respaldo_id) {
      const err = requireUuidParam(String(body.documento_respaldo_id))
      if (err) return json({ error: 'documento_respaldo_id inválido' }, 400)
    }
    const meds = (body.mediciones ?? []).map((m) => ({
      periodo: String(m.periodo ?? ''),
      valor: m.valor as number,
    }))
    const result = await sql.begin(async (tx) => {
      return createIndicador(
        tx,
        {
          nombre: body.nombre!,
          descripcion: body.descripcion,
          unidad: body.unidad,
          meta: body.meta ?? null,
          fecha_evaluacion: body.fecha_evaluacion,
          resultado_texto: body.resultado_texto,
          documento_respaldo_id: body.documento_respaldo_id ?? null,
          creadoPor: user?.id,
        },
        meds,
      )
    })
    return json({ ok: true, id: result.id }, 201)
  }

  const indicadorPutMatch = method === 'PUT' ? matchPath(pathname, '/api/indicadores/:id') : null
  if (indicadorPutMatch) {
    const authError = requireAdmin()
    if (authError) return authError
    const err = requireUuidParam(indicadorPutMatch.id)
    if (err) return err
    const body = (await request.json().catch(() => ({}))) as {
      nombre?: string
      descripcion?: string
      unidad?: string
      meta?: number | string | null
      fecha_evaluacion?: string
      resultado_texto?: string
      documento_respaldo_id?: string | null
      mediciones?: Array<{ periodo?: string; valor?: number | string }>
    }
    if (body.documento_respaldo_id) {
      const e = requireUuidParam(String(body.documento_respaldo_id))
      if (e) return json({ error: 'documento_respaldo_id inválido' }, 400)
    }
    const meds =
      body.mediciones !== undefined
        ? body.mediciones.map((m) => ({
            periodo: String(m.periodo ?? ''),
            valor: m.valor as number,
          }))
        : undefined
    const ok = await updateIndicador(
      indicadorPutMatch.id,
      {
        nombre: body.nombre,
        descripcion: body.descripcion,
        unidad: body.unidad,
        meta: body.meta,
        fecha_evaluacion: body.fecha_evaluacion,
        resultado_texto: body.resultado_texto,
        documento_respaldo_id: body.documento_respaldo_id,
      },
      meds,
    )
    if (!ok) return json({ error: 'No encontrado' }, 404)
    return json({ ok: true })
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
