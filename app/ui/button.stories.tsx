import type { Meta, StoryObj } from '@storybook/html-vite'

import { mountRemix } from '../../.storybook/remix-root.ts'
import { Button, type ButtonProps } from './button.tsx'

const meta: Meta<ButtonProps> = {
  title: 'UI/Button',
  render: mountRemix((args: ButtonProps) => <Button {...args} />),
  args: {
    children: 'Botón de Acción',
    variant: 'primary',
    size: 'md',
  },
  argTypes: {
    variant: {
      control: 'select',
      options: ['primary', 'secondary', 'gold', 'dark', 'danger', 'text'],
      description: 'Variante visual del botón basada en los tokens de Civic Horizon',
    },
    size: {
      control: 'select',
      options: ['sm', 'md', 'lg'],
      description: 'Tamaño del botón (padding y tipografía)',
    },
    disabled: {
      control: 'boolean',
      description: 'Deshabilita la interacción del botón',
    },
    fullWidth: {
      control: 'boolean',
      description: 'Expande el botón al 100% del ancho del contenedor',
    },
  },
}

export default meta

type Story = StoryObj<ButtonProps>

export const Primary: Story = {
  args: {
    variant: 'primary',
    children: 'Botón Primario Institucional',
  },
}

export const Secondary: Story = {
  args: {
    variant: 'secondary',
    children: 'Botón Secundario / Contorno',
  },
}

export const Gold: Story = {
  args: {
    variant: 'gold',
    children: 'Botón Dorado / Acento',
  },
}

export const Dark: Story = {
  args: {
    variant: 'dark',
    children: 'Botón Oscuro',
  },
}

export const Danger: Story = {
  args: {
    variant: 'danger',
    children: 'Botón Peligro / Eliminar',
  },
}

export const Text: Story = {
  args: {
    variant: 'text',
    children: 'Botón Texto / Ghost',
  },
}

export const Small: Story = {
  args: {
    size: 'sm',
    children: 'Tamaño Pequeño (sm)',
  },
}

export const Medium: Story = {
  args: {
    size: 'md',
    children: 'Tamaño Mediano (md)',
  },
}

export const Large: Story = {
  args: {
    size: 'lg',
    children: 'Tamaño Grande (lg)',
  },
}

export const Disabled: Story = {
  args: {
    disabled: true,
    children: 'Botón Deshabilitado',
  },
}

export const AsLink: Story = {
  args: {
    href: 'https://ac.tlaquepaque.gob.mx/ordena',
    target: '_blank',
    children: 'Enlace <a> con apariencia de Botón',
  },
}

export const FullWidth: Story = {
  args: {
    fullWidth: true,
    children: 'Botón Ancho Completo',
  },
}
