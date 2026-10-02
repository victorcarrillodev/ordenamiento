import { describe, expect, it } from 'vitest'

import { pideDescarga, respuestaDeArchivo } from './archivo-proxy.ts'

const desdeElBackend = (headers: Record<string, string>) =>
  new Response('contenido', { headers: { 'content-type': 'application/pdf', ...headers } })

describe('pideDescarga', () => {
  it('es verdadera solo con ?download=1', () => {
    expect(pideDescarga(new Request('http://x/a?download=1'))).toBe(true)
    expect(pideDescarga(new Request('http://x/a'))).toBe(false)
    expect(pideDescarga(new Request('http://x/a?download=0'))).toBe(false)
  })
})

describe('respuestaDeArchivo', () => {
  it('reenvía tipo, disposición y tamaño, y fija la política de seguridad', () => {
    const res = respuestaDeArchivo(
      desdeElBackend({
        'content-disposition': 'inline; filename="a.pdf"',
        'content-length': '9',
        'set-cookie': 'sesion=secreta',
      }),
      false,
    )
    expect(res.headers.get('content-type')).toBe('application/pdf')
    expect(res.headers.get('content-disposition')).toBe('inline; filename="a.pdf"')
    expect(res.headers.get('content-length')).toBe('9')
    expect(res.headers.get('content-security-policy')).toContain("default-src 'none'")
    // Lo que no está en la lista no pasa: la cookie del backend no llega al navegador.
    expect(res.headers.get('set-cookie')).toBeNull()
  })

  it('en una descarga conserva el attachment que mandó el backend', () => {
    const res = respuestaDeArchivo(
      desdeElBackend({ 'content-disposition': 'attachment; filename="a.pdf"' }),
      true,
    )
    expect(res.headers.get('content-disposition')).toBe('attachment; filename="a.pdf"')
  })

  it('en una descarga corrige una disposición inline en vez de abrir el visor', () => {
    const res = respuestaDeArchivo(
      desdeElBackend({ 'content-disposition': 'inline; filename="a.pdf"' }),
      true,
    )
    expect(res.headers.get('content-disposition')).toMatch(/^attachment/)
  })

  it('en una descarga sin disposición la fija como attachment', () => {
    expect(respuestaDeArchivo(desdeElBackend({}), true).headers.get('content-disposition')).toBe(
      'attachment',
    )
  })

  it('sin descarga no inventa una disposición', () => {
    expect(
      respuestaDeArchivo(desdeElBackend({}), false).headers.get('content-disposition'),
    ).toBeNull()
  })
})
