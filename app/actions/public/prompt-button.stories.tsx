import type { Meta, StoryObj } from '@storybook/html-vite'

import { mountRemix } from '../../../.storybook/remix-root.ts'
import { PromptButton } from './prompt-button.tsx'

interface Args {
  text: string
}

const meta: Meta<Args> = {
  title: 'Público/PromptButton',
  render: mountRemix((args: Args) => <PromptButton text={args.text} />),
  args: {
    text: 'Explícame cómo funciona la Bitácora Ambiental',
  },
}

export default meta

type Story = StoryObj<Args>

export const Default: Story = {}
