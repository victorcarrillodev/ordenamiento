import { clientEntry, css, type Handle, type SerializableProps } from 'remix/ui'

type Leaflet = typeof import('leaflet')

const LEAFLET_JS = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'
const LEAFLET_CSS = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'

/** Centro de San Pedro Tlaquepaque, para cuando la sesión aún no tiene punto. */
const CENTRO_TLAQUEPAQUE: [number, number] = [20.6409, -103.3126]

const contenedor = css({
  width: '100%',
  height: '260px',
  borderRadius: '10px',
  overflow: 'hidden',
  border: '1px solid #e3e8f0',
})

let leafletPromise: Promise<Leaflet | null> | null = null

/**
 * Carga Leaflet desde unpkg (permitido por la CSP del sitio, ver server.ts).
 * Se cachea la promesa para no volver a bajar el script si hay varios mapas.
 */
function loadLeaflet(): Promise<Leaflet | null> {
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

export interface MapaSelectorProps extends SerializableProps {
  /** Sufijo de los inputs a rellenar: lat_<destino> y lng_<destino>. */
  destino: string
  latitud?: string
  longitud?: string
}

/**
 * Selector de ubicación: al hacer clic en el mapa coloca un marcador y escribe
 * las coordenadas en los inputs `lat_<destino>` / `lng_<destino>` del formulario.
 *
 * Los inputs son la fuente de la verdad y se pueden teclear a mano: si Leaflet
 * no carga (sin red, CSP, unpkg caído), el formulario sigue siendo usable y no
 * se pierde nada. El mapa es una ayuda, no un requisito.
 */
export const MapaSelector = clientEntry(
  import.meta.url,

  function MapaSelector(handle: Handle<MapaSelectorProps>) {
    let map: import('leaflet').Map | null = null
    let programado = false

    handle.signal.addEventListener('abort', () => {
      map?.remove()
      map = null
    })

    return () => {
      const { destino, latitud, longitud } = handle.props

      if (!programado) {
        programado = true

        handle.queueTask(async (signal) => {
          const L = await loadLeaflet()
          if (!L || signal.aborted) return

          const elemento = document.getElementById(handle.id)
          if (!elemento || signal.aborted) return

          const inputLat = document.getElementById(`lat_${destino}`) as HTMLInputElement | null
          const inputLng = document.getElementById(`lng_${destino}`) as HTMLInputElement | null

          const guardadas: [number, number] | null =
            latitud && longitud && !isNaN(Number(latitud)) && !isNaN(Number(longitud))
              ? [Number(latitud), Number(longitud)]
              : null

          map = L.map(elemento).setView(guardadas ?? CENTRO_TLAQUEPAQUE, guardadas ? 16 : 12)

          L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution:
              '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
            maxZoom: 19,
          }).addTo(map)

          let marcador = guardadas ? L.marker(guardadas).addTo(map) : null

          const fijar = (lat: number, lng: number) => {
            // 6 decimales ≈ 11 cm: de sobra para ubicar una sede, y evita
            // guardar ruido de coma flotante en la base.
            const latTxt = lat.toFixed(6)
            const lngTxt = lng.toFixed(6)
            if (inputLat) inputLat.value = latTxt
            if (inputLng) inputLng.value = lngTxt
            if (marcador) marcador.setLatLng([lat, lng])
            else if (map) marcador = L.marker([lat, lng]).addTo(map)
          }

          map.on('click', (e: import('leaflet').LeafletMouseEvent) => {
            fijar(e.latlng.lat, e.latlng.lng)
          })

          // Teclear las coordenadas a mano también mueve el marcador.
          const sincronizar = () => {
            const lat = Number(inputLat?.value)
            const lng = Number(inputLng?.value)
            if (!isNaN(lat) && !isNaN(lng) && inputLat?.value && inputLng?.value) {
              fijar(lat, lng)
              map?.setView([lat, lng], 16)
            }
          }
          inputLat?.addEventListener('change', sincronizar)
          inputLng?.addEventListener('change', sincronizar)
        })
      }

      return <div id={handle.id} mix={contenedor} />
    }
  },
)
