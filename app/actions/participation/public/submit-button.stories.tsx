import type { Meta, StoryObj } from '@storybook/html-vite'

import { mountRemix } from '../../../../.storybook/remix-root.ts'
import { SubmitButton, type SubmitButtonProps } from './submit-button.tsx'

const meta: Meta<SubmitButtonProps> = {
  title: 'Participation/SubmitButton',
  render: mountRemix((args: SubmitButtonProps) => (
    <form>
      <SubmitButton {...args} />
    </form>
  )),
  args: {
    label: 'Enviar participación',
    pendingLabel: 'Enviando participación…',
  },
}

export default meta

type Story = StoryObj<SubmitButtonProps>

export const Default: Story = {}
