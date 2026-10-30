import { expect, it } from 'vitest'
import { renderToString } from 'remix/ui/server'
import { DescargasSection } from './descargas.tsx'
import { GRUPOS_TEXTOS, textosDeFormData } from '../../admin/personalizacion-textos-defs.ts'

it('muestra los textos acordados y un único botón que abre documentos y filtros', async () => {
  const html = await renderToString(<DescargasSection />)
  expect(html).toContain('Consulta los documentos del Programa')
  expect(html).toContain('dictámenes y demás documentos generados durante el proceso')
  expect(html.match(/<a /g)).toHaveLength(1)
  expect(html).toContain('href="/ordena/poetdum#documentos"')
  expect(html).toContain('Ver documentos')
})

it('la edición del panel llega al recuadro; vacío recupera el texto predeterminado', async () => {
  const fd = new FormData()
  fd.set('txt_documentos_titulo', 'Expediente público')
  fd.set('txt_consulta_pendiente_titulo', 'Próximamente')
  const textos = textosDeFormData(fd)
  expect(textos.consultaPendienteTitulo).toBe('Próximamente')
  expect(GRUPOS_TEXTOS.some((g) => g.id === 'consulta')).toBe(true)
  const html = await renderToString(<DescargasSection theme={{ usuario: { textos } }} />)
  expect(html).toContain('Expediente público')
  expect(html).toContain('Ver documentos')
})
