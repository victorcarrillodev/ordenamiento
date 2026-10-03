import { describe, expect, it, beforeEach, afterEach, mock } from 'bun:test'

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

const { mailConfigurado, escapeHtml, enviarAcuseReciboParticipacion, REMITENTE_CONSULTA } =
  await import('./mail.ts')

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

  it('sale del correo de la consulta pública, no del remitente general', async () => {
    await enviarAcuseReciboParticipacion('id-1', 'juan@ejemplo.com', cargar)
    expect(REMITENTE_CONSULTA).toContain('consulta.poetdum@tlaquepaque.gob.mx')
    expect(sendMailCalls[0].from).toBe(REMITENTE_CONSULTA)
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
