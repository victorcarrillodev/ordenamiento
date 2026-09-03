/**
 * Imágenes de marca — GET /marca/:file
 *
 * Sirve las imágenes que el administrador sube en Personalización. Están
 * guardadas en el backend, al que el navegador no llega, así que este proxy es
 * el único camino: sin él, el `<img src>` apuntaba a una ruta del backend
 * (`/api/settings/assets/...`) que desde fuera devuelve 404, y toda imagen
 * subida por el panel quedaba rota en el sitio público.
 *
 * Es pública a propósito: el logotipo y las fotos del carrusel se ven en la
 * portada, antes de que nadie inicie sesión.
 */
import { backendFetch } from '../backend.ts'

/** Nombres que genera `saveUploadedBrandingImage`; nada más pasa. */
const NOMBRE_RE = /^[A-Za-z0-9_.-]{1,200}$/

export async function marcaAction(request: Request, file: string): Promise<Response> {
  // `..` no puede colarse por el regex, pero se comprueba igual: el nombre
  // termina concatenado a una ruta de disco en el backend.
  if (!NOMBRE_RE.test(file) || file.includes('..')) {
    return new Response('Not Found', { status: 404 })
  }

  const response = await backendFetch(request, `/api/settings/assets/${encodeURIComponent(file)}`)
  if (!response.ok) return new Response('Not Found', { status: response.status })

  const headers = new Headers()
  for (const h of ['content-type', 'content-length', 'cache-control']) {
    const v = response.headers.get(h)
    if (v) headers.set(h, v)
  }
  headers.set('x-content-type-options', 'nosniff')
  // Se sirve como recurso aislado: aunque el archivo fuera un HTML disfrazado,
  // el navegador no lo ejecutaría en este origen.
  headers.set('content-security-policy', "default-src 'none'; frame-ancestors 'self'")
  if (!headers.has('cache-control')) headers.set('cache-control', 'public, max-age=86400')

  return new Response(response.body, { headers })
}
