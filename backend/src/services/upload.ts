import { mkdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

import { validarAdjunto } from '../files/limits.ts'
import { nombreEnDisco, sanitizarNombre } from '../files/nombres.ts'
import { validateUpload } from './upload-guard.ts'

const UPLOAD_DIR = join(process.cwd(), 'uploads')

export interface ArchivoSubido {
  nombreOriginal: string
  mime: string
  size: number
  rutaLocal: string
}

/**
 * Replica la secuencia de participations.ts:79-107 para N claves de formData.
 * Itera getAll(clave), valida límites → magic bytes → escribe a disco.
 * Devuelve archivos y rutas escritas para rollback.
 */
export async function subirArchivosDesdeForm(
  request: Request,
  claves: string[],
): Promise<{ archivos: ArchivoSubido[]; escritos: string[] }> {
  const form = await request.formData()
  const rawFiles: File[] = []
  for (const clave of claves) {
    for (const entry of form.getAll(clave)) {
      if (entry instanceof File && entry.size > 0) rawFiles.push(entry)
    }
  }

  const archivos: ArchivoSubido[] = []
  const escritos: string[] = []

  for (const file of rawFiles) {
    const lim = validarAdjunto({ size: file.size, name: file.name }, rawFiles.length)
    if (!lim.ok) {
      throw Object.assign(new Error(lim.reason ?? 'Archivo rechazado'), {
        status: lim.codigo ?? 400,
      })
    }
    const buffer = Buffer.from(await file.arrayBuffer())
    const verdict = validateUpload({ filename: file.name, buffer })
    if (!verdict.ok) {
      throw Object.assign(
        new Error(`Archivo rechazado (${sanitizarNombre(file.name)}): ${verdict.reason}`),
        { status: 415 },
      )
    }
    await mkdir(UPLOAD_DIR, { recursive: true })
    const nombreDisco = nombreEnDisco(file.name)
    const ruta = join(UPLOAD_DIR, nombreDisco)
    await writeFile(ruta, buffer)
    escritos.push(ruta)
    archivos.push({
      nombreOriginal: sanitizarNombre(file.name),
      mime: verdict.safeMime!,
      size: file.size,
      rutaLocal: ruta,
    })
  }

  return { archivos, escritos }
}
