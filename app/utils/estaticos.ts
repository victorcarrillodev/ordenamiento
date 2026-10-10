import { createHash } from 'node:crypto'
import { readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'

/**
 * Direcciones de los archivos estáticos de `public/` con su versión.
 *
 * `admin.css`, `admin.js` y compañía se servían sin ninguna marca de versión ni
 * `Cache-Control`, así que cada navegador decidía por su cuenta cuánto guardarlos
 * (por heurística, a partir de la fecha del archivo). Tras una actualización la
 * página nueva llegaba con la hoja de estilos vieja: menús rotos, rejillas
 * descuadradas, hasta que alguien forzaba la recarga. Con `?v=<huella>` la
 * dirección cambia en cuanto cambia el contenido, y el servidor puede dejar que el
 * navegador lo guarde un año (ver `withCacheHeaders` en server.ts).
 *
 * La huella es un hash del contenido, no de la fecha: dos instalaciones con los
 * mismos archivos dan la misma dirección. Solo se recalcula cuando cambia la fecha
 * de modificación del archivo, que es lo único que se consulta en cada página.
 */

const basePath = (process.env.BASE_PATH ?? '/ordena').replace(/\/$/, '')

export interface Versionador {
  /** Huella del contenido de `public/<archivo>`; «0» si el archivo no existe. */
  versionDe(archivo: string): string
  /** `${BASE_PATH}/<archivo>?v=<huella>`, la dirección que se escribe en el HTML. */
  urlEstatica(archivo: string): string
}

export function crearVersionador(carpeta: string): Versionador {
  const guardadas = new Map<string, { modificado: number; huella: string }>()

  function versionDe(archivo: string): string {
    const ruta = join(carpeta, archivo)
    try {
      const modificado = statSync(ruta).mtimeMs
      const previa = guardadas.get(archivo)
      if (previa && previa.modificado === modificado) return previa.huella
      const huella = createHash('sha1').update(readFileSync(ruta)).digest('hex').slice(0, 10)
      guardadas.set(archivo, { modificado, huella })
      return huella
    } catch {
      // Sin el archivo no hay nada que versionar; la página sigue funcionando.
      return '0'
    }
  }

  return {
    versionDe,
    urlEstatica: (archivo) => `${basePath}/${archivo}?v=${versionDe(archivo)}`,
  }
}

/** El de la aplicación: lee `public/` desde la carpeta donde corre el servidor. */
export const { versionDe, urlEstatica } = crearVersionador(join(process.cwd(), 'public'))
