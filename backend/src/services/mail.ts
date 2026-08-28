import nodemailer from 'nodemailer'
import { readFile } from 'node:fs/promises'
import { isAbsolute, join } from 'node:path'

import { sql } from '../db/pool.ts'

const UPLOAD_DIR = join(process.cwd(), 'uploads')

const SMTP_HOST = process.env.SMTP_HOST || '127.0.0.1'
const SMTP_PORT = Number(process.env.SMTP_PORT || 25)
const SMTP_USER = process.env.SMTP_USER || ''
const SMTP_PASS = process.env.SMTP_PASS || ''
const MAIL_FROM =
  process.env.MAIL_FROM ||
  (SMTP_USER
    ? `"Bitácora Ambiental Tlaquepaque" <${SMTP_USER}>`
    : '"Bitácora Ambiental Tlaquepaque" <no-reply@tlaquepaque.gob.mx>')

/**
 * true si hay configuración SMTP suficiente para enviar.
 * Nota: se comprueba `process.env.SMTP_HOST` directamente (no la constante
 * `SMTP_HOST`, que ya trae un fallback a 127.0.0.1) para que un despliegue
 * sin SMTP configurado responda con el 503 "correo no configurado" en vez
 * de intentar conectar a localhost y fallar de forma confusa.
 */
export function mailConfigurado(): boolean {
  return Boolean(process.env.SMTP_HOST)
}

function getTransporter() {
  const options: Record<string, unknown> = {
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: SMTP_PORT === 465,
  }
  if (SMTP_USER && SMTP_PASS) {
    options.auth = { user: SMTP_USER, pass: SMTP_PASS }
  }
  return nodemailer.createTransport(options)
}

interface ParticipacionCorreo {
  folio: string
  origen: string
  nombre: string
  correo: string
  municipio: string
  colonia: string
  institucion: string
  ocupacion: string
  estado: string
  fuente: string
  genero: string
  tematica: string
  observacion: string
  created_at: Date
}

interface AvisoCorreo {
  id: number
  titulo: string
  descripcion: string
  activo: boolean
  created_at: Date
}

/**
 * Renderiza la plantilla base institucional para correos (HTML responsivo, formal y estilizado).
 */
function renderPlantillaBase({
  titulo,
  subtitulo,
  badge,
  badgeColor = '#8B1E3F',
  contenidoHtml,
  pieExtra,
}: {
  titulo: string
  subtitulo?: string
  badge?: string
  badgeColor?: string
  contenidoHtml: string
  pieExtra?: string
}): string {
  const anio = new Date().getFullYear()

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(titulo)}</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      background-color: #F1F5F9;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      color: #1E293B;
      -webkit-font-smoothing: antialiased;
    }
    .wrapper {
      width: 100%;
      table-layout: fixed;
      background-color: #F1F5F9;
      padding: 32px 12px;
    }
    .main-card {
      max-width: 640px;
      margin: 0 auto;
      background-color: #FFFFFF;
      border-radius: 16px;
      overflow: hidden;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.08);
      border: 1px solid #E2E8F0;
    }
    .header-banner {
      background: linear-gradient(135deg, #7A1A37 0%, #4D1022 100%);
      padding: 32px;
      text-align: left;
      color: #FFFFFF;
      border-bottom: 4px solid #C59B27;
    }
    .header-top {
      font-size: 11px;
      font-weight: 800;
      letter-spacing: 2px;
      text-transform: uppercase;
      color: #F8D57E;
      margin-bottom: 8px;
    }
    .header-title {
      font-size: 22px;
      font-weight: 800;
      margin: 0;
      line-height: 1.25;
      color: #FFFFFF;
    }
    .header-subtitle {
      font-size: 13px;
      color: #FCE7EB;
      margin-top: 6px;
      margin-bottom: 0;
      line-height: 1.4;
    }
    .content-body {
      padding: 32px;
    }
    .badge {
      display: inline-block;
      padding: 6px 14px;
      border-radius: 9999px;
      font-size: 12px;
      font-weight: 700;
      letter-spacing: 0.5px;
      text-transform: uppercase;
      margin-bottom: 20px;
    }
    .folio-box {
      background: linear-gradient(135deg, #FAF5FF 0%, #F3E8FF 100%);
      border: 2px dashed #9333EA;
      border-radius: 12px;
      padding: 16px 20px;
      text-align: center;
      margin-bottom: 24px;
    }
    .folio-label {
      font-size: 11px;
      font-weight: 700;
      color: #6B21A8;
      text-transform: uppercase;
      letter-spacing: 1.5px;
    }
    .folio-value {
      font-size: 22px;
      font-weight: 900;
      color: #581C87;
      letter-spacing: 1px;
      margin-top: 4px;
      font-family: 'Courier New', Courier, monospace;
    }
    .info-table {
      width: 100%;
      border-collapse: collapse;
      margin: 16px 0 24px 0;
      border-radius: 8px;
      overflow: hidden;
      border: 1px solid #E2E8F0;
    }
    .info-table td {
      padding: 11px 16px;
      font-size: 13.5px;
      border-bottom: 1px solid #EDF2F7;
    }
    .info-table tr:last-child td {
      border-bottom: none;
    }
    .label-col {
      width: 34%;
      font-weight: 600;
      color: #475569;
      background-color: #F8FAFC;
      border-right: 1px solid #EDF2F7;
    }
    .val-col {
      color: #0F172A;
    }
    .section-heading {
      font-size: 13px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 1px;
      color: #7A1A37;
      margin: 24px 0 10px 0;
      border-bottom: 2px solid #F1D5DC;
      padding-bottom: 6px;
    }
    .observation-box {
      background-color: #F8FAFC;
      border-left: 4px solid #7A1A37;
      padding: 16px;
      border-radius: 0 8px 8px 0;
      font-size: 13.5px;
      line-height: 1.6;
      color: #334155;
      margin: 12px 0 20px 0;
      white-space: pre-wrap;
    }
    .protocol-box {
      background-color: #F0FDF4;
      border: 1px solid #BBF7D0;
      border-radius: 12px;
      padding: 16px 20px;
      margin: 20px 0;
    }
    .protocol-title {
      font-size: 13px;
      font-weight: 700;
      color: #166534;
      margin-bottom: 10px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .protocol-step {
      font-size: 13px;
      color: #14532D;
      line-height: 1.5;
      margin-bottom: 8px;
    }
    .protocol-step:last-child {
      margin-bottom: 0;
    }
    .footer {
      background-color: #F8FAFC;
      border-top: 1px solid #E2E8F0;
      padding: 24px 32px;
      text-align: center;
      font-size: 12px;
      color: #64748B;
      line-height: 1.6;
    }
    .footer-highlight {
      color: #7A1A37;
      font-weight: 700;
      font-size: 13px;
    }
    .attachment-pill {
      display: inline-block;
      padding: 6px 12px;
      background-color: #EFF6FF;
      color: #1E40AF;
      border: 1px solid #BFDBFE;
      border-radius: 6px;
      font-size: 12px;
      font-weight: 600;
      margin-top: 6px;
      margin-right: 6px;
    }
  </style>
</head>
<body>
  <div class="wrapper">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
      <tr>
        <td align="center">
          <div class="main-card">
            <!-- Header -->
            <div class="header-banner">
              <div class="header-top">Gobierno Municipal de San Pedro Tlaquepaque &bull; POETDUM</div>
              <h1 class="header-title">${escapeHtml(titulo)}</h1>
              ${subtitulo ? `<p class="header-subtitle">${escapeHtml(subtitulo)}</p>` : ''}
            </div>

            <!-- Body -->
            <div class="content-body">
              ${
                badge
                  ? `<div class="badge" style="background-color:${badgeColor}15;color:${badgeColor};border:1px solid ${badgeColor}40;">${escapeHtml(badge)}</div>`
                  : ''
              }
              ${contenidoHtml}
              ${pieExtra ? `<div style="margin-top:20px;">${pieExtra}</div>` : ''}
            </div>

            <!-- Footer -->
            <div class="footer">
              <div class="footer-highlight">Dirección General de Transformación y Planeación Urbana</div>
              <div>Bitácora Ambiental &bull; Programa de Ordenamiento Ecológico y Territorial de San Pedro Tlaquepaque</div>
              <div style="margin-top: 10px; font-size: 11px; color: #94A3B8;">
                Este acuse digital tiene validez oficial de confirmación de recepción ciudadana. &copy; ${anio} San Pedro Tlaquepaque, Jalisco.
              </div>
            </div>
          </div>
        </td>
      </tr>
    </table>
  </div>
</body>
</html>`
}

/**
 * Envía el Acuse de Recibo Oficial formal al ciudadano (modalidad digital o física).
 */
export async function enviarAcuseReciboParticipacion(
  participationId: number,
  para: string,
): Promise<{ enviado: true; adjuntos: number; folio: string }> {
  if (!mailConfigurado()) {
    throw new Error('SMTP_NO_CONFIGURADO')
  }

  const rows = await sql<ParticipacionCorreo[]>`
    SELECT folio, origen, nombre, correo, municipio, colonia, institucion, ocupacion, estado, fuente, genero, tematica, observacion, created_at
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
      // Si el adjunto no se lee, se envía el resumen
    }
  }

  const fechaFormateada = p.created_at
    ? new Date(p.created_at).toLocaleString('es-MX', {
        dateStyle: 'full',
        timeStyle: 'medium',
      })
    : '—'

  const esDigital = p.origen === 'digital'
  const modalidadLabel = esDigital
    ? 'Participación Ciudadana Digital (Vía Portal Web Oficial)'
    : 'Participación Física (Ventanilla Oficial / Oficialía de Partes)'

  const contenidoHtml = `
    <!-- Folio Destacado -->
    <div class="folio-box">
      <div class="folio-label">Folio Oficial Asignado</div>
      <div class="folio-value">${escapeHtml(p.folio)}</div>
    </div>

    <p style="font-size: 14px; line-height: 1.6; color: #334155; margin-top: 0;">
      Estimado(a) <strong>${escapeHtml(p.nombre || 'Ciudadano(a)')}</strong>:
    </p>
    <p style="font-size: 14px; line-height: 1.6; color: #334155;">
      Por medio del presente documento oficial, la <strong>Dirección General de Transformación y Planeación Urbana</strong> del Municipio de San Pedro Tlaquepaque hace constar la <strong>recepción formal</strong> de su propuesta para la elaboración del <em>Programa de Ordenamiento Ecológico y Territorial (POETDUM)</em>.
    </p>

    <!-- Ficha de Datos Recibidos -->
    <div class="section-heading">1. Resumen de la Información Registrada</div>
    <table class="info-table">
      <tr><td class="label-col">Folio de Registro</td><td class="val-col"><strong>${escapeHtml(p.folio)}</strong></td></tr>
      <tr><td class="label-col">Modalidad</td><td class="val-col">${escapeHtml(modalidadLabel)}</td></tr>
      <tr><td class="label-col">Nombre del Promovente</td><td class="val-col">${escapeHtml(p.nombre || '—')}</td></tr>
      <tr><td class="label-col">Correo Registrado</td><td class="val-col">${escapeHtml(p.correo || '—')}</td></tr>
      <tr><td class="label-col">Municipio / Localidad</td><td class="val-col">${escapeHtml(p.municipio || 'San Pedro Tlaquepaque')}</td></tr>
      <tr><td class="label-col">Colonia / Zona de Interés</td><td class="val-col">${escapeHtml(p.colonia || '—')}</td></tr>
      ${p.institucion ? `<tr><td class="label-col">Institución / Organización</td><td class="val-col">${escapeHtml(p.institucion)}</td></tr>` : ''}
      ${p.fuente ? `<tr><td class="label-col">Sector / Actor</td><td class="val-col">${escapeHtml(p.fuente)}</td></tr>` : ''}
      <tr><td class="label-col">Eje Temático</td><td class="val-col"><strong>${escapeHtml(p.tematica || 'General / Medio Ambiente')}</strong></td></tr>
      <tr><td class="label-col">Fecha y Hora de Recepción</td><td class="val-col">${escapeHtml(fechaFormateada)}</td></tr>
      <tr><td class="label-col">Estatus Inicial</td><td class="val-col"><span style="color:#D97706;font-weight:700;">● ${escapeHtml(p.estado || 'En proceso')}</span></td></tr>
    </table>

    <!-- Contenido de la Observación -->
    <div class="section-heading">2. Observación, Propuesta o Planteamiento</div>
    <div class="observation-box">${escapeHtml(p.observacion || '(Sin texto de observación capturado)')}</div>

    <!-- Archivos Adjuntos -->
    ${
      adjuntos.length > 0
        ? `<div class="section-heading">3. Documentos y Anexos Recibidos (${adjuntos.length})</div>
           <div style="margin-bottom: 20px;">${adjuntos.map((a) => `<div class="attachment-pill">📎 ${escapeHtml(a.nombre_original)}</div>`).join(' ')}</div>`
        : ''
    }

    <!-- Protocolo Oficial de Atención -->
    <div class="section-heading">${adjuntos.length > 0 ? '4' : '3'}. Protocolo de Seguimiento y Próximos Pasos</div>
    <div class="protocol-box">
      <div class="protocol-title">Etapas del Proceso de Consulta y Dictamen:</div>
      <div class="protocol-step">✔ <strong>Paso 1: Asignación y Registro:</strong> Su propuesta ha quedado formalmente asentada en la Bitácora Ambiental oficial.</div>
      <div class="protocol-step">⏳ <strong>Paso 2: Análisis Técnico y Vectorial:</strong> El Comité Técnico del POETDUM evaluará la viabilidad ambiental, territorial y normativa del planteamiento.</div>
      <div class="protocol-step">📋 <strong>Paso 3: Integración y Respuesta:</strong> Se integrará en la memoria técnica del programa y se emitirá el dictamen de procedencia correspondiente.</div>
    </div>

    <p style="font-size: 12.5px; color: #64748B; line-height: 1.5; margin-top: 16px;">
      <em>Fundamento: Artículos 19, 20 y 20 BIS de la Ley General del Equilibrio Ecológico y la Protección al Ambiente, y el Reglamento de Planeación y Ordenamiento Territorial de San Pedro Tlaquepaque, Jalisco.</em>
    </p>
  `

  const html = renderPlantillaBase({
    titulo: `Acuse Oficial de Participación`,
    subtitulo: `Confirmación de Recepción y Registro en la Bitácora Ambiental`,
    badge: `Folio: ${p.folio}`,
    badgeColor: '#7A1A37',
    contenidoHtml,
  })

  const transporter = getTransporter()
  await transporter.sendMail({
    from: MAIL_FROM,
    to: para,
    subject: `[Acuse Oficial POETDUM] Recepción de Participación Ciudadana — Folio ${p.folio}`,
    html,
    attachments,
  })

  return { enviado: true, adjuntos: attachments.length, folio: p.folio }
}

interface ResolucionCorreo extends ParticipacionCorreo {
  resolucion_motivo: string
  resolucion_direccion: string
  resolucion_cita: string
}

/**
 * Envía al ciudadano el DICTAMEN de su participación: si procede o no, por qué,
 * y —cuando procede— a qué oficina debe acudir y en qué horario.
 *
 * Es distinto del acuse: el acuse confirma que llegó, esto le dice en qué acabó.
 */
export async function enviarResolucionParticipacion(
  participationId: number,
  para: string,
): Promise<{ enviado: true; folio: string; estado: string }> {
  if (!mailConfigurado()) {
    throw new Error('SMTP_NO_CONFIGURADO')
  }

  const rows = await sql<ResolucionCorreo[]>`
    SELECT folio, origen, nombre, correo, municipio, colonia, institucion, ocupacion,
           estado, fuente, genero, tematica, observacion, created_at,
           resolucion_motivo, resolucion_direccion, resolucion_cita
    FROM participations WHERE id = ${participationId}
  `
  if (rows.length === 0) throw new Error('NO_ENCONTRADA')
  const p = rows[0]

  if (p.estado !== 'Procedente' && p.estado !== 'No procedente') {
    throw new Error('SIN_DICTAMEN')
  }

  const procede = p.estado === 'Procedente'
  const color = procede ? '#16A34A' : '#B91C1C'

  const bloqueCita =
    procede && (p.resolucion_direccion || p.resolucion_cita)
      ? `
    <div class="section-heading">3. Dónde y cuándo debe presentarse</div>
    <div class="protocol-box">
      ${
        p.resolucion_direccion
          ? `<div class="protocol-step">📍 <strong>Domicilio:</strong> ${escapeHtml(p.resolucion_direccion)}</div>`
          : ''
      }
      ${
        p.resolucion_cita
          ? `<div class="protocol-step">🕒 <strong>Día y horario de atención:</strong> ${escapeHtml(p.resolucion_cita)}</div>`
          : ''
      }
      <div class="protocol-step">🪪 <strong>Presente este correo</strong> junto con una identificación oficial vigente. El folio <strong>${escapeHtml(p.folio)}</strong> es su referencia para cualquier trámite o aclaración.</div>
    </div>`
      : ''

  const contenidoHtml = `
    <div class="folio-box">
      <div class="folio-label">Folio de la participación dictaminada</div>
      <div class="folio-value">${escapeHtml(p.folio)}</div>
    </div>

    <p style="font-size: 14px; line-height: 1.6; color: #334155; margin-top: 0;">
      Estimado(a) <strong>${escapeHtml(p.nombre || 'Ciudadano(a)')}</strong>:
    </p>
    <p style="font-size: 14px; line-height: 1.6; color: #334155;">
      La <strong>Dirección General de Transformación y Planeación Urbana</strong> del Municipio de
      San Pedro Tlaquepaque le comunica que su participación, registrada con el folio
      <strong>${escapeHtml(p.folio)}</strong>, ha sido analizada por el Comité Técnico del
      <em>Programa de Ordenamiento Ecológico y Territorial (POETDUM)</em> y se ha emitido la
      resolución correspondiente.
    </p>

    <div class="section-heading">1. Resolución</div>
    <table class="info-table">
      <tr>
        <td class="label-col">Dictamen</td>
        <td class="val-col"><span style="color:${color};font-weight:800;">● ${escapeHtml(p.estado)}</span></td>
      </tr>
      <tr><td class="label-col">Folio</td><td class="val-col"><strong>${escapeHtml(p.folio)}</strong></td></tr>
      <tr><td class="label-col">Eje temático</td><td class="val-col">${escapeHtml(p.tematica || 'General / Medio Ambiente')}</td></tr>
      <tr><td class="label-col">Fecha de resolución</td><td class="val-col">${escapeHtml(new Date().toLocaleString('es-MX', { dateStyle: 'full' }))}</td></tr>
    </table>

    <div class="section-heading">2. Fundamento y consideraciones</div>
    <div class="observation-box">${escapeHtml(
      p.resolucion_motivo || '(La autoridad no capturó un motivo detallado para esta resolución.)',
    )}</div>
    ${bloqueCita}

    <div class="section-heading">${bloqueCita ? '4' : '3'}. Su planteamiento original</div>
    <div class="observation-box">${escapeHtml(p.observacion || '(Sin texto de observación capturado)')}</div>

    <p style="font-size: 12.5px; color: #64748B; line-height: 1.5; margin-top: 16px;">
      <em>Fundamento: Artículos 19, 20 y 20 BIS de la Ley General del Equilibrio Ecológico y la
      Protección al Ambiente, y el Reglamento de Planeación y Ordenamiento Territorial de
      San Pedro Tlaquepaque, Jalisco.</em>
    </p>
  `

  const html = renderPlantillaBase({
    titulo: procede ? 'Su participación fue aceptada' : 'Resolución de su participación',
    subtitulo: 'Dictamen del Comité Técnico · Bitácora Ambiental POETDUM',
    badge: p.estado,
    badgeColor: color,
    contenidoHtml,
  })

  const transporter = getTransporter()
  await transporter.sendMail({
    from: MAIL_FROM,
    to: para,
    subject: `[Resolución POETDUM] Participación ${p.folio} — ${p.estado}`,
    html,
  })

  return { enviado: true, folio: p.folio, estado: p.estado }
}

/**
 * Envía por correo la participación (función estándar de reenvío).
 */
export async function enviarParticipacion(
  participationId: number,
  para: string,
): Promise<{ enviado: true; adjuntos: number }> {
  const res = await enviarAcuseReciboParticipacion(participationId, para)
  return { enviado: true, adjuntos: res.adjuntos }
}

/**
 * Envía por correo un Aviso institucional oficial.
 */
export async function enviarAviso(avisoId: number, para: string): Promise<{ enviado: true }> {
  if (!mailConfigurado()) {
    throw new Error('SMTP_NO_CONFIGURADO')
  }

  const rows = await sql<AvisoCorreo[]>`
    SELECT id, titulo, descripcion, activo, created_at
    FROM avisos WHERE id = ${avisoId}
  `
  if (rows.length === 0) throw new Error('NO_ENCONTRADO')
  const av = rows[0]

  const fechaFormateada = av.created_at
    ? new Date(av.created_at).toLocaleString('es-MX', {
        dateStyle: 'full',
      })
    : '—'

  const contenidoHtml = `
    <div class="section-heading">Comunicado Oficial</div>
    <div style="font-size: 18px; font-weight: 800; color: #1E293B; margin: 16px 0 8px 0;">
      ${escapeHtml(av.titulo)}
    </div>
    <div style="font-size: 13px; color: #64748B; margin-bottom: 18px;">
      📅 Publicación Oficial: ${escapeHtml(fechaFormateada)}
    </div>
    <div class="observation-box">
      ${escapeHtml(av.descripcion || '(Sin detalles adicionales)')}
    </div>
    <div class="protocol-box">
      <div class="protocol-title">Información para los participantes:</div>
      <div class="protocol-step">Este aviso forma parte del proceso participativo del Programa de Ordenamiento Ecológico Local (POEL) de San Pedro Tlaquepaque. Puedes consultar el calendario completo de actividades y bitácora en el portal oficial.</div>
    </div>
  `

  const html = renderPlantillaBase({
    titulo: 'Aviso Oficial de la Bitácora Ambiental',
    subtitulo: 'Programa de Ordenamiento Ecológico y Territorial (POETDUM)',
    badge: 'Aviso Activo',
    badgeColor: '#16A34A',
    contenidoHtml,
  })

  const transporter = getTransporter()
  await transporter.sendMail({
    from: MAIL_FROM,
    to: para,
    subject: `[Aviso Oficial POETDUM Tlaquepaque] ${av.titulo}`,
    html,
  })

  return { enviado: true }
}

/**
 * Envía un correo de prueba de verificación de conexión SMTP.
 */
export async function enviarCorreoPrueba(para: string): Promise<{ enviado: true }> {
  if (!mailConfigurado()) {
    throw new Error('SMTP_NO_CONFIGURADO')
  }

  const contenidoHtml = `
    <div class="section-heading">Verificación de Conectividad SMTP</div>
    <p style="font-size: 14px; line-height: 1.6; color: #334155;">
      Este es un correo de prueba enviado desde el sistema de <strong>Bitácora Ambiental y Ordenamiento Territorial de Tlaquepaque</strong>.
    </p>
    <div class="observation-box">
      <strong>Servidor SMTP:</strong> ${escapeHtml(SMTP_HOST)}<br>
      <strong>Puerto:</strong> ${SMTP_PORT}<br>
      <strong>Remitente configurado:</strong> ${escapeHtml(MAIL_FROM)}<br>
      <strong>Fecha y hora:</strong> ${new Date().toLocaleString('es-MX', { timeStyle: 'medium', dateStyle: 'full' })}
    </div>
    <p style="font-size: 13px; color: #16A34A; font-weight: 600;">
      ✔ Todos los componentes del servicio de mensajería están operando correctamente.
    </p>
  `

  const html = renderPlantillaBase({
    titulo: 'Prueba de Sistema de Correo',
    subtitulo: 'Validación de servidor y configuración SMTP',
    badge: 'Prueba Exitosa',
    badgeColor: '#16A34A',
    contenidoHtml,
  })

  const transporter = getTransporter()
  await transporter.sendMail({
    from: MAIL_FROM,
    to: para,
    subject: `[Bitácora Ambiental] Verificación de Sistema de Correo`,
    html,
  })

  return { enviado: true }
}

function escapeHtml(s: string): string {
  return String(s).replace(
    /[&<>"']/g,
    (c) =>
      ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;',
      })[c] ?? c,
  )
}
