/**
 * Íconos del portal público del Programa, en SVG en línea: la portada no debe
 * depender del CDN de Iconify para dibujar un marcador de lugar o una flecha.
 * Heredan el color del texto (`currentColor`) y son decorativos (`aria-hidden`).
 */
import type { Handle } from 'remix/ui'

interface IconoProps {
  size?: number
}

function trazo(d: string | string[]) {
  return function Icono(handle: Handle<IconoProps>) {
    return () => {
      const size = handle.props.size ?? 16
      const rutas = Array.isArray(d) ? d : [d]
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
          aria-hidden="true"
          focusable="false"
        >
          {rutas.map((ruta) => (
            <path key={ruta} d={ruta} />
          ))}
        </svg>
      )
    }
  }
}

export const IconoUbicacion = trazo([
  'M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21z',
  'M12 12.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z',
])
export const IconoReloj = trazo(['M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z', 'M12 7v5l3 2'])
export const IconoFlecha = trazo('M5 12h14M13 5l7 7-7 7')
export const IconoMegafono = trazo([
  'M3 11v2a1 1 0 0 0 1 1h2l5 4V6L6 10H4a1 1 0 0 0-1 1z',
  'M15.5 8.5a5 5 0 0 1 0 7',
  'M18.5 5.5a9 9 0 0 1 0 13',
])
export const IconoCalendario = trazo([
  'M5 5h14a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1z',
  'M16 3v4M8 3v4M4 10h16',
])
export const IconoDocumento = trazo([
  'M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z',
  'M14 3v5h5M9 13h6M9 17h6',
])
export const IconoDescarga = trazo(['M12 4v11M7 10l5 5 5-5', 'M5 20h14'])
export const IconoVer = trazo([
  'M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z',
  'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z',
])
