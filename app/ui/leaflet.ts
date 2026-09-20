/**
 * Carga de Leaflet desde unpkg (permitido por la CSP del sitio, ver
 * server.ts), compartida por los dos mapas del sitio: el del portal público
 * (app/actions/poetdum/public/mapa.tsx) y el selector de ubicación del panel
 * (app/actions/admin/public/mapa-selector.tsx). Cachea la promesa para no
 * volver a bajar el script si hay varios mapas en la misma página.
 */
export type Leaflet = typeof import('leaflet')

const LEAFLET_JS = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'
const LEAFLET_CSS = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'

let leafletPromise: Promise<Leaflet | null> | null = null

/**
 * Además del script, asegura la hoja de estilos si nadie la puso ya en
 * `<head>` (antes cada mapa decidía esto por su cuenta, y uno de los dos
 * confiaba en que la página se acordara de agregar el `<link>`). Comprobarlo
 * aquí, una sola vez y de forma idempotente, evita que un mapa nuevo se quede
 * sin estilos por ese olvido.
 */
export function loadLeaflet(): Promise<Leaflet | null> {
  leafletPromise ??= new Promise((resolve) => {
    const global = window as unknown as { L?: Leaflet }
    if (global.L) {
      resolve(global.L)
      return
    }

    if (!document.querySelector(`link[href="${LEAFLET_CSS}"]`)) {
      const hoja = document.createElement('link')
      hoja.rel = 'stylesheet'
      hoja.href = LEAFLET_CSS
      document.head.appendChild(hoja)
    }

    const script = document.createElement('script')
    script.src = LEAFLET_JS
    script.onload = () => resolve((window as unknown as { L?: Leaflet }).L ?? null)
    script.onerror = () => {
      leafletPromise = null
      resolve(null)
    }
    document.head.appendChild(script)
  })

  return leafletPromise
}
