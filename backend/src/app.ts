import { readFile } from 'node:fs/promises'
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
  verifyCredentials,
  verifySessionToken,
  type SessionUser,
} from './auth/auth.ts'
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
import { createReunion, deleteReunion, listReuniones } from './services/reuniones.ts'
import { listAvisos, createAviso, deleteAviso } from './services/avisos.ts'
import { listPoel, createPoelSesion, deletePoelSesion } from './services/poel.ts'
import { exportTableToXlsx, isExportable } from './services/export.ts'
import { participationDocx } from './services/word.ts'
import {
  enviarParticipacion,
  enviarResolucionParticipacion,
  enviarAviso,
  enviarCorreoPrueba,
  mailConfigurado,
} from './services/mail.ts'
import {
  getCustomizations,
  saveCustomizations,
  listAuditLogs,
  restoreAuditSnapshot,
  saveUploadedBrandingImage,
  DEFAULT_THEME_CONFIG,
} from './services/customizations.ts'
import { sql } from './db/pool.ts'
import { json, bodyTooLarge, rateLimit, logger } from './utils.ts'

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

async function currentUser(request: Request): Promise<SessionUser | null> {
  const token = readCookie(request.headers.get('cookie'), 'ordenamiento_session')
  if (!token) return null
  const userId = await verifySessionToken(token)
  if (!userId) return null
  return getUserById(userId)
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
    return json(
      { user: { id: user.id, name: user.name, role: user.role } },
      { headers: { 'set-cookie': sessionCookie(token) } },
    )
  }

  if (method === 'POST' && pathname === '/api/auth/logout') {
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
    if (/[\r\n]/.test(String(body.para)) || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(body.para).trim()) || /[<>]/.test(String(body.para))) {
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
    if (/[\r\n]/.test(String(body.para)) || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(body.para).trim()) || /[<>]/.test(String(body.para))) {
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
    if (/[\r\n]/.test(destino) || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(destino) || /[<>]/.test(destino)) {
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
    const [users, digital, fisica, estados, fuente, genero, tematica] = await Promise.all([
      sql<{ n: string }[]>`SELECT count(*)::text AS n FROM users`,
      sql<{ n: string }[]>`SELECT count(*)::text AS n FROM participations WHERE origen = 'digital'`,
      sql<{ n: string }[]>`SELECT count(*)::text AS n FROM participations WHERE origen = 'fisica'`,
      sql<{ estado: string; n: string }[]>`
        SELECT estado, count(*)::text AS n FROM participations GROUP BY estado
      `,
      sql<{ k: string; n: string }[]>`
        SELECT fuente AS k, count(*)::text AS n FROM participations GROUP BY fuente ORDER BY count(*) DESC
      `,
      sql<{ k: string; n: string }[]>`
        SELECT genero AS k, count(*)::text AS n FROM participations GROUP BY genero ORDER BY count(*) DESC
      `,
      sql<{ k: string; n: string }[]>`
        SELECT tematica AS k, count(*)::text AS n FROM participations GROUP BY tematica ORDER BY count(*) DESC
      `,
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
    if (!(await deleteAviso(avisoDeleteMatch.id)))
      return json({ error: 'No encontrado' }, 404)
    return json({ ok: true })
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
    }
    if (!body.titulo) return json({ error: 'Falta titulo' }, 400)
    const sesion = await createPoelSesion({
      categoria: body.categoria ?? '',
      orden: body.orden ?? 0,
      titulo: body.titulo,
      descripcion: body.descripcion,
      fecha: body.fecha || null,
      ubicacion: body.ubicacion ?? '',
    })
    return json({ ok: true, sesion }, 201)
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
