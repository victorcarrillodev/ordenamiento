import type { Meta, StoryObj } from '@storybook/html-vite'

import { mountRemix } from '../../../.storybook/remix-root.ts'
import Button, { type ButtonProps } from './Button.tsx'

const meta: Meta<ButtonProps> = {
  title: 'Componentes/Button',
  render: mountRemix((args: ButtonProps) => <Button {...args} />),
  args: {
    data: 'Button',
  },
}

export default meta

type Story = StoryObj<ButtonProps>

export const Default: Story = {}
