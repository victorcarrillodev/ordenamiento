import type { Meta, StoryObj } from '@storybook/html-vite'

import { mountRemix } from '../../../.storybook/remix-root.ts'
import { ParticipationForm, type ParticipationFormProps } from './participation-form.tsx'

const meta: Meta<ParticipationFormProps> = {
  title: 'Participation/ParticipationForm',
  render: mountRemix((args: ParticipationFormProps) => <ParticipationForm {...args} />),
}

export default meta

type Story = StoryObj<ParticipationFormProps>

export const Default: Story = {}

export const ConValoresPrevios: Story = {
  args: {
    values: {
      nombre: 'María González López',
      email: 'maria.gonzalez@example.com',
      calle: 'Av. Juárez 100',
      colonia: 'Centro',
      municipio: 'San Pedro Tlaquepaque',
      cp: '45500',
      institucion: 'Colectivo Ambiental',
      observacion: 'Propongo revisar la zonificación de la ribera del arroyo.',
      consentimiento: false,
    },
  },
}

export const ConErrores: Story = {
  args: {
    values: {
      nombre: 'María',
    },
    errors: {
      nombre: 'El nombre debe tener al menos 5 caracteres',
      email: 'Ingresa un correo electrónico válido',
      colonia: 'La colonia es requerida',
      municipio: 'El municipio es requerido',
      cp: 'Código postal inválido',
      observacion: 'Describe con más detalle tu observación',
      consentimiento: 'Debes aceptar el tratamiento de datos para continuar',
      archivos: 'Alguno de los archivos supera el límite de 50 MB',
    },
  },
}
