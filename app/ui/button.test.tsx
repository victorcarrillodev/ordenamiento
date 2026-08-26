import { describe, expect, it } from 'vitest'
import { renderToString } from 'remix/ui/server'
import { Button } from './button.tsx'

describe('Button component', () => {
  it('renders a default button with children text', async () => {
    const html = await renderToString(<Button>Haz tu participación</Button>)
    expect(html).toContain('<button')
    expect(html).toContain('type="button"')
    expect(html).toContain('Haz tu participación')
  })

  it('supports label or data prop as text content', async () => {
    const htmlLabel = await renderToString(<Button label="Guardar" />)
    expect(htmlLabel).toContain('Guardar')

    const htmlData = await renderToString(<Button data="Descargar" />)
    expect(htmlData).toContain('Descargar')
  })

  it('renders submit button type when specified', async () => {
    const html = await renderToString(<Button buttonType="submit">Enviar</Button>)
    expect(html).toContain('type="submit"')
  })

  it('renders as an anchor <a> when href is provided', async () => {
    const html = await renderToString(
      <Button href="/ordena/participation" target="_blank">
        Participar
      </Button>,
    )
    expect(html).toContain('<a')
    expect(html).toContain('href="/ordena/participation"')
    expect(html).toContain('target="_blank"')
    expect(html).toContain('rel="noopener noreferrer"')
  })

  it('supports all visual variants without crashing', async () => {
    const variants = [
      'primary',
      'contained',
      'secondary',
      'outlined',
      'gold',
      'accent',
      'dark',
      'danger',
      'text',
      'ghost',
    ] as const

    for (const variant of variants) {
      const html = await renderToString(<Button variant={variant}>{variant}</Button>)
      expect(html).toContain(variant)
    }
  })

  it('supports legacy type property for variant', async () => {
    const htmlContained = await renderToString(<Button type="contained">Contained</Button>)
    expect(htmlContained).toContain('Contained')

    const htmlOutlined = await renderToString(<Button type="outlend">Outlined</Button>)
    expect(htmlOutlined).toContain('Outlined')
  })

  it('supports size options (sm, md, lg)', async () => {
    const htmlSm = await renderToString(<Button size="sm">Small</Button>)
    expect(htmlSm).toContain('Small')

    const htmlLg = await renderToString(<Button size="lg">Large</Button>)
    expect(htmlLg).toContain('Large')
  })

  it('handles disabled state correctly for buttons and links', async () => {
    const htmlBtn = await renderToString(<Button disabled>Deshabilitado</Button>)
    expect(htmlBtn).toContain('disabled')
    expect(htmlBtn).toContain('aria-disabled="true"')

    // If disabled with href, renders as button instead of active anchor to prevent navigation
    const htmlLink = await renderToString(
      <Button href="/link" disabled>
        Link deshabilitado
      </Button>,
    )
    expect(htmlLink).toContain('<button')
    expect(htmlLink).toContain('disabled')
  })

  it('renders with left and right icons', async () => {
    const html = await renderToString(
      <Button icon={<span id="icon-left">←</span>} iconRight={<span id="icon-right">→</span>}>
        Navegar
      </Button>,
    )
    expect(html).toContain('id="icon-left"')
    expect(html).toContain('id="icon-right"')
    expect(html).toContain('Navegar')
  })
})
