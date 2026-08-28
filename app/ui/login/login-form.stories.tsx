import type { Meta, StoryObj } from '@storybook/html-vite'

import '../../../public/login.css'
import { mountRemix } from '../../../.storybook/remix-root.ts'
import { LoginForm, type LoginFormProps } from './login-form.tsx'

const meta: Meta<LoginFormProps> = {
  title: 'Login/LoginForm',
  render: mountRemix((args: LoginFormProps) => <LoginForm {...args} />),
}

export default meta

type Story = StoryObj<LoginFormProps>

export const Default: Story = {
  args: {},
}

export const ConErrores: Story = {
  args: {
    errors: {
      email: 'Ingresa un correo electrónico válido',
      password: 'La contraseña debe tener al menos 8 caracteres',
    },
  },
}
