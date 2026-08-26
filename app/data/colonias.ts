import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { type EntradaCatalogo } from '../utils/catalogo-sepomex.ts'

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
