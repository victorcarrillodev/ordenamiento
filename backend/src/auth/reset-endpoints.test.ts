/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, expect, it, spyOn, beforeEach, afterEach } from 'bun:test'

import { handleRequest } from '../app.ts'
import * as mail from '../services/mail.ts'
import * as pool from '../db/pool.ts'
import * as auth from './auth.ts'
import { createSessionToken } from './auth.ts'
import * as reset from './password-reset.ts'

/**
 * Contrato HTTP de /api/auth/forgot-password y /api/auth/reset-password.
 * La lógica del token se prueba en password-reset.test.ts; aquí interesa lo
 * que ve el mundo exterior: mismos cuerpos, mismos status, nada que revele si
 * un correo está registrado.
 */

const USUARIO = { id: 'u1', name: 'Ana', email: 'ana@tlaquepaque.gob.mx' }

function req(path: string, method = 'GET', body?: unknown) {
  return new Request(`http://localhost${path}`, {
    method,
    headers: { 'content-type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  })
}

/** Correo distinto en cada test: el limitador por correo es estado global. */
function correoUnico() {
  return `u${Math.random().toString(36).slice(2)}@ejemplo.com`
}

let crearSpy: any
let restablecerSpy: any
let validoSpy: any
let mailSpy: any

beforeEach(() => {
  process.env.SMTP_HOST = 'smtp.example.com'
  crearSpy = spyOn(reset as any, 'crearSolicitudRecuperacion')
  restablecerSpy = spyOn(reset as any, 'restablecerConToken')
  validoSpy = spyOn(reset as any, 'tokenRecuperacionValido')
  mailSpy = spyOn(mail as any, 'enviarCorreoRecuperacion').mockResolvedValue({ enviado: true })
})

afterEach(() => {
  crearSpy.mockRestore()
  restablecerSpy.mockRestore()
  validoSpy.mockRestore()
  mailSpy.mockRestore()
  delete process.env.SMTP_HOST
})

describe('POST /api/auth/forgot-password', () => {
  it('responde igual exista o no la cuenta', async () => {
    crearSpy.mockResolvedValue({ token: 'tok', usuario: USUARIO, expiraEn: new Date() })
    const conCuenta = await handleRequest(
      req('/api/auth/forgot-password', 'POST', { email: correoUnico() }),
    )
    const cuerpoConCuenta = await conCuenta.text()

    crearSpy.mockResolvedValue(null)
    const sinCuenta = await handleRequest(
      req('/api/auth/forgot-password', 'POST', { email: correoUnico() }),
    )
    const cuerpoSinCuenta = await sinCuenta.text()

    expect(conCuenta.status).toBe(sinCuenta.status)
    expect(cuerpoConCuenta).toBe(cuerpoSinCuenta)
  })

  it('no envía correo si la cuenta no existe', async () => {
    crearSpy.mockResolvedValue(null)
    await handleRequest(req('/api/auth/forgot-password', 'POST', { email: correoUnico() }))
    expect(mailSpy).not.toHaveBeenCalled()
  })

  it('envía el enlace construido sobre APP_PUBLIC_URL, no sobre el Host de la petición', async () => {
    crearSpy.mockResolvedValue({ token: 'tok-123', usuario: USUARIO, expiraEn: new Date() })

    const peticion = new Request('http://atacante.example/api/auth/forgot-password', {
      method: 'POST',
      headers: { 'content-type': 'application/json', host: 'atacante.example' },
      body: JSON.stringify({ email: correoUnico() }),
    })
    await handleRequest(peticion)

    expect(mailSpy).toHaveBeenCalled()
    const url = mailSpy.mock.calls[0][0].url as string
    expect(url).not.toContain('atacante.example')
    expect(url).toContain('/restablecer?token=tok-123')
  })

  it('rechaza un correo mal formado sin consultar nada', async () => {
    const res = await handleRequest(req('/api/auth/forgot-password', 'POST', { email: 'roto' }))
    expect(res.status).toBe(400)
    expect(crearSpy).not.toHaveBeenCalled()
  })

  it('avisa con 503 si el servidor no tiene SMTP configurado', async () => {
    delete process.env.SMTP_HOST
    const res = await handleRequest(
      req('/api/auth/forgot-password', 'POST', { email: correoUnico() }),
    )
    expect(res.status).toBe(503)
    // Se comprueba ANTES de buscar la cuenta: no puede filtrar si existe.
    expect(crearSpy).not.toHaveBeenCalled()
  })

  it('corta con 429 tras varias solicitudes al mismo correo', async () => {
    crearSpy.mockResolvedValue(null)
    const email = correoUnico()
    const status: number[] = []
    for (let i = 0; i < 5; i++) {
      status.push((await handleRequest(req('/api/auth/forgot-password', 'POST', { email }))).status)
    }
    expect(status.slice(0, 3)).toEqual([200, 200, 200])
    expect(status[3]).toBe(429)
    expect(status[4]).toBe(429)
  })
})

describe('POST /api/auth/reset-password', () => {
  it('no abre sesión al restablecer: sin set-cookie', async () => {
    restablecerSpy.mockResolvedValue({ ok: true, usuario: USUARIO })
    const res = await handleRequest(
      req('/api/auth/reset-password', 'POST', {
        token: 'a'.repeat(43),
        password: 'contrasena-larga',
      }),
    )
    expect(res.status).toBe(200)
    expect(res.headers.get('set-cookie')).toBeNull()
  })

  it('devuelve 410 cuando el enlace ya no sirve', async () => {
    restablecerSpy.mockResolvedValue({ ok: false, motivo: 'expirado' })
    const res = await handleRequest(
      req('/api/auth/reset-password', 'POST', {
        token: 'b'.repeat(43),
        password: 'contrasena-larga',
      }),
    )
    expect(res.status).toBe(410)
  })

  it('devuelve 422 con una contraseña demasiado corta', async () => {
    restablecerSpy.mockResolvedValue({ ok: false, motivo: 'password_corta' })
    const res = await handleRequest(
      req('/api/auth/reset-password', 'POST', { token: 'c'.repeat(43), password: 'corta' }),
    )
    expect(res.status).toBe(422)
  })

  it('sin token responde 400 sin tocar el servicio', async () => {
    const res = await handleRequest(
      req('/api/auth/reset-password', 'POST', { password: 'x'.repeat(12) }),
    )
    expect(res.status).toBe(400)
    expect(restablecerSpy).not.toHaveBeenCalled()
  })

  it('no requiere sesión: es el flujo de quien no puede entrar', async () => {
    validoSpy.mockResolvedValue({ valido: true, usuario: USUARIO })
    const res = await handleRequest(
      new Request('http://localhost/api/auth/reset-password?token=' + 'd'.repeat(43)),
    )
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ valido: true, usuario: USUARIO })
  })

  it('devuelve 410 al comprobar un enlace muerto', async () => {
    validoSpy.mockResolvedValue({ valido: false, motivo: 'invalido' })
    const res = await handleRequest(
      new Request('http://localhost/api/auth/reset-password?token=' + 'e'.repeat(43)),
    )
    expect(res.status).toBe(410)
  })
})

describe('Corte de sesiones al cambiar la contraseña', () => {
  const UID = '550e8400-e29b-41d4-a716-446655440077'

  /** Petición autenticada con `token` en la cookie de sesión. */
  function conSesion(token: string) {
    return new Request('http://localhost/api/auth/me', {
      headers: { cookie: `ordenamiento_session=${encodeURIComponent(token)}` },
    })
  }

  let getUserSpy: any

  afterEach(() => {
    getUserSpy?.mockRestore()
  })

  it('acepta la sesión de una cuenta que nunca restableció (corte 0)', async () => {
    getUserSpy = spyOn(auth as any, 'getUserById').mockResolvedValue({
      id: UID,
      name: 'Ana',
      email: USUARIO.email,
      role: 'admin',
      sessionsValidFrom: 0,
    })

    const res = await handleRequest(conSesion(await createSessionToken(UID)))

    expect(((await res.json()) as any).user?.id).toBe(UID)
  })

  it('rechaza una sesión anterior al último cambio de contraseña', async () => {
    // La cuenta restableció "ahora"; la cookie se firmó hace una hora.
    getUserSpy = spyOn(auth as any, 'getUserById').mockResolvedValue({
      id: UID,
      name: 'Ana',
      email: USUARIO.email,
      role: 'admin',
      sessionsValidFrom: Date.now(),
    })

    const realNow = Date.now
    let tokenViejo: string
    try {
      Date.now = () => realNow() - 60 * 60 * 1000
      tokenViejo = await createSessionToken(UID)
    } finally {
      Date.now = realNow
    }

    const res = await handleRequest(conSesion(tokenViejo))

    expect(((await res.json()) as any).user).toBeNull()
  })

  it('acepta la sesión creada después del cambio', async () => {
    getUserSpy = spyOn(auth as any, 'getUserById').mockResolvedValue({
      id: UID,
      name: 'Ana',
      email: USUARIO.email,
      role: 'admin',
      sessionsValidFrom: Date.now() - 60 * 60 * 1000,
    })

    const res = await handleRequest(conSesion(await createSessionToken(UID)))

    expect(((await res.json()) as any).user?.id).toBe(UID)
  })

  it('updateUserPassword sella el corte junto al nuevo hash', async () => {
    const consultas: Array<{ sql: string; valores: unknown[] }> = []
    const sqlSpy = spyOn(pool as any, 'sql').mockImplementation(
      async (strings: TemplateStringsArray, ...valores: unknown[]) => {
        consultas.push({ sql: strings.join('?'), valores })
        return [{ id: UID }]
      },
    )

    const antes = Date.now()
    await auth.updateUserPassword(UID, 'contrasena-larga')
    sqlSpy.mockRestore()

    const update = consultas.find((c) => c.sql.includes('sessions_valid_from'))
    expect(update).toBeDefined()
    const corte = update!.valores.find((v) => v instanceof Date) as Date
    expect(corte.getTime()).toBeGreaterThanOrEqual(antes)
  })
})

describe('No hay alta pública de cuentas', () => {
  it('POST /api/auth/register ya no existe', async () => {
    // Participar no requiere cuenta y las del panel las crea un administrador.
    // Un alta abierta dejaba a cualquiera llenar de cuentas el sistema, y cada
    // una cuesta un hash argon2id, que es caro a propósito.
    const res = await handleRequest(
      req('/api/auth/register', 'POST', {
        email: 'intruso@ejemplo.com',
        name: 'Intruso',
        password: 'contrasena-larga',
      }),
    )

    expect(res.status).toBe(404)
    expect(res.headers.get('set-cookie')).toBeNull()
  })

  it('tampoco acepta un rol enviado por el cliente', async () => {
    const res = await handleRequest(
      req('/api/auth/register', 'POST', {
        email: 'intruso@ejemplo.com',
        name: 'Intruso',
        password: 'contrasena-larga',
        role: 'admin',
      }),
    )

    expect(res.status).toBe(404)
  })
})

describe('Defensas contra abuso de los endpoints de contraseña', () => {
  /** Petición con un `content-length` declarado enorme. */
  function peticionGrande(path: string, bytes: number) {
    return new Request(`http://localhost${path}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'content-length': String(bytes) },
      body: JSON.stringify({ email: 'a@b.mx', password: 'x'.repeat(50) }),
    })
  }

  it('corta un cuerpo desmesurado antes de bufferizarlo', async () => {
    // Sin este tope, `request.json()` traga lo que llegue y, con una
    // contraseña de megabytes detrás, cada petición cuesta un hash argon2id.
    for (const ruta of [
      '/api/auth/login',
      '/api/auth/forgot-password',
      '/api/auth/reset-password',
      '/api/auth/confirm-email',
    ]) {
      const res = await handleRequest(peticionGrande(ruta, 5 * 1024 * 1024))
      expect(res.status, ruta).toBe(413)
    }
  })

  it('restablecer con una contraseña desmesurada no llega a hashearse', async () => {
    restablecerSpy.mockResolvedValue({ ok: false, motivo: 'password_corta' })
    const res = await handleRequest(
      req('/api/auth/reset-password', 'POST', {
        token: 'a'.repeat(43),
        password: 'x'.repeat(5000),
      }),
    )
    expect(res.status).toBe(422)
  })
})
