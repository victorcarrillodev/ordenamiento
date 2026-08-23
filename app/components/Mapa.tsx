import { clientEntry, css, type Handle } from 'remix/ui'

type Leaflet = typeof import('leaflet')

const LEAFLET_URL = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'

const mapa = css({
  width: '100%',
  height: '500px',
  borderRadius: '12px',
  overflow: 'hidden',
})

let leafletPromise: Promise<Leaflet | null> | null = null

function loadLeaflet(): Promise<Leaflet | null> {
  leafletPromise ??= new Promise((resolve) => {
    const global = window as unknown as { L?: Leaflet }
    if (global.L) {
      resolve(global.L)
      return
    }

    const script = document.createElement('script')
    script.src = LEAFLET_URL
    script.onload = () => resolve((window as unknown as { L?: Leaflet }).L ?? null)
    script.onerror = () => {
      leafletPromise = null
      resolve(null)
    }
    document.head.appendChild(script)
  })
  return leafletPromise
}

export const Mapa = clientEntry(
  import.meta.url,
  function Mapa(handle: Handle) {
    let map: import('leaflet').Map | null = null
    let scheduled = false

    handle.signal.addEventListener('abort', () => {
      map?.remove()
      map = null
    })

    return () => {
      if (!scheduled) {
        scheduled = true
        handle.queueTask(async (signal) => {
          const L = await loadLeaflet()
          if (!L || signal.aborted) return

          const elemento = document.getElementById(handle.id)
          if (!elemento || signal.aborted) return

          map = L.map(elemento).setView([20.6767, -103.3475], 13)

          L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution:
              '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
            maxZoom: 19,
          }).addTo(map)

          L.marker([20.6767, -103.3475])
            .addTo(map)
            .bindPopup('<b>Guadalajara</b>')
            .openPopup()
        })
      }

      return <div id={handle.id} mix={mapa} />
    }
  },
)
