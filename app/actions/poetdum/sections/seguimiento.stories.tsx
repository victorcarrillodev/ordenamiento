import type { Meta, StoryObj } from '@storybook/html-vite'

import { mountRemix } from '../../../../.storybook/remix-root.ts'
import { SeguimientoSection, type SeguimientoSectionProps } from './seguimiento.tsx'

const meta: Meta<SeguimientoSectionProps> = {
  title: 'POETDUM/SeguimientoSection',
  render: mountRemix((args: SeguimientoSectionProps) => <SeguimientoSection {...args} />),
  args: {
    indicadores: [
      {
        id: '1',
        nombre: 'Superficie con cobertura forestal restaurada',
        descripcion: 'Hectáreas restauradas dentro de las UGA de conservación.',
        unidad: 'hectáreas',
        meta: 120,
        fecha_evaluacion: '2025-12-01',
        resultado_texto: 'Avance conforme a lo programado.',
        documento_respaldo: { id: 'd1', titulo: 'Informe de restauración 2025' },
        mediciones: [
          { id: 'm1', periodo: '2025-T1', valor: 20 },
          { id: 'm2', periodo: '2025-T2', valor: 55 },
          { id: 'm3', periodo: '2025-T3', valor: 90 },
        ],
      },
      {
        id: '2',
        nombre: 'Predios regularizados en zona de amortiguamiento',
        descripcion: '',
        unidad: 'predios',
        meta: null,
        fecha_evaluacion: null,
        resultado_texto: null,
        documento_respaldo: null,
        mediciones: [],
      },
    ],
  },
}

export default meta

type Story = StoryObj<SeguimientoSectionProps>

export const Default: Story = {}

export const Vacio: Story = {
  args: {
    indicadores: [],
  },
}
