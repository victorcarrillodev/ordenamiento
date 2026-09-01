import type { Meta, StoryObj } from '@storybook/html-vite'

import '../../../public/login.css'
import { mountRemix } from '../../../.storybook/remix-root.ts'
import { LoginAlert as LoginAlertComponent } from './login-alert.tsx'
import type { LoginAlert as LoginAlertProps } from './types.ts'

const meta: Meta<LoginAlertProps> = {
  title: 'Login/LoginAlert',
  render: mountRemix((args: LoginAlertProps) => <LoginAlertComponent {...args} />),
  argTypes: {
    type: { control: 'select', options: ['error', 'success', 'warning', 'info'] },
  },
  args: {
    type: 'error',
    message: 'Correo o contraseña incorrectos.',
  },
}

export default meta

type Story = StoryObj<LoginAlertProps>

export const Error: Story = {}

export const Success: Story = {
  args: {
    type: 'success',
    message: 'Sesión iniciada correctamente.',
  },
}

export const Warning: Story = {
  args: {
    type: 'warning',
    message: 'Tu sesión está por expirar.',
  },
}

export const Info: Story = {
  args: {
    type: 'info',
    message: 'Se requiere verificar tu correo electrónico.',
  },
}
