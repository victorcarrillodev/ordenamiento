/**
 * Guardia de subida de archivos (OWASP File Upload Cheat Sheet).
 *
 * Capas de defensa aplicadas:
 *  1. Whitelist de extensiones de negocio + denylist dura de lo peligroso
 *     (ejecutables, scripts, HTML/SVG activo, Office con macros).
 *  2. Validación por firma binaria (magic bytes): el Content-Type declarado
 *     por el cliente NUNCA se confía (es trivial de falsificar).
 *  3. Escaneo de contenido activo (<script>, <?php, etc.) en archivos de texto.
 *  4. Al servir: MIME canónico derivado de la extensión, nunca el declarado;
 *      descarga forzada (`attachment`) salvo formatos visualmente inertes;
 *      `nosniff`; y filename saneado contra inyección de cabeceras.
 */

// Extensiones prohibidas explícitamente aunque alguien las intente renombrar.
const DENIED_EXTENSIONS = new Set([
  // Ejecutables e instaladores
  'exe',
  'dll',
  'com',
  'scr',
  'msi',
  'msp',
  'mst',
  'cpl',
  'ocx',
  'sys',
  'drv',
  'jar',
  'apk',
  'app',
  'deb',
  'rpm',
  // Scripts de shell / sistema / autorun
  'bat',
  'cmd',
  'sh',
  'bash',
  'zsh',
  'ps1',
  'psd1',
  'psm1',
  'vbs',
  'vbe',
  'js',
  'jse',
  'ws',
  'wsf',
  'wsc',
  'wsh',
  'hta',
  'reg',
  'lnk',
  'scpt',
  // Web activo (puede ejecutar script en el navegador del admin)
  'html',
  'htm',
  'xhtml',
  'shtml',
  'svg',
  'svgz',
  'xml',
  'xsl',
  'xslt',
  'swf',
  // Servidor web (RCE en caso de mala configuración)
  'php',
  'phtml',
  'php3',
  'php4',
  'php5',
  'php7',
  'phps',
  'phar',
  'asp',
  'aspx',
  'axd',
  'ashx',
  'asmx',
  'jsp',
  'jspx',
  'cgi',
  'pl',
  'py',
  'pyc',
  'rb',
  'action',
  'do',
  // Office con macros (vector clásico de malware dirigido)
  'docm',
  'dotm',
  'xlsm',
  'xltm',
  'xlam',
  'pptm',
  'potm',
  'ppam',
  'ppsm',
  'sldm',
  // Fuentes y certificados
  'p12',
  'pfx',
  'pem',
  'cer',
  'crt',
  'der',
  'key',
  // Contenedores / discos / configs peligrosas
  'iso',
  'vmdk',
  'vdi',
  'img',
  'htaccess',
  'htpasswd',
  'env',
  'ini',
  'conf',
])

// Whitelist de negocio: extension -> MIME canónico con el que se sirve.
const ALLOWED_MIMES: Record<string, string> = {
  // Documentos
  pdf: 'application/pdf',
  doc: 'application/msword',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  odt: 'application/vnd.oasis.opendocument.text',
  rtf: 'application/rtf',
  txt: 'text/plain',
  csv: 'text/csv',
  md: 'text/markdown',
  // Hojas de cálculo
  xls: 'application/vnd.ms-excel',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  ods: 'application/vnd.oasis.opendocument.spreadsheet',
  // Presentaciones
  ppt: 'application/vnd.ms-powerpoint',
  pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  odp: 'application/vnd.oasis.opendocument.presentation',
  // Imágenes (SVG excluido a propósito: puede contener <script>)
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  gif: 'image/gif',
  bmp: 'image/bmp',
  tif: 'image/tiff',
  tiff: 'image/tiff',
  ico: 'image/x-icon',
  // SIG / ordenamiento territorial (lo que el formulario público ofrece)
  dwg: 'image/vnd.dwg',
  shp: 'application/octet-stream',
  shx: 'application/octet-stream',
    // Archivos comprimidos
  zip: 'application/zip',
  kmz: 'application/vnd.google-earth.kmz',
  rar: 'application/vnd.rar',
  '7z': 'application/x-7z-compressed',
  // SIG auxiliares (shapefile)
  dbf: 'application/octet-stream',
  // Multimedia común
  mp3: 'audio/mpeg',
  wav: 'audio/wav',
  mp4: 'video/mp4',
  mov: 'video/quicktime',
  avi: 'video/x-msvideo',
  mkv: 'video/x-matroska',
}

// Formatos que el navegador puede mostrar inline sin riesgo de script activo.
const INLINE_EXTENSIONS = new Set(['pdf', 'jpg', 'jpeg', 'png', 'webp', 'gif'])

// Familias de firma binaria -> extensiones que legítimamente la presentan.
type SignatureFamily =
  | 'pdf'
  | 'jpg'
  | 'png'
  | 'gif'
  | 'webp'
  | 'bmp'
  | 'tiff'
  | 'wav'
  | 'zip'
  | 'ole'
  | 'dwg'
  | 'shapefile'
  | 'dbf'
  | 'ftyp'
  | 'mp3'
  | '7z'
  | 'rar'
  | 'rtf'
  | 'text'
  | 'unknown'

const FAMILY_EXTENSIONS: Record<SignatureFamily, string[]> = {
  pdf: ['pdf'],
  jpg: ['jpg', 'jpeg'],
  png: ['png'],
  gif: ['gif'],
  webp: ['webp'],
  bmp: ['bmp'],
  tiff: ['tif', 'tiff'],
  wav: ['wav'],
  zip: ['docx', 'xlsx', 'pptx', 'odt', 'ods', 'odp', 'zip', 'kmz'],
  ole: ['doc', 'xls', 'ppt'],
  dwg: ['dwg'],
  shapefile: ['shp', 'shx'],
  dbf: ['dbf'],
  ftyp: ['mp4', 'mov', 'heic', 'heif'],
  mp3: ['mp3'],
  '7z': ['7z'],
  rar: ['rar'],
  rtf: ['rtf'],
  text: ['txt', 'csv', 'md'],
  unknown: [],
}

function startsWith(buffer: Buffer, bytes: number[], offset = 0): boolean {
  return bytes.every((byte, i) => buffer[offset + i] === byte)
}

function asciiAt(buffer: Buffer, offset: number, text: string): boolean {
  if (buffer.length < offset + text.length) return false
  return buffer.toString('latin1', offset, offset + text.length) === text
}

/** Detecta la familia real del archivo leyendo sus primeros bytes. */
export function detectFileFamily(buffer: Buffer): SignatureFamily {
  // PDF: la especificación permite basura binaria ANTES de %PDF- (hasta 1024
  // bytes); los escáneres lo hacen habitualmente.
  const head = buffer.subarray(0, 1024).toString('latin1')
  if (head.includes('%PDF')) return 'pdf'
  if (startsWith(buffer, [0xff, 0xd8, 0xff])) return 'jpg'
  if (startsWith(buffer, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return 'png'
  if (asciiAt(buffer, 0, 'GIF87a') || asciiAt(buffer, 0, 'GIF89a')) return 'gif'
  if (asciiAt(buffer, 0, 'RIFF')) {
    if (asciiAt(buffer, 8, 'WEBP')) return 'webp'
    if (asciiAt(buffer, 8, 'WAVE')) return 'wav'
  }
  if (startsWith(buffer, [0x42, 0x4d])) return 'bmp'
  if (asciiAt(buffer, 0, 'II*\u0000') || asciiAt(buffer, 0, 'MM\u0000*')) return 'tiff'
  if (
    startsWith(buffer, [0x50, 0x4b, 0x03, 0x04]) ||
    startsWith(buffer, [0x50, 0x4b, 0x05, 0x06])
  ) {
    return 'zip'
  }
  if (startsWith(buffer, [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1])) return 'ole'
  // DWG de AutoCAD: todas las versiones modernas empiezan con "AC10xx".
  if (asciiAt(buffer, 0, 'AC1')) return 'dwg'
  // Shapefile ESRI (.shp/.shx): código de archivo 9994 big-endian.
  if (startsWith(buffer, [0x00, 0x00, 0x27, 0x0a])) return 'shapefile'
  // DBF (dBASE): primer byte 0x03/0x05/0x30 y cabecera mínima de 32 bytes.
  if (
    buffer.length >= 32 &&
    (buffer[0] === 0x03 || buffer[0] === 0x05 || buffer[0] === 0x30)
  ) {
    return 'dbf'
  }
  if (asciiAt(buffer, 4, 'ftyp')) return 'ftyp'
  if (
    asciiAt(buffer, 0, 'ID3') ||
    startsWith(buffer, [0xff, 0xfb]) ||
    startsWith(buffer, [0xff, 0xf3])
  ) {
    return 'mp3'
  }
  if (startsWith(buffer, [0x37, 0x7a, 0xbc, 0xaf, 0x27, 0x1c])) return '7z'
  if (asciiAt(buffer, 0, 'Rar!')) return 'rar'
  if (asciiAt(buffer, 0, '{\\rtf')) return 'rtf'

  // Sin firma conocida: solo es texto si no hay bytes NUL en la muestra
  // inicial; un binario genérico se marca como desconocido y se rechaza.
  const sample = buffer.subarray(0, 1024)
  if (sample.includes(0)) return 'unknown'
  return 'text'
}

/** Extrae la extensión final en minúsculas tras limpiar rutas (`foto.jpg.php` -> `php`). */
export function getExtension(filename: string): string {
  const base = filename.split(/[\\/]/).pop() ?? ''
  const parts = base.split('.')
  if (parts.length < 2) return ''
  return (parts.pop() ?? '').toLowerCase()
}

/** MIME canónico para una extensión whitelist, o undefined si no está permitida. */
export function canonicalMimeFor(extension: string): string | undefined {
  return ALLOWED_MIMES[extension]
}

export function isImageExtension(extension: string): boolean {
  return /^image\//.test(ALLOWED_MIMES[extension] ?? '')
}

/**
 * Sanea un nombre de archivo original para mostrarlo/guardarlo:
 * sin rutas, sin caracteres de control, sin prefijos peligrosos, largo acotado.
 */
export function sanitizeFilename(filename: string): string {
  let base = filename.split(/[\\/]/).pop() ?? ''
  // Elimina caracteres de control (incluye CRLF: evita inyección de cabeceras).
  base = Array.from(base)
    .filter((ch) => {
      const code = ch.codePointAt(0) ?? 0
      return code > 31 && code !== 127
    })
    .join('')
  base = base.replace(/[^a-zA-Z0-9_.()[\] áéíóúÁÉÍÓÚñÑüÜ-]/g, '_')
  base = base.replace(/^[.\s-]+/, '') // sin puntos/espacios/guones iniciales
  base = base.replace(/\.{2,}/g, '.') // sin puntos consecutivos (traversal)
  if (base.length > 120) {
    const ext = getExtension(base)
    base = `${base.slice(0, 120 - ext.length - 1)}.${ext}`
  }
  return base || 'archivo'
}

/** Cabecera content-disposition segura (filename citado + RFC 5987 para Unicode). */
export function contentDispositionHeader(kind: 'inline' | 'attachment', filename: string): string {
  const safe = filename.replace(/["\\]/g, '_').replace(/[\r\n]/g, '')
  const encoded = encodeURIComponent(safe).replace(
    /['()*]/g,
    (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`,
  )
  return `${kind}; filename="${safe}"; filename*=UTF-8''${encoded}`
}

/** ¿Debe servirse inline este tipo? Solo los formatos visualmente inertes. */
export function shouldServeInline(extension: string): boolean {
  return INLINE_EXTENSIONS.has(extension)
}

// Patrones de contenido activo que jamás se acepten dentro de tipos "texto".
const ACTIVE_CONTENT_PATTERNS = [
  '<script',
  '<?php',
  '<html',
  '<iframe',
  '<object',
  '<embed',
  '<svg',
  'javascript:',
  'data:text/html',
  'onerror=',
  'onload=',
]

export interface UploadVerdict {
  ok: boolean
  reason?: string
  ext?: string
  safeMime?: string
}

/**
 * Valida un archivo subido en profundidad. `declaredMime` solo se recibe como
 * pista informativa: la decisión se toma con extensión + firma + contenido.
 */
export function validateUpload(input: { filename: string; buffer: Buffer }): UploadVerdict {
  const ext = getExtension(input.filename)

  if (!ext) return { ok: false, reason: 'el archivo no tiene extensión reconocible' }
  if (DENIED_EXTENSIONS.has(ext)) {
    return {
      ok: false,
      reason: `los archivos .${ext} no están permitidos por política de seguridad`,
    }
  }

  const safeMime = ALLOWED_MIMES[ext]
  if (!safeMime) {
    return { ok: false, reason: `el tipo .${ext} no está en la lista de formatos aceptados` }
  }

  // Firma real vs extensión declarada: bloquea executables disfrazados y
  // HTML/PHP renombrados a .pdf/.jpg.
  const familyByExt = (Object.keys(FAMILY_EXTENSIONS) as SignatureFamily[]).find((family) =>
    FAMILY_EXTENSIONS[family].includes(ext),
  )

  if (familyByExt) {
    const detected = detectFileFamily(input.buffer)
    if (detected !== familyByExt) {
      // Tolerancia: ZIP con datos previos (algunos generadores) empieza distinto.
      if (!(detected === 'text' && familyByExt === 'zip')) {
        return {
          ok: false,
          reason: `el contenido real no corresponde a un archivo .${ext}`,
        }
      }
    }
  }

  // Tipos servidos como texto: escanear contenido activo explícitamente.
  if (familyByExt === 'text') {
    const head = input.buffer.subarray(0, 4096).toString('latin1').toLowerCase()
    const hit = ACTIVE_CONTENT_PATTERNS.find((pattern) => head.includes(pattern))
    if (hit) {
      return { ok: false, reason: 'el archivo contiene código ejecutable (script)' }
    }
  }

  return { ok: true, ext, safeMime }
}
