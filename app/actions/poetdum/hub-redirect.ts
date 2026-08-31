import { redirect } from 'remix/response/redirect'
import { routes } from '../../routes.ts'

export function hubRedirect(ancla: string, request: Request, params: string[] = []): Response {
  const url = new URL(request.url)
  const qs = new URLSearchParams()
  for (const k of params) {
    const v = url.searchParams.get(k)
    if (v) qs.set(k, v)
  }
  const query = qs.toString() ? `?${qs.toString()}` : ''
  return redirect(`${routes.poetdum.show.href()}${query}#${ancla}`)
}
