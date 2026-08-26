import { type EntradaCatalogo, normalizar } from './catalogo-sepomex.ts'

export interface Sugerencia {
  colonia: string
  municipio: string
  cp: string
  tipo: string
}

export interface OpcionesBusqueda {
  q: string
  municipio?: string
  limite?: number
}

/**
 * Busca y clasifica colonias según query y filtro opcional de municipio.
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
  const munNorm = opciones.municipio ? normalizar(opciones.municipio) : ''
  const limite = opciones.limite && opciones.limite > 0 ? opciones.limite : 8

  const esCp = /^\d{5}$/.test(query)

  interface Coincidencia {
    entrada: EntradaCatalogo
    score: number // menor score = mayor relevancia
  }

  const matches: Coincidencia[] = []

  for (const entrada of catalogo) {
    if (munNorm && normalizar(entrada.municipio) !== munNorm) {
      continue
    }

    if (esCp) {
      if (entrada.cp === query) {
        matches.push({ entrada, score: 0 })
      }
      continue
    }

    const colNorm = normalizar(entrada.colonia)
    const munEntradaNorm = normalizar(entrada.municipio)

    if (colNorm.startsWith(qNorm)) {
      // Coincidencia de prefijo en colonia (máxima prioridad para texto)
      matches.push({ entrada, score: 1 })
    } else if (munEntradaNorm.startsWith(qNorm)) {
      // Coincidencia de prefijo en municipio
      matches.push({ entrada, score: 2 })
    } else if (entrada.busqueda.includes(qNorm)) {
      // Substring general en busqueda (colonia, municipio o cp)
      matches.push({ entrada, score: 3 })
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

  return matches.slice(0, limite).map((m) => ({
    colonia: m.entrada.colonia,
    municipio: m.entrada.municipio,
    cp: m.entrada.cp,
    tipo: m.entrada.tipo,
  }))
}

export interface MunicipioSugerencia {
  municipio: string
  coloniasCount: number
}

/**
 * Busca municipios únicos de Jalisco según prefijo o coincidencia de texto.
 */
export function buscarMunicipios(
  catalogo: EntradaCatalogo[],
  query: string,
  limite = 8,
): MunicipioSugerencia[] {
  const q = query.trim()
  if (q.length < 1) {
    return []
  }

  const qNorm = normalizar(q)
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
    if (munNorm.startsWith(qNorm)) {
      results.push({ municipio, coloniasCount: count, score: 1 })
    } else if (munNorm.includes(qNorm)) {
      results.push({ municipio, coloniasCount: count, score: 2 })
    }
  }

  results.sort((a, b) => {
    if (a.score !== b.score) return a.score - b.score
    return a.municipio.localeCompare(b.municipio, 'es', { sensitivity: 'base' })
  })

  return results.slice(0, limite)
}
