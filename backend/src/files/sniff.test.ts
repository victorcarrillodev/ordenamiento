import { describe, expect, it } from 'bun:test'
import { detectarTipo } from './sniff.ts'

describe('files/sniff', () => {
  it('rechaza HTML renombrado a .jpg (Hallazgo 1)', () => {
    const htmlPayload = new TextEncoder().encode(
      '<!DOCTYPE html><html><body><script>alert(1)</script></body></html>',
    )
    const tipo = detectarTipo(htmlPayload, 'foto.jpg')
    expect(tipo).toBeNull()
  })

  it('detecta PDF legítimo', () => {
    const pdfPayload = new TextEncoder().encode('%PDF-1.4\n%...')
    const tipo = detectarTipo(pdfPayload, 'documento.pdf')
    expect(tipo).toEqual({ mime: 'application/pdf', extension: 'pdf' })
  })

  it('detecta PDF con basura previa (escáneres)', () => {
    const header = new Uint8Array(64)
    header[0] = 0x00
    header[1] = 0x20
    const pdfSig = new TextEncoder().encode('%PDF-1.7')
    header.set(pdfSig, 10)
    const tipo = detectarTipo(header, 'escaneo.pdf')
    expect(tipo).toEqual({ mime: 'application/pdf', extension: 'pdf' })
  })

  it('detecta PNG legítimo', () => {
    const pngSig = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00])
    const tipo = detectarTipo(pngSig, 'plano.png')
    expect(tipo).toEqual({ mime: 'image/png', extension: 'png' })
  })

  it('detecta JPEG legítimo', () => {
    const jpegSig = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10])
    const tipo = detectarTipo(jpegSig, 'foto.jpeg')
    expect(tipo).toEqual({ mime: 'image/jpeg', extension: 'jpg' })
  })

  it('detecta ZIP y derivados (DOCX/XLSX)', () => {
    const zipSig = new Uint8Array([0x50, 0x4b, 0x03, 0x04, 0x14, 0x00])
    expect(detectarTipo(zipSig, 'archivo.zip')).toEqual({
      mime: 'application/zip',
      extension: 'zip',
    })
    expect(detectarTipo(zipSig, 'reporte.docx')).toEqual({
      mime: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      extension: 'docx',
    })
    expect(detectarTipo(zipSig, 'tabla.xlsx')).toEqual({
      mime: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      extension: 'xlsx',
    })
  })

  it('detecta DWG de AutoCAD', () => {
    const dwgSig = new TextEncoder().encode('AC1027...')
    const tipo = detectarTipo(dwgSig, 'plano.dwg')
    expect(tipo).toEqual({ mime: 'image/vnd.dwg', extension: 'dwg' })
  })

  it('detecta ESRI Shapefile', () => {
    const shpSig = new Uint8Array([0x00, 0x00, 0x27, 0x0a, 0x00, 0x00, 0x00, 0x00])
    const tipo = detectarTipo(shpSig, 'capa.shp')
    expect(tipo).toEqual({ mime: 'application/octet-stream', extension: 'shp' })
  })

  it('retorna null para buffers vacíos o truncados no reconocidos', () => {
    expect(detectarTipo(new Uint8Array([]), 'algo.bin')).toBeNull()
    expect(detectarTipo(new Uint8Array([0x00, 0x01]), 'algo.bin')).toBeNull()
  })
})
