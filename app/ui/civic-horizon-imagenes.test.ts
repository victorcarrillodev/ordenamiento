import { describe, expect, it } from 'vitest'

import { IMAGEN_POR_DEFECTO, imagenUsable } from './civic-horizon.ts'

/**
 * Normalización de las imágenes que guarda Personalización.
 *
 * Los casos vienen de lo que había realmente en producción: rutas de una
 * versión anterior del proyecto y URLs internas del backend que el navegador
 * no puede alcanzar. Ambas dejaban el icono de imagen rota en la portada.
 */
describe('imagenUsable', () => {
  it('conserva una ruta válida del propio sitio', () => {
    expect(imagenUsable('/ordena/assets/img/hero/hero.webp', IMAGEN_POR_DEFECTO.logo)).toBe(
      '/ordena/assets/img/hero/hero.webp',
    )
  })

  it('conserva una URL externa por https', () => {
    expect(imagenUsable('https://cdn.ejemplo.mx/foto.png', IMAGEN_POR_DEFECTO.logo)).toBe(
      'https://cdn.ejemplo.mx/foto.png',
    )
  })

  it('sustituye la carpeta /images/ de la versión anterior', () => {
    // Lo que había en producción: la carpeta se llama assets/img, no images.
    expect(imagenUsable('/ordena/images/ecology-split.jpg', IMAGEN_POR_DEFECTO.ecologia)).toBe(
      IMAGEN_POR_DEFECTO.ecologia,
    )
  })

  it('sustituye la ilustración retirada del repositorio, con cualquier extensión', () => {
    for (const src of [
      '/ordena/assets/img/ecology-split.webp',
      '/ordena/assets/img/ecology-split.jpg',
      '/otra/ruta/ecology-split.png',
    ]) {
      expect(imagenUsable(src, IMAGEN_POR_DEFECTO.programa)).toBe(IMAGEN_POR_DEFECTO.programa)
    }
  })

  it('traduce la ruta interna del backend al proxy público', () => {
    // El navegador nunca habla con el backend: /api/settings/assets/... da 404.
    expect(imagenUsable('/api/settings/assets/brand-123-foto.jpg', IMAGEN_POR_DEFECTO.logo)).toBe(
      '/ordena/marca/brand-123-foto.jpg',
    )
  })

  it('no traduce una ruta del backend con nombre sospechoso', () => {
    expect(imagenUsable('/api/settings/assets/../../etc/passwd', IMAGEN_POR_DEFECTO.logo)).toBe(
      IMAGEN_POR_DEFECTO.logo,
    )
  })

  it('cae al valor por defecto ante vacíos y basura', () => {
    for (const src of [undefined, null, '', '   ', 42, {}, 'javascript:alert(1)']) {
      expect(imagenUsable(src, IMAGEN_POR_DEFECTO.hero)).toBe(IMAGEN_POR_DEFECTO.hero)
    }
  })

  it('rechaza una URL que rompería la función url() de CSS', () => {
    // El valor acaba dentro de `url(...)` en un atributo style.
    expect(imagenUsable('/foto.png) ; background: red', IMAGEN_POR_DEFECTO.hero)).toBe(
      IMAGEN_POR_DEFECTO.hero,
    )
  })

  it('rechaza http:// para no meter contenido mixto en una página https', () => {
    expect(imagenUsable('http://inseguro.mx/foto.png', IMAGEN_POR_DEFECTO.hero)).toBe(
      IMAGEN_POR_DEFECTO.hero,
    )
  })
})
