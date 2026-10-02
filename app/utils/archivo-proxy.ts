/**
 * Entrega al navegador un archivo que sirve el backend. El navegador nunca
 * habla con el backend: este servidor lo pide y reenvía la respuesta, y es el
 * punto donde se asegura que una descarga sea una descarga.
 */

/** Cabeceras del backend que se reenvían al servir un archivo. */
const CABECERAS_ARCHIVO = [
  'content-type',
  'content-disposition',
  'content-length',
  'x-content-type-options',
  'cross-origin-resource-policy',
  'cache-control',
]

/**
 * Sin `sandbox`: el visor de PDF del navegador se niega a abrir dentro de un
 * documento aislado. El recurso sigue sin poder cargar nada.
 */
const CSP_ARCHIVO = "default-src 'none'; frame-ancestors 'self'"

/** ¿Pide la URL el archivo como descarga (`?download=1`)? */
export function pideDescarga(request: Request): boolean {
  return new URL(request.url).searchParams.get('download') === '1'
}

/**
 * Reenvía `response` (la del backend) como archivo. Con `descarga`, la
 * disposición es siempre `attachment`: si el backend no la mandó así, se corrige
 * aquí en vez de dejar que el navegador abra el documento en su visor.
 */
export function respuestaDeArchivo(response: Response, descarga: boolean): Response {
  const headers = new Headers()
  for (const nombre of CABECERAS_ARCHIVO) {
    const valor = response.headers.get(nombre)
    if (valor) headers.set(nombre, valor)
  }
  if (descarga && !/^\s*attachment/i.test(headers.get('content-disposition') ?? '')) {
    headers.set('content-disposition', 'attachment')
  }
  headers.set('content-security-policy', CSP_ARCHIVO)
  return new Response(response.body, { headers })
}
