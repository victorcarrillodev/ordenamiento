import type { Meta, StoryObj } from '@storybook/html-vite'

import { mountRemix } from '../../../../.storybook/remix-root.ts'
import { Mapa } from './mapa.tsx'

const meta: Meta = {
  title: 'Componentes/Mapa',
  render: mountRemix(() => <Mapa />),
  parameters: {
    // Carga Leaflet vía CDN en el propio componente (window.L); sin red no
    // se ve el mapa, pero el contenedor y el ciclo de vida sí se prueban.
    layout: 'fullscreen',
  },
}

export default meta

type Story = StoryObj

export const Default: Story = {}
