import type { Meta, StoryObj } from '@storybook/html-vite'

import { mountRemix } from '../../../../.storybook/remix-root.ts'
import { DescargasSection } from './descargas.tsx'

const meta: Meta = {
  title: 'POETDUM/DescargasSection',
  render: mountRemix(() => <DescargasSection />),
}

export default meta

type Story = StoryObj

export const Default: Story = {}
