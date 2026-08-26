import type { Meta, StoryObj } from '@storybook/html-vite'

import { mountRemix } from '../../../.storybook/remix-root.ts'
import Button, { type ButtonProps } from './Button.tsx'

const meta: Meta<ButtonProps> = {
  title: 'Componentes/Button',
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
    },
    size: {
      control: 'select',
      options: ['sm', 'md', 'lg'],
    },
    disabled: {
      control: 'boolean',
    },
    fullWidth: {
      control: 'boolean',
    },
  },
}

export default meta

type Story = StoryObj<ButtonProps>

export const Primary: Story = {
  args: {
    variant: 'primary',
    children: 'Botón Primario',
  },
}

export const Secondary: Story = {
  args: {
    variant: 'secondary',
    children: 'Botón Secundario',
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
    children: 'Botón de Peligro',
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
    children: 'Botón Pequeño',
  },
}

export const Large: Story = {
  args: {
    size: 'lg',
    children: 'Botón Grande',
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
    children: 'Enlace estilizado como Botón',
  },
}
