import type { Meta, StoryObj } from '@storybook/html-vite'

import { mountRemix } from '../../../.storybook/remix-root.ts'
import { Icon, type IconProps } from './icon.tsx'

const meta: Meta<IconProps> = {
  title: 'Admin/Icon',
  render: mountRemix((args: IconProps) => <Icon {...args} />),
  args: {
    name: 'mdi:home',
    label: 'Inicio',
  },
}

export default meta

type Story = StoryObj<IconProps>

export const Default: Story = {}

export const Cuenta: Story = { args: { name: 'mdi:account', label: 'Mi cuenta' } }
export const Reuniones: Story = { args: { name: 'mdi:calendar-month-outline', label: 'Reuniones' } }
export const Exportar: Story = { args: { name: 'mdi:table-arrow-down', label: 'Exportar' } }
