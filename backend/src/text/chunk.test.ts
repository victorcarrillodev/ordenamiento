import { describe, expect, it } from 'bun:test'

import { chunkText } from './chunk.ts'

describe('chunkText', () => {
  it('returns nothing for empty input', () => {
    expect(chunkText('')).toEqual([])
  })

  it('keeps a short text as a single chunk', () => {
    const chunks = chunkText('Una observación breve sobre el ordenamiento.')
    expect(chunks.length).toBe(1)
    expect(chunks[0].position).toBe(0)
    expect(chunks[0].content).toBe('Una observación breve sobre el ordenamiento.')
  })

  it('splits text longer than maxChars into multiple positioned chunks', () => {
    const longParagraph = 'palabra '.repeat(200).trim() // ~1600 chars, un solo "párrafo"
    const chunks = chunkText(longParagraph, 700, 100)
    expect(chunks.length).toBeGreaterThan(1)
    chunks.forEach((chunk, i) => expect(chunk.position).toBe(i))
    chunks.forEach((chunk) => expect(chunk.content.length).toBeLessThanOrEqual(700))
  })

  it('does not lose the tail end of a long single paragraph', () => {
    const longParagraph = 'x'.repeat(1500)
    const chunks = chunkText(longParagraph, 700, 100)
    const rebuilt = chunks.map((c) => c.content).join('')
    // Con solape, se permite contenido repetido, pero el último carácter
    // original debe seguir apareciendo en algún chunk.
    expect(rebuilt.length).toBeGreaterThanOrEqual(longParagraph.length)
    expect(chunks.at(-1)?.content.endsWith('x')).toBe(true)
  })

  it('groups multiple short paragraphs into one chunk when they fit', () => {
    const text = 'Primer punto.\n\nSegundo punto.\n\nTercer punto.'
    const chunks = chunkText(text, 700, 100)
    expect(chunks.length).toBe(1)
    expect(chunks[0].content).toContain('Primer punto.')
    expect(chunks[0].content).toContain('Tercer punto.')
  })
})
