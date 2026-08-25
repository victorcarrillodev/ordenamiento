import type { Meta, StoryObj } from '@storybook/html-vite'

import '../../../public/login.css'
import { mountRemix } from '../../../.storybook/remix-root.ts'
import { TextField, type TextFieldProps } from './text-field.tsx'

const meta: Meta<TextFieldProps> = {
  title: 'Login/TextField',
  render: mountRemix((args: TextFieldProps) => <TextField {...args} />),
  argTypes: {
    type: { control: 'select', options: ['email', 'password', 'text'] },
  },
  args: {
    id: 'email',
    name: 'email',
    label: 'Correo electrónico',
    type: 'email',
    placeholder: 'usuario@ejemplo.com',
    autoComplete: 'email',
  },
}

export default meta

type Story = StoryObj<TextFieldProps>

export const Email: Story = {}

export const Password: Story = {
  args: {
    id: 'password',
    name: 'password',
    label: 'Contraseña',
    type: 'password',
    placeholder: '••••••••',
    autoComplete: 'current-password',
  },
}

export const ConError: Story = {
  args: {
    error: 'Ingresa un correo electrónico válido',
  },
}
