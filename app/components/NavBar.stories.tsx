import type { Meta, StoryObj } from '@storybook/html-vite'

import { mountRemix } from '../../.storybook/remix-root.ts'
import { NavBar } from './NavBar.tsx'

const meta: Meta = {
  title: 'Componentes/NavBar',
  render: mountRemix(() => <NavBar />),
}

export default meta

type Story = StoryObj

export const Default: Story = {}
