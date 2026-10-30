/* eslint-disable @typescript-eslint/no-explicit-any */
import { afterEach, beforeEach, describe, expect, it, spyOn } from 'bun:test'

import { handleRequest } from './app.ts'
import * as auth from './auth/auth.ts'
import * as configuracion from './auth/configuracion-cuenta.ts'
import * as avatar from './services/avatar.ts'
import * as mail from './services/mail.ts'
import * as sesiones from './services/sesiones.ts'
import * as users from './services/users.ts'

/**
 * Alta de cuentas por un root y primer acceso de la persona.
 *
 * Lo que se cuida aquí: solo el root da de alta; la contraseña provisional no
 * viaja en el correo; una cuenta por configurar no abre sesión ni con la
 * contraseña provisional; y el panel de configuración solo cambia algo cuando
 * todo lo que se mandó es válido.
 */
const ROOT = {
  id: '550e8400-e29b-41d4-a716-446655440001',
  name: 'Dueña del Sistema',
  role: 'root',
  email: 'root@x.mx',
}
const ADMIN = {
  id: '550e8400-e29b-41d4-a716-446655440002',
  name: 'Admin',
  role: 'admin',
  email: 'admin@x.mx',
}
const NUEVA_ID = '550e8400-e29b-41d4-a716-4466554400cc'
const TOKEN = 'T'.repeat(43)

const ALTA = {
  email: 'Nueva.Persona@Tlaquepaque.gob.mx',
  name: '  Nueva   Persona ',
  password: 'provisional-2026',
  role: 'admin',
}

function req(path: string, method = 'GET', body?: unknown) {
  return new Request(`http://localhost${path}`, {
    method,
    headers: { cookie: 'ordenamiento_session=token', 'content-type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  })
}

let spies: Array<{ mockRestore: () => void }> = []
let quien: typeof ROOT | null = ROOT

let registrar: any
let enlace: any
let correo: any
let smtp: any

beforeEach(() => {
  quien = ROOT
  spies = []
  const guardar = <T extends { mockRestore: () => void }>(s: T): T => {
    spies.push(s)
    return s
  }
  guardar(spyOn(auth as any, 'verifySessionToken').mockImplementation(async () => ROOT.id))
  guardar(spyOn(auth as any, 'getUserById').mockImplementation(async () => quien as any))
  registrar = guardar(
    spyOn(auth as any, 'registerUser').mockImplementation(async () => ({ id: NUEVA_ID })),
  )
  enlace = guardar(
    spyOn(configuracion as any, 'emitirEnlaceDeConfiguracion').mockImplementation(async () => ({
      token: TOKEN,
      expiraEn: new Date(),
    })),
  )
  correo = guardar(
    spyOn(mail as any, 'enviarCorreoBienvenida').mockImplementation(async () => ({
      enviado: true,
    })),
  )
  smtp = guardar(spyOn(mail as any, 'mailConfigurado').mockImplementation(() => true))
})

afterEach(() => spies.forEach((s) => s.mockRestore()))

describe('POST /api/users · alta con contraseña provisional', () => {
  it('el root crea la cuenta por configurar y se le manda el correo con el enlace', async () => {
    const res = await handleRequest(req('/api/users', 'POST', ALTA))
    const cuerpo = (await res.json()) as any

    expect(res.status).toBe(201)
    expect(cuerpo).toEqual({ ok: true, id: NUEVA_ID, correo: { enviado: true } })

    const alta = registrar.mock.calls[0][0]
    expect(alta.email).toBe('nueva.persona@tlaquepaque.gob.mx') // en minúsculas
    expect(alta.name).toBe('Nueva Persona') // sin espacios sobrantes
    expect(alta.role).toBe('admin')
    expect(alta.password).toBe('provisional-2026') // la escribió quien da de alta
    // Queda «por configurar», con la contraseña provisional vigente hasta una fecha.
    expect(alta.configurarAntesDe).toBeInstanceOf(Date)
    expect(alta.configurarAntesDe.getTime()).toBeGreaterThan(Date.now() + 6 * 24 * 3600 * 1000)

    expect(correo).toHaveBeenCalledTimes(1)
    const enviado = correo.mock.calls[0][0]
    expect(enviado.para).toBe('nueva.persona@tlaquepaque.gob.mx')
    expect(enviado.nombre).toBe('Nueva Persona')
    expect(enviado.rango).toBe('Administrador')
    expect(enviado.creadoPor).toBe('Dueña del Sistema')
    expect(enviado.expiraDias).toBe(7)
    expect(enviado.url).toBe(
      `http://localhost:44100/ordena/configurar-cuenta?token=${encodeURIComponent(TOKEN)}`,
    )
  })

  it('la contraseña provisional no viaja en el correo ni en la respuesta', async () => {
    const res = await handleRequest(req('/api/users', 'POST', ALTA))
    expect(JSON.stringify(await res.json())).not.toContain('provisional-2026')
    expect(JSON.stringify(correo.mock.calls)).not.toContain('provisional-2026')
  })

  it('sin SMTP configurado la cuenta se crea igual y se avisa de que no hubo correo', async () => {
    smtp.mockImplementation(() => false)
    const res = await handleRequest(req('/api/users', 'POST', ALTA))
    expect(res.status).toBe(201)
    expect(((await res.json()) as any).correo).toEqual({
      enviado: false,
      motivo: 'smtp_no_configurado',
    })
    expect(registrar).toHaveBeenCalledTimes(1)
    expect(correo).not.toHaveBeenCalled()
  })

  it('si el servidor de correo falla, la cuenta queda creada y se avisa del fallo', async () => {
    correo.mockImplementation(async () => {
      throw new Error('550 rechazado')
    })
    const res = await handleRequest(req('/api/users', 'POST', ALTA))
    expect(res.status).toBe(201)
    expect(((await res.json()) as any).correo).toEqual({
      enviado: false,
      motivo: 'envio_fallido',
    })
  })

  it('rechaza lo que no sirve sin crear nada', async () => {
    const casos: Array<[Record<string, unknown>, number]> = [
      [{ ...ALTA, email: 'sin-arroba' }, 400],
      [{ ...ALTA, name: 'A' }, 422],
      [{ ...ALTA, name: 'x'.repeat(121) }, 422],
      [{ email: ALTA.email, name: ALTA.name }, 400],
    ]
    for (const [cuerpo, status] of casos) {
      const res = await handleRequest(req('/api/users', 'POST', cuerpo))
      expect(res.status, JSON.stringify(cuerpo)).toBe(status)
    }
    expect(registrar).not.toHaveBeenCalled()
    expect(correo).not.toHaveBeenCalled()
  })

  it('un correo repetido responde 409 y no manda nada', async () => {
    registrar.mockImplementation(async () => {
      throw new Error('EMAIL_TAKEN')
    })
    const res = await handleRequest(req('/api/users', 'POST', ALTA))
    expect(res.status).toBe(409)
    expect(correo).not.toHaveBeenCalled()
  })

  it('una contraseña provisional fuera de rango responde 422', async () => {
    registrar.mockImplementation(async () => {
      throw new Error('PASSWORD_LONGITUD_INVALIDA')
    })
    const res = await handleRequest(req('/api/users', 'POST', { ...ALTA, password: 'corta' }))
    expect(res.status).toBe(422)
    expect(correo).not.toHaveBeenCalled()
  })

  it('un administrador recibe 403 y no se crea ni se manda nada', async () => {
    quien = ADMIN as never
    const res = await handleRequest(req('/api/users', 'POST', ALTA))
    expect(res.status).toBe(403)
    expect(registrar).not.toHaveBeenCalled()
    expect(correo).not.toHaveBeenCalled()
  })
})

describe('POST /api/users/:id/invitation · reenviar la invitación', () => {
  const RUTA = `/api/users/${NUEVA_ID}/invitation`
  let obtener: any
  let renovar: any

  beforeEach(() => {
    obtener = spyOn(users as any, 'obtenerCuenta').mockImplementation(async () => ({
      id: NUEVA_ID,
      role: 'admin',
      email: 'nueva@x.mx',
      name: 'Nueva',
    }))
    renovar = spyOn(configuracion as any, 'renovarInvitacion').mockImplementation(async () => ({
      token: TOKEN,
      usuario: { id: NUEVA_ID, name: 'Nueva', email: 'nueva@x.mx', role: 'admin' },
      expiraEn: new Date(),
    }))
    spies.push(obtener, renovar)
  })

  it('el root reenvía el correo con un enlace nuevo', async () => {
    const res = await handleRequest(req(RUTA, 'POST'))
    expect(res.status).toBe(200)
    expect(((await res.json()) as any).email).toBe('nueva@x.mx')
    expect(renovar).toHaveBeenCalledWith(NUEVA_ID)
    const enviado = correo.mock.calls[0][0]
    expect(enviado.para).toBe('nueva@x.mx')
    expect(enviado.url).toContain(`/configurar-cuenta?token=${encodeURIComponent(TOKEN)}`)
    expect(enviado.creadoPor).toBe('Dueña del Sistema')
  })

  it('un administrador recibe 403', async () => {
    quien = ADMIN as never
    const res = await handleRequest(req(RUTA, 'POST'))
    expect(res.status).toBe(403)
    expect(renovar).not.toHaveBeenCalled()
    expect(correo).not.toHaveBeenCalled()
  })

  it('una cuenta que ya se configuró responde 409: no hay nada que reenviar', async () => {
    renovar.mockImplementation(async () => null)
    const res = await handleRequest(req(RUTA, 'POST'))
    expect(res.status).toBe(409)
    expect(((await res.json()) as any).motivo).toBe('no_pendiente')
    expect(correo).not.toHaveBeenCalled()
  })

  it('sin correo configurado responde 503 SIN invalidar el enlace anterior', async () => {
    smtp.mockImplementation(() => false)
    const res = await handleRequest(req(RUTA, 'POST'))
    expect(res.status).toBe(503)
    expect(renovar).not.toHaveBeenCalled()
  })

  it('si el envío falla responde 502', async () => {
    correo.mockImplementation(async () => {
      throw new Error('smtp caído')
    })
    const res = await handleRequest(req(RUTA, 'POST'))
    expect(res.status).toBe(502)
  })

  it('404 si la cuenta no existe, y el id debe ser un UUID', async () => {
    obtener.mockImplementation(async () => null)
    expect((await handleRequest(req(RUTA, 'POST'))).status).toBe(404)
    expect((await handleRequest(req('/api/users/123/invitation', 'POST'))).status).toBe(400)
  })
})

describe('POST /api/auth/login · cuenta por configurar', () => {
  let verificar: any
  let estado: any
  let sesion: any

  beforeEach(() => {
    verificar = spyOn(auth as any, 'verifyCredentials').mockImplementation(async () => ({
      id: NUEVA_ID,
      name: 'Nueva',
      email: 'nueva@x.mx',
      role: 'admin',
    }))
    estado = spyOn(configuracion as any, 'estadoDeConfiguracion').mockImplementation(async () => ({
      pendiente: true,
      vencida: false,
    }))
    sesion = spyOn(sesiones as any, 'registrarInicioSesion').mockImplementation(
      async () => undefined,
    )
    spies.push(verificar, estado, sesion)
  })

  const entrar = () =>
    handleRequest(
      new Request('http://localhost/api/auth/login', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email: 'nueva@x.mx', password: 'provisional-2026' }),
      }),
    )

  it('con la contraseña provisional NO abre sesión: entrega un enlace de corta vida al panel', async () => {
    const res = await entrar()
    const cuerpo = (await res.json()) as any
    expect(res.status).toBe(200)
    expect(cuerpo).toEqual({ configurar: true, token: TOKEN, user: null })
    expect(res.headers.get('set-cookie')).toBeNull()
    expect(sesion).not.toHaveBeenCalled()
    // No gasta los enlaces que ya existían: el del correo debe seguir sirviendo.
    expect(enlace.mock.calls[0][1]).toEqual({ vigenciaMs: 60 * 60_000, invalidarAnteriores: false })
  })

  it('si la contraseña provisional venció responde 403 y explica qué hacer', async () => {
    estado.mockImplementation(async () => ({ pendiente: true, vencida: true }))
    const res = await entrar()
    const cuerpo = (await res.json()) as any
    expect(res.status).toBe(403)
    expect(cuerpo.motivo).toBe('invitacion_vencida')
    expect(cuerpo.error).toContain('reenvíe la invitación')
    expect(res.headers.get('set-cookie')).toBeNull()
    expect(enlace).not.toHaveBeenCalled()
  })

  it('una cuenta ya configurada inicia sesión como siempre', async () => {
    estado.mockImplementation(async () => ({ pendiente: false, vencida: false }))
    const res = await entrar()
    expect(res.status).toBe(200)
    expect(res.headers.get('set-cookie')).toContain('ordenamiento_session=')
    expect(((await res.json()) as any).user.id).toBe(NUEVA_ID)
    expect(enlace).not.toHaveBeenCalled()
  })

  it('una contraseña incorrecta sigue siendo 401 y no revela si la cuenta está por configurar', async () => {
    verificar.mockImplementation(async () => null)
    const res = await entrar()
    expect(res.status).toBe(401)
    expect(estado).not.toHaveBeenCalled()
  })
})

describe('el panel de configuración de la cuenta (público, con el enlace)', () => {
  let valido: any
  let completar: any
  let validarFoto: any
  let escribirFoto: any
  let sesion: any

  beforeEach(() => {
    quien = null
    valido = spyOn(configuracion as any, 'enlaceDeConfiguracionValido').mockImplementation(
      async () => ({
        valido: true,
        usuario: { id: NUEVA_ID, name: 'Nueva', email: 'nueva@x.mx', role: 'admin' },
      }),
    )
    completar = spyOn(configuracion as any, 'completarConfiguracion').mockImplementation(
      async () => ({
        ok: true,
        usuario: { id: NUEVA_ID, name: 'Ana López', email: 'nueva@x.mx', role: 'admin' },
      }),
    )
    validarFoto = spyOn(avatar as any, 'validarAvatar')
    escribirFoto = spyOn(avatar as any, 'escribirAvatar').mockImplementation(
      async () => '/tmp/uploads/foto.png',
    )
    sesion = spyOn(sesiones as any, 'registrarInicioSesion').mockImplementation(
      async () => undefined,
    )
    spies.push(valido, completar, validarFoto, escribirFoto, sesion)
  })

  const completo = (extra: Record<string, string | Blob> = {}) => {
    const f = new FormData()
    f.set('token', TOKEN)
    f.set('nombres', 'Ana María')
    f.set('apellidos', 'López Pérez')
    f.set('password', 'mi-clave-nueva-2026')
    f.set('confirmacion', 'mi-clave-nueva-2026')
    for (const [k, v] of Object.entries(extra)) f.set(k, v)
    return f
  }
  const enviar = (form: FormData) =>
    handleRequest(
      new Request('http://localhost/api/auth/account-setup', { method: 'POST', body: form }),
    )

  describe('GET /api/auth/account-setup', () => {
    const consultar = (token: string) =>
      handleRequest(
        new Request(
          `http://localhost/api/auth/account-setup${token ? `?token=${encodeURIComponent(token)}` : ''}`,
        ),
      )

    it('con un enlace vivo responde quién es, sin su id interno', async () => {
      const res = await consultar(TOKEN)
      const cuerpo = (await res.json()) as any
      expect(res.status).toBe(200)
      expect(cuerpo).toEqual({
        valido: true,
        usuario: { name: 'Nueva', email: 'nueva@x.mx', rol: 'admin' },
      })
    })

    it('un enlace vencido o ya usado responde 410 con el motivo', async () => {
      valido.mockImplementation(async () => ({ valido: false, motivo: 'expirado' }))
      const res = await consultar(TOKEN)
      expect(res.status).toBe(410)
      expect(((await res.json()) as any).motivo).toBe('expirado')
    })

    it('sin token responde 400', async () => {
      expect((await consultar('')).status).toBe(400)
    })

    it('consultar el enlace no lo gasta', async () => {
      await consultar(TOKEN)
      expect(completar).not.toHaveBeenCalled()
    })
  })

  describe('POST /api/auth/account-setup', () => {
    it('completa la configuración, abre la sesión y no pide nada más', async () => {
      const res = await enviar(completo())
      const cuerpo = (await res.json()) as any
      expect(res.status).toBe(200)
      expect(cuerpo).toEqual({
        ok: true,
        user: { id: NUEVA_ID, name: 'Ana López', role: 'admin' },
      })
      expect(res.headers.get('set-cookie')).toContain('ordenamiento_session=')
      expect(sesion).toHaveBeenCalledTimes(1)
      expect(completar.mock.calls[0][0]).toBe(TOKEN)
      expect(completar.mock.calls[0][1]).toEqual({
        nombres: 'Ana María',
        apellidos: 'López Pérez',
        password: 'mi-clave-nueva-2026',
      })
      expect(completar.mock.calls[0][2]).toBeUndefined() // sin foto
    })

    it('si los datos no sirven responde 422 con el error por campo y NO gasta el enlace', async () => {
      const res = await enviar(
        completo({ nombres: '', confirmacion: 'otra-distinta-123', apellidos: 'López' }),
      )
      const cuerpo = (await res.json()) as any
      expect(res.status).toBe(422)
      expect(cuerpo.campos.nombres).toBeTruthy()
      expect(cuerpo.campos.confirmacion).toBe('Las contraseñas no coinciden.')
      expect(cuerpo.campos.apellidos).toBeUndefined()
      expect(completar).not.toHaveBeenCalled()
      expect(valido).not.toHaveBeenCalled()
    })

    it('un enlace vencido o gastado responde 410 y no toca la cuenta', async () => {
      valido.mockImplementation(async () => ({ valido: false, motivo: 'invalido' }))
      const res = await enviar(completo())
      expect(res.status).toBe(410)
      expect(completar).not.toHaveBeenCalled()
      expect(res.headers.get('set-cookie')).toBeNull()
    })

    it('si el enlace se gasta entre la comprobación y el guardado, responde 410 y borra la foto', async () => {
      const foto = new File([new Uint8Array([1, 2, 3])], 'foto.png', { type: 'image/png' })
      validarFoto.mockImplementation(async () => ({
        ok: true,
        avatar: { buffer: Buffer.from([1]), nombreOriginal: 'foto.png', mime: 'image/png' },
      }))
      completar.mockImplementation(async () => ({ ok: false, motivo: 'invalido' }))
      const res = await enviar(completo({ avatar: foto }))
      expect(res.status).toBe(410)
      expect(escribirFoto).toHaveBeenCalledTimes(1)
      expect(res.headers.get('set-cookie')).toBeNull()
    })

    it('la contraseña nueva no puede ser la provisional', async () => {
      completar.mockImplementation(async () => ({ ok: false, motivo: 'password_provisional' }))
      const res = await enviar(completo())
      const cuerpo = (await res.json()) as any
      expect(res.status).toBe(422)
      expect(cuerpo.campos.password).toContain('distinta de la provisional')
      expect(res.headers.get('set-cookie')).toBeNull()
    })

    it('con foto válida la guarda junto con la configuración', async () => {
      const foto = new File([new Uint8Array([1, 2, 3])], 'foto.png', { type: 'image/png' })
      const validada = { buffer: Buffer.from([1]), nombreOriginal: 'foto.png', mime: 'image/png' }
      validarFoto.mockImplementation(async () => ({ ok: true, avatar: validada }))
      const res = await enviar(completo({ avatar: foto }))
      expect(res.status).toBe(200)
      expect(escribirFoto).toHaveBeenCalledWith(validada)
      expect(completar.mock.calls[0][2]).toEqual({
        validado: validada,
        ruta: '/tmp/uploads/foto.png',
      })
    })

    it('una foto que no sirve se avisa (415) y no se descarta en silencio ni gasta el enlace', async () => {
      const foto = new File([new Uint8Array([1])], 'virus.exe')
      validarFoto.mockImplementation(async () => ({
        ok: false,
        status: 415,
        error: 'El archivo debe ser una imagen (JPG, PNG, WEBP o GIF)',
      }))
      const res = await enviar(completo({ avatar: foto }))
      const cuerpo = (await res.json()) as any
      expect(res.status).toBe(415)
      expect(cuerpo.campos.avatar).toContain('imagen')
      expect(completar).not.toHaveBeenCalled()
      expect(escribirFoto).not.toHaveBeenCalled()
    })

    it('sin archivo en el campo de la foto no se valida ninguna', async () => {
      const res = await enviar(completo())
      expect(res.status).toBe(200)
      expect(validarFoto).not.toHaveBeenCalled()
      expect(escribirFoto).not.toHaveBeenCalled()
    })

    it('sin token responde 400, y un envío gigante 413', async () => {
      const sinToken = completo()
      sinToken.delete('token')
      expect((await enviar(sinToken)).status).toBe(400)

      const res = await handleRequest(
        new Request('http://localhost/api/auth/account-setup', {
          method: 'POST',
          headers: { 'content-length': String(50 * 1024 * 1024) },
          body: completo(),
        }),
      )
      expect(res.status).toBe(413)
    })

    it('solo acepta un formulario: un JSON no llega a tocar nada', async () => {
      const res = await handleRequest(
        new Request('http://localhost/api/auth/account-setup', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ token: TOKEN, password: 'x' }),
        }),
      )
      expect(res.status).toBe(400)
      expect(completar).not.toHaveBeenCalled()
    })
  })
})
