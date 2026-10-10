import type { Handle } from 'remix/ui'

import { ICONOS } from './iconos.ts'

/**
 * Icono en línea (SVG), de la colección «Material Design Icons».
 *
 * Los trazos viven en `iconos.ts`, que genera `npm run iconos` leyendo los
 * `mdi:<nombre>` que aparecen en el código: un icono nuevo se usa escribiendo su
 * nombre y volviendo a generar el archivo (la prueba de `icon.test.tsx` avisa si se
 * olvida). No hay CDN ni web component: el dibujo viaja con la página, así que un
 * botón con icono se ve igual sin internet, con un bloqueador de anuncios o detrás
 * de la red institucional.
 *
 * Hereda el color del texto (`currentColor`), de modo que un icono sigue al botón,
 * al enlace o a la tarjeta que lo contiene.
 */
export interface IconProps {
  /** Nombre en la colección, p. ej. `mdi:trash-can-outline`. */
  name: string
  /**
   * Texto accesible. Sin él el icono es decorativo (`aria-hidden`): lo normal, porque
   * casi siempre acompaña a un texto. Un icono solo, sin texto, debe llevarlo.
   */
  label?: string
  /** Lado en píxeles. Por defecto 16, que es el tamaño del menú lateral. */
  size?: number
}

export function Icon(handle: Handle<IconProps>) {
  return () => {
    const { name, label, size = 16 } = handle.props
    // Un nombre que no está en el registro deja el hueco del icono, sin romper la
    // pantalla; la prueba de la aplicación impide que llegue a producción.
    const trazos = ICONOS[name] ?? []
    return (
      <svg
        class="icono"
        viewBox="0 0 24 24"
        width={size}
        height={size}
        fill="currentColor"
        role={label ? 'img' : undefined}
        aria-label={label}
        aria-hidden={label ? undefined : 'true'}
        focusable="false"
      >
        {trazos.map((d, i) => (
          <path key={i} d={d} />
        ))}
      </svg>
    )
  }
}
