/** Rechaza temprano cuerpos gigantes sin bufferizarlos completos en memoria. */
export function bodyTooLarge(request: Request, limitBytes: number): boolean {
  const declared = Number(request.headers.get('content-length') ?? '0')
  return Number.isFinite(declared) && declared > limitBytes
}

export function json(data: unknown, init?: number | ResponseInit): Response {
  if (typeof init === 'number') {
    return new Response(JSON.stringify(data), {
      status: init,
      headers: { 'content-type': 'application/json' },
    })
  }
  const headers: Record<string, string> = {
    'content-type': 'application/json',
    ...(init?.headers as Record<string, string> | undefined),
  }
  return new Response(JSON.stringify(data), { status: init?.status ?? 200, headers })
}
