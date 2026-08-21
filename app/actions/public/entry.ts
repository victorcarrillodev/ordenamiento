import { run } from 'remix/ui'

const app = run({
  async loadModule(moduleUrl, exportName) {
    const mod = await import(moduleUrl)
    return mod[exportName]
  },
  async resolveFrame(src, options) {
    const response = await fetch(src, {
      headers: { Accept: 'text/html' },
      method: options?.method,
      body: getRequestBody(options?.formData, options?.method, options?.encType),
      signal: options?.signal,
    })
    if (!response.ok) {
      return `<pre>Frame error: ${response.status} ${response.statusText}</pre>`
    }

    if (response.body) return response.body
    return await response.text()
  },
})

if (import.meta.hot) {
  import.meta.hot.on('server:update', async () => {
    try {
      await app.ready()
      await app.frames.top.reload()
    } catch (error) {
      console.error('Error reloading top frame on server update', error)
    }
  })
}

function getRequestBody(
  formData?: FormData,
  method?: string,
  encType?: string,
): BodyInit | undefined {
  if (!formData || method?.toLowerCase() === 'get') return
  if (encType !== 'application/x-www-form-urlencoded') return formData

  const body = new URLSearchParams()
  for (const [name, value] of formData) {
    body.append(name, typeof value === 'string' ? value : value.name)
  }
  return body
}
