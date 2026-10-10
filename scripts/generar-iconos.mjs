#!/usr/bin/env node
/**
 * Genera `app/ui/admin/iconos.ts`: los trazos de todos los iconos que usa la
 * aplicación, para que el panel y las páginas públicas los dibujen EN LÍNEA.
 *
 * Antes cada icono era un `<iconify-icon>` que pedía su dibujo a un CDN. El script
 * que registra ese componente se cargaba desde una dirección que no existe
 * (https://code.iconify.design/3/3.1.1/…, responde 404), así que NINGÚN icono se
 * dibujó nunca: los botones, el menú y las tarjetas quedaban con un hueco. Aun con
 * la dirección bien, la pantalla dependía de un tercero para algo tan básico como
 * un botón de borrar; en una red institucional con salida restringida, igual.
 *
 * Uso (necesita internet, solo al agregar un icono nuevo):
 *
 *     npm run iconos
 *
 * Recorre `app/` y `public/` buscando referencias `mdi:nombre`, pide a la API de
 * Iconify (https://api.iconify.design) el dibujo de cada una en la colección
 * «Material Design Icons» de Pictogrammers (Apache 2.0) y reescribe el archivo. El
 * resultado se versiona: la aplicación no vuelve a pedir nada en ejecución.
 * Falla —sin escribir nada— si algún nombre no existe en la colección o si algún
 * dibujo trae algo que no sean trazos (`<path>`).
 */
/* global fetch, console */
import { readFile, readdir, writeFile } from 'node:fs/promises'
import { fileURLToPath, URL } from 'node:url'
import { join } from 'node:path'

const RAIZ = fileURLToPath(new URL('..', import.meta.url))
const DESTINO = join(RAIZ, 'app/ui/admin/iconos.ts')
const CARPETAS = ['app', 'public']
const EXTENSIONES = /\.(tsx?|jsx?|mjs|css)$/
/** Las pruebas usan nombres inventados a propósito; no son iconos de la aplicación. */
const IGNORAR = /(\.test\.|\.stories\.|\/iconos\.ts$)/
const POR_PETICION = 40

async function* archivos(carpeta) {
  for (const entrada of await readdir(carpeta, { withFileTypes: true })) {
    const ruta = join(carpeta, entrada.name)
    if (entrada.isDirectory()) {
      if (entrada.name === 'node_modules') continue
      yield* archivos(ruta)
    } else if (EXTENSIONES.test(entrada.name) && !IGNORAR.test(ruta)) {
      yield ruta
    }
  }
}

async function nombresUsados() {
  const nombres = new Set()
  for (const carpeta of CARPETAS) {
    for await (const ruta of archivos(join(RAIZ, carpeta))) {
      const texto = await readFile(ruta, 'utf8')
      for (const [, nombre] of texto.matchAll(/\bmdi:([a-z0-9]+(?:-[a-z0-9]+)*)\b/g)) {
        nombres.add(nombre)
      }
    }
  }
  return [...nombres].sort()
}

/** `<path fill="currentColor" d="…"/>` → `['…']`; cualquier otra cosa es un error. */
function trazosDe(nombre, cuerpo) {
  const trazos = [...cuerpo.matchAll(/<path\b[^>]*?\sd="([^"]+)"[^>]*?\/?>/g)].map((m) => m[1])
  const resto = cuerpo.replace(/<path\b[^>]*?\/?>/g, '').trim()
  if (trazos.length === 0 || resto !== '') {
    throw new Error(`mdi:${nombre} trae algo que no son trazos: ${cuerpo.slice(0, 120)}`)
  }
  return trazos
}

async function pedir(nombres) {
  const url = `https://api.iconify.design/mdi.json?icons=${nombres.join(',')}`
  const respuesta = await fetch(url)
  if (!respuesta.ok) throw new Error(`La API de Iconify respondió ${respuesta.status}`)
  return respuesta.json()
}

function resolver(datos, nombre) {
  const directo = datos.icons?.[nombre]
  if (directo) return directo
  const alias = datos.aliases?.[nombre]
  if (!alias) return null
  if (alias.hFlip || alias.vFlip || alias.rotate) {
    throw new Error(`mdi:${nombre} es un alias girado o volteado; usa el nombre original`)
  }
  return resolver(datos, alias.parent)
}

const nombres = await nombresUsados()
const iconos = {}
for (let i = 0; i < nombres.length; i += POR_PETICION) {
  const lote = nombres.slice(i, i + POR_PETICION)
  const datos = await pedir(lote)
  if ((datos.width ?? 24) !== 24 || (datos.height ?? 24) !== 24) {
    throw new Error('La colección ya no usa la cuadrícula de 24 × 24')
  }
  for (const nombre of lote) {
    const icono = resolver(datos, nombre)
    if (!icono) throw new Error(`mdi:${nombre} no existe en Material Design Icons`)
    iconos[`mdi:${nombre}`] = trazosDe(nombre, icono.body)
  }
}

const filas = Object.keys(iconos)
  .sort()
  .map((clave) => `  '${clave}': ${JSON.stringify(iconos[clave])},`)
  .join('\n')

await writeFile(
  DESTINO,
  `/**
 * GENERADO por scripts/generar-iconos.mjs (\`npm run iconos\`): no se edita a mano.
 *
 * Trazos de los iconos de la aplicación, de la colección «Material Design Icons»
 * de Pictogrammers (licencia Apache 2.0), en su cuadrícula de 24 × 24. \`Icon\` los
 * dibuja en línea: la pantalla no depende de ningún CDN para mostrar un botón.
 */
export const ICONOS: Record<string, readonly string[]> = {
${filas}
}
`,
)

console.log(`${Object.keys(iconos).length} iconos escritos en app/ui/admin/iconos.ts`)
