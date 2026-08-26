import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { parseSepomex, type EntradaCatalogo } from '../app/utils/catalogo-sepomex.ts'

const DEFAULT_ORIGEN = 'https://www.correosdemexico.gob.mx/DATOSABIERTOS/cp/CPdescarga.txt'
const DEFAULT_ESTADO = 'Jalisco'
const DEFAULT_DESTINO = 'app/data/colonias.json'
const DEFAULT_CLIENT_BUNDLE = 'public/autocomplete-data.js'

/**
 * Genera el paquete compacto para ejecución 100% en el cliente (0ms latencia).
 */
export function generarBundleCliente(catalogo: EntradaCatalogo[]): string {
  const municipiosMap = new Map<string, number>()
  const tiposMap = new Map<string, number>()
  const municipios: string[] = []
  const tipos: string[] = []

  // Priorizar municipios de la Zona Metropolitana de Guadalajara al inicio
  const priorityMun = [
    'San Pedro Tlaquepaque',
    'Guadalajara',
    'Zapopan',
    'Tlajomulco de Zúñiga',
    'Tonalá',
    'El Salto',
    'Ixtlahuacán de los Membrillos',
    'Juanacatlán',
    'Zapotlanejo',
    'Chapala',
    'Puerto Vallarta',
    'Lagos de Moreno',
    'Tepatitlán de Morelos',
    'Ciudad Guzmán (Zapotlán el Grande)',
    'Ocotlán',
  ]

  for (const m of priorityMun) {
    if (!municipiosMap.has(m)) {
      municipiosMap.set(m, municipios.length)
      municipios.push(m)
    }
  }

  for (const item of catalogo) {
    if (!municipiosMap.has(item.municipio)) {
      municipiosMap.set(item.municipio, municipios.length)
      municipios.push(item.municipio)
    }
    if (!tiposMap.has(item.tipo)) {
      tiposMap.set(item.tipo, tipos.length)
      tipos.push(item.tipo)
    }
  }

  const compactRows = catalogo.map((item) => [
    item.colonia,
    municipiosMap.get(item.municipio) ?? 0,
    item.cp,
    tiposMap.get(item.tipo) ?? 0,
  ])

  return `/**
 * Catálogo Compacto de Jalisco (SEPOMEX) para Búsqueda Instantánea 0ms en Cliente
 * Autogenerado: ${new Date().toISOString()}
 */
;(function(){
  if (typeof window !== 'undefined') {
    window.__JALISCO_DATA__ = {
      m: ${JSON.stringify(municipios)},
      t: ${JSON.stringify(tipos)},
      c: ${JSON.stringify(compactRows)}
    };
  }
})();
`
}

/**
 * Descarga y procesa el catálogo SEPOMEX para generar el artefacto de build en JSON y el bundle de cliente.
 */
export async function construirCatalogo({
  origen = process.env.CATALOGO_ORIGEN ?? DEFAULT_ORIGEN,
  estado = process.env.CATALOGO_ESTADO ?? DEFAULT_ESTADO,
  destino = process.env.CATALOGO_DESTINO ?? DEFAULT_DESTINO,
  clientDestino = DEFAULT_CLIENT_BUNDLE,
}: {
  origen?: string
  estado?: string
  destino?: string
  clientDestino?: string
} = {}): Promise<number> {
  const rutaDestino = resolve(process.cwd(), destino)
  const rutaClientDestino = resolve(process.cwd(), clientDestino)
  await mkdir(dirname(rutaDestino), { recursive: true })
  await mkdir(dirname(rutaClientDestino), { recursive: true })

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

  const catalogo = parseSepomex(textoSepomex, estado)
  await writeFile(rutaDestino, JSON.stringify(catalogo, null, 2), 'utf-8')
  console.log(`[build:catalogo] Éxito: ${catalogo.length} colonias generadas en ${destino}`)

  const clientBundle = generarBundleCliente(catalogo)
  await writeFile(rutaClientDestino, clientBundle, 'utf-8')
  console.log(`[build:catalogo] Éxito: Bundle de cliente generado en ${clientDestino}`)

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
