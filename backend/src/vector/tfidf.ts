/**
 * TF-IDF mejorado (matemática, sin IA)
 *
 * Genera vectores de N dimensiones con normalización L2. Cada dimensión
 * corresponde a un "término" del vocabulario. Es la "fórmula única" interna:
 *
 *   texto → limpiar → tokenizar → stopwords → pesos TF-IDF/BM25 → vector L2 (512D)
 *
 * Mejoras v2:
 *  - Lista exhaustiva de stopwords en español (artículos, preposiciones, conjunciones,
 *    pronombres, verbos auxiliares comunes) para mejorar la señal/ruido.
 *  - Suavizado BM25-like: TF saturada en k1=1.2 en lugar de log puro.
 *  - IDF batch: getIdfMap hace UNA sola query para todos los términos (no N+1).
 *  - Normalización L2 preservada para que producto punto = similitud coseno.
 *
 * Separación pura/IO: aquí solo viven funciones SIN efectos (matemática).
 * El conteo de documentos por término (docsWithTerm) vive en services/knowledge.ts.
 */

export const DIMENSIONS = 512

// ── Stopwords en español ────────────────────────────────────────────────────
// Palabras de alta frecuencia que no aportan valor semántico al vector.
const STOPWORDS = new Set([
  // artículos
  'el','la','los','las','un','una','unos','unas','lo',
  // preposiciones
  'a','ante','bajo','con','contra','de','desde','durante','en','entre',
  'hacia','hasta','mediante','para','por','segun','sin','sobre','tras',
  // conjunciones
  'y','e','ni','o','u','pero','sino','aunque','porque','pues','que',
  'si','como','cuando','donde','mientras','ya','tambien','ademas',
  // pronombres
  'yo','tu','el','ella','nosotros','vosotros','ellos','ellas',
  'me','te','se','nos','os','le','les','mi','mis','su','sus',
  'este','esta','estos','estas','ese','esa','esos','esas',
  'aquel','aquella','aquellos','aquellas',
  // verbos auxiliares / cópula comunes
  'es','son','era','eran','fue','fueron','ser','estar','tener',
  'ha','han','hay','haber','puede','pueden','debe','deben',
  // adverbios frecuentes
  'no','si','muy','mas','menos','bien','mal','solo','aqui','ahi',
  'alla','antes','despues','siempre','nunca','todo','todos','toda',
  'todas','otro','otra','otros','otras',
  // palabras muy cortas que pasan el filtro de longitud >2
  'del','las','los','por','que','con','una','sus','los',
])

/**
 * Tokeniza un texto: minúsculas, quita acentos y signos, separa palabras,
 * filtra stopwords y tokens muy cortos/largos.
 */
export function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')  // quita acentos
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((t) => t.length > 2 && t.length < 40 && !STOPWORDS.has(t))
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

// Parámetros BM25-like
const K1 = 1.2   // saturación de TF: limita el peso de términos muy repetidos
const B  = 0.75  // no se usa (requiere longitud media del corpus), simplificado

/**
 * TF saturada estilo BM25: (k1+1)*freq / (k1 + freq)
 * Evita que un término repetido 100 veces pese 100x más que uno que aparece una vez.
 */
export function tf(frequency: number): number {
  return ((K1 + 1) * frequency) / (K1 + frequency)
}

/**
 * IDF suavizado (Robertson & Sparck Jones):
 *   ln((N - df + 0.5) / (df + 0.5)) + 1
 * Siempre ≥ 1 para df > 0.
 */
export function idf(totalDocs: number, docsWithTerm: number): number {
  const df = Math.min(docsWithTerm, totalDocs)  // df nunca puede superar N
  return Math.log((totalDocs - df + 0.5) / (df + 0.5) + 1) + 1
}

/**
 * TF-IDF combinado.
 */
export function tfidf(
  frequency: number,
  totalDocs: number,
  docsWithTerm: number,
): number {
  return tf(frequency) * idf(totalDocs, docsWithTerm)
}

/**
 * Vector TF-IDF de un texto (sin pesos de corpus externos).
 */
export function featurize(text: string): Float32Array {
  return featurizeWeighted(text)
}

/**
 * Vector TF-IDF ponderado: aplica TF saturada (BM25-like) y, si hay mapa IDF,
 * escala cada término antes de normalizar L2.
 */
export function featurizeWeighted(
  text: string,
  idfWeights?: Record<string, number>,
): Float32Array {
  const counts = new Map<string, number>()
  for (const term of tokenize(text)) {
    counts.set(term, (counts.get(term) ?? 0) + 1)
  }

  const vec = new Float32Array(DIMENSIONS)
  for (const [term, freq] of counts) {
    const tfw = tf(freq)
    const idfw = idfWeights?.[term] ?? 1
    vec[hashTerm(term)] += tfw * idfw
  }

  return l2Normalize(vec)
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
