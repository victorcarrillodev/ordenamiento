import { describe, expect, it } from 'bun:test'

import { participationRateLimited } from './app.ts'
import { DEFAULT_THEME_CONFIG, validarYSanitizarThemeConfig } from './services/customizations.ts'
import { clientIp, isSafeCssColor, isSafeImageUrl, rateLimit, sanitizeText } from './utils.ts'

type ThemeConfig = Partial<typeof DEFAULT_THEME_CONFIG>

describe('rateLimit', () => {
  it('permite los primeros 10 requests y bloquea el 11º', () => {
    const ip = '10.0.0.1'
    for (let i = 0; i < 10; i++) {
      expect(rateLimit(ip, 10, 60_000, 1_700_000_000_000)).toBe(false)
    }
    expect(rateLimit(ip, 10, 60_000, 1_700_000_000_000)).toBe(true)
  })

  it('reinicia el contador cuando expira la ventana', () => {
    const ip = '10.0.0.2'
    const t0 = 1_700_000_000_000
    for (let i = 0; i < 10; i++) {
      rateLimit(ip, 10, 60_000, t0)
    }
    expect(rateLimit(ip, 10, 60_000, t0)).toBe(true)
    // Tras la ventana el contador se resetea: el primer request vuelve a pasar
    expect(rateLimit(ip, 10, 60_000, t0 + 61_000)).toBe(false)
  })

  it('aísla el contador por IP', () => {
    for (let i = 0; i < 10; i++) {
      expect(rateLimit('10.0.0.3', 10, 60_000, 1_700_000_000_001)).toBe(false)
    }
    // 11º para 10.0.0.3 queda bloqueado
    expect(rateLimit('10.0.0.3', 10, 60_000, 1_700_000_000_001)).toBe(true)
    // pero otra IP nunca se ve afectada
    expect(rateLimit('172.16.0.9', 10, 60_000, 1_700_000_000_001)).toBe(false)
  })
})

describe('participationRateLimited', () => {
  const t0 = 1_800_000_000_000

  it('exime a un admin autenticado: más de 10 POSTs sin bloquearse', () => {
    for (let i = 0; i < 15; i++) {
      expect(participationRateLimited('admin', '10.0.0.40', t0)).toBe(false)
    }
  })

  it('bloquea a un participante público (digital) tras 10 POSTs', () => {
    const ip = '10.0.0.41'
    for (let i = 0; i < 10; i++) {
      expect(participationRateLimited(undefined, ip, t0)).toBe(false)
    }
    expect(participationRateLimited(undefined, ip, t0)).toBe(true)
  })

  it('bloquea a un usuario con rol user igual que al público', () => {
    const ip = '10.0.0.42'
    for (let i = 0; i < 10; i++) {
      expect(participationRateLimited('user', ip, t0)).toBe(false)
    }
    expect(participationRateLimited('user', ip, t0)).toBe(true)
  })

  it('no contamina el bucket de un admin con el de otras IPs', () => {
    expect(participationRateLimited('admin', '10.0.0.43', t0)).toBe(false)
    expect(participationRateLimited(undefined, '10.0.0.43', t0)).toBe(false)
  })
})

describe('clientIp', () => {
  it('NO confía en x-forwarded-for salvo que TRUST_PROXY=true', () => {
    const req = new Request('http://localhost/', {
      headers: { 'x-forwarded-for': '203.0.113.66' },
    })
    expect(clientIp(req, '198.51.100.10')).toBe('198.51.100.10')
    expect(clientIp(req, null)).toBe('unknown')
  })

  it('usa el primer valor de x-forwarded-for cuando TRUST_PROXY=true', () => {
    process.env.TRUST_PROXY = 'true'
    try {
      const req = new Request('http://localhost/', {
        headers: { 'x-forwarded-for': '203.0.113.66, 70.44.55.66' },
      })
      expect(clientIp(req, '198.51.100.10')).toBe('203.0.113.66')
    } finally {
      delete process.env.TRUST_PROXY
    }
  })
})

describe('isSafeCssColor', () => {
  it('rechaza etiquetas/scripts y nombres, acepta hex', () => {
    expect(isSafeCssColor('red')).toBe(false)
    expect(isSafeCssColor('red; }</style><script>')).toBe(false)
    expect(isSafeCssColor('#ff0000')).toBe(true)
    expect(isSafeCssColor('#abc')).toBe(true)
    expect(isSafeCssColor('rgba(255,0,0,0.5)')).toBe(true)
  })

  it('rechaza no-strings', () => {
    expect(isSafeCssColor(42)).toBe(false)
    expect(isSafeCssColor(null)).toBe(false)
  })
})

describe('isSafeImageUrl', () => {
  it('acepta rutas relativas, protocol-relative y https', () => {
    expect(isSafeImageUrl('/ok.jpg')).toBe(true)
    expect(isSafeImageUrl('//cdn.example/x.png')).toBe(true)
    expect(isSafeImageUrl('https://example.com/a.png')).toBe(true)
  })

  it('rechaza javascript:, http:// y caracteres peligrosos', () => {
    expect(isSafeImageUrl('javascript:alert(1)')).toBe(false)
    expect(isSafeImageUrl('http://example.com/a.png')).toBe(false)
    expect(isSafeImageUrl('#ff0000')).toBe(false)
    expect(isSafeImageUrl('/a b.png')).toBe(false)
  })
})

describe('sanitizeText', () => {
  it('elimina etiquetas HTML', () => {
    expect(sanitizeText('<script>alert(1)</script>', 500)).toBe('alert(1)')
    expect(sanitizeText('<b>hola</b>', 500)).toBe('hola')
  })

  it('devuelve string vacío para entradas no-string', () => {
    expect(sanitizeText(undefined, 500)).toBe('')
    expect(sanitizeText(null, 500)).toBe('')
    expect(sanitizeText(123, 500)).toBe('')
  })

  it('trunca a la longitud máxima', () => {
    expect(sanitizeText('abcdefghij', 5)).toBe('abcde')
  })
})

describe('validarYSanitizarThemeConfig', () => {
  const validar = (config: object): string | null =>
    validarYSanitizarThemeConfig(config as ThemeConfig)

  it('acepta el config por defecto', () => {
    expect(validar({})).toBeNull()
  })

  it('acepta valores con cadenas vacías', () => {
    const config = {
      usuario: {
        imagenes: { logoNavbar: '', logoFooter: '', imagenEcologia: '' },
      },
      panel: { adminLogo: '' },
    }
    expect(validar(config)).toBeNull()
  })

  it('rechaza colores maliciosos con inyección CSS', () => {
    const config = {
      usuario: {
        colores: { primario: 'red; }</style><script>alert(1)</script>' },
      },
    }
    expect(validar(config)).toContain('Color inválido')
  })

  it('rechaza URLs de imagen peligrosas', () => {
    expect(validar({ usuario: { imagenes: { logoNavbar: 'javascript:alert(1)' } } })).toContain(
      'URL de imagen inválida',
    )
    expect(
      validar({ usuario: { imagenes: { heroImagenes: ['http://evil.example/x.png'] } } }),
    ).toContain('URL de imagen inválida')
  })

  it('rechaza heroImagenes cuando no es un array (en vez de tirar TypeError)', () => {
    const config = { usuario: { imagenes: { heroImagenes: 'javascript:alert(1)' } } }
    expect(validar(config)).toBe('heroImagenes debe ser un array')
  })

  it('sanitiza textos libres quitando tags y truncando', () => {
    const config: {
      usuario: { textos: { heroTitulo: string; footerDesc: string } }
    } = {
      usuario: {
        textos: {
          heroTitulo: '<script>hola</script>',
          footerDesc: 'x'.repeat(600),
        },
      },
    }
    expect(validar(config)).toBeNull()
    expect(config.usuario.textos.heroTitulo).toBe('hola')
    expect(config.usuario.textos.footerDesc.length).toBeLessThanOrEqual(500)
  })

  it('acepta colores y URLs válidas', () => {
    expect(
      validar({
        usuario: { colores: { primario: '#ff0000' }, imagenes: { logoNavbar: '/x.png' } },
      }),
    ).toBeNull()
  })
})
