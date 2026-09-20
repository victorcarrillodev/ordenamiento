import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { router } from '../../router.ts'

/**
 * Panel · «Actividades y avances del Programa»: lo que el controller manda al
 * backend y cómo responde. El backend se simula; sus reglas tienen sus propias
 * pruebas en backend/src.
 */

const ORIGINAL_FETCH = globalThis.fetch
const ID = '550e8400-e29b-41d4-a716-446655440001'
const AID = '550e8400-e29b-41d4-a716-446655440077'

const ACTIVIDAD = {
  id: ID,
  titulo: 'Sesión de Cabildo para la aprobación del Programa',
  fase: 'Expedición',
  tipo: 'Sesión de Cabildo',
  estado: 'realizada',
  fecha: '2026-09-10',
  hora_inicio: '12:00',
  hora_fin: '14:00',
  lugar: 'Salón de Cabildo',
  direccion: '',
  latitud: '',
  longitud: '',
  descripcion: 'Presentación del proyecto.\nSegunda línea.',
  resultados: 'Aprobado por unanimidad.',
  acuerdos: '',
  publicacion: 'publicado',
  aviso_activo: true,
  aviso_titulo: 'Sesión de Cabildo',
  aviso_descripcion: 'Sesión pública',
  aviso_inicio: '2026-09-01',
  aviso_fin: '2026-09-10',
  created_at: '',
  updated_at: '',
  total_archivos: 1,
  visibilidad: {
    proximas: false,
    calendario: true,
    avances: true,
    aviso: 'vencido',
    fechaPasada: false,
  },
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
}

/** La lista del panel sin actividades (vista de lista o de calendario). */
const LISTA_VACIA = {
  'GET http://localhost:5920/api/actividades/gestion': {
    body: {
      actividades: [],
      resumen: {
        total: 0,
        proximas: 0,
        realizadas: 0,
        borradores: 0,
        avisosVigentes: 0,
        avisos: [],
      },
    },
  },
}

interface Llamada {
  url: string
  method: string
  body: BodyInit | null | undefined
}

/** Backend simulado: sesión de admin y respuestas por ruta. */
function mockBackend(respuestas: Record<string, { status?: number; body?: unknown }> = {}) {
  const llamadas: Llamada[] = []
  globalThis.fetch = vi
    .fn()
    .mockImplementation((url: string | URL | Request, init?: RequestInit) => {
      const u = typeof url === 'string' ? url : url instanceof Request ? url.url : url.toString()
      const method = init?.method ?? 'GET'
      llamadas.push({ url: u, method, body: init?.body })
      const json = (body: unknown, status = 200) =>
        Promise.resolve(
          new Response(JSON.stringify(body), {
            status,
            headers: { 'content-type': 'application/json' },
          }),
        )
      if (u.includes('/api/auth/me')) {
        return json({ user: { id: 'u1', name: 'Admin Prueba', role: 'admin' } })
      }
      for (const [clave, r] of Object.entries(respuestas)) {
        if (`${method} ${u}`.includes(clave)) return json(r.body ?? { ok: true }, r.status ?? 200)
      }
      if (u.includes(`/api/actividades/gestion/${ID}`)) return json({ actividad: ACTIVIDAD })
      return json({ ok: true })
    }) as unknown as typeof fetch
  return llamadas
}

function post(ruta: string, fd: FormData) {
  return router.fetch(new Request(`http://localhost${ruta}`, { method: 'POST', body: fd }))
}

function formularioValido(): FormData {
  const fd = new FormData()
  fd.set('titulo', 'Foro de consulta pública')
  fd.set('fase', 'Formulación')
  fd.set('tipo', 'Consulta pública')
  fd.set('estado', 'programada')
  fd.set('fecha', '2030-10-05')
  fd.set('publicacion', 'publicado')
  return fd
}

describe('Panel · actividades y avances', () => {
  beforeEach(() => vi.restoreAllMocks())
  afterEach(() => (globalThis.fetch = ORIGINAL_FETCH))

  it('alta: manda el multipart al backend y abre la edición del registro creado', async () => {
    const llamadas = mockBackend({
      'POST http://localhost:5920/api/actividades': { status: 201, body: { ok: true, id: ID } },
    })
    const fd = formularioValido()
    fd.set('documentos_tipo_0', 'Convocatoria')
    fd.append(
      'documentos_0',
      new File(['%PDF-1.4'], 'convocatoria.pdf', { type: 'application/pdf' }),
    )

    const res = await post('/ordena/admin/actividades/nueva', fd)
    expect(res?.status).toBe(302)
    expect(res?.headers.get('location')).toBe(`/ordena/admin/actividades/${ID}?ok=creada`)

    const alta = llamadas.find((l) => l.method === 'POST' && l.url.endsWith('/api/actividades'))
    const cuerpo = alta?.body as FormData
    expect(cuerpo.get('titulo')).toBe('Foro de consulta pública')
    expect(cuerpo.getAll('archivo_tipo')).toEqual(['Convocatoria'])
    expect((cuerpo.get('archivo') as File).name).toBe('convocatoria.pdf')
  })

  it('si el backend rechaza el alta, el formulario vuelve con lo capturado y el motivo', async () => {
    mockBackend({
      'POST http://localhost:5920/api/actividades': {
        status: 400,
        body: { error: 'La hora de conclusión debe ser posterior a la de inicio.' },
      },
    })
    const res = await post('/ordena/admin/actividades/nueva', formularioValido())
    expect(res?.status).toBe(400)
    const html = (await res?.text()) ?? ''
    expect(html).toContain('La hora de conclusión debe ser posterior a la de inicio.')
    expect(html).toContain('value="Foro de consulta pública"')
  })

  it('una fila de documentos sin tipo no llega al backend', async () => {
    const llamadas = mockBackend()
    const fd = formularioValido()
    fd.append('documentos_1', new File(['%PDF-1.4'], 'acta.pdf', { type: 'application/pdf' }))
    const res = await post('/ordena/admin/actividades/nueva', fd)
    expect(res?.status).toBe(400)
    expect(llamadas.some((l) => l.method === 'POST' && l.url.endsWith('/api/actividades'))).toBe(
      false,
    )
  })

  it('edición: el formulario sale con los datos del registro y dónde aparece', async () => {
    mockBackend()
    const res = await router.fetch(new Request(`http://localhost/ordena/admin/actividades/${ID}`))
    expect(res?.status).toBe(200)
    const html = (await res?.text()) ?? ''
    expect(html).toContain('value="Sesión de Cabildo para la aprobación del Programa"')
    expect(html).toMatch(/<option value="realizada" selected/)
    expect(html).toMatch(/<option value="Sesión de Cabildo" selected/)
    expect(html).toMatch(/id="aviso_activo"[^>]*checked/)
    expect(html).toContain('Aprobado por unanimidad.')
    expect(html).toContain('Dónde aparece hoy en el portal')
    expect(html).toContain('Avances del Programa')
    // El archivo cargado, con ver/descargar/quitar.
    expect(html).toContain(`/ordena/poetdum/archivos/${AID}`)
    expect(html).toContain('archivo_quitar')
  })

  it('guardar edita el mismo registro (PUT) y vuelve con el acuse', async () => {
    const llamadas = mockBackend()
    const fd = formularioValido()
    fd.set('estado', 'realizada')
    fd.set('resultados', 'Se recibieron 40 observaciones.')
    const res = await post(`/ordena/admin/actividades/${ID}`, fd)
    expect(res?.status).toBe(302)
    expect(res?.headers.get('location')).toBe(`/ordena/admin/actividades/${ID}?ok=guardada`)
    const put = llamadas.find((l) => l.method === 'PUT')
    expect(put?.url).toContain(`/api/actividades/${ID}`)
    expect((put?.body as FormData).get('resultados')).toBe('Se recibieron 40 observaciones.')
  })

  it('quitar un archivo manda el id codificado y confirma', async () => {
    const llamadas = mockBackend()
    const fd = new FormData()
    fd.set('intent', 'archivo_quitar')
    fd.set('aid', '../../users/1')
    const res = await post(`/ordena/admin/actividades/${ID}`, fd)
    expect(res?.headers.get('location')).toContain('ok=archivo_quitado')
    const borrado = llamadas.find((l) => l.method === 'DELETE')
    // Un id con barras no puede escaparse a otra ruta del backend.
    expect(borrado?.url).toContain('/api/actividades/archivos/..%2F..%2Fusers%2F1')
  })

  it('corregir el tipo de un archivo con un tipo inventado no llama al backend', async () => {
    const llamadas = mockBackend()
    const fd = new FormData()
    fd.set('intent', 'archivo_editar')
    fd.set('aid', AID)
    fd.set('tipo', 'Meme')
    const res = await post(`/ordena/admin/actividades/${ID}`, fd)
    expect(res?.headers.get('location')).toContain('error=archivo')
    expect(llamadas.some((l) => l.method === 'PATCH')).toBe(false)
  })

  it('enviar el aviso sin SMTP configurado lo explica', async () => {
    mockBackend({
      [`POST http://localhost:5920/api/actividades/${ID}/aviso/enviar`]: { status: 503 },
    })
    const fd = new FormData()
    fd.set('intent', 'enviar_aviso')
    fd.set('para', 'ciudadania@ejemplo.mx')
    const res = await post(`/ordena/admin/actividades/${ID}`, fd)
    expect(res?.headers.get('location')).toContain('error=correo_config')
  })

  it('eliminar desde la ficha vuelve a la lista con el acuse', async () => {
    mockBackend()
    const fd = new FormData()
    fd.set('intent', 'eliminar')
    const res = await post(`/ordena/admin/actividades/${ID}`, fd)
    expect(res?.headers.get('location')).toBe('/ordena/admin/actividades?ok=eliminada')
  })

  it('un error en la URL solo se muestra si es un código conocido', async () => {
    mockBackend(LISTA_VACIA)
    const inventado = await router.fetch(
      new Request('http://localhost/ordena/admin/actividades?error=Tu%20cuenta%20fue%20bloqueada'),
    )
    expect(await inventado?.text()).not.toContain('Tu cuenta fue bloqueada')

    const conocido = await router.fetch(
      new Request('http://localhost/ordena/admin/actividades?error=eliminar'),
    )
    expect(await conocido?.text()).toContain('No se pudo eliminar la actividad')
  })

  it('calendario: en años de 3 cifras conserva el mes; en los extremos no ofrece botón', async () => {
    const llamadas = mockBackend(LISTA_VACIA)
    const calendario = (mes: string) =>
      router
        .fetch(new Request(`http://localhost/ordena/admin/actividades?vista=calendario&mes=${mes}`))
        .then((res) => res?.text() ?? '')

    const enero100 = await calendario('0100-01')
    expect(llamadas.some((l) => l.url.includes('mes=0100-01'))).toBe(true)
    expect(enero100).toContain('mes=0100-02')
    expect(enero100).not.toContain('title="Mes anterior"')
    expect(enero100).toContain('cal-nav__btn--inactivo')

    const diciembre9999 = await calendario('9999-12')
    expect(diciembre9999).toContain('mes=9999-11')
    expect(diciembre9999).not.toContain('title="Mes siguiente"')
  })

  it('una actividad que ya no existe manda a la lista con el aviso', async () => {
    mockBackend({ [`GET http://localhost:5920/api/actividades/gestion/${ID}`]: { status: 404 } })
    const res = await router.fetch(new Request(`http://localhost/ordena/admin/actividades/${ID}`))
    expect(res?.status).toBe(302)
    expect(res?.headers.get('location')).toBe('/ordena/admin/actividades?error=no_encontrada')
  })
})
