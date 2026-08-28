import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { type EntradaCatalogo } from '../utils/catalogo-sepomex.ts'
import {
  buscarColonias,
  buscarMunicipios,
  type MunicipioSugerencia,
  type Sugerencia,
} from '../utils/colonias-search.ts'

let catalogoCache: EntradaCatalogo[] | null = null
let avisoEmitido = false

/**
 * Carga el catálogo de colonias desde app/data/colonias.json y lo cachea en memoria del módulo.
 * Si el archivo no existe, degrada suavemente retornando un array vacío.
 */
export async function cargarCatalogo(): Promise<EntradaCatalogo[]> {
  if (catalogoCache) {
    return catalogoCache
  }

  const ruta = resolve(process.cwd(), 'app/data/colonias.json')
  try {
    const raw = await readFile(ruta, 'utf-8')
    catalogoCache = JSON.parse(raw) as EntradaCatalogo[]
    return catalogoCache
  } catch {
    if (!avisoEmitido) {
      console.warn(
        '[catalogo] app/data/colonias.json no encontrado, operando sin sugerencias de catálogo',
      )
      avisoEmitido = true
    }
    return []
  }
}

/**
 * Máximo de búsquedas distintas que se recuerdan.
 *
 * El caché lo alimenta una query string pública, así que tiene que estar
 * acotado: sin tope, basta con pedir cadenas al azar para hacerlo crecer sin
 * límite. Al llenarse se descarta la entrada más antigua.
 */
const MAX_BUSQUEDAS_MEMORIZADAS = 500

const busquedasCache = new Map<string, readonly (Sugerencia | MunicipioSugerencia)[]>()

function recordar<T extends Sugerencia[] | MunicipioSugerencia[]>(
  clave: string,
  resultado: T,
): readonly T[number][] {
  if (busquedasCache.size >= MAX_BUSQUEDAS_MEMORIZADAS) {
    const masAntigua = busquedasCache.keys().next().value
    if (masAntigua !== undefined) busquedasCache.delete(masAntigua)
  }

  // Todos los que pidan la misma búsqueda reciben esta misma instancia, así que
  // basta con que uno la mute para corromper el resultado de los demás.
  Object.freeze(resultado)
  busquedasCache.set(clave, resultado)
  return resultado
}

/**
 * Busca colonias memorizando el resultado.
 *
 * El scoring recorre el catálogo entero en cada llamada (~13-17 ms sobre las
 * 5723 entradas actuales) y es una función pura del catálogo, que sólo cambia
 * al reiniciar. Como el autocompletado dispara una consulta por pulsación, las
 * mismas búsquedas se repiten constantemente entre usuarios.
 */
export async function sugerirColonias(
  q: string,
  municipio: string | undefined,
  limite: number,
): Promise<readonly Sugerencia[]> {
  const clave = `colonia|${limite}|${q.toLowerCase()}|${(municipio ?? '').toLowerCase()}`
  const memorizada = busquedasCache.get(clave)
  if (memorizada) return memorizada as readonly Sugerencia[]

  const catalogo = await cargarCatalogo()
  return recordar(clave, buscarColonias(catalogo, { q, municipio, limite }))
}

/** Contraparte de sugerirColonias para el listado de municipios. */
export async function sugerirMunicipios(
  q: string,
  limite: number,
): Promise<readonly MunicipioSugerencia[]> {
  const clave = `municipio|${limite}|${q.toLowerCase()}`
  const memorizada = busquedasCache.get(clave)
  if (memorizada) return memorizada as readonly MunicipioSugerencia[]

  const catalogo = await cargarCatalogo()
  return recordar(clave, buscarMunicipios(catalogo, q, limite))
}
