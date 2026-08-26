import type { Meta, StoryObj } from '@storybook/html-vite'

import { mountRemix } from '../../../.storybook/remix-root.ts'
import { DireccionFields, type DireccionFieldsProps } from './direccion-fields.tsx'

const meta: Meta<DireccionFieldsProps> = {
  title: 'UI/Form/DireccionFields',
  render: mountRemix((args: DireccionFieldsProps) => <DireccionFields {...args} />),
  args: {
    endpoint: '/api/colonias',
    appearance: 'civic',
    required: true,
    values: {
      calle: 'Av. Juárez 100',
      colonia: 'Centro',
      municipio: 'San Pedro Tlaquepaque',
      cp: '45500',
    },
  },
  argTypes: {
    appearance: {
      control: 'select',
      options: ['civic', 'admin'],
      description: 'Estilo visual del grupo de campos',
    },
    required: {
      control: 'boolean',
    },
  },
}

export default meta

type Story = StoryObj<DireccionFieldsProps>

export const Civic: Story = {}

export const WithErrors: Story = {
  args: {
    values: {
      calle: '',
      colonia: '',
      municipio: '',
      cp: '123',
    },
    errors: {
      colonia: 'La colonia es requerida',
      municipio: 'El municipio es requerido',
      cp: 'Código postal inválido',
    },
  },
}

export const AdminAppearance: Story = {
  args: {
    appearance: 'admin',
    namePrefix: 'aporte_',
    values: {
      calle: 'Hidalgo 45',
      colonia: 'Santa Anita',
      municipio: 'San Pedro Tlaquepaque',
      cp: '45600',
    },
  },
}
