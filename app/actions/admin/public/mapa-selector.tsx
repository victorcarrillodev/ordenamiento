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

/**
 * Saca lat/lng de un enlace de Google Maps pegado en el campo de ubicación.
 *
 * Cubre las formas que traen las coordenadas dentro de la propia URL:
 *   .../@20.6409,-103.3126,17z        (barra de direcciones)
 *   ...?q=20.6409,-103.3126           (compartir → enlace)
 *   ...!3d20.6409!4d-103.3126         (enlaces largos de lugar)
 *
 * Los acortados (maps.app.goo.gl) NO se pueden resolver aquí: harían falta una
 * petición al servidor de Google y seguir la redirección. No pasa nada: ese
 * enlace igual se guarda y se muestra como tal; solo no pinta el marcador.
 */
export function coordenadasDeEnlace(texto: string): [number, number] | null {
  const patrones = [
    /@(-?\d{1,3}\.\d+),(-?\d{1,3}\.\d+)/,
    /[?&]q=(-?\d{1,3}\.\d+),\s*(-?\d{1,3}\.\d+)/,
    /!3d(-?\d{1,3}\.\d+)!4d(-?\d{1,3}\.\d+)/,
  ]
  for (const re of patrones) {
    const m = re.exec(texto)
    if (m) {
      const lat = Number(m[1])
      const lng = Number(m[2])
      if (Math.abs(lat) <= 90 && Math.abs(lng) <= 180) return [lat, lng]
    }
  }
  return null
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

          // Pegar un enlace de Google Maps con coordenadas las copia solas, para
          // que nadie tenga que leerlas ni teclearlas.
          const inputUbicacion = document.getElementById(
            `ubicacion_${destino}`,
          ) as HTMLInputElement | null

          inputUbicacion?.addEventListener('change', () => {
            const punto = coordenadasDeEnlace(inputUbicacion.value)
            if (!punto) return
            fijar(punto[0], punto[1])
            map?.setView(punto, 17)
          })
        })
      }

      return <div id={handle.id} mix={contenedor} />
    }
  },
)
