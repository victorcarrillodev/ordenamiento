import type { Meta, StoryObj } from '@storybook/html-vite'

import { mountRemix } from '../../../../.storybook/remix-root.ts'
import { ActividadesSection, type ActividadesSectionProps } from './actividades.tsx'

const meta: Meta<ActividadesSectionProps> = {
  title: 'POETDUM/ActividadesSection',
  render: mountRemix((args: ActividadesSectionProps) => <ActividadesSection {...args} />),
  args: {
    estado: 'proximas',
    actividades: [
      {
        id: '1',
        titulo: 'Recorrido de campo Cerro del Cuatro',
        fecha: '2025-11-04',
        hora_inicio: '09:00',
        hora_fin: '13:00',
        lugar: 'Cerro del Cuatro',
        descripcion: 'Levantamiento de información en campo para el diagnóstico ambiental.',
        estado: 'proxima',
        resultados: null,
        fotos: [],
        documentos: [],
      },
      {
        id: '2',
        titulo: 'Taller de socialización con colonos',
        fecha: '2025-11-18',
        hora_inicio: '17:00',
        hora_fin: null,
        lugar: 'Casa de la Cultura de Tlaquepaque',
        descripcion: 'Presentación de avances a la ciudadanía y recepción de comentarios.',
        estado: 'proxima',
        resultados: null,
        fotos: [],
        documentos: [],
      },
    ],
  },
}

export default meta

type Story = StoryObj<ActividadesSectionProps>

export const Proximas: Story = {}

export const Realizadas: Story = {
  args: {
    estado: 'realizadas',
    actividades: [
      {
        id: '3',
        titulo: '3ra Sesión Ordinaria del Comité',
        fecha: '2025-04-22',
        hora_inicio: '10:00',
        hora_fin: '12:30',
        lugar: 'Salón de Cabildo, Presidencia Municipal',
        descripcion: 'Revisión del diagnóstico ambiental territorial con el Comité.',
        estado: 'realizada',
        resultados:
          'Se aprobó el diagnóstico ambiental territorial por unanimidad y se acordó continuar con la fase de propuesta.',
        fotos: [
          { id: 'f1', nombre_original: 'sesion-comite-1.jpg', mime: 'image/jpeg' },
          { id: 'f2', nombre_original: 'sesion-comite-2.jpg', mime: 'image/jpeg' },
        ],
        documentos: [{ id: 'd1', titulo: 'Minuta 3ra Sesión Ordinaria', tipo: 'Actas y minutas' }],
      },
      {
        id: '4',
        titulo: 'Taller cancelado por lluvias',
        fecha: '2025-06-02',
        hora_inicio: '09:00',
        hora_fin: '11:00',
        lugar: 'Parque Solidaridad',
        descripcion: '',
        estado: 'cancelada',
        resultados: null,
        fotos: [],
        documentos: [],
      },
    ],
  },
}

export const Vacio: Story = {
  args: {
    estado: 'proximas',
    actividades: [],
  },
}
