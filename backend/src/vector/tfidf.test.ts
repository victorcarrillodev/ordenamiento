import { describe, expect, it } from 'bun:test'

import {
  cosineSimilarity,
  DIMENSIONS,
  featurizeWeighted,
  idf,
  l2Normalize,
  tf,
  tokenize,
  toVectorLiteral,
} from './tfidf.ts'

describe('tokenize', () => {
  it('lowercases, strips accents and punctuation', () => {
    expect(tokenize('Árboles, Río y Ecología!')).toEqual(['arboles', 'rio', 'ecologia'])
  })

  it('drops stopwords and tokens outside the length window', () => {
    // "de", "la" son stopwords; "a" es demasiado corta; el resto sobrevive.
    expect(tokenize('de la observacion a favor')).toEqual(['observacion', 'favor'])
  })
})

describe('tf/idf', () => {
  it('tf saturates as frequency grows (BM25-like, not linear)', () => {
    const low = tf(1)
    const high = tf(100)
    expect(high).toBeGreaterThan(low)
    // Un término repetido 100 veces no debe pesar ~100x más que uno único.
    expect(high / low).toBeLessThan(3)
  })

  it('idf is higher for rarer terms', () => {
    const rare = idf(1000, 1)
    const common = idf(1000, 900)
    expect(rare).toBeGreaterThan(common)
  })

  it('idf is always >= 1', () => {
    expect(idf(100, 100)).toBeGreaterThanOrEqual(1)
    expect(idf(100, 0)).toBeGreaterThanOrEqual(1)
  })
})

describe('l2Normalize / cosineSimilarity', () => {
  it('normalizes a vector to unit length', () => {
    const vec = new Float32Array([3, 4])
    const normalized = l2Normalize(vec)
    const norm = Math.sqrt(normalized[0] ** 2 + normalized[1] ** 2)
    expect(norm).toBeCloseTo(1, 5)
  })

  it('leaves an all-zero vector unchanged instead of dividing by zero', () => {
    const vec = new Float32Array(4)
    expect(Array.from(l2Normalize(vec))).toEqual([0, 0, 0, 0])
  })

  it('gives identical texts a cosine similarity of ~1', () => {
    const a = featurizeWeighted('observacion sobre el rio de tlaquepaque')
    const b = featurizeWeighted('observacion sobre el rio de tlaquepaque')
    expect(cosineSimilarity(a, b)).toBeCloseTo(1, 5)
  })

  it('gives unrelated texts a lower similarity than identical texts', () => {
    const a = featurizeWeighted('conservacion del bosque y proteccion ambiental')
    const b = featurizeWeighted('conservacion del bosque y proteccion ambiental')
    const c = featurizeWeighted('presupuesto municipal para pavimentacion de calles')
    expect(cosineSimilarity(a, b)).toBeGreaterThan(cosineSimilarity(a, c))
  })
})

describe('featurizeWeighted / toVectorLiteral', () => {
  it('produces a vector of the expected dimensionality', () => {
    expect(featurizeWeighted('cualquier texto de prueba').length).toBe(DIMENSIONS)
  })

  it('serializes to a pgvector literal', () => {
    const literal = toVectorLiteral(new Float32Array([0.1, 0.2, 0.3]))
    expect(literal).toMatch(/^\[-?\d+(\.\d+)?,-?\d+(\.\d+)?,-?\d+(\.\d+)?\]$/)
  })
})
