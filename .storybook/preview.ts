import type { Preview } from '@storybook/html-vite'
import { colors, FONT_STACK } from '../app/ui/civic-horizon.ts'

// Cargar recursos globales necesarios para que los componentes de Remix UI
// se rendericen con total fidelidad en el entorno de Storybook:

if (typeof document !== 'undefined') {
  // 1. Tipografía institucional Montserrat
  if (!document.querySelector('link[data-font-montserrat]')) {
    const preconnect1 = document.createElement('link')
    preconnect1.rel = 'preconnect'
    preconnect1.href = 'https://fonts.googleapis.com'
    document.head.appendChild(preconnect1)

    const preconnect2 = document.createElement('link')
    preconnect2.rel = 'preconnect'
    preconnect2.href = 'https://fonts.gstatic.com'
    preconnect2.crossOrigin = 'anonymous'
    document.head.appendChild(preconnect2)

    const fontLink = document.createElement('link')
    fontLink.rel = 'stylesheet'
    fontLink.href =
      'https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700;800;900&display=swap'
    fontLink.dataset.fontMontserrat = 'true'
    document.head.appendChild(fontLink)
  }

  // 2. Iconify Web Component para app/ui/admin/icon.tsx
  if (!document.querySelector('script[data-iconify]')) {
    const iconifyScript = document.createElement('script')
    iconifyScript.src = 'https://code.iconify.design/3/3.1.1/iconify-icon.min.js'
    iconifyScript.dataset.iconify = 'true'
    document.head.appendChild(iconifyScript)
  }

  // 3. Estilos de Leaflet para componentes de mapas
  if (!document.querySelector('link[data-leaflet]')) {
    const leafletLink = document.createElement('link')
    leafletLink.rel = 'stylesheet'
    leafletLink.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'
    leafletLink.dataset.leaflet = 'true'
    document.head.appendChild(leafletLink)
  }

  // 4. Reset básico y tipografía por defecto en el body del iframe de Storybook
  document.body.style.fontFamily = FONT_STACK
  document.body.style.margin = '0'
  document.body.style.padding = '16px'
  document.body.style.boxSizing = 'border-box'
}

const preview: Preview = {
  parameters: {
    controls: { expanded: true },
    backgrounds: {
      default: 'light',
      values: [
        { name: 'light', value: colors.white },
        { name: 'civic-bg', value: colors.burgundy50 },
        { name: 'gray-50', value: colors.gray50 },
        { name: 'dark', value: colors.gray950 },
      ],
    },
    actions: { argTypesRegex: '^on[A-Z].*' },
  },
}

export default preview
