import JSZip from 'jszip'
import { SaxesParser } from 'saxes'

const MAX_XML_BYTES = 4 * 1024 * 1024
const WORD_NAMESPACES = new Set([
  'http://schemas.openxmlformats.org/wordprocessingml/2006/main',
  'http://purl.oclc.org/ooxml/wordprocessingml/main',
])

/** Vista de texto: no ejecuta contenido, carga imágenes ni sigue vínculos del documento. */
export async function docxPreview(buffer: Buffer): Promise<string> {
  const zip = await JSZip.loadAsync(buffer)
  const document = zip.file('word/document.xml')
  if (!document) throw new Error('El documento no contiene texto de Word válido')
  const chunks: Buffer[] = []
  let size = 0
  // El tamaño comprimido no limita el descomprimido: se corta durante la lectura.
  await new Promise<void>((resolve, reject) => {
    const stream = document.nodeStream()
    stream
      .on('data', (bytes: Buffer) => {
        size += bytes.length
        if (size > MAX_XML_BYTES) {
          stream.pause()
          reject(new Error('El texto supera el tamaño de vista previa'))
          return
        }
        chunks.push(bytes)
      })
      .on('error', reject)
      .on('end', resolve)
      .resume()
  })

  const parser = new SaxesParser({ xmlns: true })
  const text: string[] = []
  let inText = false
  parser.on('doctype', () => {
    throw new Error('Declaraciones XML no permitidas')
  })
  parser.on('opentag', (tag) => {
    if (!WORD_NAMESPACES.has(tag.uri)) return
    if (tag.local === 't') inText = true
    if (tag.local === 'tab') text.push('\t')
    if (tag.local === 'br' || tag.local === 'cr') text.push('\n')
  })
  parser.on('text', (value) => {
    if (inText) text.push(value)
  })
  parser.on('cdata', (value) => {
    if (inText) text.push(value)
  })
  parser.on('closetag', (tag) => {
    if (!WORD_NAMESPACES.has(tag.uri)) return
    if (tag.local === 't') inText = false
    if (tag.local === 'p') text.push('\n\n')
    if (tag.local === 'tc') text.push('\t')
  })
  parser.write(Buffer.concat(chunks).toString('utf8')).close()
  return text.join('').replace(/\0/g, '').trim()
}
