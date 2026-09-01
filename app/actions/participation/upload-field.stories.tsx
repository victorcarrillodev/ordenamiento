import type { Meta, StoryObj } from '@storybook/html-vite'

import { mountRemix } from '../../../.storybook/remix-root.ts'
import { UploadField, type UploadFieldProps } from './upload-field.tsx'

const meta: Meta<UploadFieldProps> = {
  title: 'Participation/UploadField',
  render: mountRemix((args: UploadFieldProps) => <UploadField {...args} />),
}

export default meta

type Story = StoryObj<UploadFieldProps>

export const Default: Story = {}

export const ConError: Story = {
  args: {
    error: 'Alguno de los archivos supera el límite de 50 MB.',
  },
}
