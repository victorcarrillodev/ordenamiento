import { mkdir, rm, writeFile } from 'node:fs/promises'
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
 * Valida y escribe a disco un lote de archivos ya leídos del formulario, con la
 * misma secuencia que los adjuntos ciudadanos: tamaño → firma binaria (magic
 * bytes) → nombre saneado y único en disco.
 *
 * Si un archivo no pasa, borra los que ya hubiera escrito del mismo lote y
 * lanza un error con `status` (413/415/400). Si todo pasa, devuelve las rutas
 * escritas para que quien llama las borre si después falla la base de datos.
 */
export async function guardarArchivos(
  files: File[],
): Promise<{ archivos: ArchivoSubido[]; escritos: string[] }> {
  const archivos: ArchivoSubido[] = []
  const escritos: string[] = []

  try {
    for (const file of files) {
      const lim = validarAdjunto({ size: file.size, name: file.name }, 1)
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
      const ruta = join(UPLOAD_DIR, nombreEnDisco(file.name))
      await writeFile(ruta, buffer)
      escritos.push(ruta)
      archivos.push({
        nombreOriginal: sanitizarNombre(file.name),
        mime: verdict.safeMime!,
        size: file.size,
        rutaLocal: ruta,
      })
    }
  } catch (err) {
    await Promise.allSettled(escritos.map((ruta) => rm(ruta, { force: true })))
    throw err
  }

  return { archivos, escritos }
}
