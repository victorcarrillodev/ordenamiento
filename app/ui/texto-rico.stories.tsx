import type { Meta, StoryObj } from '@storybook/html-vite'

import { mountRemix } from '../../.storybook/remix-root.ts'
import { TextoRico, type TextoRicoProps } from './texto-rico.tsx'

/**
 * Cómo dibuja el portal un texto de «Textos del portal»: dentro del elemento
 * que lo contiene (aquí un `<p>` con la tipografía de la página), con negritas
 * y alineación por párrafo. Nunca inserta el valor como HTML.
 */
const meta: Meta<TextoRicoProps> = {
  title: 'UI/TextoRico',
  render: mountRemix((args: TextoRicoProps) => (
    <p style="font-family: sans-serif; font-size: 16px; line-height: 1.65; max-width: 560px; margin: 0; padding: 16px; background: #f1f5f9;">
      <TextoRico {...args} />
    </p>
  )),
  args: {
    valor: 'Un texto sin formato, como los que había antes del editor.',
  },
}

export default meta

type Story = StoryObj<TextoRicoProps>

export const SinFormato: Story = {}

export const ConNegritas: Story = {
  args: {
    valor:
      '<p>Consulta las <strong>fases</strong> del Programa y su <strong>calendario</strong>.</p>',
  },
}

export const Justificado: Story = {
  args: {
    valor:
      '<p style="text-align:justify">Es una herramienta que permite organizar el territorio del municipio, definiendo qué actividades pueden realizarse en cada zona y en qué condiciones, con el objetivo de proteger el medio ambiente.</p>',
  },
}

export const VariosParrafosYAlineaciones: Story = {
  args: {
    valor:
      '<p style="text-align:center"><strong>Aviso importante</strong></p><p style="text-align:justify">El periodo para recibir observaciones y propuestas concluye el 5 de octubre.</p><p style="text-align:right">Dirección de Gestión Territorial</p>',
  },
}

export const SaltosDeLinea: Story = {
  args: {
    valor:
      'Dirección de Medio Ambiente y Ecología\nH. Ayuntamiento de San Pedro Tlaquepaque\nJalisco, México',
  },
}

export const ValorHostil: Story = {
  args: {
    valor:
      '<p onclick="alert(1)" style="text-align:center;position:fixed">Solo se ve el texto<script>alert(2)</script><img src=x onerror=alert(3)></p>',
  },
}
