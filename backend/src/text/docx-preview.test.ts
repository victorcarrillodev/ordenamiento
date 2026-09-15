import { describe, expect, it } from 'bun:test'
import JSZip from 'jszip'
import { docxPreview } from './docx-preview.ts'

async function word(xml: string) {
  const zip = new JSZip()
  zip.file('word/document.xml', xml)
  return zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' })
}

describe('vista de texto DOCX', () => {
  it('recupera párrafos y texto de vínculos sin cargar sus destinos', async () => {
    const file = await word(
      '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body><w:p><w:r><w:t>Propuesta &amp; observación</w:t></w:r></w:p><w:p><w:hyperlink><w:r><w:t>&lt;script&gt;texto&lt;/script&gt;</w:t></w:r></w:hyperlink></w:p></w:body></w:document>',
    )
    expect(await docxPreview(file)).toBe('Propuesta & observación\n\n<script>texto</script>')
  })
  it('rechaza archivos incompletos y declaraciones de entidades', async () => {
    await expect(docxPreview(Buffer.from('no es un zip'))).rejects.toThrow()
    const file = await word('<!DOCTYPE test [<!ENTITY ext SYSTEM "file:///etc/passwd">]><test/>')
    await expect(docxPreview(file)).rejects.toThrow()
  })
  it('corta un XML descomprimido excesivo aunque el zip sea pequeño', async () => {
    const file = await word(`<document>${'a'.repeat(4 * 1024 * 1024)}</document>`)
    expect(file.length).toBeLessThan(10_000)
    await expect(docxPreview(file)).rejects.toThrow('tamaño de vista previa')
  })
})
