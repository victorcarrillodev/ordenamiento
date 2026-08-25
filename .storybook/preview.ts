import type { Preview } from '@storybook/html-vite'

// El componente Icon (app/ui/admin/icon.tsx) usa el web component
// <iconify-icon>. En la app normal lo carga Document; aquí no pasamos por
// Document, así que lo cargamos una vez para toda la Storybook.
if (typeof document !== 'undefined' && !document.querySelector('script[data-iconify]')) {
  const script = document.createElement('script')
  script.src = 'https://code.iconify.design/3/3.1.1/iconify-icon.min.js'
  script.dataset.iconify = 'true'
  document.head.appendChild(script)
}

const preview: Preview = {
  parameters: {
    controls: { expanded: true },
  },
}

export default preview
