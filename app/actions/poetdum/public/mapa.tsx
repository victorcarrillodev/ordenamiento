import { clientEntry, css, type Handle, type SerializableProps } from 'remix/ui'

import { loadLeaflet } from '../../../ui/leaflet.ts'

const mapa = css({
  width: '100%',
  height: '500px',
  borderRadius: '12px',
  overflow: 'hidden',
})

/** Centro por omisión del mapa del territorio. */
const CENTRO_TERRITORIO: [number, number] = [20.6767, -103.3475]

export interface MapaProps extends SerializableProps {
  /**
   * Punto a marcar (la sede de una actividad). Sin él, el mapa muestra el
   * territorio completo con su marcador de referencia.
   */
  latitud?: number
  longitud?: number
  /** Texto del marcador; se inserta como texto, nunca como HTML. */
  etiqueta?: string
  /** Alto del mapa (CSS). */
  alto?: string
}

export const Mapa = clientEntry(
  import.meta.url,

  function Mapa(handle: Handle<MapaProps>) {
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

          // ==========================================
          // MAPA
          // ==========================================

          const { latitud, longitud, etiqueta } = handle.props
          const punto: [number, number] | null =
            Number.isFinite(latitud) && Number.isFinite(longitud)
              ? [latitud as number, longitud as number]
              : null

          map = L.map(elemento).setView(punto ?? CENTRO_TERRITORIO, punto ? 16 : 13)

          // ==========================================
          // MAPA NORMAL - OPENSTREETMAP
          // ==========================================

          const osm = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution:
              '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
            maxZoom: 19,
          })

          // ==========================================
          // MAPA SATÉLITE
          // ==========================================

          const satellite = L.tileLayer(
            'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
            {
              attribution: 'Tiles &copy; Esri',
              maxZoom: 19,
            },
          )

          // ==========================================
          // MAPA OSCURO
          // ==========================================

          const dark = L.tileLayer(
            'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
            {
              attribution: '&copy; OpenStreetMap &copy; CARTO',
              maxZoom: 20,
            },
          )
          const terrain = L.tileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', {
            attribution:
              'Map data: &copy; OpenStreetMap contributors, SRTM | Map style: &copy; OpenTopoMap',
            maxZoom: 17,
          })

          // ==========================================
          // MAPA POR DEFECTO
          // ==========================================

          osm.addTo(map)

          const baseMaps = {
            '🗺️ Mapa': osm,
            '🛰️ Satélite': satellite,
            '🌙 Oscuro': dark,
            '🏔️ Terreno': terrain,
          }

          // ==========================================
          // CONTROL DE CAPAS
          // ==========================================

          L.control
            .layers(baseMaps, undefined, {
              position: 'topright',
              collapsed: true,
            })
            .addTo(map)

          // ==========================================
          // MARCADOR
          // ==========================================

          if (punto) {
            // Un nodo con textContent: el nombre de la sede lo escribe el
            // panel, y Leaflet interpretaría un texto con etiquetas como HTML.
            const rotulo = document.createElement('strong')
            rotulo.textContent = etiqueta ?? ''
            const marcador = L.marker(punto).addTo(map)
            if (etiqueta) marcador.bindPopup(rotulo).openPopup()
          } else {
            L.marker(CENTRO_TERRITORIO).addTo(map).bindPopup('<b>Guadalajara</b>').openPopup()
          }
        })
      }

      const { alto } = handle.props
      return <div id={handle.id} mix={alto ? [mapa, css({ height: alto })] : mapa} />
    }
  },
)
