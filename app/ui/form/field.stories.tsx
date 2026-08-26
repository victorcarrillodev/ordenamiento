import type { Meta, StoryObj } from '@storybook/html-vite'

import { mountRemix } from '../../../.storybook/remix-root.ts'
import { CheckboxField, Field, type FieldProps, TextArea } from './field.tsx'

const meta: Meta<FieldProps> = {
  title: 'UI/Form/Field',
  render: mountRemix((args: FieldProps) => <Field {...args} />),
  args: {
    name: 'nombre',
    label: 'Nombre completo',
    placeholder: 'Ej. María Pérez García',
    required: true,
    appearance: 'civic',
  },
  argTypes: {
    appearance: {
      control: 'select',
      options: ['civic', 'admin'],
      description: 'Estilo visual del campo (formulario cívico o panel administrativo)',
    },
    required: {
      control: 'boolean',
    },
    readOnly: {
      control: 'boolean',
    },
  },
}

export default meta

type Story = StoryObj<FieldProps>

export const Default: Story = {}

export const WithHint: Story = {
  args: {
    hint: 'Ingresa tu nombre tal como aparece en tu identificación oficial.',
  },
}

export const WithError: Story = {
  args: {
    value: 'abc',
    error: 'El nombre debe tener al menos 5 caracteres.',
  },
}

export const AdminAppearance: Story = {
  args: {
    appearance: 'admin',
    name: 'titulo',
    label: 'Título de la sesión',
    placeholder: 'Ej. 3ra Sesión Ordinaria del Comité',
    hint: 'Este título aparecerá en el listado del panel de control.',
  },
}

export const TextAreaStory: StoryObj = {
  name: 'TextArea',
  render: mountRemix(() => (
    <TextArea
      name="observacion"
      label="Observación o propuesta ciudadana"
      placeholder="Escribe detalladamente tu aportación..."
      required
      rows={4}
      hint="Sé lo más específico posible respecto a la zona territorial."
    />
  )),
}

export const CheckboxStory: StoryObj = {
  name: 'CheckboxField',
  render: mountRemix(() => (
    <CheckboxField name="consentimiento" required>
      Acepto los términos de privacidad y autorizo el tratamiento de mis datos.
    </CheckboxField>
  )),
}
