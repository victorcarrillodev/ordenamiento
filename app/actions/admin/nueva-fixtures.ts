import { vi } from 'vitest'
import { router } from '../../router.ts'

const NUEVA_URL = 'http://localhost/ordena/admin/participaciones/nueva'

/** Mockea al backend y captura el FormData reenviado a /api/participations. */
export function mockBackend() {
  const captured: { body: FormData | null } = { body: null }

  globalThis.fetch = vi
    .fn()
    .mockImplementation((url: string | URL | Request, init?: RequestInit) => {
      const u = typeof url === 'string' ? url : url instanceof Request ? url.url : url.toString()

      if (u.includes('/api/auth/me')) {
        return Promise.resolve(
          new Response(JSON.stringify({ user: { id: 1, name: 'Admin Root', role: 'admin' } }), {
            status: 200,
            headers: { 'content-type': 'application/json' },
          }),
        )
      }

      if (u.includes('/api/participations')) {
        captured.body = init?.body as FormData
        return Promise.resolve(
          new Response(JSON.stringify({ id: 105, folio: 'FIS-2026-009' }), {
            status: 201,
            headers: { 'content-type': 'application/json' },
          }),
        )
      }

      return Promise.resolve(new Response(JSON.stringify({ ok: true }), { status: 200 }))
    }) as unknown as typeof fetch

  return captured
}

/** Formulario mínimo válido: los mismos campos que el formulario ciudadano. */
export function formularioBase() {
  const fd = new FormData()
  fd.set('nombre', 'Ciudadano Físico')
  fd.set('email', 'fisico@ejemplo.com')
  fd.set('alcance_ubicacion', 'especifico')
  fd.set('calle', 'Prolongación Colón 500')
  fd.set('colonia', 'Santa Anita')
  fd.set('cp', '45640')
  fd.set('domicilio', 'Av. Juárez 100, Centro')
  fd.set('municipio_participante', 'Guadalajara')
  fd.set('observacion', 'Aporte capturado en módulo físico')
  return fd
}

export function postNueva(fd: FormData) {
  return router.fetch(new Request(NUEVA_URL, { method: 'POST', body: fd }))
}
