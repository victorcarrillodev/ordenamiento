import { afterEach, beforeEach, describe, expect, it, spyOn } from 'bun:test'

import * as acuseDatos from './acuse-datos.ts'
import * as documentos from './documentos-participacion.ts'
import * as envios from './envios.ts'
import { asuntoRespuesta, textoRespuesta } from './mail.ts'
import { enviarRespuesta, nombreArchivoOficio, type DependenciasRespuesta } from './respuestas.ts'

const ID = '11111111-2222-4333-8444-555555555555'
const FOLIO = 'SPAGU-DGTPU-E-0018'

const expediente = {
  id: ID,
  folio: FOLIO,
  origen: 'digital',
  nombre: 'Ana Pérez',
  correo: 'ana@example.com',
} as acuseDatos.DatosParticipacion

let oficioCargado: Record<string, unknown> | null
let registrados: envios.NuevoEnvio[]
let restore: Array<() => void>

beforeEach(() => {
  oficioCargado = { id: 'doc-1', tipo: 'oficio', ruta_local: `${process.cwd()}/uploads/oficio.pdf` }
  registrados = []
  const datos = spyOn(acuseDatos, 'datosDeParticipacion').mockImplementation(
    (async () => expediente) as never,
  )
  const oficio = spyOn(documentos, 'obtenerDocumento').mockImplementation(
    (async () => oficioCargado) as never,
  )
  const registrar = spyOn(envios, 'registrarEnvio').mockImplementation((async (
    e: envios.NuevoEnvio,
  ) => {
    registrados.push(e)
    return { id: 'e-1', created_at: '2026-10-05T16:00:00.000Z', ...e } as never
  }) as never)
  restore = [() => datos.mockRestore(), () => oficio.mockRestore(), () => registrar.mockRestore()]
})
afterEach(() => restore.forEach((r) => r()))

function deps(cambios: Partial<DependenciasRespuesta> = {}) {
  const enviados: Array<Parameters<DependenciasRespuesta['enviarCorreo']>[0]> = []
  const base: DependenciasRespuesta = {
    correoConfigurado: () => true,
    enviarCorreo: async (entrada) => {
      enviados.push(entrada)
      return { asunto: asuntoRespuesta(entrada.folio) }
    },
    leerArchivo: async () => Buffer.from('%PDF-1.4 oficio'),
    ...cambios,
  }
  return { deps: base, enviados }
}

describe('textos acordados del correo de respuesta', () => {
  it('el asunto es «Respuesta a tu participación · Folio [folio]»', () => {
    expect(asuntoRespuesta(FOLIO)).toBe(`Respuesta a tu participación · Folio ${FOLIO}`)
  })

  it('el texto avisa dónde recoger la respuesta y que el oficio va adjunto', () => {
    expect(textoRespuesta(FOLIO)).toBe(
      `La respuesta correspondiente a su participación, registrada con el folio ${FOLIO}, se encuentra disponible para recoger en las oficinas de la Dirección de Gestión Territorial y Planeación Urbana. Se adjunta el oficio de respuesta en formato PDF.`,
    )
  })

  it('el oficio adjunto lleva el folio en su nombre', () => {
    expect(nombreArchivoOficio(FOLIO)).toBe(`Oficio de respuesta ${FOLIO}.pdf`)
  })
})

describe('enviarRespuesta', () => {
  it('envía el oficio íntegro al correo REGISTRADO, con el folio y el oficio como adjunto', async () => {
    const { deps: d, enviados } = deps()
    const r = await enviarRespuesta(ID, 'admin-1', d)
    expect(r.ok).toBe(true)
    expect(enviados).toHaveLength(1)
    expect(enviados[0]).toMatchObject({
      para: 'ana@example.com',
      folio: FOLIO,
      nombreArchivo: `Oficio de respuesta ${FOLIO}.pdf`,
    })
    expect(enviados[0].oficio.toString()).toContain('%PDF-1.4 oficio')
  })

  it('deja constancia del envío con su resultado, destino, asunto y quién lo hizo', async () => {
    const { deps: d } = deps()
    await enviarRespuesta(ID, 'admin-1', d)
    expect(registrados).toEqual([
      {
        participationId: ID,
        tipo: 'respuesta',
        para: 'ana@example.com',
        asunto: `Respuesta a tu participación · Folio ${FOLIO}`,
        resultado: 'enviado',
        detalle: '',
        enviadoPor: 'admin-1',
      },
    ])
  })

  it('sin el oficio cargado no envía nada y pide cargarlo', async () => {
    oficioCargado = null
    const { deps: d, enviados } = deps()
    const r = await enviarRespuesta(ID, 'admin-1', d)
    expect(r).toMatchObject({ ok: false, status: 409 })
    expect(enviados).toEqual([])
    expect(registrados).toEqual([])
  })

  it('una participación inexistente es 404', async () => {
    spyOn(acuseDatos, 'datosDeParticipacion').mockResolvedValue(null)
    const { deps: d } = deps()
    expect(await enviarRespuesta(ID, 'admin-1', d)).toMatchObject({ ok: false, status: 404 })
  })

  it('si el servidor rechaza el correo, lo registra como error con su motivo y NO marca notificada', async () => {
    const { deps: d } = deps({
      enviarCorreo: async () => {
        throw new Error('550 5.1.1 El buzón\nno existe')
      },
    })
    const r = await enviarRespuesta(ID, 'admin-1', d)
    expect(r).toMatchObject({ ok: false, status: 502 })
    if (!r.ok) expect(r.error).toContain('550 5.1.1 El buzón no existe')
    expect(registrados).toHaveLength(1)
    expect(registrados[0]).toMatchObject({
      resultado: 'error',
      detalle: '550 5.1.1 El buzón no existe',
    })
  })

  it('sin SMTP configurado lo dice y también lo registra', async () => {
    const { deps: d, enviados } = deps({ correoConfigurado: () => false })
    const r = await enviarRespuesta(ID, 'admin-1', d)
    expect(r).toMatchObject({ ok: false, status: 503 })
    expect(enviados).toEqual([])
    expect(registrados[0]).toMatchObject({ resultado: 'error' })
  })

  it('si el archivo del oficio ya no está en disco, es un error registrado, no un 500', async () => {
    const { deps: d } = deps({
      leerArchivo: async () => {
        throw new Error('ENOENT: no such file')
      },
    })
    const r = await enviarRespuesta(ID, 'admin-1', d)
    expect(r).toMatchObject({ ok: false, status: 502 })
    expect(registrados[0]).toMatchObject({ resultado: 'error' })
  })

  it('una ruta de oficio fuera de uploads/ no se lee', async () => {
    oficioCargado = { id: 'doc-1', tipo: 'oficio', ruta_local: '/etc/passwd' }
    let leyo = false
    const { deps: d } = deps({
      leerArchivo: async () => {
        leyo = true
        return Buffer.alloc(0)
      },
    })
    const r = await enviarRespuesta(ID, 'admin-1', d)
    expect(r.ok).toBe(false)
    expect(leyo).toBe(false)
  })
})

describe('detalle de un error de envío', () => {
  it('es de una línea y de largo acotado', () => {
    const d = envios.detalleDeError(new Error(`${'x'.repeat(500)}\n\r otro`))
    expect(d).not.toContain('\n')
    expect(d.length).toBeLessThanOrEqual(300)
    expect(envios.detalleDeError('texto plano')).toBe('texto plano')
  })
})
