import type { Meta, StoryObj } from '@storybook/html-vite'

import '../../../public/login.css'
import { mountRemix } from '../../../.storybook/remix-root.ts'
import { LoginFooter, type LoginFooterProps } from './login-footer.tsx'
import { MailIcon, LockIcon } from './text-field.tsx'

const meta: Meta<LoginFooterProps> = {
  title: 'Login/LoginFooter',
  render: mountRemix((args: LoginFooterProps) => <LoginFooter {...args} />),
  args: {
    links: [
      { label: 'Ayuda', icon: <MailIcon /> },
      { label: 'Privacidad', icon: <LockIcon /> },
    ],
  },
}

export default meta

type Story = StoryObj<LoginFooterProps>

export const Default: Story = {}
