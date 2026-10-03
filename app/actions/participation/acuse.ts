/**
 * Descarga del acuse de recepción para quien acaba de participar.
 *
 * El acuse lo genera el backend y el navegador no llega a él: este servidor lo
 * pide con el enlace firmado y lo reenvía como descarga. El enlace (`?t=`) lo
 * emite el backend al registrar la participación y vence a las 48 horas; sin
 * él no hay forma de pedir el acuse de otra persona probando folios.
 */
import { BACKEND_URL } from '../../backend.ts'
import { respuestaDeArchivo } from '../../utils/archivo-proxy.ts'

/** Lo que alcanza a ver quien llega con un enlace roto o vencido. */
const ENLACE_INVALIDO =
  'El enlace del acuse no es válido o ya venció. Tu acuse en PDF también llegó al correo electrónico que registraste.'

export async function acuseCiudadanoAction(request: Request, folio: string): Promise<Response> {
  const token = new URL(request.url).searchParams.get('t') ?? ''
  let response: Response
  try {
    // Sin cookies: el acuse se pide con la firma, no con una sesión.
    response = await fetch(
      `${BACKEND_URL}/api/acuse/${encodeURIComponent(folio)}?t=${encodeURIComponent(token)}`,
    )
  } catch {
    return new Response('El servicio no está disponible. Intenta de nuevo en un momento.', {
      status: 503,
      headers: { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'no-store' },
    })
  }
  if (!response.ok) {
    return new Response(ENLACE_INVALIDO, {
      status: response.status === 429 ? 429 : 404,
      headers: { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'no-store' },
    })
  }
  return respuestaDeArchivo(response, true)
}
