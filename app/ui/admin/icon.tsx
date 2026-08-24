import type { Handle } from 'remix/ui'

declare global {
  namespace JSX {
    interface IntrinsicElements {
      'iconify-icon': {
        icon: string
        width?: string | number
        height?: string | number
        'aria-label'?: string
        role?: string
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
}

export function Icon(handle: Handle<IconProps>) {
  return () => {
    const { name, label } = handle.props
    return (
      <iconify-icon
        icon={name}
        aria-label={label}
        role={label ? 'img' : 'presentation'}
        width="16"
        height="16"
      />
    )
  }
}
