import { describe, expect, it } from 'vitest'
import { renderToString } from 'remix/ui/server'

import { AccionesDocumento, hrefDeDescarga } from './acciones-documento.tsx'

describe('hrefDeDescarga', () => {
  it('añade download=1 a una dirección sin parámetros', () => {
    expect(hrefDeDescarga('/ordena/poetdum/archivos/1')).toBe(
      '/ordena/poetdum/archivos/1?download=1',
    )
  })

  it('respeta los parámetros que ya trae', () => {
    expect(hrefDeDescarga('/ordena/x?tipo=a')).toBe('/ordena/x?tipo=a&download=1')
  })
})

describe('AccionesDocumento', () => {
  const props = {
    href: '/ordena/poetdum/archivos/abc',
    nombre: 'Convenio firmado',
    nombreArchivo: 'convenio.pdf',
  }

  it('«Consultar» abre el documento en otra pestaña, sin descargarlo', async () => {
    const html = await renderToString(<AccionesDocumento {...props} />)
    expect(html).toContain('href="/ordena/poetdum/archivos/abc"')
    expect(html).toContain('target="_blank"')
    expect(html).toContain('rel="noopener"')
    expect(html).toContain('Consultar')
  })

  it('«Descargar» guarda el archivo directo: pide la descarga y lleva el atributo download', async () => {
    const html = await renderToString(<AccionesDocumento {...props} />)
    expect(html).toContain('href="/ordena/poetdum/archivos/abc?download=1"')
    expect(html).toContain('download="convenio.pdf"')
    expect(html).toContain('Descargar')
  })

  it('admite otras etiquetas, con su nombre accesible', async () => {
    const html = await renderToString(
      <AccionesDocumento
        {...props}
        etiquetaVer="Consultar participación"
        etiquetaDescargar="Descargar participación"
      />,
    )
    expect(html).toContain('aria-label="Consultar participación: Convenio firmado"')
    expect(html).toContain('aria-label="Descargar participación: Convenio firmado"')
  })
})
