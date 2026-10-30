/**
 * Lista de «Actividades y avances»: la tabla, sus acciones (el botón rojo que no decía
 * qué hacía), la búsqueda, el estado vacío y los avisos de fecha.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { router } from '../../router.ts'

const ORIGINAL_FETCH = globalThis.fetch
const ID = '550e8400-e29b-41d4-a716-446655440001'
const AID = '550e8400-e29b-41d4-a716-446655440077'

/** «Hoy» para toda la prueba: 10 de octubre de 2026, mediodía en Tlaquepaque. */
const AHORA = new Date('2026-10-10T18:00:00Z')

function actividad(extra: Record<string, unknown> = {}) {
  return {
    id: ID,
    titulo: 'Foro de consulta pública',
    fase: 'Formulación',
    tipo: 'Foro',
    estado: 'programada',
    fecha: '2026-10-13',
    hora_inicio: '17:00',
    hora_fin: '19:00',
    lugar: 'Casa de la Cultura',
    direccion: '',
    latitud: '',
    longitud: '',
    descripcion: '',
    resultados: '',
    acuerdos: '',
    publicacion: 'publicado',
    aviso_activo: false,
    aviso_titulo: '',
    aviso_descripcion: '',
    aviso_inicio: null,
    aviso_fin: null,
    created_at: '',
    updated_at: '',
    total_archivos: 0,
    visibilidad: {
      proximas: true,
      calendario: true,
      avances: false,
      aviso: 'sin_aviso',
      fechaPasada: false,
    },
    ...extra,
  }
}

const RESUMEN = {
  total: 3,
  proximas: 2,
  realizadas: 1,
  borradores: 0,
  avisosVigentes: 0,
  avisos: [],
}

/** URLs que se pidieron al backend, para comprobar qué filtros viajan. */
let pedidas: string[] = []

function backend(actividades: unknown[], resumen: unknown = RESUMEN, edicion?: unknown) {
  pedidas = []
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
    if (url.includes('/api/actividades/gestion/')) return json({ actividad: edicion ?? null })
    if (url.includes('/api/actividades/gestion')) {
      pedidas.push(url)
      return json({ actividades, resumen })
    }
    return json({ ok: true })
  }) as unknown as typeof fetch
}

async function abrir(ruta = ''): Promise<string> {
  const res = await router.fetch(new Request(`http://localhost/ordena/admin/actividades${ruta}`))
  expect(res?.status).toBe(200)
  return (await res?.text()) ?? ''
}

/** La fila (`<tr>`) del cuerpo de la tabla que contiene ese texto. */
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

/** Texto visible de un fragmento: sin etiquetas ni lo que solo oyen los lectores. */
function textoVisible(html: string): string {
  return html
    .replace(/<span class="solo-lector">[\s\S]*?<\/span>/g, '')
    .replace(/<svg[\s\S]*?<\/svg>/g, '')
    .replace(/<[^>]+>/g, '')
    .replace(/&[a-z]+;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

beforeEach(() => {
  vi.restoreAllMocks()
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(AHORA)
})
afterEach(() => {
  vi.useRealTimers()
  globalThis.fetch = ORIGINAL_FETCH
})

describe('Actividades · tabla', () => {
  it('tiene las columnas que importan, rotuladas para la vista de tarjetas', async () => {
    backend([actividad()])
    const html = await abrir()
    for (const rotulo of ['Fecha', 'Actividad', 'Estado', 'Publicación', 'Acciones']) {
      expect(html).toMatch(new RegExp(`<th[^>]*scope="col"[^>]*>\\s*${rotulo}\\s*</th>`))
      expect(html).toContain(`data-label="${rotulo}"`)
    }
    // El conteo de archivos ya no ocupa una columna: va junto al título.
    expect(html).not.toMatch(/<th[^>]*>\s*Archivos\s*<\/th>/)
  })

  it('el título enlaza a la edición y debajo van el tipo y la fase', async () => {
    backend([actividad()])
    const celda = celdaDe(filaCon(await abrir(), 'Foro de consulta pública'), 'Actividad')
    expect(celda).toMatch(
      new RegExp(`<a[^>]*href="[^"]*/admin/actividades/${ID}"[^>]*>Foro de consulta pública</a>`),
    )
    expect(celda).toContain('Foro · Formulación')
  })

  it('cada estado y cada publicación lleva su icono además de su color', async () => {
    backend([
      actividad({ id: 'a1', titulo: 'A1', estado: 'programada', publicacion: 'publicado' }),
      actividad({ id: 'a2', titulo: 'A2', estado: 'realizada', publicacion: 'borrador' }),
      actividad({ id: 'a3', titulo: 'A3', estado: 'reprogramada', publicacion: 'oculto' }),
      actividad({ id: 'a4', titulo: 'A4', estado: 'cancelada', publicacion: 'publicado' }),
    ])
    const html = await abrir()
    for (const titulo of ['A1', 'A2', 'A3', 'A4']) {
      const fila = filaCon(html, `>${titulo}<`)
      expect(celdaDe(fila, 'Estado')).toMatch(/<svg[\s\S]*<\/svg>/)
      expect(celdaDe(fila, 'Publicación')).toMatch(/<svg[\s\S]*<\/svg>/)
    }
    expect(textoVisible(celdaDe(filaCon(html, '>A3<'), 'Estado'))).toBe('Reprogramada')
    expect(textoVisible(celdaDe(filaCon(html, '>A3<'), 'Publicación'))).toContain('Oculto')
  })

  it('dice dónde aparece en el portal o que no aparece', async () => {
    backend([
      actividad({ id: 'a1', titulo: 'Visible' }),
      actividad({
        id: 'a2',
        titulo: 'Borrador',
        publicacion: 'borrador',
        visibilidad: {
          proximas: false,
          calendario: false,
          avances: false,
          aviso: 'sin_aviso',
          fechaPasada: false,
        },
      }),
    ])
    const html = await abrir()
    expect(textoVisible(celdaDe(filaCon(html, '>Visible<'), 'Publicación'))).toContain(
      'Próximas · Calendario',
    )
    expect(textoVisible(celdaDe(filaCon(html, '>Borrador<'), 'Publicación'))).toContain(
      'No aparece en el portal',
    )
  })

  it('un aviso vigente se ve junto a la publicación', async () => {
    backend([
      actividad({
        aviso_activo: true,
        visibilidad: {
          proximas: true,
          calendario: true,
          avances: false,
          aviso: 'vigente',
          fechaPasada: false,
        },
      }),
    ])
    const celda = celdaDe(filaCon(await abrir(), 'Foro de consulta pública'), 'Publicación')
    expect(celda).toContain('act-aviso-chip--vigente')
    expect(textoVisible(celda)).toContain('Aviso vigente')
  })

  it('cuenta los archivos junto al título y no pinta nada si no hay', async () => {
    backend([
      actividad({ id: 'a1', titulo: 'Con archivos', total_archivos: 2 }),
      actividad({ id: 'a2', titulo: 'Sin archivos' }),
    ])
    const html = await abrir()
    const con = celdaDe(filaCon(html, 'Con archivos'), 'Actividad')
    expect(con).toContain('archivos--mini')
    expect(con).toContain('<span class="solo-lector">2 archivos</span>')
    expect(celdaDe(filaCon(html, 'Sin archivos'), 'Actividad')).not.toContain('archivos--mini')
  })

  it('la actividad que ya pasó pero sigue programada avisa, con un enlace a la edición', async () => {
    backend([
      actividad({
        fecha: '2026-10-01',
        visibilidad: {
          proximas: false,
          calendario: true,
          avances: false,
          aviso: 'sin_aviso',
          fechaPasada: true,
        },
      }),
    ])
    const celda = celdaDe(filaCon(await abrir(), 'Foro de consulta pública'), 'Actividad')
    expect(celda).toMatch(
      new RegExp(`<a[^>]*href="[^"]*/admin/actividades/${ID}"[^>]*class="act-alerta"`),
    )
    expect(textoVisible(celda)).toContain('La fecha ya pasó: actualiza su estado')
  })
})

describe('Actividades · cuánto falta', () => {
  const fila = async (extra: Record<string, unknown>) => {
    backend([actividad(extra)])
    return celdaDe(filaCon(await abrir(), 'Foro de consulta pública'), 'Fecha')
  }

  it.each([
    ['2026-10-10', 'Hoy'],
    ['2026-10-11', 'Mañana'],
    ['2026-10-13', 'En 3 días'],
    ['2026-10-24', 'En 2 semanas'],
  ])('una actividad programada el %s dice «%s»', async (fecha, texto) => {
    expect(textoVisible(await fila({ fecha }))).toContain(texto)
  })

  it('no lo dice si falta más de dos semanas', async () => {
    expect(await fila({ fecha: '2026-10-25' })).not.toContain('act-pronto')
  })

  it('no lo dice de lo ya realizado, lo cancelado ni lo pasado', async () => {
    expect(await fila({ estado: 'realizada', fecha: '2026-10-12' })).not.toContain('act-pronto')
    expect(await fila({ estado: 'cancelada', fecha: '2026-10-12' })).not.toContain('act-pronto')
    expect(await fila({ fecha: '2026-10-05' })).not.toContain('act-pronto')
  })

  it('«Hoy» y «Mañana» se marcan con más urgencia que «En 5 días»', async () => {
    expect(await fila({ fecha: '2026-10-10' })).toContain('act-pronto act-pronto--ya')
    expect(await fila({ fecha: '2026-10-11' })).toContain('act-pronto act-pronto--ya')
    expect(await fila({ fecha: '2026-10-15' })).not.toContain('act-pronto--ya')
  })

  it('toma «hoy» en la hora de Tlaquepaque, no la del servidor', async () => {
    // 03:00 UTC del 11 de octubre son las 21:00 del 10 en Tlaquepaque.
    vi.setSystemTime(new Date('2026-10-11T03:00:00Z'))
    expect(textoVisible(await fila({ fecha: '2026-10-11' }))).toContain('Mañana')
  })

  it('escribe el horario con la hora «h»', async () => {
    expect(textoVisible(await fila({ hora_inicio: '17:00', hora_fin: '19:00' }))).toContain(
      '17:00 – 19:00 h',
    )
  })
})

describe('Actividades · acciones', () => {
  it('«Eliminar» dice lo que hace: lleva su palabra, no solo un bote de basura', async () => {
    backend([actividad()])
    const celda = celdaDe(filaCon(await abrir(), 'Foro de consulta pública'), 'Acciones')
    const boton = celda.match(/<button[\s\S]*?<\/button>/)?.[0] ?? ''
    expect(boton).not.toBe('')
    expect(textoVisible(boton)).toBe('Eliminar')
    expect(boton).toContain('aria-label="Eliminar «Foro de consulta pública»"')
    expect(boton).toContain('title="Eliminar «Foro de consulta pública»"')
    // De contorno rojo, no un bloque sólido.
    expect(boton).toContain('btn--peligro')
  })

  it('ningún botón de la tabla es solo un icono sin texto', async () => {
    backend([actividad({ total_archivos: 1 }), actividad({ id: 'a2', titulo: 'Otra' })])
    const html = await abrir()
    const cuerpo = html.slice(html.indexOf('<tbody'), html.indexOf('</tbody>'))
    for (const boton of cuerpo.match(/<button[\s\S]*?<\/button>/g) ?? []) {
      expect(textoVisible(boton), boton).not.toBe('')
    }
  })

  it('pregunta antes de borrar, con el título, y avisa de los archivos si los hay', async () => {
    backend([
      actividad({ id: 'a1', titulo: 'Con archivos', total_archivos: 3 }),
      actividad({ id: 'a2', titulo: 'Sin archivos' }),
    ])
    const html = await abrir()
    expect(filaCon(html, 'Con archivos')).toContain(
      'data-confirmar="¿Eliminar «Con archivos» y todos sus archivos? No se puede deshacer."',
    )
    const sin = filaCon(html, 'Sin archivos')
    expect(sin).toContain('data-confirmar="¿Eliminar «Sin archivos»? No se puede deshacer."')
    expect(sin).not.toContain('archivos?')
  })

  it('el formulario de borrar manda la intención y el id de esa fila', async () => {
    backend([actividad()])
    const celda = celdaDe(filaCon(await abrir(), 'Foro de consulta pública'), 'Acciones')
    expect(celda).toMatch(/<input[^>]*name="intent"[^>]*value="eliminar"/)
    expect(celda).toMatch(new RegExp(`<input[^>]*name="id"[^>]*value="${ID}"`))
    expect(celda).toMatch(/<form[^>]*method="post"/)
  })

  it('«Editar» lleva el título en su nombre accesible', async () => {
    backend([actividad()])
    const celda = celdaDe(filaCon(await abrir(), 'Foro de consulta pública'), 'Acciones')
    expect(celda).toContain('aria-label="Editar «Foro de consulta pública»"')
    expect(textoVisible(celda)).toContain('Editar')
  })

  it('«Portal» solo se ofrece para lo publicado y abre en otra pestaña sin dar acceso a la ventana', async () => {
    backend([
      actividad({ id: 'a1', titulo: 'Publicada' }),
      actividad({ id: 'a2', titulo: 'En borrador', publicacion: 'borrador' }),
      actividad({ id: 'a3', titulo: 'Oculta', publicacion: 'oculto' }),
    ])
    const html = await abrir()
    const publicada = celdaDe(filaCon(html, '>Publicada<'), 'Acciones')
    const enlace = publicada.match(/<a[^>]*href="[^"]*\/poetdum\/actividades\/a1"[^>]*>/)?.[0] ?? ''
    expect(enlace).toContain('target="_blank"')
    expect(enlace).toContain('rel="noopener"')
    expect(enlace).toContain('aria-label="Ver «Publicada» en el portal (se abre en otra pestaña)"')
    expect(publicada).toMatch(/<span class="btn__texto">Portal<\/span>/)
    expect(celdaDe(filaCon(html, '>En borrador<'), 'Acciones')).not.toContain('/poetdum/')
    expect(celdaDe(filaCon(html, '>Oculta<'), 'Acciones')).not.toContain('/poetdum/')
  })
})

describe('Actividades · búsqueda y filtros', () => {
  const tres = [
    actividad({
      id: 'a1',
      titulo: 'Sesión de Cabildo para la aprobación del Programa',
      tipo: 'Sesión de Cabildo',
    }),
    actividad({ id: 'a2', titulo: 'Foro de consulta pública' }),
    actividad({ id: 'a3', titulo: 'Taller sectorial de diagnóstico', tipo: 'Taller' }),
  ]

  it('busca sin distinguir acentos y no manda el texto al backend', async () => {
    backend(tres)
    const html = await abrir('?q=sesion')
    expect(html).toContain('Sesión de Cabildo para la aprobación del Programa')
    expect(html).not.toContain('Foro de consulta pública')
    expect(html).not.toContain('Taller sectorial')
    expect(html).toContain('value="sesion"')
    expect(new URL(pedidas[0]).searchParams.has('q')).toBe(false)
    expect(textoVisible(html)).toContain('Mostrando 1 de 3 actividades')
  })

  it('una búsqueda de una sola letra no filtra', async () => {
    backend(tres)
    const html = await abrir('?q=s')
    expect(html).toContain('Foro de consulta pública')
    expect(html).toContain('Taller sectorial')
    expect(html).not.toContain('Limpiar')
  })

  it('manda al backend estado, publicación y fase, y los deja elegidos en los selectores', async () => {
    backend(tres)
    const html = await abrir('?estado=programada&publicacion=borrador&fase=Ejecuci%C3%B3n')
    const consulta = new URL(pedidas[0]).searchParams
    expect(consulta.get('estado')).toBe('programada')
    expect(consulta.get('publicacion')).toBe('borrador')
    expect(consulta.get('fase')).toBe('Ejecución')
    expect(html).toMatch(/<option[^>]*value="programada"[^>]*selected/)
    expect(html).toMatch(/<option[^>]*value="borrador"[^>]*selected/)
    expect(html).toMatch(/<option[^>]*value="Ejecución"[^>]*selected/)
  })

  it('con algún filtro aparece «Limpiar»; sin filtros no', async () => {
    backend(tres)
    expect(await abrir()).not.toContain('Limpiar')
    backend(tres)
    expect(await abrir('?estado=realizada')).toContain('Limpiar')
  })

  it('sin filtros el pie cuenta las actividades en singular o plural', async () => {
    backend([actividad()], { ...RESUMEN, total: 1 })
    expect(textoVisible(await abrir())).toContain('1 actividad')
    backend(tres)
    expect(textoVisible(await abrir())).toContain('3 actividades')
  })

  it('escapa el texto buscado al devolverlo en el campo', async () => {
    backend(tres)
    const html = await abrir(`?q=${encodeURIComponent('"><script>alert(1)</script>')}`)
    expect(html).not.toContain('<script>alert(1)</script>')
  })
})

describe('Actividades · estado vacío', () => {
  it('sin actividades invita a registrar la primera', async () => {
    backend([], { ...RESUMEN, total: 0 })
    const html = await abrir()
    expect(html).toContain('Todavía no hay actividades')
    expect(html).not.toContain('<table')
    expect(html).toMatch(/href="[^"]*\/admin\/actividades\/nueva"[^>]*>[\s\S]*?Agregar actividad/)
  })

  it('con filtros que no encuentran nada ofrece quitarlos', async () => {
    backend([])
    const html = await abrir('?estado=cancelada')
    expect(html).toContain('Ninguna actividad coincide')
    expect(html).toMatch(/href="[^"]*\/admin\/actividades"[^>]*>[\s\S]*?Quitar filtros/)
    expect(html).not.toContain('<table')
  })

  it('una búsqueda sin resultados también lo dice', async () => {
    backend([actividad()])
    const html = await abrir('?q=zzzz')
    expect(html).toContain('Ninguna actividad coincide')
  })
})

describe('Actividad · archivos de la ficha', () => {
  const conArchivo = actividad({
    total_archivos: 1,
    archivos: [
      {
        id: AID,
        actividad_id: ID,
        tipo: 'Acta',
        titulo: '',
        nombre_original: 'acta.pdf',
        mime: 'application/pdf',
        size: 2048,
        created_at: '',
      },
    ],
  })

  it('quitar y guardar el tipo llevan su palabra, no solo un icono', async () => {
    backend([], RESUMEN, conArchivo)
    const res = await router.fetch(new Request(`http://localhost/ordena/admin/actividades/${ID}`))
    expect(res?.status).toBe(200)
    const html = (await res?.text()) ?? ''
    const fila = html.match(/<li[^>]*class="act-archivo"[\s\S]*?<\/li>/)?.[0] ?? ''
    expect(fila).not.toBe('')
    for (const boton of fila.match(/<button[\s\S]*?<\/button>/g) ?? []) {
      expect(textoVisible(boton), boton).not.toBe('')
    }
    expect(fila).toContain('aria-label="Quitar «acta.pdf»"')
    expect(fila).toContain('aria-label="Guardar el tipo y el nombre de acta.pdf"')
    expect(fila).toContain(
      'data-confirmar="¿Quitar «acta.pdf» de la actividad? El archivo se elimina."',
    )
    expect(fila).toMatch(new RegExp(`<input[^>]*name="aid"[^>]*value="${AID}"`))
  })
})
