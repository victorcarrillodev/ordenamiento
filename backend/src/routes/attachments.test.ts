import { afterEach, beforeEach, describe, expect, it, spyOn } from 'bun:test'
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import * as pool from '../db/pool.ts'
import { getAttachment } from './attachments.ts'
import { attachmentPath } from '../files/attachment-path.ts'

let root: string
let upload: string
let db: ReturnType<typeof spyOn>
const ids = { id: 'participacion-1', aid: 'adjunto-1' }

beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), 'ordenamiento-adjuntos-'))
  upload = join(root, 'uploads')
  await mkdir(upload)
  await writeFile(join(upload, 'datos.pdf'), '%PDF-1.7 prueba de descarga')
  db = spyOn(pool, 'sql').mockResolvedValue([
    { ruta_local: 'uploads/datos.pdf', nombre_original: 'Observación.pdf', origen: 'digital' },
  ] as never)
})
afterEach(async () => {
  db.mockRestore()
  await rm(root, { recursive: true, force: true })
})

describe('descarga y lectura de adjuntos', () => {
  it('descarga un archivo legado sin duplicar uploads y conserva los bytes', async () => {
    const response = await getAttachment(
      new Request('http://local/adjunto?download=1'),
      ids,
      upload,
    )
    expect(response.status).toBe(200)
    expect(response.headers.get('content-disposition')).toStartWith('attachment;')
    expect(response.headers.get('cache-control')).toContain('no-store')
    expect(await response.text()).toBe('%PDF-1.7 prueba de descarga')
    expect(db.mock.calls[0].slice(1)).toEqual([ids.aid, ids.id])
  })
  it('sirve rangos de un PDF y rechaza rangos fuera del archivo', async () => {
    const partial = await getAttachment(
      new Request('http://local/adjunto', { headers: { range: 'bytes=0-3' } }),
      ids,
      upload,
    )
    expect(partial.status).toBe(206)
    expect(await partial.text()).toBe('%PDF')
    const invalid = await getAttachment(
      new Request('http://local/adjunto', { headers: { range: 'bytes=999999-' } }),
      ids,
      upload,
    )
    expect(invalid.status).toBe(416)
  })
  it('rechaza rutas que salen del almacén y no confunde prefijos vecinos', async () => {
    await writeFile(join(root, 'secreto.txt'), 'no exponer')
    await expect(attachmentPath(upload, '../secreto.txt')).rejects.toThrow('DENIED')
    await expect(
      attachmentPath(upload, join(root, 'uploads-copia', 'secreto.txt')),
    ).rejects.toThrow('DENIED')
  })
  it('devuelve 404 si el adjunto no pertenece a la participación consultada', async () => {
    db.mockResolvedValueOnce([])
    const response = await getAttachment(new Request('http://local/adjunto'), ids, upload)
    expect(response.status).toBe(404)
  })
})
