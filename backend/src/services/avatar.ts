/**
 * Foto de perfil: validación y escritura en disco.
 *
 * La reciben dos pantallas —«Mi cuenta» (`POST /api/users/me/avatar`) y el panel
 * de primer acceso (`POST /api/auth/account-setup`)— y las dos deben aceptar y
 * rechazar exactamente lo mismo, así que las reglas viven aquí y no en cada
 * endpoint: una imagen de hasta 5 MB, de un formato que el portal sabe servir,
 * que pase la revisión de archivos del proyecto (extensión, contenido real).
 */
import { mkdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

import { nombreEnDisco, sanitizarNombre } from '../files/nombres.ts'
import { getExtension, isImageExtension, validateUpload } from './upload-guard.ts'
import { AVATAR_MAX_BYTES } from './users.ts'

const UPLOAD_DIR = join(process.cwd(), 'uploads')

export interface AvatarValidado {
  buffer: Buffer
  /** Nombre original ya saneado: es lo que se guarda y se muestra, nunca la ruta en disco. */
  nombreOriginal: string
  /** Tipo de contenido que determinó la revisión, no el que declaró el navegador. */
  mime: string
}

export type ResultadoAvatar =
  { ok: true; avatar: AvatarValidado } | { ok: false; status: 400 | 413 | 415; error: string }

/**
 * Revisa lo que llegó en el campo de la foto. `archivo` es lo que devuelve
 * `FormData.get()`: puede ser un `File`, un texto o nada.
 */
export async function validarAvatar(archivo: unknown): Promise<ResultadoAvatar> {
  if (!(archivo instanceof File) || archivo.size === 0) {
    return { ok: false, status: 400, error: 'No se recibió ninguna imagen' }
  }
  if (archivo.size > AVATAR_MAX_BYTES) {
    return { ok: false, status: 413, error: 'Archivo demasiado grande (máx 5 MB)' }
  }

  const nombre = String(archivo.name)
  const buffer = Buffer.from(await archivo.arrayBuffer())
  const veredicto = validateUpload({ filename: nombre, buffer })
  if (!veredicto.ok) {
    return {
      ok: false,
      status: 415,
      error: `Archivo rechazado (${sanitizarNombre(nombre)}): ${veredicto.reason}`,
    }
  }
  if (!isImageExtension(getExtension(nombre))) {
    return {
      ok: false,
      status: 415,
      error: 'El archivo debe ser una imagen (JPG, PNG, WEBP o GIF)',
    }
  }

  return {
    ok: true,
    avatar: { buffer, nombreOriginal: sanitizarNombre(nombre), mime: veredicto.safeMime! },
  }
}

/** Escribe la imagen ya validada en `uploads/` y devuelve la ruta del archivo. */
export async function escribirAvatar(avatar: AvatarValidado): Promise<string> {
  await mkdir(UPLOAD_DIR, { recursive: true })
  const ruta = join(UPLOAD_DIR, nombreEnDisco(avatar.nombreOriginal))
  await writeFile(ruta, avatar.buffer)
  return ruta
}
