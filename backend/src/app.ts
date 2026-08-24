import { mkdir, writeFile, readFile } from 'node:fs/promises'
import { join, isAbsolute } from 'node:path'

import {
  clearSessionCookie,
  createSessionToken,
  getUserById,
  registerUser,
  sessionCookie,
  verifyCredentials,
  verifySessionToken,
  type SessionUser,
} from './auth/auth.ts'
import { seedRootAdmin, seedExtraAdmins } from './seed.ts'
import { seedDemoData } from './seed-demo.ts'
import { migrate } from './db/migrate.ts'
import { ingestParticipation } from './services/ingest.ts'
import { nextFolio } from './services/folio.ts'
import {
  createParticipation,
  deleteParticipation,
  getParticipation,
  listParticipations,
  updateEstado,
  type Estado,
  type Origen,
} from './services/participations.ts'
import { searchParticipations } from './services/search.ts'
import {
  ingestSkillKnowledge,
  searchSkillKnowledge,
} from './services/skill-knowledge.ts'
import { createReunion, deleteReunion, listReuniones } from './services/reuniones.ts'
import { listAvisos, createAviso, deleteAviso } from './services/avisos.ts'
import { listPoel, createPoelSesion, deletePoelSesion } from './services/poel.ts'
import { exportTableToXlsx, isExportable } from './services/export.ts'
import { participationDocx } from './services/word.ts'
import { enviarParticipacion, mailConfigurado } from './services/mail.ts'
import { sql } from './db/pool.ts'

const UPLOAD_DIR = join(process.cwd(), 'uploads')
const MAX_UPLOAD_BYTES = 850 * 1024 * 1024 // 850 MB (formulario)

function json(data: unknown, init?: number | ResponseInit): Response {
  if (typeof init === 'number') {
    return new Response(JSON.stringify(data), {
      status: init,
      headers: { 'content-type': 'application/json' },
    })
  }
  const headers: Record<string, string> = {
    'content-type': 'application/json',
    ...(init?.headers as Record<string, string> | undefined),
  }
  return new Response(JSON.stringify(data), { status: init?.status ?? 200, headers })
}

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

function safePositiveInt(v: string | null, fallback: number): number {
  const n = Number(v)
  return Number.isInteger(n) && n > 0 ? n : fallback
}

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
  if (method === 'POST' && pathname === '/api/auth/register') {
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
      const user = await registerUser({
        email: body.email,
        name: body.name,
        password: body.password,
        role: body.role ?? 'user',
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
    const user = await verifyCredentials(body.email, body.password)
    if (!user) return json({ error: 'Credenciales inválidas' }, 401)

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

  // Listado con filtros + paginación
  if (method === 'GET' && pathname === '/api/participations') {
    const authError = requireAuth()
    if (authError) return authError

    const origen = url.searchParams.get('origen')
    const estado = url.searchParams.get('estado')
    if (origen && !isOrigen(origen)) return json({ error: 'origen inválido' }, 400)
    if (estado && !isEstado(estado)) return json({ error: 'estado inválido' }, 400)

    const result = await listParticipations({
      origen: (origen as Origen | undefined) ?? undefined,
      estado: (estado as Estado | undefined) ?? undefined,
      folio: url.searchParams.get('folio') ?? undefined,
      nombre: url.searchParams.get('nombre') ?? undefined,
      colonia: url.searchParams.get('colonia') ?? undefined,
      desde: url.searchParams.get('desde') ?? undefined,
      hasta: url.searchParams.get('hasta') ?? undefined,
      q: url.searchParams.get('q') ?? undefined,
      page: safePositiveInt(url.searchParams.get('page'), 1),
      limit: safePositiveInt(url.searchParams.get('limit'), 10),
    })

    return json(result)
  }

  // Detalle
  const detailMatch = method === 'GET' ? matchPath(pathname, '/api/participations/:id') : null
  if (detailMatch) {
    const authError = requireAuth()
    if (authError) return authError
    const participation = await getParticipation(Number(detailMatch.id))
    if (!participation) return json({ error: 'No encontrado' }, 404)
    return json(participation)
  }

  // Crear participación: digital = público (ciudadano, sin sesión); física = admin
  if (method === 'POST' && pathname === '/api/participations') {
    const form = await request.formData()
    const origin = String(form.get('origen') ?? 'digital') as Origen
    if (!isOrigen(origin)) return json({ error: 'origen inválido' }, 400)

    // La física solo la crea un admin autenticado
    if (origin === 'fisica' && user?.role !== 'admin') {
      return json({ error: 'Requiere rol admin' }, 403)
    }

    const folio = await nextFolio()

    const created = await createParticipation(
      {
        folio,
        origen: origin,
        nombre: String(form.get('nombre') ?? ''),
        correo: String(form.get('correo') ?? ''),
        calle: String(form.get('calle') ?? ''),
        numero: String(form.get('numero') ?? ''),
        colonia: String(form.get('colonia') ?? ''),
        municipio: String(form.get('municipio') ?? ''),
        institucion: String(form.get('institucion') ?? ''),
        ocupacion: String(form.get('ocupacion') ?? ''),
        latitud: String(form.get('latitud') ?? ''),
        longitud: String(form.get('longitud') ?? ''),
        observacion: String(form.get('observacion') ?? ''),
        creadoPor: user?.id,
      },
      folio,
    )

    // Véctorizar adjunto + campos
    let pdfBuffer: Buffer | undefined
    let pdfMeta: { nombreOriginal: string; mime: string; rutaLocal: string } | undefined
    const file = form.get('pdf') as unknown as File | null
    if (file && file.size > 0 && file instanceof File) {
      if (file.size > MAX_UPLOAD_BYTES) {
        return json({ error: 'Archivo demasiado grande (máx 850 MB)' }, 413)
      }
      await mkdir(UPLOAD_DIR, { recursive: true })
      const safeName = `${Date.now()}-${String(file.name).replace(/[^a-z0-9_.-]/gi, '_')}`
      const dest = join(UPLOAD_DIR, safeName)
      pdfBuffer = Buffer.from(await file.arrayBuffer())
      await writeFile(dest, pdfBuffer)
      pdfMeta = {
        nombreOriginal: String(file.name),
        mime: file.type || 'application/octet-stream',
        rutaLocal: dest,
      }
    }

    const ingest = await ingestParticipation(
      created.participationId,
      {
        nombre: String(form.get('nombre') ?? ''),
        correo: String(form.get('correo') ?? ''),
        colonia: String(form.get('colonia') ?? ''),
        municipio: String(form.get('municipio') ?? ''),
        institucion: String(form.get('institucion') ?? ''),
        ocupacion: String(form.get('ocupacion') ?? ''),
        observacion: String(form.get('observacion') ?? ''),
        folio,
      },
      pdfBuffer,
      pdfMeta,
    )

    return json({ id: created.participationId, folio: created.folio, ...ingest }, 201)
  }

  // Cambiar estado
  const estadoMatch =
    method === 'PATCH' ? matchPath(pathname, '/api/participations/:id/estado') : null
  if (estadoMatch) {
    const authError = requireAdmin()
    if (authError) return authError
    const body = (await request.json()) as { estado?: string }
    if (!body.estado || !isEstado(body.estado)) return json({ error: 'estado inválido' }, 400)
    if (!(await updateEstado(Number(estadoMatch.id), body.estado))) {
      return json({ error: 'No encontrado' }, 404)
    }
    return json({ ok: true })
  }

  // Eliminar
  const deleteMatch = method === 'DELETE' ? matchPath(pathname, '/api/participations/:id') : null
  if (deleteMatch) {
    const authError = requireAdmin()
    if (authError) return authError
    if (!(await deleteParticipation(Number(deleteMatch.id)))) {
      return json({ error: 'No encontrado' }, 404)
    }
    return json({ ok: true })
  }

  // Ver / descargar adjunto
  const attachMatch =
    method === 'GET' ? matchPath(pathname, '/api/participations/:id/attachments/:aid') : null
  if (attachMatch) {
    const authError = requireAuth()
    if (authError) return authError
    const rows = await sql<
      Array<{ ruta_local: string; nombre_original: string; mime: string }>
    >`--sql
      SELECT ruta_local, nombre_original, mime
      FROM attachments
      WHERE id = ${Number(attachMatch.aid)} AND participation_id = ${Number(attachMatch.id)}
    `
    if (rows.length === 0) return json({ error: 'Archivo no encontrado' }, 404)
    // Resuelve rutas relativas contra UPLOAD_DIR (datos viejos la guardaron relativa)
    const ruta = isAbsolute(rows[0].ruta_local)
      ? rows[0].ruta_local
      : join(UPLOAD_DIR, rows[0].ruta_local)
    let file: Buffer
    try {
      file = await readFile(ruta)
    } catch (err) {
      return json({ error: 'Archivo en disco no disponible' }, 404)
    }
    const isDownload = url.searchParams.get('download') === '1'
    return new Response(new Uint8Array(file), {
      headers: {
        'content-type': rows[0].mime,
        'content-disposition': `${isDownload ? 'attachment' : 'inline'}; filename="${rows[0].nombre_original}"`,
      },
    })
  }

  // Descargar Word (.docx) con los datos — autenticado
  const wordMatch = method === 'GET' ? matchPath(pathname, '/api/participations/:id/word') : null
  if (wordMatch) {
    const authError = requireAuth()
    if (authError) return authError
    const rows = await sql<Array<{
      id: number; folio: string; origen: string; nombre: string; correo: string
      calle: string; numero: string; colonia: string; municipio: string
      institucion: string; ocupacion: string; latitud: string; longitud: string
      observacion: string; estado: string; fuente: string; genero: string
      tematica: string; created_at: Date
    }>>`
      SELECT id, folio, origen, nombre, correo, calle, numero, colonia, municipio,
             institucion, ocupacion, latitud, longitud, observacion, estado,
             fuente, genero, tematica, created_at
      FROM participations WHERE id = ${Number(wordMatch.id)}
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
    const authError = requireAuth()
    if (authError) return authError
    const body = (await request.json()) as { id?: number; para?: string }
    if (!body.id || !body.para) return json({ error: 'Faltan datos: id, para' }, 400)
    if (!mailConfigurado()) {
      return json({ error: 'Correo no configurado: define SMTP_HOST, SMTP_USER y SMTP_PASS' }, 503)
    }
    try {
      const r = await enviarParticipacion(Number(body.id), body.para)
      return json({ ok: true, ...r })
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      if (msg === 'NO_ENCONTRADA') return json({ error: 'Participación no encontrada' }, 404)
      return json({ error: `No se pudo enviar: ${msg}` }, 502)
    }
  }

  // Búsqueda híbrida
  if (method === 'GET' && pathname === '/api/search') {
    const authError = requireAuth()
    if (authError) return authError
    const q = url.searchParams.get('q') ?? ''
    if (!q) return json({ error: 'Faltan datos: q' }, 400)
    const results = await searchParticipations(q, 10, {
      origen: url.searchParams.get('origen') ?? undefined,
      estado: url.searchParams.get('estado') ?? undefined,
    })
    return json({ query: q, results })
  }

  // Ingesta de conocimiento (RAG skill_knowledge) — solo admin
  if (method === 'POST' && pathname === '/api/knowledge') {
    const authError = requireAdmin()
    if (authError) return authError
    const body = (await request.json()) as { title?: string; kind?: string; content?: string }
    if (!body.title || !body.content) {
      return json({ error: 'Faltan datos: title, content' }, 400)
    }
    const chunks = await ingestSkillKnowledge(body.title, body.kind ?? 'general', body.content)
    return json({ ok: true, chunks }, 201)
  }

  // Búsqueda semántica de conocimiento — autenticado
  if (method === 'GET' && pathname === '/api/knowledge/search') {
    const authError = requireAuth()
    if (authError) return authError
    const q = url.searchParams.get('q') ?? ''
    if (!q) return json({ error: 'Faltan datos: q' }, 400)
    const results = await searchSkillKnowledge(q, {
      kind: url.searchParams.get('kind') ?? undefined,
      limit: safePositiveInt(url.searchParams.get('limit'), 10),
    })
    return json({ query: q, results })
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

  const reunionDeleteMatch =
    method === 'DELETE' ? matchPath(pathname, '/api/reuniones/:id') : null
  if (reunionDeleteMatch) {
    const authError = requireAdmin()
    if (authError) return authError
    if (!(await deleteReunion(Number(reunionDeleteMatch.id)))) {
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
    const users = await sql<Array<{ id: number; email: string; name: string; role: string; created_at: string }>>`
      SELECT id, email, name, role, created_at::text AS created_at FROM users ORDER BY id
    `
    return json({ users })
  }

  if (method === 'POST' && pathname === '/api/users') {
    const authError = requireAdmin()
    if (authError) return authError
    const body = (await request.json()) as { email?: string; name?: string; password?: string; role?: 'admin' | 'user' }
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

  // ── Stats para el dashboard — autenticado ───────────────────────────
  if (method === 'GET' && pathname === '/api/stats') {
    const authError = requireAuth()
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
    const tu: Array<[string, number]> = fuente
      .filter((r) => r.k)
      .map((r) => [r.k, Number(r.n)])
    const tg: Array<[string, number]> = genero
      .filter((r) => r.k)
      .map((r) => [r.k, Number(r.n)])
    const tt: Array<[string, number]> = tematica
      .filter((r) => r.k)
      .map((r) => [r.k, Number(r.n)])
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
    const aviso = await createAviso({ titulo: body.titulo, descripcion: body.descripcion, creadoPor: user?.id })
    return json({ ok: true, aviso }, 201)
  }

  const avisoDeleteMatch = method === 'DELETE' ? matchPath(pathname, '/api/avisos/:id') : null
  if (avisoDeleteMatch) {
    const authError = requireAdmin()
    if (authError) return authError
    if (!(await deleteAviso(Number(avisoDeleteMatch.id)))) return json({ error: 'No encontrado' }, 404)
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
      categoria?: string; orden?: number; titulo?: string
      descripcion?: string; fecha?: string; ubicacion?: string
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
    if (!(await deletePoelSesion(Number(poelDeleteMatch.id)))) return json({ error: 'No encontrado' }, 404)
    return json({ ok: true })
  }

  return json({ error: 'No encontrado' }, 404)
}

export async function init(): Promise<void> {
  await migrate()
  await seedRootAdmin()
  await seedExtraAdmins()
  await seedDemoData()
  console.log('[server] listo para recibir requests')
}
