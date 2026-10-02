/**
 * Archivos de una actividad en el portal: galería para las fotografías y lista
 * para los documentos, cada uno con «Ver documento» y «Descargar».
 */
import { css, type Handle } from 'remix/ui'

import { nombreDeArchivo, pesoLegible, type ArchivoActividad } from '../../../data/programa.ts'
import { routes } from '../../../routes.ts'
import { colors, FONT_STACK } from '../../../ui/civic-horizon.ts'
import { AccionesDocumento } from '../../../ui/programa/acciones-documento.tsx'
import { IconoDocumento } from '../../../ui/programa/iconos.tsx'

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

/** «Ver documento» (en otra pestaña) y «Descargar» para un archivo. */
export function AccionesArchivo(handle: Handle<{ archivo: ArchivoActividad }>) {
  return () => {
    const { archivo } = handle.props
    return (
      <AccionesDocumento
        href={routes.poetdum.archivo.href({ aid: archivo.id })}
        nombre={nombreDeArchivo(archivo)}
        nombreArchivo={archivo.nombre_original}
        etiquetaVer="Ver documento"
      />
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
