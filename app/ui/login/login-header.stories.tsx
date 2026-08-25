import type { Meta, StoryObj } from '@storybook/html-vite'

import '../../../public/login.css'
import { mountRemix } from '../../../.storybook/remix-root.ts'
import { LoginHeader, type LoginHeaderProps } from './login-header.tsx'

const meta: Meta<LoginHeaderProps> = {
  title: 'Login/LoginHeader',
  render: mountRemix((args: LoginHeaderProps) => <LoginHeader {...args} />),
  args: {
    title: 'Bitácora Ambiental',
    subtitle: 'Portal de administración',
    logoSrc: '/images/tlaquepaque.png',
    logoAlt: 'Tlaquepaque',
  },
}

export default meta

type Story = StoryObj<LoginHeaderProps>

export const Default: Story = {}
