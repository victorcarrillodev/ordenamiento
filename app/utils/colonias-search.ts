import { type EntradaCatalogo, normalizar } from './catalogo-sepomex.ts'

export interface Sugerencia {
  colonia: string
  municipio: string
  cp: string
  tipo: string
  calleSugerida?: string
}

export interface MunicipioSugerencia {
  municipio: string
  coloniasCount: number
}

export interface OpcionesBusqueda {
  q: string
  municipio?: string
  limite?: number
}

const STOPWORDS = new Set(['el', 'la', 'los', 'las', 'de', 'del', 'y', 'en', 'un', 'una'])

const STREET_PREFIXES = new Set([
  'calle',
  'av',
  'ave',
  'avenida',
  'andador',
  'and',
  'privada',
  'priv',
  'prolongacion',
  'prol',
  'carretera',
  'carr',
  'calzada',
  'blvd',
  'boulevard',
  'cerrada',
  'cda',
  'c',
  'no',
  'num',
  'numero',
])

function tokenize(query: string): string[] {
  const norm = normalizar(query)
  return norm
    .split(/[\s,.-]+/)
    .filter((t) => t.length > 0 && !STOPWORDS.has(t) && !STREET_PREFIXES.has(t) && !/^\d+$/.test(t))
}

function normalizePhonetic(term: string): string {
  return normalizar(term)
    .replace(/th/g, 't')
    .replace(/z/g, 's')
    .replace(/c([ei])/g, 's$1')
    .replace(/v/g, 'b')
    .replace(/h/g, '')
}

/**
 * Busca y clasifica colonias de Jalisco según query con búsqueda difusa, tolerancia fonética y coincidencia de prefijos.
 */
export function buscarColonias(
  catalogo: EntradaCatalogo[],
  opciones: OpcionesBusqueda,
): Sugerencia[] {
  const query = opciones.q?.trim() ?? ''
  if (query.length < 2) {
    return []
  }

  const qNorm = normalizar(query)
  const qTokens = tokenize(query)
  const qTokensPhonetic = qTokens.map(normalizePhonetic).filter((t) => t.length >= 2)
  const munNorm = opciones.municipio ? normalizar(opciones.municipio) : ''
  const limite = opciones.limite && opciones.limite > 0 ? opciones.limite : 10

  const esCp = /^\d{5}$/.test(query)

  // Extraer número de calle si se ingresó (ej: "Loma Alta 200" o "Av. Juárez #45")
  const numeroMatch = query.match(/(?:#|no\.?|num\.?|núm\.?)?\s*(\d{1,5}(?:\s*-[A-Za-z0-9]+)?)/i)
  const numeroCalle = numeroMatch ? numeroMatch[1] : undefined

  // Consulta limpia sin prefijos ni números para matching directo
  const qLimpia = qTokens.join(' ')

  interface Coincidencia {
    entrada: EntradaCatalogo
    score: number // menor score = mayor relevancia
  }

  const matches: Coincidencia[] = []

  for (const entrada of catalogo) {
    const munEntradaNorm = normalizar(entrada.municipio)

    // Filtro por municipio si fue seleccionado previamente
    if (munNorm && munEntradaNorm !== munNorm) {
      continue
    }

    if (esCp) {
      if (entrada.cp === query) {
        matches.push({ entrada, score: 0 })
      }
      continue
    }

    const colNorm = normalizar(entrada.colonia)
    const busquedaNorm = entrada.busqueda

    // 1. Coincidencia exacta de prefijo en colonia (máxima prioridad)
    if (colNorm.startsWith(qNorm) || (qLimpia.length >= 2 && colNorm.startsWith(qLimpia))) {
      matches.push({ entrada, score: 1 })
      continue
    }

    // 2. Coincidencia de prefijo sin artículos (ej: "Loma Alta" vs "La Loma Alta")
    const colSinArticulos = colNorm.replace(/^(el|la|los|las|de|del|san|santa|sta)\s+/, '')
    const qSinArticulos = (qLimpia || qNorm).replace(/^(el|la|los|las|de|del|san|santa|sta)\s+/, '')
    if (qSinArticulos.length >= 2 && colSinArticulos.startsWith(qSinArticulos)) {
      matches.push({ entrada, score: 2 })
      continue
    }

    // 3. Substring directo en colonia
    if (colNorm.includes(qNorm) || (qLimpia.length >= 2 && colNorm.includes(qLimpia))) {
      matches.push({ entrada, score: 3 })
      continue
    }

    // 4. Coincidencia de prefijo en municipio
    if (
      munEntradaNorm.startsWith(qNorm) ||
      (qLimpia.length >= 2 && munEntradaNorm.startsWith(qLimpia))
    ) {
      matches.push({ entrada, score: 4 })
      continue
    }

    // 5. Coincidencia de todos los tokens relevantes
    if (qTokens.length > 0) {
      const matchAllTokens = qTokens.every((tok) => busquedaNorm.includes(tok))
      if (matchAllTokens) {
        matches.push({ entrada, score: 5 })
        continue
      }
    }

    // 6. Substring general en texto indexado de búsqueda (colonia + municipio + cp)
    if (busquedaNorm.includes(qNorm) || (qLimpia.length >= 2 && busquedaNorm.includes(qLimpia))) {
      matches.push({ entrada, score: 6 })
      continue
    }

    // 7. Búsqueda fonética token por token (ej: "el betel" -> "Bethel, Guadalajara", "santo tomas")
    if (qTokensPhonetic.length > 0) {
      const entradaPhonetic = normalizePhonetic(busquedaNorm)
      if (qTokensPhonetic.every((tok) => entradaPhonetic.includes(tok))) {
        matches.push({ entrada, score: 7 })
      }
    }
  }

  matches.sort((a, b) => {
    if (a.score !== b.score) {
      return a.score - b.score
    }
    const cmpCol = a.entrada.colonia.localeCompare(b.entrada.colonia, 'es', {
      sensitivity: 'base',
    })
    if (cmpCol !== 0) return cmpCol
    const cmpMun = a.entrada.municipio.localeCompare(b.entrada.municipio, 'es', {
      sensitivity: 'base',
    })
    if (cmpMun !== 0) return cmpMun
    return a.entrada.cp.localeCompare(b.entrada.cp)
  })

  return matches.slice(0, limite).map((m) => {
    let calleSugerida: string | undefined
    if (numeroCalle) {
      calleSugerida = `${m.entrada.colonia} ${numeroCalle}`
    }
    return {
      colonia: m.entrada.colonia,
      municipio: m.entrada.municipio,
      cp: m.entrada.cp,
      tipo: m.entrada.tipo,
      calleSugerida,
    }
  })
}

/**
 * Busca municipios únicos de Jalisco según prefijo o coincidencia de texto.
 */
export function buscarMunicipios(
  catalogo: EntradaCatalogo[],
  query: string,
  limite = 10,
): MunicipioSugerencia[] {
  const q = query.trim()
  if (q.length < 1) {
    return []
  }

  const qNorm = normalizar(q)
  const qSinArticulos = qNorm.replace(/^(el|la|los|las|san|santa|sta)\s+/, '')
  const munMap = new Map<string, number>()
  for (const entrada of catalogo) {
    munMap.set(entrada.municipio, (munMap.get(entrada.municipio) ?? 0) + 1)
  }

  interface CoincidenciaMun {
    municipio: string
    coloniasCount: number
    score: number
  }

  const results: CoincidenciaMun[] = []
  for (const [municipio, count] of munMap.entries()) {
    const munNorm = normalizar(municipio)
    const munSinArticulos = munNorm.replace(/^(el|la|los|las|san|santa|sta)\s+/, '')

    if (munNorm.startsWith(qNorm)) {
      results.push({ municipio, coloniasCount: count, score: 1 })
    } else if (qSinArticulos.length >= 2 && munSinArticulos.startsWith(qSinArticulos)) {
      results.push({ municipio, coloniasCount: count, score: 2 })
    } else if (munNorm.includes(qNorm)) {
      results.push({ municipio, coloniasCount: count, score: 3 })
    }
  }

  results.sort((a, b) => {
    if (a.score !== b.score) return a.score - b.score
    return a.municipio.localeCompare(b.municipio, 'es', { sensitivity: 'base' })
  })

  return results.slice(0, limite)
}
