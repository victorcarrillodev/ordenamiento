import nodemailer from 'nodemailer'
import { readFile } from 'node:fs/promises'
import { isAbsolute, join } from 'node:path'

import { sql } from '../db/pool.ts'

const UPLOAD_DIR = join(process.cwd(), 'uploads')

const SMTP_HOST = process.env.SMTP_HOST ?? ''
const SMTP_PORT = Number(process.env.SMTP_PORT ?? 587)
const SMTP_USER = process.env.SMTP_USER ?? ''
const SMTP_PASS = process.env.SMTP_PASS ?? ''
const MAIL_FROM = process.env.MAIL_FROM ?? SMTP_USER

/**
 * true si hay configuración SMTP suficiente para enviar.
 */
export function mailConfigurado(): boolean {
  return Boolean(SMTP_HOST && SMTP_USER && SMTP_PASS)
}

interface ParticipacionCorreo {
  folio: string
  nombre: string
  correo: string
  municipio: string
  colonia: string
  estado: string
  fuente: string
  genero: string
  tematica: string
  observacion: string
  created_at: Date
}

/**
 * Envía por correo la participación: resumen en el cuerpo + adjuntos (PDF…).
 */
export async function enviarParticipacion(participationId: number, para: string): Promise<{ enviado: true; adjuntos: number }> {
  if (!mailConfigurado()) {
    throw new Error('SMTP_NO_CONFIGURADO')
  }

  const rows = await sql<ParticipacionCorreo[]>`
    SELECT folio, nombre, correo, municipio, colonia, estado, fuente, genero, tematica, observacion, created_at
    FROM participations WHERE id = ${participationId}
  `
  if (rows.length === 0) throw new Error('NO_ENCONTRADA')
  const p = rows[0]

  const adjuntos = await sql<Array<{ nombre_original: string; ruta_local: string }>>`
    SELECT nombre_original, ruta_local FROM attachments WHERE participation_id = ${participationId}
  `

  const attachments: Array<{ filename: string; content: Buffer }> = []
  for (const a of adjuntos) {
    const ruta = isAbsolute(a.ruta_local) ? a.ruta_local : join(UPLOAD_DIR, a.ruta_local)
    try {
      attachments.push({ filename: a.nombre_original, content: await readFile(ruta) })
    } catch {
      // adjunto ilegible: se envía solo el cuerpo
    }
  }

  const transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: SMTP_PORT === 465,
    auth: { user: SMTP_USER, pass: SMTP_PASS },
  })

  const html = [
    `<h2 style="color:#1F4D6E">Participación ${p.folio}</h2>`,
    `<table cellpadding="6" style="border-collapse:collapse;font-family:Calibri,sans-serif;font-size:14px">`,
    filaHtml('Nombre', p.nombre),
    filaHtml('Correo', p.correo),
    filaHtml('Municipio', p.municipio),
    filaHtml('Colonia', p.colonia),
    filaHtml('Fuente', p.fuente),
    filaHtml('Género', p.genero),
    filaHtml('Temática', p.tematica),
    filaHtml('Estado', p.estado),
    filaHtml('Registro', p.created_at?.toLocaleString?.('es-MX') ?? String(p.created_at)),
    `</table>`,
    `<h3 style="color:#1F4D6E">Observación</h3>`,
    `<p style="font-family:Calibri,sans-serif;font-size:14px">${escapeHtml(p.observacion || '(sin observación)')}</p>`,
  ].join('')

  await transporter.sendMail({
    from: MAIL_FROM,
    to: para,
    subject: `Participación ${p.folio} — Bitácora Ambiental`,
    html,
    attachments,
  })

  return { enviado: true, adjuntos: attachments.length }
}

function filaHtml(label: string, valor: string): string {
  return `<tr><td style="border:1px solid #D5DCE5;background:#F2F5F9;font-weight:bold;color:#1F4D6E">${label}</td><td style="border:1px solid #D5DCE5">${escapeHtml(valor || '—')}</td></tr>`
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] ?? c)
}
