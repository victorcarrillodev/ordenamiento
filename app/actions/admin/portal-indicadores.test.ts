/**
 * Panel · Indicadores: la página se acomoda al alto de la ventana, el formulario
 * respeta los límites del backend y «Eliminar» dice lo que hace (y pregunta).
 */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { router } from '../../router.ts'

const ORIGINAL_FETCH = globalThis.fetch

interface Escenario {
  indicadores?: unknown[]
  aprobado?: boolean
  documentos?: unknown[]
}

function backend({ indicadores = [], aprobado = false, documentos = [] }: Escenario = {}) {
  const json = (cuerpo: unknown) =>
    Promise.resolve(
      new Response(JSON.stringify(cuerpo), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }),
    )
  globalThis.fetch = vi.fn().mockImplementation((entrada: string | URL | Request) => {
    const url =
      typeof entrada === 'string'
        ? entrada
        : entrada instanceof Request
          ? entrada.url
          : `${entrada}`
    if (url.includes('/api/auth/me')) {
      return json({ user: { id: 'u1', name: 'Admin Prueba', role: 'admin' } })
    }
    if (url.includes('/api/indicadores')) return json({ indicadores })
    if (url.includes('/api/actividades/documentos')) return json({ documentos })
    if (url.includes('/api/settings/theme')) return json({ theme: { programa: { aprobado } } })
    return json({ ok: true })
  }) as unknown as typeof fetch
}

async function abrir(ruta = ''): Promise<string> {
  const res = await router.fetch(new Request(`http://localhost/ordena/admin/indicadores${ruta}`))
  expect(res?.status).toBe(200)
  return (await res?.text()) ?? ''
}

function indicador(extra: Record<string, unknown> = {}) {
  return {
    id: 'i-1',
    nombre: 'Cobertura de suelo con ordenamiento vigente',
    descripcion: 'Porcentaje del territorio cubierto por instrumentos vigentes.',
    unidad: '%',
    meta: '100',
    fecha_evaluacion: '2026-12-31',
    resultado_texto: '',
    documento_respaldo: null,
    mediciones: [
      { id: 'm1', periodo: '2024', valor: '20' },
      { id: 'm2', periodo: '2026', valor: '45' },
    ],
    ...extra,
  }
}

function filaCon(html: string, texto: string): string {
  const filas = [...html.matchAll(/<tr>[\s\S]*?<\/tr>/g)].map((m) => m[0])
  const fila = filas.find((f) => f.includes(texto))
  expect(fila, `debe haber una fila con «${texto}»`).toBeDefined()
  return fila!
}

function celdaDe(fila: string, rotulo: string): string {
  const celda = fila.match(new RegExp(`<td[^>]*data-label="${rotulo}"[^>]*>([\\s\\S]*?)</td>`))
  expect(celda, `debe haber una celda «${rotulo}»`).not.toBeNull()
  return celda![1]
}

function textoVisible(html: string): string {
  return html
    .replace(/<span class="solo-lector">[\s\S]*?<\/span>/g, '')
    .replace(/<svg[\s\S]*?<\/svg>/g, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

beforeEach(() => vi.restoreAllMocks())
afterEach(() => {
  globalThis.fetch = ORIGINAL_FETCH
})

describe('Indicadores · se acomoda al alto de la ventana', () => {
  it('usa el diseño ajustado, con los tres bloques dentro de un solo contenedor', async () => {
    backend()
    const html = await abrir()
    expect(html).toMatch(/<main class="content content--ajustada"/)
    const contenedor = html.match(/<div class="indic">([\s\S]*)<\/div><\/main>/)?.[1] ?? ''
    expect(contenedor).not.toBe('')
    for (const bloque of ['indic__programa', 'indic__nuevo', 'indic__lista']) {
      expect(contenedor).toContain(bloque)
    }
  })

  it('no lleva estilos en línea: todas las medidas salen de la hoja común', async () => {
    // Los `style="margin:0; padding:12px…"` sueltos eran justo lo que descuadraba la
    // página respecto del resto: las medidas viven en admin.css, en tres variables.
    backend({ indicadores: [indicador()] })
    const html = await abrir()
    const cuerpo = html.slice(html.indexOf('<main'), html.indexOf('</main>'))
    expect(cuerpo).not.toMatch(/\sstyle="/)
    const fuente = readFileSync(
      join(process.cwd(), 'app/actions/admin/portal-indicadores-page.tsx'),
      'utf8',
    )
    expect(fuente).not.toMatch(/\sstyle=/)
  })
})

describe('Indicadores · formulario', () => {
  it('respeta los límites del backend en cada campo', async () => {
    backend()
    const html = await abrir()
    const maximo = (id: string) =>
      html.match(new RegExp(`<(?:input|textarea)[^>]*id="${id}"[^>]*maxlength="(\\d+)"`))?.[1]
    expect(maximo('nombre')).toBe('300')
    expect(maximo('unidad')).toBe('50')
    expect(maximo('fecha_evaluacion')).toBe('60')
    expect(maximo('descripcion')).toBe('5000')
    expect(maximo('resultado_texto')).toBe('5000')
    for (const n of [1, 2, 3]) expect(maximo(`periodo_${n}`)).toBe('60')
  })

  it('el nombre es obligatorio y los campos se rotulan con claridad', async () => {
    backend()
    const html = await abrir()
    expect(html).toMatch(/<input[^>]*id="nombre"[^>]*required/)
    expect(html).toMatch(/<label[^>]*for="fecha_evaluacion"[^>]*>Fecha de evaluación<\/label>/)
    expect(html).toMatch(/<label[^>]*for="resultado_texto"[^>]*>Resultado<\/label>/)
    expect(html).not.toContain('Resultado texto')
    expect(html).not.toContain('Fecha evaluación')
  })

  it('manda la intención de crear y conserva las tres mediciones', async () => {
    backend()
    const html = await abrir()
    expect(html).toMatch(/<input[^>]*name="intent"[^>]*value="crear"/)
    for (const n of [1, 2, 3]) {
      expect(html).toContain(`name="periodo_${n}"`)
      expect(html).toContain(`name="valor_${n}"`)
    }
  })

  it('el guardado lleva su palabra, sin el signo suelto que tenía', async () => {
    backend()
    const html = await abrir()
    expect(html).toContain('Guardar indicador')
    expect(html).not.toContain('＋')
  })

  it('ofrece como respaldo los documentos de actividades publicadas', async () => {
    backend({
      documentos: [
        {
          id: 'd1',
          actividad_id: 'a1',
          actividad_titulo: 'Foro de consulta',
          tipo: 'Acta',
          titulo: '',
          nombre_original: 'acta-foro.pdf',
        },
      ],
    })
    const html = await abrir()
    expect(html).toMatch(/<option[^>]*value="d1"[^>]*>[\s\S]*?Foro de consulta/)
  })
})

describe('Indicadores · estado del Programa', () => {
  it('en elaboración ofrece aprobar, con la pregunta de confirmación', async () => {
    backend({ aprobado: false })
    const html = await abrir()
    expect(html).toContain('Estado del Programa: en elaboración')
    expect(html).toMatch(/<input[^>]*name="aprobado"[^>]*value="1"/)
    expect(html).toContain(
      'data-confirmar="¿Marcar el Programa como aprobado y publicar «Seguimiento y evaluación»?"',
    )
    expect(html).toContain('Marcar como aprobado y publicar el seguimiento')
    expect(html).not.toContain('act-programa--aprobado')
  })

  it('aprobado ofrece volver a «en elaboración» y se pinta en verde', async () => {
    backend({ aprobado: true })
    const html = await abrir()
    expect(html).toContain('Estado del Programa: aprobado y en aplicación')
    expect(html).toMatch(/<input[^>]*name="aprobado"[^>]*value="0"/)
    expect(html).toContain(
      'data-confirmar="¿Retirar del portal la sección «Seguimiento y evaluación»?"',
    )
    expect(html).toContain('Volver a «en elaboración»')
    expect(html).toContain('act-programa--aprobado')
  })

  it('avisa cuando el estado se acaba de cambiar', async () => {
    backend({ aprobado: true })
    expect(await abrir('?ok=programa')).toContain('Estado del Programa actualizado en el portal.')
  })
})

describe('Indicadores · lista', () => {
  it('sin indicadores explica qué hacer y no dibuja una tabla vacía', async () => {
    backend()
    const html = await abrir()
    expect(html).toContain('No hay indicadores registrados')
    expect(html).toContain('vacio--compacto')
    expect(html).not.toContain('<table')
    expect(textoVisible(html.match(/<span class="conteo">([\s\S]*?)<\/span>/)?.[1] ?? '')).toBe('0')
  })

  it('cuenta los indicadores en el título', async () => {
    backend({ indicadores: [indicador(), indicador({ id: 'i-2', nombre: 'Otro' })] })
    const html = await abrir()
    expect(textoVisible(html.match(/<span class="conteo">([\s\S]*?)<\/span>/)?.[1] ?? '')).toBe('2')
  })

  it('muestra la meta con su unidad y la última medición con su periodo', async () => {
    backend({ indicadores: [indicador()] })
    const html = await abrir()
    const fila = filaCon(html, 'Cobertura de suelo')
    expect(textoVisible(celdaDe(fila, 'Meta'))).toBe('100 %')
    const ultima = textoVisible(celdaDe(fila, 'Última medición'))
    expect(ultima).toBe('45 % 2026')
    expect(textoVisible(celdaDe(fila, 'Evaluación'))).toBe('2026-12-31')
  })

  it('un indicador sin datos muestra guiones, no «null» ni «undefined»', async () => {
    backend({
      indicadores: [
        indicador({
          nombre: 'Vacío',
          descripcion: '',
          unidad: '',
          meta: null,
          fecha_evaluacion: null,
          mediciones: [],
        }),
      ],
    })
    const html = await abrir()
    const fila = filaCon(html, 'Vacío')
    for (const rotulo of ['Meta', 'Última medición', 'Evaluación', 'Respaldo']) {
      expect(textoVisible(celdaDe(fila, rotulo)), rotulo).toBe('—')
    }
    expect(html).not.toMatch(/null|undefined/)
  })

  it('tolera un backend que no manda las mediciones', async () => {
    const sin = indicador({ nombre: 'Sin lista' })
    delete (sin as Record<string, unknown>).mediciones
    backend({ indicadores: [sin] })
    const html = await abrir()
    expect(textoVisible(celdaDe(filaCon(html, 'Sin lista'), 'Última medición'))).toBe('—')
  })

  it('la meta puede venir como número o como texto', async () => {
    backend({ indicadores: [indicador({ nombre: 'Numérica', meta: 250, unidad: 'ha' })] })
    const html = await abrir()
    expect(textoVisible(celdaDe(filaCon(html, 'Numérica'), 'Meta'))).toBe('250 ha')
  })

  it('el respaldo se ve como un adjunto, con el nombre del documento en el tooltip', async () => {
    backend({
      indicadores: [
        indicador({ documento_respaldo: { id: 'd1', titulo: 'Informe de evaluación' } }),
      ],
    })
    const celda = celdaDe(filaCon(await abrir(), 'Cobertura de suelo'), 'Respaldo')
    expect(celda).toMatch(/title="Informe de evaluación"/)
    expect(textoVisible(celda)).toBe('Documento')
  })

  it('cada celda lleva su rótulo para la vista de tarjetas', async () => {
    backend({ indicadores: [indicador()] })
    const html = await abrir()
    for (const rotulo of [
      'Indicador',
      'Meta',
      'Última medición',
      'Evaluación',
      'Respaldo',
      'Acciones',
    ]) {
      expect(html).toContain(`data-label="${rotulo}"`)
    }
  })
})

describe('Indicadores · eliminar', () => {
  it('«Eliminar» dice lo que hace, en vez de un bote de basura sin palabra', async () => {
    backend({ indicadores: [indicador()] })
    const html = await abrir()
    const celda = celdaDe(filaCon(html, 'Cobertura de suelo'), 'Acciones')
    const boton = celda.match(/<button[\s\S]*?<\/button>/)?.[0] ?? ''
    expect(textoVisible(boton)).toBe('Eliminar')
    expect(boton).toContain('aria-label="Eliminar «Cobertura de suelo con ordenamiento vigente»"')
    expect(boton).toContain('btn--peligro')
    expect(html).not.toContain('🗑')
  })

  it('pregunta antes de borrar: antes se borraba al primer clic', async () => {
    backend({ indicadores: [indicador()] })
    const celda = celdaDe(filaCon(await abrir(), 'Cobertura de suelo'), 'Acciones')
    expect(celda).toContain(
      'data-confirmar="¿Eliminar el indicador «Cobertura de suelo con ordenamiento vigente» con todas sus mediciones? No se puede deshacer."',
    )
  })

  it('manda la intención de eliminar y el id de esa fila', async () => {
    backend({ indicadores: [indicador({ id: 'i-77' })] })
    const celda = celdaDe(filaCon(await abrir(), 'Cobertura de suelo'), 'Acciones')
    expect(celda).toMatch(/<input[^>]*name="intent"[^>]*value="eliminar"/)
    expect(celda).toMatch(/<input[^>]*name="id"[^>]*value="i-77"/)
  })

  it('un nombre con comillas o etiquetas no rompe el mensaje de confirmación', async () => {
    backend({ indicadores: [indicador({ nombre: 'Tasa "bruta" <b>x</b>' })] })
    const html = await abrir()
    expect(html).not.toContain('<b>x</b>')
    expect(html).toContain('&lt;b&gt;x&lt;/b&gt;')
  })
})
