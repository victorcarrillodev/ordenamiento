import type { Meta, StoryObj } from '@storybook/html-vite'

import { mountRemix } from '../../../../.storybook/remix-root.ts'
import { DocumentosSection, type DocumentosSectionProps } from './documentos.tsx'

const meta: Meta<DocumentosSectionProps> = {
  title: 'POETDUM/DocumentosSection',
  render: mountRemix((args: DocumentosSectionProps) => <DocumentosSection {...args} />),
  args: {
    tipo: '',
    etapa: '',
    documentos: [
      {
        id: '1',
        titulo: 'Programa de Ordenamiento Ecológico Territorial (POETDUM)',
        tipo: 'Programa',
        etapa: 'Notificada',
        fecha: '2025-03-10',
        descripcion: 'Documento integral del programa, versión notificada.',
      },
      {
        id: '2',
        titulo: 'Acta de Instalación del Comité',
        tipo: 'Actas y minutas',
        etapa: 'En proceso',
        fecha: '2025-02-14',
        descripcion: '',
      },
    ],
  },
}

export default meta

type Story = StoryObj<DocumentosSectionProps>

export const Default: Story = {}

export const Filtrado: Story = {
  args: {
    tipo: 'Programa',
    etapa: 'Notificada',
  },
}

export const Vacio: Story = {
  args: {
    documentos: [],
    tipo: 'Cartografía',
    etapa: '',
  },
}
