import { mkdir, writeFile, readFile } from 'node:fs/promises'
import { join } from 'node:path'

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
    const file = await readFile(rows[0].ruta_local)
    return new Response(new Uint8Array(file), {
      headers: {
        'content-type': rows[0].mime,
        'content-disposition': `inline; filename="${rows[0].nombre_original}"`,
      },
    })
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

  return json({ error: 'No encontrado' }, 404)
}

export async function init(): Promise<void> {
  await migrate()
  console.log('[server] listo para recibir requests')
}
