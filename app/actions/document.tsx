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
          <link rel="icon" type="image/svg+xml" href={`${basePath}/favicon.svg`} />
          {/* Montserrat – primary institutional typeface */}
          <link rel="preconnect" href="https://fonts.googleapis.com" />
          <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
          <link
            rel="stylesheet"
            href="https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700;800;900&display=swap"
          />
          <script src="https://code.iconify.design/3/3.1.1/iconify-icon.min.js"></script>
          <link rel="stylesheet" href={`${basePath}/autocomplete.css`} />
          <script src={`${basePath}/autocomplete-data.js`} defer></script>
          <script src={`${basePath}/autocomplete.js`} defer></script>
          <title>{title}</title>
          {head}
          {entryPreloads.map((href) => (
            <link key={href} rel="modulepreload" href={href} />
          ))}
          <script type="module" src={entryHref}></script>
        </head>
        <body mix={css({ margin: 0, padding: 0 })}>{children}</body>
      </html>
    )
  }
}
