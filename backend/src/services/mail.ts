import nodemailer from 'nodemailer'

import { sql } from '../db/pool.ts'
import { obtenerActividadGestion } from './actividades.ts'
import { datosDeParticipacion } from './acuse-datos.ts'
import {
  filasDelAcuse,
  generarAcuse,
  nombreArchivoAcuse,
  SIN_ADJUNTOS,
  TEXTOS_ACUSE,
} from './acuse.ts'
import { textoDeOpcion } from './participacion-campos.ts'

const SMTP_HOST = process.env.SMTP_HOST || '127.0.0.1'
const SMTP_PORT = Number(process.env.SMTP_PORT || 25)
const SMTP_USER = process.env.SMTP_USER || ''
const SMTP_PASS = process.env.SMTP_PASS || ''
const MAIL_FROM =
  process.env.MAIL_FROM ||
  (SMTP_USER
    ? `"Bitácora Tlaquepaque" <${SMTP_USER}>`
    : '"Bitácora Tlaquepaque" <no-reply@tlaquepaque.gob.mx>')

/**
 * Remitente de los acuses y de las notificaciones de la consulta pública, para
 * que las personas que participan vean ese origen en lo que reciben. Debe ser un
 * buzón que el servidor SMTP tenga autorizado para enviar (ver DEPLOY.md).
 */
export const REMITENTE_CONSULTA =
  process.env.MAIL_FROM_CONSULTA ||
  '"Consulta pública POETDUM" <consulta.poetdum@tlaquepaque.gob.mx>'

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
    // `requireTLS: true` exige STARTTLS y rompe con Postfix sin TLS (502 5.5.1
    // Error: command not implemented) como el del host 172.19.0.1:25.
    // Usamos TLS oportunista: si el servidor anuncia STARTTLS lo usa, si no
    // manda en claro (red interna). Solo se exige TLS en 587/465.
    requireTLS: SMTP_PORT === 587 || SMTP_PORT === 465,
    // Para puerto 25 sin TLS (relay interno) no intentes STARTTLS.
    tls: SMTP_PORT === 25 ? { rejectUnauthorized: false } : undefined,
  }
  // nodemailer ignora `tls: undefined`, lo dejamos limpio
  if (!options.tls) delete (options as Record<string, unknown>).tls
  if (SMTP_PORT === 25) {
    // En 25 deshabilitamos el intento de upgrade; sin esto nodemailer
    // igual intenta STARTTLS si el banner lo ofrece y falla con 502.
    ;(options as Record<string, unknown>).ignoreTLS = true
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
  pieEntidad = 'Dirección de Medio Ambiente y Ecología',
}: {
  titulo: string
  subtitulo?: string
  badge?: string
  badgeColor?: string
  contenidoHtml: string
  pieExtra?: string
  /** Dependencia que firma el pie. Los mensajes de la consulta pública llevan la que recibe y responde. */
  pieEntidad?: string
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
      /* El contenedor es una celda centrada: sin esto, párrafos y tablas heredan el centrado. */
      text-align: left;
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
              ${pieExtra ? `<div style="margin-top:20px;">${escapeHtml(pieExtra)}</div>` : ''}
            </div>

            <!-- Footer -->
            <div class="footer">
              <div class="footer-highlight">${escapeHtml(pieEntidad)}</div>
              <div>Bitácora &bull; Programa de Ordenamiento Ecológico y Territorial de San Pedro Tlaquepaque</div>
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

const DIRECCION_RESPONSABLE = 'Dirección de Gestión Territorial y Planeación Urbana'

/** Asunto del correo de confirmación que acompaña al acuse. */
export const asuntoAcuse = (folio: string) =>
  `Acuse de recepción de tu participación · Folio ${folio}`

/** Una fila de la tabla de información del correo. */
const filaDeCorreo = (etiqueta: string, valor: string) =>
  `<tr><td class="label-col">${escapeHtml(etiqueta)}</td><td class="val-col">${escapeHtml(valor || '—')}</td></tr>`

/**
 * Envía al participante la confirmación de su participación: toda la
 * información registrada —incluidos los datos complementarios, que no van en el
 * acuse— y el acuse en PDF adjunto. Sale de `REMITENTE_CONSULTA`.
 */
export async function enviarAcuseReciboParticipacion(
  participationId: string,
  para: string,
  /** De dónde salen los datos; las pruebas pasan los suyos en vez de leer la base. */
  cargar: typeof datosDeParticipacion = datosDeParticipacion,
): Promise<{ enviado: true; adjuntos: number; folio: string }> {
  if (!mailConfigurado()) {
    throw new Error('SMTP_NO_CONFIGURADO')
  }

  const p = await cargar({ id: participationId })
  if (!p) throw new Error('NO_ENCONTRADA')

  const { pdf } = await generarAcuse(p)

  const filas = [
    ...filasDelAcuse(p),
    ['Tipo de participante', textoDeOpcion(p.fuente, p.fuente_otra)],
    ['Género', p.genero],
    ['Domicilio de quien participa', p.domicilio],
    ['Municipio de residencia', p.municipio_participante],
    ['Ocupación o puesto', p.ocupacion],
  ] as Array<[string, string]>

  const adjuntosHtml =
    p.adjuntos.length > 0
      ? p.adjuntos.map((n) => `<div class="attachment-pill">📎 ${escapeHtml(n)}</div>`).join(' ')
      : `<p style="font-size:13.5px;color:#475569;margin:0;">${escapeHtml(SIN_ADJUNTOS)}</p>`

  const contenidoHtml = `
    <div class="folio-box">
      <div class="folio-label">Tu folio</div>
      <div class="folio-value">${escapeHtml(p.folio)}</div>
      <div style="font-size:12px;color:#6B21A8;margin-top:6px;">${escapeHtml(TEXTOS_ACUSE.folioNota)}</div>
    </div>

    <p style="font-size: 14px; line-height: 1.6; color: #334155; margin-top: 0;">
      <strong>Hola, ${escapeHtml(p.nombre || 'participante')}:</strong>
    </p>
    <p style="font-size: 14px; line-height: 1.6; color: #334155;">
      ${escapeHtml(TEXTOS_ACUSE.intro)} Adjuntamos tu acuse de recepción en formato PDF.
    </p>
    <p style="font-size: 12.5px; color: #64748B; line-height: 1.5;">${escapeHtml(TEXTOS_ACUSE.aviso)}</p>

    <div class="section-heading">${escapeHtml(TEXTOS_ACUSE.informacion)}</div>
    <table class="info-table">
      ${filas.map(([etiqueta, valor]) => filaDeCorreo(etiqueta, valor)).join('\n      ')}
    </table>

    <div class="section-heading">${escapeHtml(TEXTOS_ACUSE.observacion)}</div>
    <div class="observation-box">${escapeHtml(p.observacion)}</div>
    <p style="font-size: 12.5px; color: #64748B; line-height: 1.5;">${escapeHtml(TEXTOS_ACUSE.publicas)}</p>

    <div class="section-heading">${escapeHtml(TEXTOS_ACUSE.adjuntos)}</div>
    <div style="margin-bottom: 20px;">${adjuntosHtml}</div>

    <div class="section-heading">${escapeHtml(TEXTOS_ACUSE.queSigue)}</div>
    <div class="protocol-box">
      ${TEXTOS_ACUSE.pasos
        .map(
          ([cabeza, cuerpo]) =>
            `<div class="protocol-step"><strong>${escapeHtml(cabeza)}:</strong> ${escapeHtml(cuerpo)}</div>`,
        )
        .join('\n      ')}
    </div>

    <div class="section-heading">${escapeHtml(TEXTOS_ACUSE.consulta)}</div>
    <p style="font-size: 13.5px; line-height: 1.6; color: #334155;">${escapeHtml(TEXTOS_ACUSE.consulta1)}</p>
    <p style="font-size: 13.5px; line-height: 1.6; color: #334155;">${escapeHtml(TEXTOS_ACUSE.consulta2)}</p>
  `

  const html = renderPlantillaBase({
    titulo: TEXTOS_ACUSE.titulo,
    subtitulo: TEXTOS_ACUSE.subtitulo,
    badge: `Folio: ${p.folio}`,
    badgeColor: '#7A1A37',
    contenidoHtml,
    pieEntidad: DIRECCION_RESPONSABLE,
  })

  const transporter = getTransporter()
  await transporter.sendMail({
    from: REMITENTE_CONSULTA,
    to: para,
    subject: asuntoAcuse(p.folio),
    html,
    attachments: [
      { filename: nombreArchivoAcuse(p.folio), content: pdf, contentType: 'application/pdf' },
    ],
  })

  return { enviado: true, adjuntos: 1, folio: p.folio }
}

/** Asunto del correo con la respuesta del área responsable. */
export const asuntoRespuesta = (folio: string) => `Respuesta a tu participación · Folio ${folio}`

/** El texto acordado del correo: avisa dónde recoger la respuesta y que el oficio va adjunto. */
export const textoRespuesta = (folio: string) =>
  `La respuesta correspondiente a su participación, registrada con el folio ${folio}, se encuentra disponible para recoger en las oficinas de la ${DIRECCION_RESPONSABLE}. Se adjunta el oficio de respuesta en formato PDF.`

/**
 * Envía a quien participó la notificación de que su respuesta está lista para
 * recoger, con el oficio de respuesta íntegro en PDF adjunto. Sale de
 * `REMITENTE_CONSULTA`. El oficio es el documento íntegro y firmado, no la
 * versión pública que se muestra en el portal.
 */
export async function enviarCorreoRespuesta(input: {
  para: string
  folio: string
  oficio: Buffer
  nombreArchivo: string
}): Promise<{ asunto: string }> {
  if (!mailConfigurado()) {
    throw new Error('SMTP_NO_CONFIGURADO')
  }

  const asunto = asuntoRespuesta(input.folio)
  const contenidoHtml = `
    <div class="folio-box">
      <div class="folio-label">Folio de tu participación</div>
      <div class="folio-value">${escapeHtml(input.folio)}</div>
    </div>
    <p style="font-size: 15px; line-height: 1.7; color: #334155;">
      ${escapeHtml(textoRespuesta(input.folio))}
    </p>
  `
  const html = renderPlantillaBase({
    titulo: 'Respuesta a tu participación',
    subtitulo: 'Consulta pública del Proyecto del Programa',
    badge: `Folio: ${input.folio}`,
    badgeColor: '#7A1A37',
    contenidoHtml,
    pieEntidad: DIRECCION_RESPONSABLE,
  })

  const transporter = getTransporter()
  await transporter.sendMail({
    from: REMITENTE_CONSULTA,
    to: input.para,
    subject: asunto,
    html,
    attachments: [
      { filename: input.nombreArchivo, content: input.oficio, contentType: 'application/pdf' },
    ],
  })
  return { asunto }
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
  participationId: string,
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
      La <strong>Dirección de Medio Ambiente y Ecología</strong> del Municipio de
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
    subtitulo: 'Dictamen del Comité Técnico · Bitácora POETDUM',
    badge: p.estado,
    badgeColor: color,
    contenidoHtml,
  })

  const transporter = getTransporter()
  await transporter.sendMail({
    from: REMITENTE_CONSULTA,
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
  participationId: string,
  para: string,
): Promise<{ enviado: true; adjuntos: number }> {
  const res = await enviarAcuseReciboParticipacion(participationId, para)
  return { enviado: true, adjuntos: res.adjuntos }
}

const MESES_CORREO = [
  'enero',
  'febrero',
  'marzo',
  'abril',
  'mayo',
  'junio',
  'julio',
  'agosto',
  'septiembre',
  'octubre',
  'noviembre',
  'diciembre',
]

/** '2026-09-20' → '20 de septiembre de 2026', sin pasar por la zona horaria del servidor. */
function fechaLargaCorreo(iso: string): string {
  const [anio, mes, dia] = iso.split('-').map(Number)
  return `${dia} de ${MESES_CORREO[mes - 1] ?? ''} de ${anio}`
}

/**
 * Envía por correo el aviso de una actividad del Programa. Todo sale del mismo
 * registro: título y descripción del aviso (o los de la actividad, si el aviso
 * no tiene los suyos), fecha, horario y lugar.
 *
 * `urlPortal` es el origen público del portal con su prefijo (APP_PUBLIC_URL +
 * BASE_PATH). El enlace a la ficha solo se incluye si la actividad está
 * publicada: un borrador daría «no encontrado» a quien lo abra.
 */
export async function enviarAviso(
  actividadId: string,
  para: string,
  urlPortal: string,
): Promise<{ enviado: true }> {
  if (!mailConfigurado()) {
    throw new Error('SMTP_NO_CONFIGURADO')
  }

  const actividad = await obtenerActividadGestion(actividadId)
  if (!actividad) throw new Error('NO_ENCONTRADO')

  const titulo = actividad.aviso_titulo || actividad.titulo
  const descripcion = actividad.aviso_descripcion || actividad.descripcion
  const horario = [actividad.hora_inicio, actividad.hora_fin].filter(Boolean).join(' – ')
  const cuando = [fechaLargaCorreo(actividad.fecha), horario].filter(Boolean).join(' · ')
  const enlace =
    actividad.publicacion === 'publicado'
      ? `${urlPortal}/poetdum/actividades/${encodeURIComponent(actividad.id)}`
      : ''

  const contenidoHtml = `
    <div class="section-heading">Aviso del Programa</div>
    <div style="font-size: 18px; font-weight: 800; color: #1E293B; margin: 16px 0 8px 0;">
      ${escapeHtml(titulo)}
    </div>
    <div style="font-size: 13px; color: #64748B; margin-bottom: 18px;">
      📅 ${escapeHtml(actividad.titulo)} — ${escapeHtml(cuando)}${
        actividad.lugar ? ` · 📍 ${escapeHtml(actividad.lugar)}` : ''
      }
    </div>
    <div class="observation-box">
      ${escapeHtml(descripcion || '(Sin detalles adicionales)')}
    </div>
    ${
      enlace
        ? `<p style="margin: 18px 0;"><a href="${escapeHtml(enlace)}" style="color: #8C1D3D; font-weight: 700;">Consultar la actividad en el portal</a></p>`
        : ''
    }
    <div class="protocol-box">
      <div class="protocol-title">Información para la ciudadanía:</div>
      <div class="protocol-step">Este aviso forma parte del proceso del Programa de Ordenamiento Ecológico Territorial y de Desarrollo Urbano de San Pedro Tlaquepaque. En el portal puedes consultar el calendario de actividades y los avances del Programa.</div>
    </div>
  `

  const html = renderPlantillaBase({
    titulo: 'Aviso de la Bitácora',
    subtitulo: 'Programa de Ordenamiento Ecológico Territorial y de Desarrollo Urbano (POETDUM)',
    badge: 'Aviso',
    badgeColor: '#16A34A',
    contenidoHtml,
  })

  const transporter = getTransporter()
  await transporter.sendMail({
    from: MAIL_FROM,
    to: para,
    subject: `[Aviso POETDUM Tlaquepaque] ${titulo}`,
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
      Este es un correo de prueba enviado desde el sistema de <strong>Bitácora de Ordenamiento Territorial de Tlaquepaque</strong>.
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
    subject: `[Bitácora] Verificación de Sistema de Correo`,
    html,
  })

  return { enviado: true }
}

/**
 * Envía el enlace de recuperación de contraseña.
 *
 * El enlace lo construye quien llama a partir de `APP_PUBLIC_URL` (ver app.ts):
 * este módulo no inventa dominios, solo escribe el correo. La URL se escapa
 * como cualquier otro dato antes de entrar al HTML.
 */
export async function enviarCorreoRecuperacion(input: {
  para: string
  nombre: string
  url: string
  expiraMinutos: number
}): Promise<{ enviado: true }> {
  if (!mailConfigurado()) {
    throw new Error('SMTP_NO_CONFIGURADO')
  }

  const url = escapeHtml(input.url)

  const contenidoHtml = `
    <p style="font-size: 14px; line-height: 1.6; color: #334155; margin-top: 0;">
      Estimado(a) <strong>${escapeHtml(input.nombre || 'usuario(a)')}</strong>:
    </p>
    <p style="font-size: 14px; line-height: 1.6; color: #334155;">
      Recibimos una solicitud para restablecer la contraseña de la cuenta asociada a
      <strong>${escapeHtml(input.para)}</strong> en la <strong>Bitácora</strong> del
      Municipio de San Pedro Tlaquepaque. Para elegir una contraseña nueva, use el siguiente botón:
    </p>

    <div style="text-align:center; margin: 28px 0;">
      <a href="${url}"
         style="display:inline-block; padding:14px 28px; background:#7A1A37; color:#FFFFFF;
                font-size:15px; font-weight:700; text-decoration:none; border-radius:10px;
                letter-spacing:0.3px;">
        Restablecer mi contraseña
      </a>
    </div>

    <p style="font-size: 12.5px; line-height: 1.6; color: #64748B; text-align:center;">
      Si el botón no funciona, copie y pegue esta dirección en su navegador:<br>
      <span style="word-break:break-all; color:#7A1A37;">${url}</span>
    </p>

    <div class="protocol-box" style="background-color:#FFFBEB; border-color:#FDE68A;">
      <div class="protocol-title" style="color:#92400E;">Importante</div>
      <div class="protocol-step" style="color:#78350F;">⏱ El enlace vence en <strong>${input.expiraMinutos} minutos</strong> y solo puede usarse una vez.</div>
      <div class="protocol-step" style="color:#78350F;">🔒 Si usted no solicitó este cambio, ignore este mensaje: su contraseña actual sigue siendo válida.</div>
      <div class="protocol-step" style="color:#78350F;">✉️ Nunca comparta este enlace; quien lo tenga puede entrar a su cuenta.</div>
    </div>
  `

  const html = renderPlantillaBase({
    titulo: 'Restablecer su contraseña',
    subtitulo: 'Solicitud de recuperación de acceso · Bitácora',
    badge: 'Enlace temporal',
    badgeColor: '#7A1A37',
    contenidoHtml,
  })

  const transporter = getTransporter()
  await transporter.sendMail({
    from: MAIL_FROM,
    to: input.para,
    subject: '[Bitácora] Restablecimiento de contraseña',
    html,
  })

  return { enviado: true }
}

/**
 * Pide confirmación en la dirección NUEVA antes de cambiar el correo de la
 * cuenta. Va a la dirección nueva justamente porque de eso se trata: probar
 * que quien la escribió puede leerla.
 */
export async function enviarConfirmacionCorreoNuevo(input: {
  para: string
  nombre: string
  url: string
  expiraMinutos: number
  emailAnterior: string
}): Promise<{ enviado: true }> {
  if (!mailConfigurado()) {
    throw new Error('SMTP_NO_CONFIGURADO')
  }

  const url = escapeHtml(input.url)

  const contenidoHtml = `
    <p style="font-size: 14px; line-height: 1.6; color: #334155; margin-top: 0;">
      Estimado(a) <strong>${escapeHtml(input.nombre || 'usuario(a)')}</strong>:
    </p>
    <p style="font-size: 14px; line-height: 1.6; color: #334155;">
      Se solicitó cambiar el correo de acceso de la cuenta
      <strong>${escapeHtml(input.emailAnterior)}</strong> a esta dirección, en la
      <strong>Bitácora</strong> del Municipio de San Pedro Tlaquepaque.
      El cambio <strong>todavía no se ha aplicado</strong>: se aplicará cuando confirme aquí.
    </p>

    <div style="text-align:center; margin: 28px 0;">
      <a href="${url}"
         style="display:inline-block; padding:14px 28px; background:#7A1A37; color:#FFFFFF;
                font-size:15px; font-weight:700; text-decoration:none; border-radius:10px;
                letter-spacing:0.3px;">
        Confirmar este correo
      </a>
    </div>

    <p style="font-size: 12.5px; line-height: 1.6; color: #64748B; text-align:center;">
      Si el botón no funciona, copie y pegue esta dirección en su navegador:<br>
      <span style="word-break:break-all; color:#7A1A37;">${url}</span>
    </p>

    <div class="protocol-box" style="background-color:#FFFBEB; border-color:#FDE68A;">
      <div class="protocol-title" style="color:#92400E;">Importante</div>
      <div class="protocol-step" style="color:#78350F;">⏱ El enlace vence en <strong>${input.expiraMinutos} minutos</strong> y solo puede usarse una vez.</div>
      <div class="protocol-step" style="color:#78350F;">✉️ Hasta que confirme, el acceso sigue siendo con <strong>${escapeHtml(input.emailAnterior)}</strong>.</div>
      <div class="protocol-step" style="color:#78350F;">🔒 Si usted no solicitó este cambio, ignore este mensaje: sin la confirmación no ocurre nada.</div>
    </div>
  `

  const html = renderPlantillaBase({
    titulo: 'Confirme su nuevo correo',
    subtitulo: 'Cambio de dirección de acceso · Bitácora',
    badge: 'Pendiente de confirmar',
    badgeColor: '#7A1A37',
    contenidoHtml,
  })

  const transporter = getTransporter()
  await transporter.sendMail({
    from: MAIL_FROM,
    to: input.para,
    subject: '[Bitácora] Confirme su nuevo correo de acceso',
    html,
  })

  return { enviado: true }
}

/**
 * Avisa a la dirección ANTERIOR de que la cuenta ya usa otra. Es la red de
 * seguridad del flujo: si el cambio no lo pidió el dueño, este mensaje llega
 * al único buzón que el atacante ya no controla.
 */
export async function enviarAvisoCorreoCambiado(input: {
  para: string
  nombre: string
  emailNuevo: string
}): Promise<{ enviado: true }> {
  if (!mailConfigurado()) {
    throw new Error('SMTP_NO_CONFIGURADO')
  }

  const contenidoHtml = `
    <p style="font-size: 14px; line-height: 1.6; color: #334155; margin-top: 0;">
      Estimado(a) <strong>${escapeHtml(input.nombre || 'usuario(a)')}</strong>:
    </p>
    <p style="font-size: 14px; line-height: 1.6; color: #334155;">
      El correo de acceso de su cuenta en la <strong>Bitácora</strong> cambió
      de <strong>${escapeHtml(input.para)}</strong> a <strong>${escapeHtml(input.emailNuevo)}</strong>.
      A partir de ahora deberá iniciar sesión con la dirección nueva.
    </p>

    <div class="protocol-box" style="background-color:#FEF2F2; border-color:#FECACA;">
      <div class="protocol-title" style="color:#991B1B;">¿No fue usted?</div>
      <div class="protocol-step" style="color:#7F1D1D;">Comuníquese de inmediato con la Dirección de Medio Ambiente y Ecología para que se restablezca el acceso de su cuenta.</div>
      <div class="protocol-step" style="color:#7F1D1D;">Este aviso se envía a la dirección anterior precisamente para que un cambio no autorizado no pase desapercibido.</div>
    </div>
  `

  const html = renderPlantillaBase({
    titulo: 'El correo de su cuenta cambió',
    subtitulo: 'Aviso de seguridad · Bitácora',
    badge: 'Aviso de seguridad',
    badgeColor: '#B91C1C',
    contenidoHtml,
  })

  const transporter = getTransporter()
  await transporter.sendMail({
    from: MAIL_FROM,
    to: input.para,
    subject: '[Bitácora] El correo de acceso de su cuenta cambió',
    html,
  })

  return { enviado: true }
}

export function escapeHtml(s: string): string {
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
