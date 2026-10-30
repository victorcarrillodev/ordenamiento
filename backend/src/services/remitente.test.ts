import { afterEach, describe, expect, it, spyOn } from 'bun:test'

import * as customizations from './customizations.ts'
import {
  CORREO_DE_CONTACTO_POR_DEFECTO,
  correoDelPie,
  errorDelCorreoDelPie,
  esCorreoDeContactoValido,
  NOMBRE_REMITENTE,
  remitenteDelPortal,
} from './remitente.ts'

describe('esCorreoDeContactoValido', () => {
  it('acepta direcciones normales', () => {
    for (const bueno of [
      'ordenamiento@tlaquepaque.gob.mx',
      'consulta.poetdum@tlaquepaque.gob.mx',
      'medio-ambiente+poetdum@tlaquepaque.gob.mx',
      'a@b.co',
    ]) {
      expect(esCorreoDeContactoValido(bueno), bueno).toBe(true)
    }
  })

  it('rechaza lo que no es una sola dirección, o permitiría meter otros destinatarios', () => {
    for (const malo of [
      '',
      'sin-arroba',
      'a@b',
      'a@b.c',
      'dos@x.mx, tres@x.mx',
      'uno@x.mx;dos@x.mx',
      'Nombre <a@x.mx>',
      '"a b"@x.mx',
      'a b@x.mx',
      'a@x.mx\r\nBcc: otro@x.mx',
      'a@x.mx ',
      ' a@x.mx',
      'a@@x.mx',
      `${'a'.repeat(250)}@x.mx`,
    ]) {
      expect(esCorreoDeContactoValido(malo), JSON.stringify(malo)).toBe(false)
    }
    for (const noTexto of [undefined, null, 12, {}, ['a@x.mx']]) {
      expect(esCorreoDeContactoValido(noTexto)).toBe(false)
    }
  })
})

describe('correoDelPie', () => {
  it('es lo que se escribió, sin espacios sobrantes', () => {
    expect(correoDelPie({ footerEmail: '  contacto@tlaquepaque.gob.mx ' })).toBe(
      'contacto@tlaquepaque.gob.mx',
    )
  })

  it('con el campo vacío o ausente es el que el pie muestra de fábrica', () => {
    expect(correoDelPie({ footerEmail: '' })).toBe(CORREO_DE_CONTACTO_POR_DEFECTO)
    expect(correoDelPie({ footerEmail: '   ' })).toBe(CORREO_DE_CONTACTO_POR_DEFECTO)
    expect(correoDelPie({})).toBe(CORREO_DE_CONTACTO_POR_DEFECTO)
    expect(correoDelPie(undefined)).toBe(CORREO_DE_CONTACTO_POR_DEFECTO)
    expect(correoDelPie(null)).toBe(CORREO_DE_CONTACTO_POR_DEFECTO)
  })

  it('coincide con el que trae la personalización de fábrica', () => {
    expect(CORREO_DE_CONTACTO_POR_DEFECTO).toBe(
      customizations.DEFAULT_THEME_CONFIG.usuario.textos.footerEmail,
    )
  })
})

describe('errorDelCorreoDelPie (validación al guardar)', () => {
  it('no objeta nada si la configuración no toca ese campo', () => {
    expect(errorDelCorreoDelPie({})).toBeNull()
    expect(errorDelCorreoDelPie({ usuario: {} })).toBeNull()
    expect(errorDelCorreoDelPie({ usuario: { textos: { heroTitulo: 'x' } } })).toBeNull()
    expect(errorDelCorreoDelPie({ panel: { sidebarFondo: '#fff' } })).toBeNull()
    expect(errorDelCorreoDelPie(null)).toBeNull()
    expect(errorDelCorreoDelPie(undefined)).toBeNull()
  })

  it('acepta una dirección válida y el campo vacío (vuelve al de fábrica)', () => {
    expect(
      errorDelCorreoDelPie({ usuario: { textos: { footerEmail: 'a@tlaquepaque.gob.mx' } } }),
    ).toBeNull()
    expect(errorDelCorreoDelPie({ usuario: { textos: { footerEmail: '' } } })).toBeNull()
    expect(errorDelCorreoDelPie({ usuario: { textos: { footerEmail: '  ' } } })).toBeNull()
  })

  it('rechaza lo que no es una dirección, con un mensaje que dice qué corregir', () => {
    const error = errorDelCorreoDelPie({
      usuario: { textos: { footerEmail: 'ordenamiento@tlaquepaque.gob.mx / 33 1234 5678' } },
    })
    expect(error).toContain('correo de contacto oficial')
    expect(error).toContain('remitente')
    expect(
      errorDelCorreoDelPie({ usuario: { textos: { footerEmail: 'sin arroba' } } }),
    ).not.toBeNull()
    expect(errorDelCorreoDelPie({ usuario: { textos: { footerEmail: 42 } } })).not.toBeNull()
  })
})

describe('remitenteDelPortal', () => {
  let restaurar: Array<() => void> = []
  afterEach(() => {
    restaurar.forEach((r) => r())
    restaurar = []
  })

  const conPie = (footerEmail: unknown) => {
    const leer = spyOn(customizations, 'getCustomizations').mockResolvedValue({
      ...customizations.DEFAULT_THEME_CONFIG,
      usuario: {
        ...customizations.DEFAULT_THEME_CONFIG.usuario,
        textos: { ...customizations.DEFAULT_THEME_CONFIG.usuario.textos, footerEmail },
      },
    } as never)
    restaurar.push(() => leer.mockRestore())
  }

  it('firma con el nombre indicado y la dirección del pie', async () => {
    conPie('contacto@tlaquepaque.gob.mx')
    expect(await remitenteDelPortal()).toBe('"Bitácora Tlaquepaque" <contacto@tlaquepaque.gob.mx>')
    expect(await remitenteDelPortal(NOMBRE_REMITENTE.consulta)).toBe(
      '"Consulta pública POETDUM" <contacto@tlaquepaque.gob.mx>',
    )
  })

  it('lee la personalización en cada envío, no una sola vez', async () => {
    conPie('uno@tlaquepaque.gob.mx')
    expect(await remitenteDelPortal()).toContain('<uno@tlaquepaque.gob.mx>')
    restaurar.forEach((r) => r())
    conPie('dos@tlaquepaque.gob.mx')
    expect(await remitenteDelPortal()).toContain('<dos@tlaquepaque.gob.mx>')
  })

  it('con el pie vacío manda desde la dirección que el pie muestra de fábrica', async () => {
    conPie('')
    expect(await remitenteDelPortal()).toBe(
      `"Bitácora Tlaquepaque" <${CORREO_DE_CONTACTO_POR_DEFECTO}>`,
    )
  })

  it('si lo guardado no es una dirección, cae a la de fábrica en vez de usarlo de remitente', async () => {
    const aviso = spyOn(console, 'warn').mockImplementation(() => {})
    restaurar.push(() => aviso.mockRestore())
    conPie('ordenamiento@x.mx\r\nBcc: robo@x.mx')
    const remitente = await remitenteDelPortal()
    expect(remitente).toBe(`"Bitácora Tlaquepaque" <${CORREO_DE_CONTACTO_POR_DEFECTO}>`)
    expect(remitente).not.toContain('Bcc')
    expect(aviso).toHaveBeenCalledTimes(1)
  })
})
