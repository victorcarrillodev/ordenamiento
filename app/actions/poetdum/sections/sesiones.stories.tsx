import type { Meta, StoryObj } from '@storybook/html-vite'

import { mountRemix } from '../../../../.storybook/remix-root.ts'
import { SesionesSection, type SesionesSectionProps } from './sesiones.tsx'

const meta: Meta<SesionesSectionProps> = {
  title: 'POETDUM/SesionesSection',
  render: mountRemix((args: SesionesSectionProps) => <SesionesSection {...args} />),
  args: {
    sesiones: [
      {
        id: '1',
        categoria: 'Comité del Ordenamiento Ecológico',
        orden: 1,
        titulo: '1ra Sesión Ordinaria del Comité',
        descripcion: 'Instalación del Comité de Ordenamiento Ecológico Territorial.',
        fecha: '2025-02-14',
        ubicacion: 'Salón de Cabildo, Presidencia Municipal',
        latitud: '20.6409',
        longitud: '-103.3126',
      },
      {
        id: '2',
        categoria: 'Comité del Ordenamiento Ecológico',
        orden: 2,
        titulo: '2da Sesión Ordinaria del Comité',
        descripcion: 'Revisión del diagnóstico ambiental territorial.',
        fecha: '2025-04-22',
        ubicacion: 'Salón de Cabildo, Presidencia Municipal',
        latitud: '20.6409',
        longitud: '-103.3126',
      },
      {
        id: '3',
        categoria: 'Talleres Sectoriales',
        orden: 1,
        titulo: 'Taller Sector Agropecuario',
        descripcion: 'Recopilación de propuestas del sector agropecuario municipal.',
        fecha: '2025-05-10',
        ubicacion: 'Centro Cultural El Refugio',
        latitud: '20.6409',
        longitud: '-103.3126',
      },
      {
        id: '4',
        categoria: 'Consulta pública',
        orden: 1,
        titulo: 'Consulta Pública Presencial',
        descripcion: '',
        fecha: null,
        ubicacion: '',
        latitud: '',
        longitud: '',
      },
    ],
  },
}

export default meta

type Story = StoryObj<SesionesSectionProps>

export const Default: Story = {}

export const Vacio: Story = {
  args: {
    sesiones: [],
  },
}
