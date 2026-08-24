/**
 * Dividir texto en chunks con solape.
 * Mantiene párrafos intactos tanto como pueda (split por líneas en blanco)
 * y agrupa hasta alcanzar el maxChars, solapando un poco para no perder contexto.
 */

export interface Chunk {
  position: number
  content: string
}

export function chunkText(text: string, maxChars = 700, overlap = 100): Chunk[] {
  const paragraphs = text
    .split(/\n\s*\n/)
    .flatMap((p) => p.split('\n'))
    .map((p) => p.trim())
    .filter((p) => p.length > 0)

  const chunks: Chunk[] = []
  let buffer = ''
  let position = 0

  const pushBuffer = () => {
    if (!buffer) return
    chunks.push({ position: position++, content: buffer.trim() })
    if (overlap > 0 && buffer.length > overlap) {
      buffer = buffer.slice(-overlap)
    } else {
      buffer = ''
    }
  }

  for (const paragraph of paragraphs) {
    if (paragraph.length > maxChars) {
      pushBuffer()
      let rest = paragraph
      while (rest.length > maxChars) {
        chunks.push({ position: position++, content: rest.slice(0, maxChars).trim() })
        rest = rest.slice(maxChars - overlap)
      }
      buffer = rest
      continue
    }

    if (buffer.length + paragraph.length + 1 > maxChars) {
      pushBuffer()
    }
    buffer = buffer ? `${buffer} ${paragraph}` : paragraph
  }

  pushBuffer()
  return chunks
}
