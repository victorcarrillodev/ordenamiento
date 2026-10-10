import { describe, expect, it, beforeEach, afterEach, mock, spyOn } from 'bun:test'

import * as actividades from './actividades.ts'
import * as customizations from './customizations.ts'

// Mockeamos nodemailer para no conectar a SMTP real.
interface CorreoEnviado {
  from: string
  to: string
  subject: string
  html: string
  attachments: Array<{ filename: string; content: Buffer; contentType?: string }>
}
const sendMailCalls: CorreoEnviado[] = []
const sendMailMock = (opts: CorreoEnviado) => {
  sendMailCalls.push(opts)
  return Promise.resolve({})
}
const nodemailerMock = {
  default: {
    createTransport: () => ({ sendMail: sendMailMock, verify: () => Promise.resolve(true) }),
  },
  createTransport: () => ({ sendMail: sendMailMock, verify: () => Promise.resolve(true) }),
}
mock.module('nodemailer', () => nodemailerMock)

// Los datos de la participación se leen de la base: aquí se sustituyen por un
// expediente de prueba que cada caso puede modificar.
let expediente: Record<string, unknown> | null = null
const cargar = (() => Promise.resolve(expediente)) as never

const {
  mailConfigurado,
  escapeHtml,
  enviarAcuseReciboParticipacion,
  enviarAviso,
  enviarAvisoCorreoCambiado,
  enviarConfirmacionCorreoNuevo,
  enviarCorreoBienvenida,
  enviarCorreoPrueba,
  enviarCorreoRecuperacion,
  enviarCorreoRespuesta,
} = await import('./mail.ts')

// El remitente es el correo de contacto del pie de página, que vive en la
// personalización guardada en la base: aquí lo fija cada caso en vez de leerla.
let correoDelPie = 'ordenamiento@tlaquepaque.gob.mx'
let restaurarPersonalizacion: Array<() => void> = []
beforeEach(() => {
  correoDelPie = 'ordenamiento@tlaquepaque.gob.mx'
  const leer = spyOn(customizations, 'getCustomizations').mockImplementation((() =>
    Promise.resolve({
      ...customizations.DEFAULT_THEME_CONFIG,
      usuario: {
        ...customizations.DEFAULT_THEME_CONFIG.usuario,
        textos: {
          ...customizations.DEFAULT_THEME_CONFIG.usuario.textos,
          footerEmail: correoDelPie,
        },
      },
    })) as never)
  restaurarPersonalizacion = [() => leer.mockRestore()]
})
afterEach(() => restaurarPersonalizacion.forEach((restaurar) => restaurar()))

describe('mailConfigurado', () => {
  const orig = process.env.SMTP_HOST
  afterEach(() => {
    if (orig === undefined) delete process.env.SMTP_HOST
    else process.env.SMTP_HOST = orig
  })
  it('es false cuando SMTP_HOST no está definido', () => {
    delete process.env.SMTP_HOST
    expect(mailConfigurado()).toBe(false)
  })
  it('es true cuando SMTP_HOST está definido', () => {
    process.env.SMTP_HOST = 'smtp.example.com'
    expect(mailConfigurado()).toBe(true)
  })
})

describe('escapeHtml (anti-XSS en correos)', () => {
  it('escapa < > & " \'', () => {
    expect(escapeHtml('<script>alert(1)</script>')).toBe('&lt;script&gt;alert(1)&lt;/script&gt;')
    expect(escapeHtml('a & b "c" \'d\'')).toBe('a &amp; b &quot;c&quot; &#39;d&#39;')
  })
  it('no altera texto plano', () => {
    expect(escapeHtml('Folio 12345 — Tlaquepaque')).toBe('Folio 12345 — Tlaquepaque')
  })
})

/** Una cuenta recién dada de alta por un root. */
const BIENVENIDA = {
  para: 'nueva@tlaquepaque.gob.mx',
  nombre: 'Nueva Persona',
  rango: 'Administrador',
  creadoPor: 'Dueña del Sistema',
  url: 'https://portal.test/ordena/configurar-cuenta?token=abc123',
  expiraDias: 7,
}

/** Una participación completa, con los datos complementarios que el acuse no muestra. */
const participacion = (cambios: Record<string, unknown> = {}) => ({
  id: 'id-1',
  folio: 'POE-2026-0001',
  origen: 'digital',
  nombre: 'Juan Pérez',
  correo: 'juan@ejemplo.com',
  fechaRecepcion: new Date('2026-01-15T16:00:00Z'),
  alcance_ubicacion: 'especifico',
  calle: 'Av. Juárez 100',
  colonia: 'Centro',
  codigo_postal: '45500',
  institucion: 'Colectivo Ambiental',
  tematica: 'Movilidad',
  tematica_otra: '',
  observacion: 'Propuesta de parque lineal sobre el arroyo',
  adjuntos: [] as string[],
  estado: 'En proceso',
  fuente: 'Otra',
  fuente_otra: 'Colectivo vecinal',
  genero: 'Hombre',
  domicilio: 'Calle del hogar 42, Santa Anita',
  municipio_participante: 'Guadalajara',
  ocupacion: 'Arquitecto',
  ...cambios,
})

describe('enviarAcuseReciboParticipacion', () => {
  beforeEach(() => {
    process.env.SMTP_HOST = 'smtp.example.com'
    expediente = participacion()
    sendMailCalls.length = 0
  })
  afterEach(() => {
    delete process.env.SMTP_HOST
  })

  it('lanza si no hay SMTP configurado', async () => {
    delete process.env.SMTP_HOST
    await expect(enviarAcuseReciboParticipacion('x', 'a@b.com', cargar)).rejects.toThrow(
      'SMTP_NO_CONFIGURADO',
    )
  })

  it('lanza NO_ENCONTRADA si la participación no existe', async () => {
    expediente = null
    await expect(enviarAcuseReciboParticipacion('x', 'a@b.com', cargar)).rejects.toThrow(
      'NO_ENCONTRADA',
    )
  })

  it('sale del correo de contacto del pie de página, firmado como la consulta pública', async () => {
    await enviarAcuseReciboParticipacion('id-1', 'juan@ejemplo.com', cargar)
    expect(sendMailCalls[0].from).toBe(
      '"Consulta pública POETDUM" <ordenamiento@tlaquepaque.gob.mx>',
    )
  })

  it('lleva el folio en el asunto y el acuse en PDF como adjunto', async () => {
    const res = await enviarAcuseReciboParticipacion('id-1', 'juan@ejemplo.com', cargar)
    expect(res).toEqual({ enviado: true, adjuntos: 1, folio: 'POE-2026-0001' })
    const enviado = sendMailCalls[0]
    expect(enviado.to).toBe('juan@ejemplo.com')
    expect(enviado.subject).toBe('Acuse de recepción de tu participación · Folio POE-2026-0001')
    expect(enviado.attachments).toHaveLength(1)
    const [acuse] = enviado.attachments
    expect(acuse.filename).toBe('Acuse POE-2026-0001.pdf')
    expect(acuse.contentType).toBe('application/pdf')
    expect(acuse.content.subarray(0, 5).toString('latin1')).toBe('%PDF-')
  })

  it('incluye toda la información registrada, también los datos complementarios', async () => {
    await enviarAcuseReciboParticipacion('id-1', 'juan@ejemplo.com', cargar)
    const { html } = sendMailCalls[0]
    for (const dato of [
      'POE-2026-0001',
      'Juan Pérez',
      'juan@ejemplo.com',
      'En línea, mediante la Bitácora',
      'Av. Juárez 100, Centro, C.P. 45500',
      'Colectivo Ambiental',
      'Movilidad',
      'Propuesta de parque lineal sobre el arroyo',
      // complementarios: se conservan en el sistema y van en este correo
      'Otra: Colectivo vecinal',
      'Hombre',
      'Calle del hogar 42, Santa Anita',
      'Guadalajara',
      'Arquitecto',
    ]) {
      expect(html, dato).toContain(dato)
    }
  })

  it('con archivos, lista sus nombres; sin ellos, lo dice', async () => {
    expediente = participacion({ adjuntos: ['plano.dwg', 'estudio.pdf'] })
    await enviarAcuseReciboParticipacion('id-1', 'juan@ejemplo.com', cargar)
    expect(sendMailCalls[0].html).toContain('plano.dwg')
    expect(sendMailCalls[0].html).toContain('estudio.pdf')
    expect(sendMailCalls[0].html).not.toContain('Sin archivos adjuntos')

    expediente = participacion({ adjuntos: [] })
    await enviarAcuseReciboParticipacion('id-1', 'juan@ejemplo.com', cargar)
    expect(sendMailCalls[1].html).toContain('Sin archivos adjuntos')
  })

  it('no adjunta los archivos del participante: solo el acuse', async () => {
    expediente = participacion({ adjuntos: ['plano.dwg'] })
    await enviarAcuseReciboParticipacion('id-1', 'juan@ejemplo.com', cargar)
    expect(sendMailCalls[0].attachments.map((a) => a.filename)).toEqual(['Acuse POE-2026-0001.pdf'])
  })

  it('firma con la dirección que recibe y responde las participaciones', async () => {
    await enviarAcuseReciboParticipacion('id-1', 'juan@ejemplo.com', cargar)
    const { html } = sendMailCalls[0]
    expect(html).toContain('Dirección de Gestión Territorial y Planeación Urbana')
    expect(html).not.toContain('Dirección de Medio Ambiente y Ecología')
  })

  it('una participación presencial lo dice en la modalidad', async () => {
    expediente = participacion({ origen: 'fisica' })
    await enviarAcuseReciboParticipacion('id-1', 'juan@ejemplo.com', cargar)
    expect(sendMailCalls[0].html).toContain('Presencial')
  })

  it('escapa HTML inyectado en campos del participante', async () => {
    expediente = participacion({
      nombre: '<img src=x onerror=alert(1)>',
      observacion: '<b>hack</b>',
      ocupacion: '<script>1</script>',
    })
    await enviarAcuseReciboParticipacion('id-2', 'a@b.com', cargar)
    const { html } = sendMailCalls[0]
    expect(html).toContain('&lt;img src=x onerror=alert(1)&gt;')
    expect(html).not.toContain('<img src=x onerror=alert(1)>')
    expect(html).not.toContain('<b>hack</b>')
    expect(html).not.toContain('<script>1</script>')
  })
})

describe('remitente de los correos: el correo de contacto del pie de página', () => {
  beforeEach(() => {
    process.env.SMTP_HOST = 'smtp.example.com'
    expediente = participacion()
    sendMailCalls.length = 0
  })
  afterEach(() => {
    delete process.env.SMTP_HOST
  })

  /** Cada correo que el portal envía sin intervención de otra base de datos. */
  const ENVIOS: Array<[string, string, () => Promise<unknown>]> = [
    [
      'el acuse de la participación',
      'Consulta pública POETDUM',
      () => enviarAcuseReciboParticipacion('id-1', 'a@b.com', cargar),
    ],
    [
      'la respuesta con el oficio',
      'Consulta pública POETDUM',
      () =>
        enviarCorreoRespuesta({
          para: 'a@b.com',
          folio: 'POE-2026-0001',
          oficio: Buffer.from('%PDF-1.4'),
          nombreArchivo: 'oficio.pdf',
        }),
    ],
    ['el correo de prueba', 'Bitácora Tlaquepaque', () => enviarCorreoPrueba('a@b.com')],
    [
      'el restablecimiento de contraseña',
      'Bitácora Tlaquepaque',
      () =>
        enviarCorreoRecuperacion({
          para: 'a@b.com',
          nombre: 'Ana',
          url: 'https://portal.test/restablecer?token=abc',
          expiraMinutos: 30,
        }),
    ],
    [
      'la confirmación del correo nuevo',
      'Bitácora Tlaquepaque',
      () =>
        enviarConfirmacionCorreoNuevo({
          para: 'nuevo@b.com',
          nombre: 'Ana',
          url: 'https://portal.test/confirmar?token=abc',
          expiraMinutos: 60,
          emailAnterior: 'viejo@b.com',
        }),
    ],
    [
      'la bienvenida de una cuenta nueva',
      'Bitácora Tlaquepaque',
      () => enviarCorreoBienvenida(BIENVENIDA),
    ],
    [
      'el aviso del correo cambiado',
      'Bitácora Tlaquepaque',
      () =>
        enviarAvisoCorreoCambiado({
          para: 'viejo@b.com',
          nombre: 'Ana',
          emailNuevo: 'nuevo@b.com',
        }),
    ],
    [
      'el aviso de una actividad',
      'Bitácora Tlaquepaque',
      () => {
        const leer = spyOn(actividades, 'obtenerActividadGestion').mockResolvedValue({
          id: 'act-1',
          titulo: 'Taller',
          descripcion: '',
          aviso_titulo: '',
          aviso_descripcion: '',
          fecha: '2026-11-05',
          hora_inicio: '10:00',
          hora_fin: '12:00',
          lugar: 'Sala 1',
          publicacion: 'borrador',
        } as never)
        restaurarPersonalizacion.push(() => leer.mockRestore())
        return enviarAviso('act-1', 'a@b.com', 'https://portal.test')
      },
    ],
  ]

  for (const [descripcion, nombre, enviar] of ENVIOS) {
    it(`${descripcion} sale del correo del pie de página`, async () => {
      await enviar()
      expect(sendMailCalls).toHaveLength(1)
      expect(sendMailCalls[0].from).toBe(`"${nombre}" <ordenamiento@tlaquepaque.gob.mx>`)
    })

    it(`${descripcion} sigue al correo del pie cuando se cambia en el panel`, async () => {
      correoDelPie = 'contacto.poetdum@tlaquepaque.gob.mx'
      await enviar()
      expect(sendMailCalls[0].from).toBe(`"${nombre}" <contacto.poetdum@tlaquepaque.gob.mx>`)
    })
  }

  it('con el correo del pie vacío usa el mismo que muestra el pie por defecto', async () => {
    correoDelPie = '   '
    await enviarCorreoPrueba('a@b.com')
    expect(sendMailCalls[0].from).toBe('"Bitácora Tlaquepaque" <ordenamiento@tlaquepaque.gob.mx>')
  })

  it('con algo que no es una dirección no manda ese texto como remitente', async () => {
    correoDelPie = 'ordenamiento@tlaquepaque.gob.mx, otro@x.mx'
    await enviarCorreoPrueba('a@b.com')
    expect(sendMailCalls[0].from).toBe('"Bitácora Tlaquepaque" <ordenamiento@tlaquepaque.gob.mx>')
  })

  it('las variables MAIL_FROM del entorno ya no deciden el remitente', async () => {
    process.env.MAIL_FROM = '"Otro" <otro@dominio.mx>'
    process.env.MAIL_FROM_CONSULTA = '"Consulta" <consulta@dominio.mx>'
    try {
      await enviarCorreoPrueba('a@b.com')
      await enviarAcuseReciboParticipacion('id-1', 'a@b.com', cargar)
    } finally {
      delete process.env.MAIL_FROM
      delete process.env.MAIL_FROM_CONSULTA
    }
    for (const correo of sendMailCalls)
      expect(correo.from).toContain('<ordenamiento@tlaquepaque.gob.mx>')
  })

  it('el correo de prueba dice de qué dirección sale', async () => {
    correoDelPie = 'contacto.poetdum@tlaquepaque.gob.mx'
    await enviarCorreoPrueba('a@b.com')
    expect(sendMailCalls[0].html).toContain('contacto.poetdum@tlaquepaque.gob.mx')
  })
})

describe('enviarCorreoBienvenida', () => {
  beforeEach(() => {
    process.env.SMTP_HOST = 'smtp.example.com'
    sendMailCalls.length = 0
  })
  afterEach(() => {
    delete process.env.SMTP_HOST
  })

  it('lanza si no hay SMTP configurado', async () => {
    delete process.env.SMTP_HOST
    await expect(enviarCorreoBienvenida(BIENVENIDA)).rejects.toThrow('SMTP_NO_CONFIGURADO')
  })

  it('va a la persona, con el enlace de configuración como botón y como texto', async () => {
    await enviarCorreoBienvenida(BIENVENIDA)
    const { to, subject, html } = sendMailCalls[0]
    expect(to).toBe('nueva@tlaquepaque.gob.mx')
    expect(subject).toBe('[Bitácora] Configure su cuenta')
    expect(html).toContain('Configurar mi cuenta')
    // El enlace aparece en el botón y escrito, por si el botón no funciona.
    expect(html.split('https://portal.test/ordena/configurar-cuenta?token=abc123').length - 1).toBe(
      2,
    )
    expect(html).toContain('href="https://portal.test/ordena/configurar-cuenta?token=abc123"')
  })

  it('dice quién dio de alta, con qué rango y qué se hará en la configuración', async () => {
    await enviarCorreoBienvenida(BIENVENIDA)
    const { html } = sendMailCalls[0]
    expect(html).toContain('Nueva Persona')
    expect(html).toContain('Dueña del Sistema')
    expect(html).toContain('Administrador')
    expect(html).toContain('nueva@tlaquepaque.gob.mx')
    expect(html).toContain('nombre y apellidos')
    expect(html).toContain('foto de perfil')
  })

  it('no lleva ninguna contraseña: explica que la provisional se entrega por otro medio', async () => {
    await enviarCorreoBienvenida(BIENVENIDA)
    const { html } = sendMailCalls[0]
    expect(html).toContain('no incluye ninguna contraseña')
    expect(html).toContain('contraseña provisional')
    expect(html).toContain('por otro medio')
  })

  it('dice cuánto dura el enlace, en singular y en plural', async () => {
    await enviarCorreoBienvenida(BIENVENIDA)
    expect(sendMailCalls[0].html).toContain('<strong>7 días</strong>')
    await enviarCorreoBienvenida({ ...BIENVENIDA, expiraDias: 1 })
    expect(sendMailCalls[1].html).toContain('<strong>1 día</strong>')
  })

  it('escapa el HTML del nombre, de quien dio de alta y de la dirección', async () => {
    await enviarCorreoBienvenida({
      ...BIENVENIDA,
      nombre: '<img src=x onerror=alert(1)>',
      creadoPor: '<script>alert(2)</script>',
      url: 'https://portal.test/x?a=1&b="2"',
    })
    const { html } = sendMailCalls[0]
    expect(html).not.toContain('<img src=x')
    expect(html).not.toContain('<script>alert(2)')
    expect(html).toContain('&lt;img src=x onerror=alert(1)&gt;')
    expect(html).toContain('a=1&amp;b=&quot;2&quot;')
  })
})
