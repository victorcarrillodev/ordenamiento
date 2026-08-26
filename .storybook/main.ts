import type { StorybookConfig } from '@storybook/html-vite'

const config: StorybookConfig = {
  stories: ['../app/**/*.stories.@(ts|tsx)'],
  addons: ['@storybook/addon-docs'],
  framework: {
    name: '@storybook/html-vite',
    options: {},
  },
  async viteFinal(viteConfig) {
    viteConfig.esbuild = {
      ...viteConfig.esbuild,
      jsx: 'automatic',
      jsxImportSource: 'remix/ui',
    }
    // Varios módulos del server (ej. app/routes.ts) leen `process.env.*` a
    // nivel de módulo. En el navegador `process` no existe; lo vaciamos
    // para que esas lecturas den `undefined` en vez de crashear.
    viteConfig.define = {
      ...viteConfig.define,
      'process.env': '{}',
    }
    return viteConfig
  },
}

export default config
