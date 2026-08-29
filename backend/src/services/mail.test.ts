import { describe, expect, it, spyOn, beforeEach, afterEach, mock } from 'bun:test'
import * as pool from '../db/pool.ts'

// Mockeamos nodemailer para no conectar a SMTP real.
const sendMailCalls: Array<{ to: string; html: string }> = []
const sendMailMock = (opts: { to: string; html: string }) => {
  sendMailCalls.push({ to: opts.to, html: opts.html })
  return Promise.resolve({})
}
const nodemailerMock = {
  default: {
    createTransport: () => ({ sendMail: sendMailMock, verify: () => Promise.resolve(true) }),
  },
  createTransport: () => ({ sendMail: sendMailMock, verify: () => Promise.resolve(true) }),
}
mock.module('nodemailer', () => nodemailerMock)

const { mailConfigurado, escapeHtml, enviarAcuseReciboParticipacion } = await import('./mail.ts')

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
    expect(escapeHtml('<script>alert(1)</script>')).toBe(
      '&lt;script&gt;alert(1)&lt;/script&gt;',
    )
    expect(escapeHtml('a & b "c" \'d\'')).toBe('a &amp; b &quot;c&quot; &#39;d&#39;')
  })
  it('no altera texto plano', () => {
    expect(escapeHtml('Folio 12345 — Tlaquepaque')).toBe('Folio 12345 — Tlaquepaque')
  })
})

describe('enviarAcuseReciboParticipacion', () => {
  let sqlMock: ReturnType<typeof spyOn> | undefined

  beforeEach(() => {
    process.env.SMTP_HOST = 'smtp.example.com'
    sqlMock = spyOn(pool.sql, 'unsafe')
    sendMailCalls.length = 0
  })
  afterEach(() => {
    sqlMock?.mockRestore()
    delete process.env.SMTP_HOST
  })

  it('lanza si no hay SMTP configurado', async () => {
    delete process.env.SMTP_HOST
    await expect(enviarAcuseReciboParticipacion('x', 'a@b.com')).rejects.toThrow('SMTP_NO_CONFIGURADO')
  })

  it('arma el correo con folio y nombre del participante', async () => {
    sqlMock!.mockImplementation(async (sql: string) => {
      if (sql.includes('FROM participations')) {
        return [
          {
            folio: 'POE-2026-0001',
            origen: 'digital',
            nombre: 'Juan Pérez',
            correo: 'juan@ejemplo.com',
            municipio: 'San Pedro Tlaquepaque',
            colonia: 'Centro',
            institucion: null,
            ocupacion: null,
            estado: 'En proceso',
            fuente: null,
            genero: null,
            tematica: 'General',
            observacion: 'Propuesta de parque',
            created_at: new Date('2026-01-15T10:00:00Z'),
          },
        ] as any
      }
      if (sql.includes('FROM attachments')) return [] as any
      return [] as any
    })

    const res = await enviarAcuseReciboParticipacion('id-1', 'juan@ejemplo.com')
    expect(res.enviado).toBe(true)
    expect(res.folio).toBe('POE-2026-0001')
    // El html enviado debe contener el folio y nombre escapados correctamente.
    const sent = sendMailCalls[0]
    expect(sent.to).toBe('juan@ejemplo.com')
    expect(sent.html).toContain('POE-2026-0001')
    expect(sent.html).toContain('Juan Pérez')
  })

  it('escapa HTML inyectado en campos del participante', async () => {
    sqlMock!.mockImplementation(async (sql: string) => {
      if (sql.includes('FROM participations')) {
        return [
          {
            folio: 'X',
            origen: 'digital',
            nombre: '<img src=x onerror=alert(1)>',
            correo: 'a@b.com',
            municipio: 'San Pedro Tlaquepaque',
            colonia: 'Centro',
            institucion: null,
            ocupacion: null,
            estado: 'En proceso',
            fuente: null,
            genero: null,
            tematica: 'General',
            observacion: '<b>hack</b>',
            created_at: new Date(),
          },
        ] as any
      }
      if (sql.includes('FROM attachments')) return [] as any
      return [] as any
    })

    await enviarAcuseReciboParticipacion('id-2', 'a@b.com')
    const sent = sendMailCalls[0]
    expect(sent.html).toContain('&lt;img src=x onerror=alert(1)&gt;')
    expect(sent.html).not.toContain('<img src=x onerror=alert(1)>')
  })
})
