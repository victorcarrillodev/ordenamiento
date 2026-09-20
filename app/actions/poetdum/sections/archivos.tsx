/**
 * Archivos de una actividad en el portal: galería para las fotografías y lista
 * para los documentos, cada uno con «Ver documento» y «Descargar».
 */
import { css, type Handle } from 'remix/ui'

import { nombreDeArchivo, pesoLegible, type ArchivoActividad } from '../../../data/programa.ts'
import { routes } from '../../../routes.ts'
import { colors, FONT_STACK } from '../../../ui/civic-horizon.ts'
import { IconoDescarga, IconoDocumento, IconoVer } from '../../../ui/programa/iconos.tsx'

const galeriaStyle = css({
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fill, minmax(min(160px, 100%), 1fr))',
  gap: '10px',
  margin: 0,
  padding: 0,
  listStyle: 'none',
})

const fotoStyle = css({
  display: 'block',
  width: '100%',
  aspectRatio: '4 / 3',
  objectFit: 'cover',
  borderRadius: '8px',
  border: `1px solid ${colors.gray200}`,
  background: colors.gray100,
})

export function GaleriaFotos(
  handle: Handle<{ fotos: ArchivoActividad[]; titulo: string; maximo?: number; masHref?: string }>,
) {
  return () => {
    const { fotos, titulo, maximo, masHref } = handle.props
    const visibles = maximo ? fotos.slice(0, maximo) : fotos
    const restantes = fotos.length - visibles.length
    return (
      <ul mix={galeriaStyle} aria-label={`Fotografías de «${titulo}»`}>
        {visibles.map((foto, i) => (
          <li key={foto.id}>
            <a
              href={routes.poetdum.archivo.href({ aid: foto.id })}
              target="_blank"
              rel="noopener"
              aria-label={`Abrir la fotografía ${i + 1} de «${titulo}»`}
            >
              <img
                src={routes.poetdum.archivo.href({ aid: foto.id })}
                alt=""
                loading="lazy"
                mix={fotoStyle}
              />
            </a>
          </li>
        ))}
        {restantes > 0 && masHref ? (
          <li>
            <a
              href={masHref}
              mix={css({
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                height: '100%',
                minHeight: '90px',
                borderRadius: '8px',
                background: colors.burgundy50,
                color: colors.burgundy900,
                fontFamily: FONT_STACK,
                fontWeight: 700,
                textDecoration: 'none',
              })}
            >
              +{restantes} fotografía{restantes === 1 ? '' : 's'}
            </a>
          </li>
        ) : null}
      </ul>
    )
  }
}

const documentoStyle = css({
  display: 'flex',
  alignItems: 'center',
  gap: '12px',
  flexWrap: 'wrap',
  padding: '10px 14px',
  borderRadius: '10px',
  border: `1px solid ${colors.gray200}`,
  background: colors.white,
  fontFamily: FONT_STACK,
})

const accionStyle = css({
  display: 'inline-flex',
  alignItems: 'center',
  gap: '6px',
  padding: '6px 12px',
  borderRadius: '6px',
  fontSize: '13px',
  fontWeight: 700,
  textDecoration: 'none',
  whiteSpace: 'nowrap',
})

/** «Ver documento» (en otra pestaña) y «Descargar» para un archivo. */
export function AccionesArchivo(handle: Handle<{ archivo: ArchivoActividad }>) {
  return () => {
    const { archivo } = handle.props
    const href = routes.poetdum.archivo.href({ aid: archivo.id })
    const nombre = nombreDeArchivo(archivo)
    return (
      <span mix={css({ display: 'flex', gap: '8px', flexWrap: 'wrap' })}>
        <a
          href={href}
          target="_blank"
          rel="noopener"
          aria-label={`Ver documento: ${nombre}`}
          mix={[
            accionStyle,
            css({ color: colors.burgundy900, border: `1px solid ${colors.burgundy100}` }),
          ]}
        >
          <IconoVer size={15} /> Ver documento
        </a>
        <a
          href={`${href}?download=1`}
          aria-label={`Descargar: ${nombre}`}
          mix={[accionStyle, css({ color: colors.white, background: colors.burgundy900 })]}
        >
          <IconoDescarga size={15} /> Descargar
        </a>
      </span>
    )
  }
}

export function ListaDocumentos(handle: Handle<{ documentos: ArchivoActividad[] }>) {
  return () => {
    const { documentos } = handle.props
    return (
      <ul mix={css({ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: '8px' })}>
        {documentos.map((doc) => {
          const nombre = nombreDeArchivo(doc)
          const peso = pesoLegible(doc.size)
          return (
            <li key={doc.id} mix={documentoStyle}>
              <span mix={css({ color: colors.burgundy900, display: 'flex' })}>
                <IconoDocumento size={20} />
              </span>
              <span mix={css({ flex: '1 1 220px', minWidth: 0 })}>
                <strong
                  mix={css({ display: 'block', fontSize: '14px', color: colors.gray900 })}
                  title={doc.nombre_original}
                >
                  {nombre}
                </strong>
                <small mix={css({ fontSize: '12px', color: colors.gray500 })}>
                  {doc.tipo}
                  {peso ? ` · ${peso}` : ''}
                </small>
              </span>
              <AccionesArchivo archivo={doc} />
            </li>
          )
        })}
      </ul>
    )
  }
}
