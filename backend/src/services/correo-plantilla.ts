/** Plantilla institucional: tablas de presentación y estilos esenciales en línea para correo. */
export function escaparCorreo(valor: string): string {
  return String(valor).replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!,
  )
}

const ESTILOS: Record<string, string> = {
  'folio-box':
    'background:#faf6f0;border:1px solid #dcc9a4;border-top:4px solid #b28b46;border-radius:12px;padding:22px;text-align:center;margin:0 0 28px;',
  'folio-label':
    'font:700 11px Arial,sans-serif;letter-spacing:1.8px;text-transform:uppercase;color:#765b2a;',
  'folio-value':
    'font:700 24px Courier New,monospace;color:#741c3c;letter-spacing:1px;overflow-wrap:anywhere;margin-top:10px;',
  'info-table':
    'width:100%;border-collapse:collapse;table-layout:fixed;border:1px solid #e3e7ee;margin:14px 0 28px;',
  'label-col':
    'width:34%;background:#f5f7fa;color:#506078;font:600 13px Arial,sans-serif;padding:12px 14px;border-bottom:1px solid #e3e7ee;text-align:left;vertical-align:top;',
  'val-col':
    'color:#17263b;font:400 15px Arial,sans-serif;line-height:1.6;padding:12px 14px;border-bottom:1px solid #e3e7ee;overflow-wrap:anywhere;word-wrap:break-word;vertical-align:top;',
  'section-heading':
    'font:700 12px Arial,sans-serif;color:#741c3c;letter-spacing:1.5px;text-transform:uppercase;margin:28px 0 12px;',
  'observation-box':
    'background:#f6f7fa;border-left:4px solid #8b2445;border-radius:0 10px 10px 0;padding:20px;font:400 15px Arial,sans-serif;line-height:1.7;color:#26364b;white-space:pre-wrap;overflow-wrap:anywhere;',
  'protocol-box':
    'background:#f1f6f4;border:1px solid #d5e5dd;border-radius:12px;padding:20px 22px;margin:18px 0 28px;',
  'protocol-title':
    'font:700 12px Arial,sans-serif;letter-spacing:1px;color:#275245;margin-bottom:12px;',
  'protocol-step':
    'font:400 14px Arial,sans-serif;line-height:1.7;color:#275245;margin-bottom:10px;',
  'attachment-pill':
    'display:inline-block;background:#f0f3f8;color:#33475e;border:1px solid #dbe2ec;border-radius:6px;padding:8px 12px;font:400 13px Arial,sans-serif;margin:4px 6px 4px 0;overflow-wrap:anywhere;',
}

/** Solo procesa clases del HTML generado por nuestras plantillas; los datos se escapan antes. */
function estilosEnLinea(html: string): string {
  return html.replace(
    /<([a-z][a-z0-9]*)([^>]*\bclass="([^"]+)"[^>]*)>/gi,
    (tag, nombre, atributos, clases) => {
      const css = (clases as string)
        .split(/\s+/)
        .map((c) => ESTILOS[c] ?? '')
        .join('')
      if (!css) return tag
      const props = /\bstyle="/.test(atributos)
        ? atributos.replace(/\bstyle="/, `style="${css}`)
        : `${atributos} style="${css}"`
      return `<${nombre}${props}>`
    },
  )
}

export interface PlantillaCorreo {
  titulo: string
  subtitulo?: string
  badge?: string
  badgeColor?: string
  contenidoHtml: string
  pieExtra?: string
  pieEntidad?: string
  leyenda?: string
}

export function renderPlantillaBase({
  titulo,
  subtitulo,
  badge,
  contenidoHtml,
  pieExtra,
  pieEntidad = 'Dirección de Medio Ambiente y Ecología',
  leyenda = '',
}: PlantillaCorreo): string {
  const e = escaparCorreo
  const preheader = [titulo, subtitulo, badge].filter(Boolean).join(' · ')
  return `<!DOCTYPE html>
<html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light"><title>${e(titulo)}</title>
<style>
body{margin:0;padding:0;background:#edf0f5;color:#243449;font-family:Arial,Helvetica,sans-serif}
a{color:#7a2344}h1,p{overflow-wrap:anywhere}
@media only screen and (max-width:600px){.correo-exterior{padding:16px 8px!important}.correo-interior{padding:26px 20px!important}.correo-titulo{font-size:28px!important}.folio-value{font-size:20px!important}.label-col,.val-col{display:block!important;width:auto!important;padding:10px 12px!important}.label-col{border-bottom:0!important;padding-bottom:4px!important}.val-col{font-size:16px!important;padding-top:4px!important}}
</style></head>
<body style="margin:0;padding:0;background:#edf0f5;font-family:Arial,Helvetica,sans-serif;color:#243449;">
<div style="display:none;font-size:1px;color:#edf0f5;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;mso-hide:all;">${e(preheader)}</div>
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%;background:#edf0f5;">
<tr><td align="center" class="correo-exterior" style="padding:40px 20px;">
<!--[if mso]><table role="presentation" width="600"><tr><td><![endif]-->
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%;max-width:600px;background:#fff;border:1px solid #dce2eb;border-radius:18px;border-collapse:separate;overflow:hidden;">
<tr><td height="6" style="height:6px;background:#b28b46;font-size:0;line-height:0;">&nbsp;</td></tr>
<tr><td class="correo-interior" style="padding:32px 38px 36px;background:#681a36;color:#fff;">
<table role="presentation" width="100%"><tr><td style="font:700 17px Arial,sans-serif;letter-spacing:2.5px;color:#fff;">TLAQUEPAQUE</td><td align="right" style="font:700 10px Arial,sans-serif;letter-spacing:2px;color:#e0c393;">BITÁCORA</td></tr></table>
<p style="font:400 11px Arial,sans-serif;color:#e7c9d3;letter-spacing:0.6px;margin:7px 0 30px;">Gobierno Municipal de San Pedro Tlaquepaque</p>
<div style="height:1px;background:#975367;margin-bottom:26px;"></div>
<h1 class="correo-titulo" style="margin:0;font:700 34px Arial,sans-serif;line-height:1.18;letter-spacing:-0.7px;color:#fff;">${e(titulo)}</h1>
${subtitulo ? `<p style="font:400 15px Arial,sans-serif;line-height:1.6;color:#f0dce3;margin:14px 0 0;">${e(subtitulo)}</p>` : ''}
</td></tr>
<tr><td class="correo-interior" style="padding:34px 38px;background:#fff;text-align:left;">
${badge ? `<div style="font:700 11px Arial,sans-serif;letter-spacing:1px;color:#68778a;margin-bottom:22px;">${e(badge)}</div>` : ''}
${estilosEnLinea(contenidoHtml)}
${pieExtra ? `<p style="font:400 14px Arial,sans-serif;line-height:1.7;color:#56677c;">${e(pieExtra)}</p>` : ''}
</td></tr>
<tr><td class="correo-interior" style="padding:26px 38px 30px;background:#f8f9fb;border-top:1px solid #e3e7ee;">
<p style="font:700 13px Arial,sans-serif;line-height:1.6;color:#741c3c;margin:0 0 10px;">${e(pieEntidad)}</p>
<p style="font:400 12px Arial,sans-serif;line-height:1.7;color:#5d6c80;margin:0 0 14px;">Bitácora · Programa de Ordenamiento Ecológico Territorial y de Desarrollo Urbano de San Pedro Tlaquepaque</p>
${leyenda ? `<p style="font:400 11px Arial,sans-serif;line-height:1.7;color:#66758a;margin:0 0 18px;">${e(leyenda)}</p>` : ''}
<p style="font:400 11px Arial,sans-serif;line-height:1.5;color:#68778a;margin:0;">&copy; ${new Date().getFullYear()} San Pedro Tlaquepaque, Jalisco.</p>
</td></tr></table>
<!--[if mso]></td></tr></table><![endif]-->
</td></tr></table></body></html>`
}
