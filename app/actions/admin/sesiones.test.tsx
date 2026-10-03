import { describe, expect, it } from 'vitest'
import { renderToString } from 'remix/ui/server'

import { formatearFechaHora } from '../../ui/admin/formato.ts'
import { SesionesPage } from './sesiones-page.tsx'
import type { ResumenSesiones, SesionRegistrada } from './sesiones-tipos.ts'

/**
 * La bitácora de sesiones cuenta lo que de verdad pasó: quién está en línea
 * AHORA, cuándo dejó de usarse una sesión que nadie cerró y cuánto tiempo se
 * usó, no cuánto lleva abierta.
 */
const BASE: SesionRegistrada = {
  id: 's1',
  user_id: '550e8400-e29b-41d4-a716-446655440077',
  nombre: 'Ana Pérez',
  email: 'ana@tlaquepaque.gob.mx',
  rol: 'admin',
  inicio: '2026-10-02T16:00:00Z',
  fin: null,
  ultima_actividad: '2026-10-02T16:30:00Z',
  uso_segundos: 1500,
  estado: 'en_linea',
  activa: true,
  ip: '189.203.44.10',
  user_agent: 'Mozilla/5.0 (Windows NT 10.0) Chrome/140.0 Safari/537.36',
}

const RESUMEN: ResumenSesiones = {
  usuarios: 1,
  sesiones: 1,
  en_linea: 1,
  medidas: 1,
  segundos_totales: 1500,
}

const pagina = (items: SesionRegistrada[], resumen: Partial<ResumenSesiones> = {}) =>
  renderToString(
    <SesionesPage
      user={{ name: 'Admin', role: 'admin' }}
      items={items}
      resumen={{ ...RESUMEN, ...resumen }}
      total={items.length}
      page={1}
      limit={25}
    />,
  )

/** El texto de la fila de una sesión (lo que se ve en la tabla), sin etiquetas. */
async function fila(sesion: SesionRegistrada): Promise<string> {
  const html = await pagina([sesion])
  const tbody = html.match(/<tbody[^>]*id="sesiones-tbody"[^>]*>([\s\S]*?)<\/tbody>/)![1]
  const fila = tbody.match(/<tr[^>]*data-search[^>]*>[\s\S]*?<\/tr>/)![0]
  return fila.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ')
}

describe('estado de cada sesión', () => {
  it('una sesión en uso se ve «En línea»', async () => {
    const texto = await fila({ ...BASE, estado: 'en_linea', activa: true })
    expect(texto).toContain('● En línea')
    expect(texto).not.toContain('En curso')
  })

  it('una sesión que nadie cerró NO se da por activa: dice «Sin cerrar» y desde cuándo no se usa', async () => {
    const texto = await fila({ ...BASE, estado: 'inactiva', activa: false })
    expect(texto).not.toContain('En línea')
    expect(texto).not.toContain('En curso')
    expect(texto).toContain(formatearFechaHora(BASE.ultima_actividad))
    expect(texto).toContain('Sin cerrar: dejó de usarla')
  })

  it('una sesión cerrada muestra cuándo cerró, no su último movimiento', async () => {
    const fin = '2026-10-02T17:45:00Z'
    const texto = await fila({ ...BASE, estado: 'cerrada', activa: false, fin })
    expect(texto).toContain(formatearFechaHora(fin))
    expect(texto).toContain('Cerró sesión')
  })

  it('una sesión expirada lo dice', async () => {
    const texto = await fila({ ...BASE, estado: 'expirada', activa: false })
    expect(texto).toContain('Sin cerrar: la sesión expiró')
    expect(texto).not.toContain('En línea')
  })

  it('una sesión revocada al cambiar la contraseña lo dice', async () => {
    const texto = await fila({ ...BASE, estado: 'revocada', activa: false })
    expect(texto).toContain('Cerrada al cambiar la contraseña')
    expect(texto).not.toContain('En línea')
  })
})

describe('tiempo de uso de cada sesión', () => {
  it('muestra el tiempo medido', async () => {
    expect(await fila({ ...BASE, uso_segundos: 125 })).toContain('2 min')
    expect(await fila({ ...BASE, uso_segundos: 3900 })).toContain('1 h 5 min')
    expect(await fila({ ...BASE, uso_segundos: 45 })).toContain('45 s')
  })

  it('una sesión medida sin uso dice 0 s, no «Sin medir»', async () => {
    const texto = await fila({ ...BASE, uso_segundos: 0, estado: 'inactiva', activa: false })
    expect(texto).toContain('0 s')
    expect(texto).not.toContain('Sin medir')
  })

  it('una sesión anterior a la medición dice «Sin medir»: no inventa un tiempo', async () => {
    const texto = await fila({ ...BASE, uso_segundos: null, estado: 'inactiva', activa: false })
    expect(texto).toContain('Sin medir')
    expect(texto).not.toMatch(/\d+ (s|min|h)\b/)
  })

  it('el encabezado explica qué cuenta', async () => {
    const html = await pagina([BASE])
    expect(html).toContain('Tiempo de uso')
    expect(html).toContain('Fin o último movimiento')
    expect(html).toMatch(/<th[^>]*title="Tiempo con el panel a la vista y en uso\./)
    expect(html).not.toContain('Tiempo conectado')
  })
})

describe('tarjetas de resumen', () => {
  const tarjeta = (html: string, titulo: string) => {
    const i = html.indexOf(titulo)
    expect(i, titulo).toBeGreaterThan(-1)
    return html
      .slice(i, i + 400)
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
  }

  it('cuenta las sesiones en línea, no las que nadie cerró', async () => {
    const html = await pagina([BASE], { sesiones: 9, en_linea: 2 })
    expect(tarjeta(html, 'En línea')).toMatch(/En línea \| Ahora mismo\s+2\b/)
    expect(html).not.toContain('Abiertas')
  })

  it('el tiempo total es el medido y el promedio se saca de las sesiones medidas', async () => {
    // 10 sesiones, 4 medidas (las demás son anteriores a la medición): 4 horas / 4 = 1 h.
    const html = await pagina([BASE], { sesiones: 10, medidas: 4, segundos_totales: 4 * 3600 })
    const texto = tarjeta(html, 'Tiempo de uso')
    expect(texto).toContain('Promedio 1 h por sesión')
    expect(texto).toContain('4 h')
  })

  it('sin ninguna sesión medida, el promedio no inventa nada', async () => {
    const html = await pagina([], { sesiones: 3, medidas: 0, segundos_totales: 0, en_linea: 0 })
    expect(tarjeta(html, 'Tiempo de uso')).toContain('Promedio — por sesión')
  })
})

describe('explicaciones', () => {
  it('dice cómo se mide el tiempo de uso', async () => {
    const html = await pagina([BASE])
    expect(html).toContain('solo mientras la persona tiene el panel a la vista')
    expect(html).toContain('pausas de más de 2 minutos')
    expect(html).toContain('no se da por activa')
  })

  it('conserva el aviso de que es control de acceso y no de productividad', async () => {
    const html = await pagina([BASE])
    expect(html).toContain('no para supervisar productividad')
  })

  it('avisa de las sesiones anteriores a la medición, en singular y en plural', async () => {
    const una = await pagina([BASE], { sesiones: 5, medidas: 4 })
    expect(una).toContain('1 sesión es anterior a la medición del uso real')
    const varias = await pagina([BASE], { sesiones: 9, medidas: 4 })
    expect(varias).toContain('5 sesiones son anteriores a la medición del uso real')
  })

  it('sin sesiones anteriores no muestra el aviso', async () => {
    const html = await pagina([BASE], { sesiones: 4, medidas: 4 })
    expect(html).not.toContain('anteriores a la medición')
  })
})
