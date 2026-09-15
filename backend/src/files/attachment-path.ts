import { realpath } from 'node:fs/promises'
import { basename, isAbsolute, relative, resolve, sep } from 'node:path'

function inside(root: string, path: string): boolean {
  const rel = relative(root, path)
  return rel !== '' && rel !== '..' && !rel.startsWith(`..${sep}`) && !isAbsolute(rel)
}

/** Admite nombres antiguos con prefijo uploads/, pero nunca sale del almacén. */
export async function attachmentPath(uploadDir: string, storedPath: string): Promise<string> {
  const root = resolve(uploadDir)
  const normalized = storedPath.replace(/\\/g, '/')
  const prefix = `${basename(root)}/`
  const local = normalized.startsWith(prefix) ? normalized.slice(prefix.length) : normalized
  const path = resolve(root, local)
  if (!inside(root, path)) throw new Error('ATTACHMENT_PATH_DENIED')
  const [realRoot, realFile] = await Promise.all([realpath(root), realpath(path)])
  if (!inside(realRoot, realFile)) throw new Error('ATTACHMENT_PATH_DENIED')
  return realFile
}
