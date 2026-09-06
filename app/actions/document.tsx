import type { Handle, RemixNode } from 'remix/ui'
import { css } from 'remix/ui'

import { entryHref, entryPreloads } from '../assets.ts'

export interface DocumentProps {
  children?: RemixNode
  head?: RemixNode
  title?: string
  description?: string
}

const DEFAULT_TITLE = 'Portal de Ordenamiento Territorial – San Pedro Tlaquepaque'
const DEFAULT_DESCRIPTION =
  'Bitácora Ambiental del Programa de Ordenamiento Ecológico Territorial y de Desarrollo Urbano del Municipio de San Pedro Tlaquepaque, Jalisco.'

const basePath = (process.env.BASE_PATH ?? '/ordena').replace(/\/$/, '')

/**
 * Base común a todas las páginas, pública y panel.
 *
 * `border-box` va aquí y no en cada componente porque el modelo `content-box`
 * del navegador sumaba el padding al `width: 100%` de los contenedores y los
 * dejaba más anchos que la pantalla: en un teléfono de 320 px eso era barra de
 * scroll horizontal en la portada y en el POETDUM. `max-width` en los medios
 * cubre el otro origen del mismo problema: una imagen o un `<iframe>` que
 * llegan con su tamaño intrínseco.
 */
const RESET_GLOBAL = `
*, *::before, *::after { box-sizing: border-box; }
html { -webkit-text-size-adjust: 100%; overflow-x: clip; }
img, svg, video, canvas, iframe, embed, object { max-width: 100%; }
/* Correos y palabras largas («ordenamiento@tlaquepaque.gob.mx») ensanchaban
   su columna por encima de la pantalla en lugar de partirse. */
body { overflow-wrap: break-word; }
img, video { height: auto; }
`

const baseStyle = css({ margin: 0, padding: 0 })

export function Document(handle: Handle<DocumentProps>) {
  return () => {
    const {
      children,
      head,
      title = DEFAULT_TITLE,
      description = DEFAULT_DESCRIPTION,
    } = handle.props

    return (
      <html lang="es">
        <head>
          <meta charSet="utf-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          <meta name="description" content={description} />
          <style>{RESET_GLOBAL}</style>
          <link rel="icon" type="image/x-icon" href={`${basePath}/assets/img/icon/favicon.ico`} />
          {/* Montserrat – primary institutional typeface */}
          <link rel="preconnect" href="https://fonts.googleapis.com" />
          <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
          <link
            rel="stylesheet"
            href="https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700;800;900&display=swap"
          />
          <script src="https://code.iconify.design/3/3.1.1/iconify-icon.min.js"></script>
          <link rel="stylesheet" href={`${basePath}/autocomplete.css`} />
          <script src={`${basePath}/colonias-data.js`}></script>
          <script src={`${basePath}/autocomplete.js`} defer></script>
          {/* Respaldo de las imágenes configurables; ver public/imagenes.js */}
          <script src={`${basePath}/imagenes.js`} defer></script>
          <title>{title}</title>
          {head}
          {entryPreloads.map((href) => (
            <link key={href} rel="modulepreload" href={href} />
          ))}
          <script type="module" src={entryHref}></script>
        </head>
        <body mix={baseStyle}>{children}</body>
      </html>
    )
  }
}
