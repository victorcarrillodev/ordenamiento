import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { parseSepomex } from '../app/utils/catalogo-sepomex.ts'

const DEFAULT_ORIGEN = 'https://www.correosdemexico.gob.mx/DATOSABIERTOS/cp/CPdescarga.txt'
const DEFAULT_ESTADO = 'Jalisco'
const DEFAULT_MUNICIPIO = 'San Pedro Tlaquepaque'
const DEFAULT_DESTINO = 'app/data/colonias.json'
const DESTINO_NAVEGADOR = 'public/colonias-data.js'

/**
 * Descarga y procesa el catálogo SEPOMEX para generar el artefacto de build en JSON y el bundle de cliente.
 */
export async function construirCatalogo({
  origen = process.env.CATALOGO_ORIGEN ?? DEFAULT_ORIGEN,
  estado = process.env.CATALOGO_ESTADO ?? DEFAULT_ESTADO,
  municipio = process.env.CATALOGO_MUNICIPIO ?? DEFAULT_MUNICIPIO,
  destino = process.env.CATALOGO_DESTINO ?? DEFAULT_DESTINO,
}: {
  origen?: string
  estado?: string
  municipio?: string
  destino?: string
} = {}): Promise<number> {
  const rutaDestino = resolve(process.cwd(), destino)
  await mkdir(dirname(rutaDestino), { recursive: true })

  console.log(`[build:catalogo] Procesando catálogo para estado: ${estado}...`)

  let textoSepomex = ''

  if (origen.startsWith('http://') || origen.startsWith('https://')) {
    try {
      console.log(`[build:catalogo] Descargando desde ${origen}...`)
      const controller = new AbortController()
      const timer = setTimeout(() => controller.abort(), 15000)
      const res = await fetch(origen, { signal: controller.signal })
      clearTimeout(timer)

      if (res.ok) {
        const arrayBuf = await res.arrayBuffer()
        // SEPOMEX distribuye en ISO-8859-1 / windows-1252
        const decoderIso = new TextDecoder('iso-8859-1')
        textoSepomex = decoderIso.decode(arrayBuf)
      } else {
        console.warn(`[build:catalogo] Respuesta HTTP no exitosa (${res.status})`)
      }
    } catch (err) {
      console.warn(`[build:catalogo] No se pudo descargar catálogo remoto:`, (err as Error).message)
    }
  } else {
    try {
      const buf = await readFile(resolve(process.cwd(), origen))
      const decoder = new TextDecoder('iso-8859-1')
      textoSepomex = decoder.decode(buf)
    } catch (err) {
      console.warn(
        `[build:catalogo] No se pudo leer archivo local ${origen}:`,
        (err as Error).message,
      )
    }
  }

  // Fallback si no hay red ni archivo disponible: generar catálogo base de municipios clave de Jalisco
  if (!textoSepomex || textoSepomex.length < 50) {
    console.log('[build:catalogo] Generando catálogo base esencial de Jalisco (fallback)...')
    textoSepomex = generarCatalogoBaseJalisco()
  }

  const catalogo = parseSepomex(textoSepomex, estado, municipio)
  await writeFile(rutaDestino, JSON.stringify(catalogo, null, 2), 'utf-8')
  console.log(`[build:catalogo] Éxito: ${catalogo.length} colonias generadas en ${destino}`)

  // Artefacto para el navegador: catálogo embebido como window.__COLONIAS__.
  // Evita cualquier fetch a red (el endpoint /api/colonias no existe) y hace el
  // autocompletado instantáneo y offline. Solo se incluye el municipio filtrado.
  const rutaNavegador = resolve(process.cwd(), DESTINO_NAVEGADOR)
  await mkdir(dirname(rutaNavegador), { recursive: true })
  const contenidoNavegador = `window.__COLONIAS__ = ${JSON.stringify(catalogo)};\n`
  await writeFile(rutaNavegador, contenidoNavegador, 'utf-8')
  console.log(`[build:catalogo] Navegador: ${catalogo.length} colonias en ${DESTINO_NAVEGADOR}`)

  return catalogo.length
}

function generarCatalogoBaseJalisco(): string {
  const lineas = [
    'd_codigo|d_asenta|d_tipo_asenta|D_mnpio|d_estado',
    '45500|Centro|Colonia|San Pedro Tlaquepaque|Jalisco',
    '45560|San Antonio|Colonia|San Pedro Tlaquepaque|Jalisco',
    '45570|Santa María Tequepexpan|Pueblo|San Pedro Tlaquepaque|Jalisco',
    '45580|Santa Anita|Colonia|San Pedro Tlaquepaque|Jalisco',
    '45590|Toluquilla|Pueblo|San Pedro Tlaquepaque|Jalisco',
    '45600|Las Juntas|Colonia|San Pedro Tlaquepaque|Jalisco',
    '45610|San Martín de las Flores|Pueblo|San Pedro Tlaquepaque|Jalisco',
    '45615|Las Pintas|Colonia|San Pedro Tlaquepaque|Jalisco',
    '45618|El Vergel|Colonia|San Pedro Tlaquepaque|Jalisco',
    '45625|Lomas del Cuatro|Colonia|San Pedro Tlaquepaque|Jalisco',
    '45629|Miravalle|Colonia|San Pedro Tlaquepaque|Jalisco',
    '45638|Buenos Aires|Colonia|San Pedro Tlaquepaque|Jalisco',
    '44100|Americana|Colonia|Guadalajara|Jalisco',
    '44100|Centro|Colonia|Guadalajara|Jalisco',
    '44160|Ladrón de Guevara|Colonia|Guadalajara|Jalisco',
    '44270|San Antonio|Colonia|Guadalajara|Jalisco',
    '44600|Providencia|Colonia|Guadalajara|Jalisco',
    '45000|San Antonio|Colonia|Zapopan|Jalisco',
    '45050|Ciudad del Sol|Colonia|Zapopan|Jalisco',
    '45070|Las Águilas|Colonia|Zapopan|Jalisco',
    '45100|Zapopan Centro|Colonia|Zapopan|Jalisco',
    '45640|Santa Anita|Colonia|Tlajomulco de Zúñiga|Jalisco',
    '45645|San Agustín|Pueblo|Tlajomulco de Zúñiga|Jalisco',
    '45653|Tlajomulco Centro|Colonia|Tlajomulco de Zúñiga|Jalisco',
    '45400|Tonalá Centro|Colonia|Tonalá|Jalisco',
  ]
  return lineas.join('\n')
}

// Ejecución CLI directa
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  construirCatalogo().catch((err) => {
    console.error('[build:catalogo] Error fatal:', err)
    process.exit(1)
  })
}
