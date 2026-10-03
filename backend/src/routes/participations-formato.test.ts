import { afterEach, beforeEach, describe, expect, it, spyOn } from 'bun:test'

import * as pool from '../db/pool.ts'
import * as documentos from '../services/documentos-participacion.ts'
import * as folios from '../services/folio.ts'
import * as formatos from '../services/formatos.ts'
import * as mail from '../services/mail.ts'
import { handleCreateParticipation } from './participations.ts'

const ADMIN = { id: 'a1', name: 'Admin', email: 'admin@example.com', role: 'admin' }
const FORMATO_ID = '11111111-2222-4333-8444-555555555555'
const PDF = new Uint8Array(
  Buffer.from(
    '%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj\n3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 200 200]>>endobj\ntrailer<</Root 1 0 R/Size 4>>\n%%EOF\n',
  ),
)

let capturado: { columnas: Record<string, unknown>; documentos: unknown[]; marcados: unknown[] }
let formatoDevuelto: formatos.Formato | null
let restore: Array<() => void>
let folioNuevo: ReturnType<typeof spyOn>

const pendiente = (cambios: Partial<formatos.Formato> = {}): formatos.Formato => ({
  id: FORMATO_ID,
  folio: 'SPAGU-DGTPU-E-0021',
  created_at: '2026-10-02T00:00:00Z',
  generado_por: 'Admin',
  participation_id: null,
  recibido_en: null,
  pendiente: true,
  ...cambios,
})

beforeEach(() => {
  capturado = { columnas: {}, documentos: [], marcados: [] }
  formatoDevuelto = pendiente()
  const tx = Object.assign(
    (query: TemplateStringsArray, ...values: unknown[]) => {
      const columnas =
        query
          .join('?')
          .match(/INSERT INTO participations \(([\s\S]*?)\)/)?.[1]
          .split(',')
          .map((v) => v.trim()) ?? []
      for (let i = 0; i < columnas.length; i++) capturado.columnas[columnas[i]] = values[i]
      return Promise.resolve([{ id: '00000000-0000-4000-8000-000000000001' }])
    },
    { unsafe: () => Promise.resolve([]) },
  )
  const begin = spyOn(pool.sql, 'begin').mockImplementation(((
    trabajo: (db: typeof tx) => Promise<unknown>,
  ) => trabajo(tx)) as never)
  restore = [() => begin.mockRestore()]
  folioNuevo = spyOn(folios, 'nextFolio').mockResolvedValue('NO-DEBE-USARSE')
  const correo = spyOn(mail, 'mailConfigurado').mockReturnValue(false)
  const obtener = spyOn(formatos, 'obtenerFormato').mockImplementation(
    (async () => formatoDevuelto) as never,
  )
  const marcar = spyOn(formatos, 'marcarFormatoRecibido').mockImplementation((async (
    _db: unknown,
    formatoId: string,
    participacionId: string,
  ) => {
    capturado.marcados.push({ formatoId, participacionId })
    return true
  }) as never)
  const escribir = spyOn(documentos, 'escribirPdf').mockResolvedValue('/tmp/uploads/escaneado.pdf')
  const guardar = spyOn(documentos, 'guardarDocumento').mockImplementation((async (
    _db: unknown,
    participacionId: string,
    tipo: string,
    datos: unknown,
  ) => {
    capturado.documentos.push({ participacionId, tipo, datos })
    return { documento: {}, rutaAnterior: null }
  }) as never)
  restore.push(
    () => folioNuevo.mockRestore(),
    () => correo.mockRestore(),
    () => obtener.mockRestore(),
    () => marcar.mockRestore(),
    () => escribir.mockRestore(),
    () => guardar.mockRestore(),
  )
})
afterEach(() => restore.forEach((fn) => fn()))

function formulario(extra: Record<string, string | File> = {}) {
  const data = new FormData()
  data.set('nombre', 'Persona de ventanilla')
  data.set('correo', 'persona@example.com')
  data.set('origen', 'fisica')
  data.set('alcance_ubicacion', 'municipio')
  data.set('observacion', 'Propuesta escrita a mano')
  for (const [clave, valor] of Object.entries(extra)) data.set(clave, valor)
  return data
}

const escaneado = () => new File([PDF], 'formato escaneado.pdf', { type: 'application/pdf' })

function enviar(data: FormData, etapa: 'pendiente' | 'abierta' | 'concluida' = 'abierta') {
  return handleCreateParticipation(
    new Request('http://local/api/participations', { method: 'POST', body: data }),
    ADMIN as never,
    async () => etapa,
  )
}

describe('registrar una participación desde un formato llenado a mano', () => {
  it('usa el MISMO folio del formato y no genera uno nuevo', async () => {
    const res = await enviar(formulario({ formato_id: FORMATO_ID, escaneado: escaneado() }))
    expect(res.status).toBe(201)
    expect((await res.json()) as { folio: string }).toMatchObject({ folio: 'SPAGU-DGTPU-E-0021' })
    expect(capturado.columnas.folio).toBe('SPAGU-DGTPU-E-0021')
    expect(folioNuevo).not.toHaveBeenCalled()
  })

  it('el formato deja de estar pendiente y su escaneado queda ligado al folio', async () => {
    await enviar(formulario({ formato_id: FORMATO_ID, escaneado: escaneado() }))
    expect(capturado.marcados).toEqual([
      { formatoId: FORMATO_ID, participacionId: '00000000-0000-4000-8000-000000000001' },
    ])
    expect(capturado.documentos).toHaveLength(1)
    expect(capturado.documentos[0]).toMatchObject({
      participacionId: '00000000-0000-4000-8000-000000000001',
      tipo: 'formato_escaneado',
      datos: { nombreOriginal: 'formato escaneado.pdf', rutaLocal: '/tmp/uploads/escaneado.pdf' },
    })
  })

  it('se identifica como captura manuscrita; la asistida, como asistida', async () => {
    await enviar(formulario({ formato_id: FORMATO_ID, escaneado: escaneado() }))
    expect(capturado.columnas.captura).toBe('manuscrita')
    expect(capturado.columnas.origen).toBe('fisica')

    capturado.columnas = {}
    await enviar(formulario())
    expect(capturado.columnas.captura).toBe('asistida')
  })

  it('una digital no lleva captura', async () => {
    const data = formulario()
    data.set('origen', 'digital')
    data.set('consentimiento', '1')
    await handleCreateParticipation(
      new Request('http://local/api/participations', { method: 'POST', body: data }),
      null,
      async () => 'abierta',
    )
    expect(capturado.columnas.captura).toBe('')
  })

  it('sin el escaneado no se registra: quedaría una participación sin su documento', async () => {
    const res = await enviar(formulario({ formato_id: FORMATO_ID }))
    expect(res.status).toBe(422)
    expect(await res.json()).toEqual({ error: 'Carga el formato escaneado en PDF' })
    expect(capturado.columnas).toEqual({})
    expect(capturado.marcados).toEqual([])
  })

  it('el escaneado debe ser un PDF', async () => {
    const res = await enviar(
      formulario({
        formato_id: FORMATO_ID,
        escaneado: new File(['no soy pdf'], 'formato.pdf', { type: 'application/pdf' }),
      }),
    )
    expect(res.status).toBe(415)
    expect(capturado.columnas).toEqual({})
    const otraExtension = await enviar(
      formulario({
        formato_id: FORMATO_ID,
        escaneado: new File([PDF], 'formato.docx'),
      }),
    )
    expect(otraExtension.status).toBe(415)
  })

  it('un formato que ya se registró se rechaza con 409', async () => {
    formatoDevuelto = pendiente({ pendiente: false, participation_id: 'ya-existe' })
    const res = await enviar(formulario({ formato_id: FORMATO_ID, escaneado: escaneado() }))
    expect(res.status).toBe(409)
    expect(capturado.columnas).toEqual({})
  })

  it('un formato inexistente o un id que no es UUID se rechaza', async () => {
    formatoDevuelto = null
    expect(
      (await enviar(formulario({ formato_id: FORMATO_ID, escaneado: escaneado() }))).status,
    ).toBe(404)
    expect(
      (await enviar(formulario({ formato_id: 'no-es-uuid', escaneado: escaneado() }))).status,
    ).toBe(400)
  })

  it('dos capturas simultáneas del mismo formato: la segunda pierde y no deja participación', async () => {
    spyOn(formatos, 'marcarFormatoRecibido').mockResolvedValue(false)
    const res = await enviar(formulario({ formato_id: FORMATO_ID, escaneado: escaneado() }))
    expect(res.status).toBe(409)
    expect(await res.json()).toEqual({ error: expect.stringContaining('ya se registró') })
    expect(capturado.documentos).toEqual([])
  })

  it('un formato generado con la consulta abierta se registra aunque ya haya concluido', async () => {
    const res = await enviar(
      formulario({ formato_id: FORMATO_ID, escaneado: escaneado() }),
      'concluida',
    )
    expect(res.status).toBe(201)
  })

  it('pero una captura nueva, sin formato, no se recibe una vez concluida', async () => {
    expect((await enviar(formulario(), 'concluida')).status).toBe(403)
  })

  it('un formato solo puede venir de una participación presencial', async () => {
    const data = formulario({ formato_id: FORMATO_ID, escaneado: escaneado() })
    data.set('origen', 'digital')
    data.set('consentimiento', '1')
    const res = await handleCreateParticipation(
      new Request('http://local/api/participations', { method: 'POST', body: data }),
      null,
      async () => 'abierta',
    )
    expect(res.status).toBe(400)
  })

  it('sin sesión de panel no se registra ni siquiera con un formato válido', async () => {
    const res = await handleCreateParticipation(
      new Request('http://local/api/participations', {
        method: 'POST',
        body: formulario({ formato_id: FORMATO_ID, escaneado: escaneado() }),
      }),
      null,
      async () => 'abierta',
    )
    expect(res.status).toBe(403)
    expect(capturado.marcados).toEqual([])
  })
})
