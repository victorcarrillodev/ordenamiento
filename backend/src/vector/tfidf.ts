/**
 * TF-IDF puro (matemática, sin IA)
 *
 * Genera vectores de N dimensiones con normalización L2. Cada dimensión
 * corresponde a un "término" del vocabulario. Es la "fórmula única" interna:
 *
 *   texto → limpiar → tokenizar → pesos TF-IDF → vector L2 (512D)
 *
 * Usa un tablero hash de tamaño fijo (feature space). La colisión suma pesos
 * en la misma coordenada; la similitud coseno se conserva en ese espacio.
 *
 * Separación pura/IO: aquí solo viven funciones SIN efectos (matemática).
 * El conteo de documentos por término (docsWithTerm) vive en services/.
 */

export const DIMENSIONS = 512

/**
 * Tokeniza un texto: minúsculas, quita acentos y signos, separa palabras.
 */
export function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // quita acentos
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((t) => t.length > 2)
}

/**
 * Hash determinista de una palabra a un índice [0, DIMENSIONS).
 */
function hashTerm(term: string): number {
  let h = 2166136261
  for (let i = 0; i < term.length; i++) {
    h ^= term.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return (h >>> 0) % DIMENSIONS
}

/**
 * Frecuencia de término con normalización logarítmica:
 * una palabra repetida 10 veces no pesa 10x.
 */
export function tf(frequency: number): number {
  return 1 + Math.log(frequency);
}

/**
 * Frecuencia inversa de documento suavizada:
 * los términos raros y relevantes pesan más que los comunes.
 * El `+1` es el piso neutro: nunca pesa 0 ni negativo.
 */
export function idf(totalDocs: number, docsWithTerm: number): number {
  return Math.log(totalDocs / (1 + docsWithTerm)) + 1;
}

/**
 * TF-IDF: el producto que da a cada término su peso final.
 */
export function tfidf(
  frequency: number,
  totalDocs: number,
  docsWithTerm: number,
): number {
  return tf(frequency) * idf(totalDocs, docsWithTerm);
}

/**
 * Vector TF-IDF de un texto (sin pesos de corpus externos).
 */
export function featurize(text: string): Float32Array {
  return featurizeWeighted(text);
}

/**
 * Vector TF-IDF ponderado: aplica log-tf y, si hay mapa IDF,
 * escala cada término antes de normalizar L2.
 */
export function featurizeWeighted(
  text: string,
  idfWeights?: Record<string, number>,
): Float32Array {
  const counts = new Map<string, number>();
  for (const term of tokenize(text)) {
    counts.set(term, (counts.get(term) ?? 0) + 1);
  }

  const vec = new Float32Array(DIMENSIONS);
  for (const [term, freq] of counts) {
    const tfw = 1 + Math.log(freq);
    const idfw = idfWeights?.[term] ?? 1;
    vec[hashTerm(term)] += tfw * idfw;
  }

  return l2Normalize(vec);
}

/**
 * Normalización L2: divide por la norma euclidiana para que el producto
 * punto sea directamente similitud coseno.
 */
export function l2Normalize(vec: Float32Array): Float32Array {
  let norm = 0
  for (let i = 0; i < vec.length; i++) {
    norm += vec[i] * vec[i]
  }
  norm = Math.sqrt(norm)

  if (norm === 0) return vec

  const out = new Float32Array(vec.length)
  for (let i = 0; i < vec.length; i++) {
    out[i] = vec[i] / norm
  }
  return out
}

/**
 * Similaridad coseno entre dos vectores normalizados = producto punto.
 */
export function cosineSimilarity(a: Float32Array, b: Float32Array): number {
  let dot = 0
  const len = Math.min(a.length, b.length)
  for (let i = 0; i < len; i++) {
    dot += a[i] * b[i]
  }
  return dot
}

/**
 * Convierte un Float32Array a un literal vector válido para pgvector,
 * por ejemplo: [0.1,0.2,0.3,...]
 */
export function toVectorLiteral(vec: Float32Array): string {
  return '[' + Array.from(vec).join(',') + ']'
}
