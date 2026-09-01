import type { Meta, StoryObj } from '@storybook/html-vite'

import { mountRemix } from '../../../../.storybook/remix-root.ts'
import { MapaSelector, type MapaSelectorProps } from './mapa-selector.tsx'

const meta: Meta<MapaSelectorProps> = {
  title: 'Admin/MapaSelector',
  // El selector escribe coordenadas en inputs #lat_<destino>/#lng_<destino> hermanos;
  // se incluyen aquí para que el click en el mapa tenga dónde escribir.
  render: mountRemix((args: MapaSelectorProps) => (
    <div>
      <MapaSelector {...args} />
      <p>
        lat: <input id={`lat_${args.destino}`} readonly value={args.latitud ?? ''} /> lng:{' '}
        <input id={`lng_${args.destino}`} readonly value={args.longitud ?? ''} />
      </p>
    </div>
  )),
  parameters: {
    // Carga Leaflet vía CDN en el propio componente (window.L); sin red no
    // se ve el mapa, pero el contenedor y el ciclo de vida sí se prueban.
    layout: 'fullscreen',
  },
  args: {
    destino: 'sede',
  },
}

export default meta

type Story = StoryObj<MapaSelectorProps>

export const Vacio: Story = {}

export const ConCoordenadas: Story = {
  args: {
    latitud: '20.6409',
    longitud: '-103.3126',
  },
}
