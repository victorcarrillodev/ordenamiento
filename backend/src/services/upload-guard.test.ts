import { join } from 'node:path'
import { describe, expect, it } from 'bun:test'

import {
  contentDispositionHeader,
  detectFileFamily,
  getExtension,
  isImageExtension,
  sanitizeFilename,
  shouldServeInline,
  validateUpload,
} from './upload-guard.ts'
import { MAX_FILE_BYTES, MAX_UPLOAD_FILES, validarAdjunto } from '../files/limits.ts'
import { nombreEnDisco, sanitizarNombre } from '../files/nombres.ts'

const buf = (text: string) => Buffer.from(text, 'latin1')

describe('getExtension', () => {
  it('toma la última extensión (detecta dobles extensiones)', () => {
    expect(getExtension('foto.jpg.php')).toBe('php')
    expect(getExtension('informe.PDF')).toBe('pdf')
    expect(getExtension('sinext')).toBe('')
    expect(getExtension('../../etc/passwd')).toBe('')
  })
})

describe('validateUpload', () => {
  it('acepta un PDF real', () => {
    const verdict = validateUpload({ filename: 'solicitud.pdf', buffer: buf('%PDF-1.7 ...') })
    expect(verdict.ok).toBe(true)
    expect(verdict.safeMime).toBe('application/pdf')
  })

  it('rechaza extensiones de la lista negra aunque el contenido sea válido', () => {
    const svg = buf('<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>')
    expect(validateUpload({ filename: 'logo.svg', buffer: svg }).ok).toBe(false)
    expect(validateUpload({ filename: 'pagina.html', buffer: buf('<h1>x</h1>') }).ok).toBe(false)
    expect(validateUpload({ filename: 'tool.exe', buffer: Buffer.alloc(4) }).ok).toBe(false)
    // Office con macros
    const macro = Buffer.concat([Buffer.from([0x50, 0x4b, 0x03, 0x04]), Buffer.alloc(16)])
    expect(validateUpload({ filename: 'plan.xlsm', buffer: macro }).ok).toBe(false)
  })

  it('rechaza extensiones fuera de la whitelist', () => {
    expect(validateUpload({ filename: 'datos.xyz', buffer: Buffer.alloc(10, 1) }).ok).toBe(false)
  })

  it('rechaza un ejecutable disfrazado de PDF (firma MZ)', () => {
    const mz = Buffer.concat([Buffer.from([0x4d, 0x5a, 0x90, 0x00]), Buffer.alloc(32)])
    const verdict = validateUpload({ filename: 'invoice.pdf', buffer: mz })
    expect(verdict.ok).toBe(false)
    expect(verdict.reason).toContain('contenido real no corresponde')
  })

  it('rechaza HTML/PHP renombrado a .pdf o .jpg', () => {
    expect(
      validateUpload({ filename: 'xss.pdf', buffer: buf('<html><script>alert(1)</script>') }).ok,
    ).toBe(false)
    expect(
      validateUpload({ filename: 'shell.php.txt', buffer: buf('<?php system($_GET["c"]); ?>') }).ok,
    ).toBe(false)
  })

  it('rechaza texto con contenido activo en tipos de texto plano', () => {
    const verdict = validateUpload({
      filename: 'notas.txt',
      buffer: buf('<iframe src="https://evil.example"></iframe>'),
    })
    expect(verdict.ok).toBe(false)
    expect(verdict.reason).toContain('código ejecutable')
  })

  it('acepta CSV y TXT legítimos', () => {
    expect(
      validateUpload({ filename: 'colonias.csv', buffer: buf('id,nombre\n1,Centro\n') }).ok,
    ).toBe(true)
    expect(validateUpload({ filename: 'notas.txt', buffer: buf('Hola mundo') }).ok).toBe(true)
  })

  it('valida firmas de imágenes y office', () => {
    const png = Buffer.concat([
      Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
      Buffer.alloc(8),
    ])
    expect(validateUpload({ filename: 'foto.png', buffer: png }).ok).toBe(true)

    const docx = Buffer.concat([Buffer.from([0x50, 0x4b, 0x03, 0x04]), Buffer.alloc(16)])
    expect(validateUpload({ filename: 'trabajo.docx', buffer: docx }).ok).toBe(true)

    const ole = Buffer.concat([
      Buffer.from([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]),
      Buffer.alloc(16),
    ])
    expect(validateUpload({ filename: 'viejo.doc', buffer: ole }).ok).toBe(true)
    // Un OLE con extensión .docx debe rechazarse (família zip vs ole)
    expect(validateUpload({ filename: 'falso.docx', buffer: ole }).ok).toBe(false)
  })

  it('acepta SIG del ordenamiento territorial (DWG y shapefiles)', () => {
    const dwg = Buffer.concat([Buffer.from('AC1032'), Buffer.alloc(32)])
    expect(validateUpload({ filename: 'manzanas.dwg', buffer: dwg }).ok).toBe(true)

    const shp = Buffer.concat([
      Buffer.from([0x00, 0x00, 0x27, 0x0a]),
      Buffer.alloc(96), // el header SHP mide 100 bytes
    ])
    expect(validateUpload({ filename: 'poligonos.shp', buffer: shp }).ok).toBe(true)
    expect(validateUpload({ filename: 'indices.shx', buffer: shp }).ok).toBe(true)

    // Un falso .dwg (no empieza con AC10xx) se rechaza
    expect(validateUpload({ filename: 'falso.dwg', buffer: buf('hola') }).ok).toBe(false)
  })

  it('acepta PDFs con basura binaria antes del header (escáneres)', () => {
    const scanned = Buffer.concat([
      Buffer.from([0x00, 0xff, 0xde, 0xad, 0xbe, 0xef]),
      Buffer.from('%PDF-1.4 ...'),
    ])
    const verdict = validateUpload({ filename: 'escaneo.pdf', buffer: scanned })
    expect(verdict.ok).toBe(true)
    expect(verdict.safeMime).toBe('application/pdf')
  })

  it('rechaza binarios desconocidos con extensión de imagen', () => {
    const junk = Buffer.from(Array.from({ length: 64 }, (_, i) => (i * 37 + 11) % 256))
    expect(validateUpload({ filename: 'img.png', buffer: junk }).ok).toBe(false)
  })
})

describe('sanitizeFilename', () => {
  it('elimina rutas, controles y traversal', () => {
    expect(sanitizeFilename('../../etc/passwd')).toBe('passwd')
    expect(sanitizeFilename('..\\..\\win\\cmd.exe')).toBe('cmd.exe')
    expect(sanitizeFilename('informe\r\nX-Injected: 1.pdf')).not.toMatch(/[\r\n]/)
    expect(sanitizeFilename('....archivo.txt')).toMatch(/^archivo/)
  })
})

describe('contentDispositionHeader', () => {
  it('escapa comillas, backslashes y CRLF', () => {
    const header = contentDispositionHeader('attachment', 'mal"icious\\name\r\nSet-Cookie: x=1.pdf')
    expect(header).not.toMatch(/[\r\n]/)
    const match = /filename="([^"]*)"/.exec(header)
    expect(match).not.toBeNull()
    expect(match![1]).not.toMatch(/["\\\r\n]/)
    expect(header).toContain("filename*=UTF-8''")
  })
})

describe('shouldServeInline', () => {
  it('inline solo para formatos inertes', () => {
    expect(shouldServeInline('pdf')).toBe(true)
    expect(shouldServeInline('jpg')).toBe(true)
    expect(shouldServeInline('docx')).toBe(false)
    expect(shouldServeInline('zip')).toBe(false)
  })
})

describe('helpers', () => {
  it('isImageExtension solo acepta imágenes', () => {
    expect(isImageExtension('png')).toBe(true)
    expect(isImageExtension('webp')).toBe(true)
    expect(isImageExtension('pdf')).toBe(false)
  })

  it('detectFileFamily clasifica por firma', () => {
    expect(detectFileFamily(buf('%PDF-1.4'))).toBe('pdf')
    expect(detectFileFamily(Buffer.from([0xff, 0xd8, 0xff, 0xe0]))).toBe('jpg')
    expect(detectFileFamily(buf('RIFF1234WEBPVP8 '))).toBe('webp')
    expect(detectFileFamily(buf('hola mundo'))).toBe('text')
  })
})

// ── helpers de buffers canónicos para firmas ──
const oleBuf = Buffer.concat([
  Buffer.from([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]),
  Buffer.alloc(16),
])
const zipBuf = Buffer.concat([Buffer.from([0x50, 0x4b, 0x03, 0x04]), Buffer.alloc(16)])
const rarBuf = Buffer.concat([Buffer.from('Rar!\x1a\x07\x00'), Buffer.alloc(16)])
const sevenZBuf = Buffer.concat([
  Buffer.from([0x37, 0x7a, 0xbc, 0xaf, 0x27, 0x1c]),
  Buffer.alloc(16),
])
const rtfBuf = Buffer.from('{\\rtf1\\ansi Hola', 'latin1')
const gif89Buf = Buffer.concat([Buffer.from('GIF89a', 'latin1'), Buffer.alloc(16)])
const bmpBuf = Buffer.concat([Buffer.from([0x42, 0x4d]), Buffer.alloc(16)])
const tiffBuf = Buffer.concat([Buffer.from([0x49, 0x49, 0x2a, 0x00]), Buffer.alloc(16)])
const webpBuf = Buffer.concat([
  Buffer.from('RIFF', 'latin1'),
  Buffer.from([0x10, 0x00, 0x00, 0x00]),
  Buffer.from('WEBP', 'latin1'),
  Buffer.alloc(16),
])
const mp3Buf = Buffer.concat([Buffer.from('ID3', 'latin1'), Buffer.alloc(16)])
const ftypBuf = Buffer.concat([Buffer.alloc(4), Buffer.from('ftyp', 'latin1'), Buffer.alloc(16)])

// ── (a) Formatos ANTES rechazados por sniff.ts que AHORA deben aceptarse ──
describe('validateUpload · formatos ampliados (fix sniff → upload-guard)', () => {
  it('acepta .doc con firma OLE', () => {
    expect(validateUpload({ filename: 'informe.doc', buffer: oleBuf }).ok).toBe(true)
  })
  it('acepta .csv legítimo', () => {
    expect(validateUpload({ filename: 'datos.csv', buffer: buf('id,nombre\n1,Centro\n') }).ok).toBe(
      true,
    )
  })
  it('acepta .txt legítimo', () => {
    expect(validateUpload({ filename: 'notas.txt', buffer: buf('Hola mundo sin script') }).ok).toBe(
      true,
    )
  })
  it('acepta .mp3 con firma ID3', () => {
    const v = validateUpload({ filename: 'audio.mp3', buffer: mp3Buf })
    expect(v.ok).toBe(true)
    expect(v.safeMime).toBe('audio/mpeg')
  })
  it('acepta .mp4 con firma ftyp', () => {
    const v = validateUpload({ filename: 'video.mp4', buffer: ftypBuf })
    expect(v.ok).toBe(true)
    expect(v.safeMime).toBe('video/mp4')
  })
  it('acepta .rtf con firma {\\rtf', () => {
    const v = validateUpload({ filename: 'carta.rtf', buffer: rtfBuf })
    expect(v.ok).toBe(true)
    expect(v.safeMime).toBe('application/rtf')
  })
  it('acepta .gif con firma GIF89a', () => {
    expect(validateUpload({ filename: 'anim.gif', buffer: gif89Buf }).ok).toBe(true)
  })
  it('acepta .webp con firma RIFF WEBP', () => {
    expect(validateUpload({ filename: 'foto.webp', buffer: webpBuf }).ok).toBe(true)
  })
  it('acepta .tiff y .tif con firma TIFF', () => {
    expect(validateUpload({ filename: 'scan.tiff', buffer: tiffBuf }).ok).toBe(true)
    expect(validateUpload({ filename: 'scan.tif', buffer: tiffBuf }).ok).toBe(true)
  })
  it('acepta .bmp con firma BM', () => {
    expect(validateUpload({ filename: 'imagen.bmp', buffer: bmpBuf }).ok).toBe(true)
  })
  it('acepta .7z con firma 7z', () => {
    const v = validateUpload({ filename: 'arch.7z', buffer: sevenZBuf })
    expect(v.ok).toBe(true)
    expect(v.safeMime).toBe('application/x-7z-compressed')
  })
  it('acepta .rar con firma Rar!', () => {
    const v = validateUpload({ filename: 'arch.rar', buffer: rarBuf })
    expect(v.ok).toBe(true)
    expect(v.safeMime).toBe('application/vnd.rar')
  })
  it('acepta .odt con firma ZIP', () => {
    expect(validateUpload({ filename: 'doc.odt', buffer: zipBuf }).ok).toBe(true)
  })
  it('acepta .xls con firma OLE', () => {
    expect(validateUpload({ filename: 'datos.xls', buffer: oleBuf }).ok).toBe(true)
  })
  // adicionales de la whitelist para completitud
  it('acepta .ods y .xlsx con firma ZIP', () => {
    expect(validateUpload({ filename: 'tabla.ods', buffer: zipBuf }).ok).toBe(true)
    expect(validateUpload({ filename: 'tabla.xlsx', buffer: zipBuf }).ok).toBe(true)
  })
})

// ── (b) Firmas FALSAS ──
describe('validateUpload · firmas falsas / archivos disfrazados', () => {
  it('rechaza .pdf que en realidad es HTML con <script>', () => {
    const html = buf('<html><script>alert(1)</script></html>')
    const v = validateUpload({ filename: 'falso.pdf', buffer: html })
    expect(v.ok).toBe(false)
    expect(v.reason).toContain('contenido real no corresponde')
  })
  it('rechaza .pdf que en realidad es PHP con <?php', () => {
    const php = buf('<?php system($_GET["cmd"]); ?>')
    const v = validateUpload({ filename: 'evil.pdf', buffer: php })
    expect(v.ok).toBe(false)
  })
  it('rechaza .jpg renombrado a .png (firma jpg vs extensión png)', () => {
    const jpgSig = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.alloc(16)])
    const v = validateUpload({ filename: 'foto.png', buffer: jpgSig })
    expect(v.ok).toBe(false)
    expect(v.reason).toContain('contenido real no corresponde')
  })
  it('rechaza .png renombrado a .jpg (firma png vs extensión jpg)', () => {
    const pngSig = Buffer.concat([
      Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
      Buffer.alloc(8),
    ])
    const v = validateUpload({ filename: 'foto.jpg', buffer: pngSig })
    expect(v.ok).toBe(false)
  })
  it('rechaza .exe disfrazado de .pdf (firma MZ, familia text != pdf)', () => {
    const mz = Buffer.concat([Buffer.from([0x4d, 0x5a, 0x90, 0x00]), Buffer.alloc(32)])
    const v = validateUpload({ filename: 'factura.pdf', buffer: mz })
    expect(v.ok).toBe(false)
    expect(v.reason).toContain('contenido real no corresponde')
  })
  it('rechaza ejecutable .exe aunque tenga contenido innocuo (deny-list)', () => {
    expect(validateUpload({ filename: 'tool.exe', buffer: buf('hola') }).ok).toBe(false)
    expect(validateUpload({ filename: 'tool.exe', buffer: Buffer.alloc(4) }).ok).toBe(false)
  })
  it('rechaza .js/.html disfrazados (deny-list)', () => {
    expect(validateUpload({ filename: 'app.js', buffer: buf('console.log(1)') }).ok).toBe(false)
    expect(validateUpload({ filename: 'page.html', buffer: buf('<h1>hi</h1>') }).ok).toBe(false)
  })
})

// ── (c) Archivo VACÍO y sin extensión ──
describe('validateUpload · casos vacíos / sin extensión', () => {
  it('rechaza archivo sin extensión', () => {
    const v = validateUpload({ filename: 'sin-extension', buffer: buf('hola') })
    expect(v.ok).toBe(false)
    expect(v.reason).toContain('no tiene extensión')
  })
  it('rechaza archivo con nombre vacío de extensión (punto final)', () => {
    const v = validateUpload({ filename: 'archivo.', buffer: buf('hola') })
    expect(v.ok).toBe(false)
  })
  it('validarAdjunto rechaza size 0', () => {
    const res = validarAdjunto({ size: 0, name: 'vacio.pdf' }, 1, MAX_FILE_BYTES, MAX_UPLOAD_FILES)
    expect(res.ok).toBe(false)
    expect(res.codigo).toBe(400)
    expect(res.reason).toContain('vacío')
  })
  it('validarAdjunto rechaza archivo sin extensión también vía size? validateUpload lo cubre', () => {
    const v = validateUpload({ filename: '', buffer: Buffer.alloc(0) })
    expect(v.ok).toBe(false)
  })
  it('buffer vacío con extensión válida no pasa firma (ej. .pdf vacío debe rechazarse)', () => {
    const v = validateUpload({ filename: 'vacio.pdf', buffer: Buffer.alloc(0) })
    expect(v.ok).toBe(false)
  })
  it('buffer vacío con extensión de texto sin contenido activo aún puede pasar texto; límites lo detienen', () => {
    // Documenta comportamiento actual: un .txt vacío no tiene script, su familia es 'text' y pasa validateUpload.
    // El rechazo real viene de validarAdjunto(size 0) / filtro size>0 en la ruta.
    // Si este test fallara, significaría que validateUpload ahora valida tamaño.
    const v = validateUpload({ filename: 'vacio.txt', buffer: Buffer.alloc(0) })
    // Importante: no exigimos ok==false aquí; verificamos que la ruta lo bloquearía por tamaño.
    // Dejamos constancia y exigimos que validarAdjunto sí lo rechace:
    const r = validarAdjunto({ size: 0, name: 'vacio.txt' }, 1, MAX_FILE_BYTES, MAX_UPLOAD_FILES)
    expect(r.ok).toBe(false)
    void v // silenciar unused
  })
})

// ── (d) Lotes: límites MAX_UPLOAD_FILES y MAX_UPLOAD_MB ──
describe('límites de lote (MAX_UPLOAD_FILES / MAX_UPLOAD_MB)', () => {
  it('rechaza cuando totalCount > MAX_UPLOAD_FILES (5+1)', () => {
    const res = validarAdjunto({ size: 1_000, name: 'a.pdf' }, 6, MAX_FILE_BYTES, MAX_UPLOAD_FILES)
    expect(res.ok).toBe(false)
    expect(res.codigo).toBe(400)
    expect(res.reason).toContain('Máximo 5')
  })
  it('acepta exactamente MAX_UPLOAD_FILES', () => {
    const res = validarAdjunto({ size: 1_000, name: 'a.pdf' }, 5, MAX_FILE_BYTES, MAX_UPLOAD_FILES)
    expect(res.ok).toBe(true)
  })
  it('rechaza archivo que supera MAX_UPLOAD_MB (50 MB + 1)', () => {
    const res = validarAdjunto(
      { size: MAX_FILE_BYTES + 1, name: 'grande.pdf' },
      1,
      MAX_FILE_BYTES,
      MAX_UPLOAD_FILES,
    )
    expect(res.ok).toBe(false)
    expect(res.codigo).toBe(413)
    expect(res.reason).toContain('50 MB')
  })
  it('acepta archivo exactamente en el límite MAX_FILE_BYTES', () => {
    const res = validarAdjunto(
      { size: MAX_FILE_BYTES, name: 'exacto.pdf' },
      1,
      MAX_FILE_BYTES,
      MAX_UPLOAD_FILES,
    )
    expect(res.ok).toBe(true)
  })
  it('acepta archivo justo por debajo del límite', () => {
    const res = validarAdjunto(
      { size: MAX_FILE_BYTES - 1, name: 'casi.pdf' },
      1,
      MAX_FILE_BYTES,
      MAX_UPLOAD_FILES,
    )
    expect(res.ok).toBe(true)
  })
})

// ── (e) Path traversal y CRLF en filename ──
describe('sanitización de nombres (traversal / CRLF)', () => {
  it('sanitizeFilename elimina traversal ../../', () => {
    expect(sanitizeFilename('../../evil.pdf')).toBe('evil.pdf')
    expect(sanitizeFilename('..\\..\\evil.pdf')).toBe('evil.pdf')
  })
  it('sanitizarNombre elimina traversal y CRLF', () => {
    expect(sanitizarNombre('../../evil.pdf')).toBe('evil.pdf')
    const crlf = sanitizarNombre('informe\r\nX-Injected: 1.pdf')
    expect(crlf).not.toMatch(/[\r\n]/)
  })
  it('sanitizeFilename elimina CRLF y evita inyección de cabecera', () => {
    const s = sanitizeFilename('informe\r\nSet-Cookie: x=1.pdf')
    expect(s).not.toMatch(/[\r\n]/)
    const hdr = contentDispositionHeader('attachment', 'a\r\nB.pdf')
    expect(hdr).not.toMatch(/[\r\n]/)
  })
  it('sanitizeFilename colapsa puntos consecutivos (..)', () => {
    expect(sanitizeFilename('....evil.pdf')).not.toMatch(/\.\./)
  })
  it('getExtension toma última extensión evitando doble extensión', () => {
    expect(getExtension('foto.jpg.php')).toBe('php')
    expect(getExtension('doc.pdf%00.jpg')).toBe('jpg') // toma tras último punto
  })
  it('nombreEnDisco prefija timestamp+hash y sanea nombre', () => {
    const n = nombreEnDisco('../../evil.pdf', 1700000000000)
    expect(n.startsWith('1700000000000-')).toBe(true)
    expect(n).not.toContain('..')
    expect(n).not.toMatch(/[\r\n]/)
    expect(n.endsWith('-evil.pdf')).toBe(true)
  })
  it('ruta destino no escapa de UPLOAD_DIR aun con traversal en nombre original', () => {
    // Simula lo que hace participations.ts: join(UPLOAD_DIR, nombreEnDisco(file.name))
    const UPLOAD_DIR = '/tmp/uploads-test'
    const malicious = '../../etc/passwd'
    const disco = nombreEnDisco(malicious, 123)
    const ruta = join(UPLOAD_DIR, disco)
    expect(ruta.startsWith(UPLOAD_DIR + '/')).toBe(true)
    expect(ruta).not.toContain('..')
  })
})

// ── extra: texto con contenido activo debe rechazarse, texto limpio aceptarse ──
describe('validateUpload · escaneo de contenido activo en texto', () => {
  const actives = ['<script', '<?php', '<html', '<iframe', '<svg', 'javascript:', 'onerror=']
  for (const payload of actives) {
    it(`rechaza .txt con payload activo: ${payload}`, () => {
      const v = validateUpload({ filename: 'notas.txt', buffer: buf(`hola ${payload} mundo`) })
      expect(v.ok).toBe(false)
      expect(v.reason).toContain('código ejecutable')
    })
  }
  it('acepta .txt/.csv/.md legítimos sin payload', () => {
    expect(validateUpload({ filename: 'a.txt', buffer: buf('texto plano sin nada raro') }).ok).toBe(
      true,
    )
    expect(validateUpload({ filename: 'b.csv', buffer: buf('a,b,c\n1,2,3') }).ok).toBe(true)
    expect(validateUpload({ filename: 'c.md', buffer: buf('# Titulo\ncontenido') }).ok).toBe(true)
  })
  it('caso insensible: <ScRiPt> en .txt debe rechazarse', () => {
    expect(validateUpload({ filename: 'x.txt', buffer: buf('<ScRiPt>alert(1)') }).ok).toBe(false)
  })
})
