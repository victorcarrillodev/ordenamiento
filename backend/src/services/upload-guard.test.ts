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
    expect(
      validateUpload({ filename: 'datos.xyz', buffer: Buffer.alloc(10, 1) }).ok,
    ).toBe(false)
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
    expect(validateUpload({ filename: 'colonias.csv', buffer: buf('id,nombre\n1,Centro\n') }).ok).toBe(true)
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
