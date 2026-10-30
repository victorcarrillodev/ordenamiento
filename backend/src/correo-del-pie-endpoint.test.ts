/* eslint-disable @typescript-eslint/no-explicit-any */
import { afterEach, beforeEach, describe, expect, it, spyOn } from 'bun:test'

import { handleRequest } from './app.ts'
import * as auth from './auth/auth.ts'
import { createSessionToken } from './auth/auth.ts'
import * as customizations from './services/customizations.ts'

/**
 * El correo de contacto del pie de página es también el remitente de los
 * correos del portal: al guardarlo, lo que no es una dirección se rechaza en
 * lugar de publicarse en el pie y de acabar en el encabezado `From:`.
 */
const UID = '550e8400-e29b-41d4-a716-446655440088'

const admin = {
  id: UID,
  name: 'Ana',
  email: 'ana@tlaquepaque.gob.mx',
  role: 'admin',
  sessionsValidFrom: 0,
}

let usuarioSpy: any
let guardarSpy: any

beforeEach(() => {
  usuarioSpy = spyOn(auth as any, 'getUserById').mockResolvedValue(admin)
  guardarSpy = spyOn(customizations as any, 'saveCustomizations').mockResolvedValue(
    customizations.DEFAULT_THEME_CONFIG,
  )
})

afterEach(() => {
  usuarioSpy.mockRestore()
  guardarSpy.mockRestore()
})

async function guardar(config: unknown) {
  const token = await createSessionToken(UID)
  return handleRequest(
    new Request('http://localhost/api/settings/theme', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        cookie: `ordenamiento_session=${encodeURIComponent(token)}`,
      },
      body: JSON.stringify({ config, motivo: 'Prueba', section: 'usuario' }),
    }),
  )
}

describe('POST /api/settings/theme · correo de contacto del pie', () => {
  it('guarda una dirección válida', async () => {
    const res = await guardar({
      usuario: { textos: { footerEmail: 'contacto@tlaquepaque.gob.mx' } },
    })
    expect(res.status).toBe(200)
    expect(guardarSpy).toHaveBeenCalledTimes(1)
  })

  it('guarda el campo vacío: el pie vuelve a mostrar el de fábrica', async () => {
    const res = await guardar({ usuario: { textos: { footerEmail: '' } } })
    expect(res.status).toBe(200)
    expect(guardarSpy).toHaveBeenCalledTimes(1)
  })

  it('no objeta cambios que no tocan ese campo', async () => {
    const res = await guardar({ usuario: { textos: { heroTitulo: 'Otro título' } } })
    expect(res.status).toBe(200)
    expect(guardarSpy).toHaveBeenCalledTimes(1)
  })

  it('rechaza con 400 algo que no es una dirección y no guarda nada', async () => {
    const res = await guardar({
      usuario: { textos: { footerEmail: 'ordenamiento@tlaquepaque.gob.mx / 33 1234 5678' } },
    })
    expect(res.status).toBe(400)
    const cuerpo = (await res.json()) as { error: string }
    expect(cuerpo.error).toContain('correo de contacto oficial')
    expect(guardarSpy).not.toHaveBeenCalled()
  })

  it('rechaza con 400 varias direcciones juntas o un encabezado inyectado', async () => {
    for (const malo of ['a@x.mx, b@x.mx', 'a@x.mx\r\nBcc: robo@x.mx']) {
      const res = await guardar({ usuario: { textos: { footerEmail: malo } } })
      expect(res.status, JSON.stringify(malo)).toBe(400)
    }
    expect(guardarSpy).not.toHaveBeenCalled()
  })
})
