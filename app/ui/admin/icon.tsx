import type { Handle } from 'remix/ui'

declare global {
  // Ampliar JSX.IntrinsicElements globalmente requiere `namespace`; no hay
  // equivalente en sintaxis de módulos ES2015 para esta declaración ambient.
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace JSX {
    interface IntrinsicElements {
      'iconify-icon': {
        icon: string
        width?: string | number
        height?: string | number
        'aria-label'?: string
        role?: string
        /** Necesario cuando un script tiene que cambiar el icono en caliente. */
        id?: string
        class?: string
      }
    }
  }
}

/**
 * Icono mediante Iconify (web component `<iconify-icon>`).
 * Carga los iconos bajo demanda desde api.iconify.design.
 */
export interface IconProps {
  name: string
  label?: string
  /** Lado en píxeles. Por defecto 16, que es el tamaño del menú lateral. */
  size?: number
}

export function Icon(handle: Handle<IconProps>) {
  return () => {
    const { name, label, size = 16 } = handle.props
    return (
      <iconify-icon
        icon={name}
        aria-label={label}
        role={label ? 'img' : 'presentation'}
        width={size}
        height={size}
      />
    )
  }
}
