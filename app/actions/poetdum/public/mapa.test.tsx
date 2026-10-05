// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest'
import { createRoot } from 'remix/ui'
import * as L from 'leaflet'

import { Mapa } from './mapa.tsx'

vi.mock('../../../ui/leaflet.ts', () => ({ loadLeaflet: async () => L }))

afterEach(() => {
  document.body.innerHTML = ''
  vi.restoreAllMocks()
})

it('muestra capas y el marcador del Ayuntamiento al montar el mapa', async () => {
  // jsdom no implementa las hojas construibles que usa Remix.
  Object.defineProperty(document, 'adoptedStyleSheets', {
    value: [],
    configurable: true,
    writable: true,
  })
  vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(800)
  vi.spyOn(HTMLElement.prototype, 'clientHeight', 'get').mockReturnValue(500)
  const container = document.createElement('div')
  document.body.append(container)
  const root = createRoot(container)
  try {
    root.render(<Mapa />)
    root.flush()
    await vi.waitFor(() => {
      expect(container.querySelectorAll('.leaflet-tile').length).toBeGreaterThan(0)
      expect(container.querySelector('.leaflet-popup-content')?.textContent).toBe(
        'San Pedro Tlaquepaque',
      )
    })
    root.render(<Mapa />)
    root.flush()
    expect(container.querySelectorAll('.leaflet-tile').length).toBeGreaterThan(0)
  } finally {
    root.dispose()
  }
})
