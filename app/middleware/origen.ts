/** Rechaza formularios externos antes de reenviarlos con la cookie al backend. */
export async function origenSeguro(context: { request: Request }, next: () => Promise<Response>) {
  const { request } = context
  if (['GET', 'HEAD', 'OPTIONS'].includes(request.method)) return next()
  const origin = request.headers.get('origin')
  const sitio = request.headers.get('sec-fetch-site')
  let permitido = true
  if (origin) {
    try {
      const origen = new URL(origin)
      // El proxy puede terminar HTTPS y reenviar por HTTP; el host público debe coincidir.
      permitido =
        ['https:', 'http:'].includes(origen.protocol) && origen.host === new URL(request.url).host
    } catch {
      permitido = false
    }
  } else if (sitio && sitio !== 'same-origin' && sitio !== 'none') permitido = false
  if (!permitido)
    return new Response(
      'La solicitud proviene de otro sitio. Vuelve al portal e intenta de nuevo.',
      { status: 403 },
    )
  return next()
}
