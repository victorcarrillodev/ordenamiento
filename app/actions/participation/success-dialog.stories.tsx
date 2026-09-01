import type { Meta, StoryObj } from '@storybook/html-vite'

import { mountRemix } from '../../../.storybook/remix-root.ts'
import { SuccessDialog, type SuccessDialogProps } from './success-dialog.tsx'

const meta: Meta<SuccessDialogProps> = {
  title: 'Participation/SuccessDialog',
  render: mountRemix((args: SuccessDialogProps) => <SuccessDialog {...args} />),
  parameters: {
    // El <dialog open> se pinta sobre su propio backdrop; se ve mejor a pantalla completa.
    layout: 'fullscreen',
  },
  args: {
    homeHref: '/ordena',
    poetdumHref: '/ordena/poetdum',
    folio: 'POETDUM-2025-00123',
  },
}

export default meta

type Story = StoryObj<SuccessDialogProps>

export const ConFolio: Story = {}

export const SinFolio: Story = {
  args: {
    folio: undefined,
  },
}
