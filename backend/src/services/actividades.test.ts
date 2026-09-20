import { afterEach, describe, expect, it, spyOn } from 'bun:test'
import { join } from 'node:path'

import * as pool from '../db/pool.ts'
import {
  actualizarArchivo,
  esFechaIso,
  esFotoWeb,
  FASES_PROGRAMA,
  hoyEnMexico,
  rangoDeMes,
  rutaEnUploads,
  TIPOS_ACTIVIDAD,
  TIPOS_ARCHIVO,
  validarActividad,
} from './actividades.ts'

const HOY = '2026-09-17'

/** Formulario mínimo válido; cada caso cambia solo lo que prueba. */
function formulario(cambios: Record<string, string | undefined> = {}) {
  return {
    titulo: 'Sesión del Comité',
    fase: 'Formulación',
    tipo: 'Sesión del Comité',
    estado: 'programada',
    fecha: '2026-10-01',
    ...cambios,
  }
}

function error(cambios: Record<string, string | undefined>): string {
  const r = validarActividad(formulario(cambios), HOY)
  if (r.ok) throw new Error('se esperaba un error de validación')
  return r.error
}

describe('catálogos del documento', () => {
  it('las cinco fases del Programa, en orden', () => {
    expect([...FASES_PROGRAMA]).toEqual([
      'Formulación',
      'Expedición',
      'Ejecución',
      'Evaluación',
      'Modificación',
    ])
  })

  it('incluye los tipos de actividad pedidos y «Otra»', () => {
    for (const tipo of [
      'Sesión del Comité',
      'Sesión del Consejo',
      'Sesión de Cabildo',
      'Foro',
      'Taller',
      'Reunión técnica',
      'Consulta pública',
      'Firma de convenio',
      'Aprobación',
      'Publicación de producto técnico',
      'Otra',
    ]) {
      expect(TIPOS_ACTIVIDAD).toContain(tipo as (typeof TIPOS_ACTIVIDAD)[number])
    }
  })

  it('los diez tipos de archivo', () => {
    expect(TIPOS_ARCHIVO).toHaveLength(10)
    expect(TIPOS_ARCHIVO).toContain('Fotografía')
    expect(TIPOS_ARCHIVO).toContain('Lista de asistencia')
  })
})

describe('validarActividad', () => {
  it('acepta el mínimo y rellena lo opcional', () => {
    const r = validarActividad(formulario(), HOY)
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.datos.publicacion).toBe('publicado')
    expect(r.datos.aviso_activo).toBe(false)
    expect(r.datos.aviso_inicio).toBeNull()
    expect(r.datos.hora_inicio).toBe('')
  })

  it('exige nombre, fase, tipo y estado válidos', () => {
    expect(error({ titulo: '   ' })).toContain('nombre')
    expect(error({ fase: 'Diagnóstico' })).toContain('fase')
    expect(error({ tipo: 'Fiesta' })).toContain('tipo')
    expect(error({ estado: 'proxima' })).toContain('estado')
    expect(error({ publicacion: 'publica' })).toContain('publicación')
  })

  it('rechaza fechas imposibles o con otro formato', () => {
    expect(error({ fecha: '2026-02-31' })).toContain('fecha')
    expect(error({ fecha: '01/10/2026' })).toContain('fecha')
    expect(error({ fecha: '' })).toContain('fecha')
  })

  it('valida el horario', () => {
    expect(error({ hora_inicio: '25:00' })).toContain('inicio')
    expect(error({ hora_fin: '12:00' })).toContain('hora de inicio')
    expect(error({ hora_inicio: '12:00', hora_fin: '11:59' })).toContain('posterior')
    expect(error({ hora_inicio: '12:00', hora_fin: '12:00' })).toContain('posterior')
    expect(validarActividad(formulario({ hora_inicio: '09:00', hora_fin: '13:30' }), HOY).ok).toBe(
      true,
    )
  })

  it('las coordenadas van juntas y dentro de rango', () => {
    expect(error({ latitud: '20.64' })).toContain('juntas')
    expect(error({ latitud: '95', longitud: '-103.3' })).toContain('coordenadas')
    expect(error({ latitud: 'abc', longitud: '-103.3' })).toContain('coordenadas')
    expect(
      validarActividad(formulario({ latitud: '20.640900', longitud: '-103.312600' }), HOY).ok,
    ).toBe(true)
  })

  it('el nombre queda en una sola línea (acaba en el asunto de un correo)', () => {
    const r = validarActividad(formulario({ titulo: 'Sesión\r\nBcc: x@y.z\t extra' }), HOY)
    expect(r.ok).toBe(true)
    if (r.ok) expect(r.datos.titulo).toBe('Sesión Bcc: x@y.z extra')
  })

  it('los textos largos conservan saltos de línea y pierden controles', () => {
    const r = validarActividad(formulario({ acuerdos: 'Uno\r\nDos\x07' }), HOY)
    expect(r.ok).toBe(true)
    if (r.ok) expect(r.datos.acuerdos).toBe('Uno\nDos')
  })

  // Regresión (Testing): antes de que esControl cubriera los C1 y los
  // invisibles (commit 3e14415), un título así no perdía estos caracteres —
  // no se dibujan, pero antes tampoco eran controles para esta función—, así
  // que el título quedaba con contenido y no se rechazaba. Ahora sí se
  // limpian todos y el título queda vacío: debe rechazarse igual que uno en
  // blanco.
  it('un título hecho solo de invisibles y controles C1 se rechaza igual que uno en blanco', () => {
    const soloRuido =
      String.fromCodePoint(0x200b) + String.fromCodePoint(0x202e) + String.fromCodePoint(0x85)
    expect(error({ titulo: soloRuido })).toContain('nombre')
  })

  // Las banderas regionales y el ZWNJ no son invisibles de esta lista
  // (ver texto.test.ts): un título que los usa debe sobrevivir intacto.
  it('conserva banderas regionales y ZWNJ en el título', () => {
    const bandera = String.fromCodePoint(0x1f1f2, 0x1f1fd) // 🇲🇽
    const r = validarActividad(formulario({ titulo: `Foro binacional ${bandera}` }), HOY)
    expect(r.ok).toBe(true)
    if (r.ok) expect(r.datos.titulo).toBe(`Foro binacional ${bandera}`)
  })

  it('topes de longitud', () => {
    expect(error({ titulo: 'x'.repeat(301) })).toContain('300')
    expect(error({ descripcion: 'x'.repeat(5001) })).toContain('5000')
    expect(error({ aviso_descripcion: 'x'.repeat(501) })).toContain('500')
  })

  describe('aviso', () => {
    it('por omisión va de hoy al día de la actividad y toma el nombre', () => {
      const r = validarActividad(formulario({ aviso_activo: 'on' }), HOY)
      expect(r.ok).toBe(true)
      if (!r.ok) return
      expect(r.datos.aviso_activo).toBe(true)
      expect(r.datos.aviso_inicio).toBe(HOY)
      expect(r.datos.aviso_fin).toBe('2026-10-01')
      expect(r.datos.aviso_titulo).toBe('Sesión del Comité')
    })

    it('respeta las fechas indicadas y exige un orden válido', () => {
      const r = validarActividad(
        formulario({ aviso_activo: '1', aviso_inicio: '2026-09-20', aviso_fin: '2026-09-25' }),
        HOY,
      )
      expect(r.ok && r.datos.aviso_fin).toBe('2026-09-25')
      expect(
        error({ aviso_activo: '1', aviso_inicio: '2026-09-25', aviso_fin: '2026-09-20' }),
      ).toContain('mismo día')
    })

    it('de una actividad ya pasada pide la fecha de término', () => {
      expect(error({ aviso_activo: '1', fecha: '2026-08-01' })).toContain('hasta qué fecha')
    })

    it('rechaza fechas de aviso inválidas aunque esté desactivado', () => {
      expect(error({ aviso_inicio: '2026-13-01' })).toContain('inicio del aviso')
    })

    it('desactivado conserva lo capturado sin exigir fechas', () => {
      const r = validarActividad(formulario({ aviso_titulo: 'Borrador de aviso' }), HOY)
      expect(r.ok && r.datos.aviso_titulo).toBe('Borrador de aviso')
      expect(r.ok && r.datos.aviso_activo).toBe(false)
    })
  })
})

describe('fechas', () => {
  it('esFechaIso', () => {
    expect(esFechaIso('2028-02-29')).toBe(true)
    expect(esFechaIso('2026-02-29')).toBe(false)
    expect(esFechaIso('2026-9-1')).toBe(false)
  })

  it('rangoDeMes', () => {
    expect(rangoDeMes('2026-02')).toEqual({ desde: '2026-02-01', hasta: '2026-02-28' })
    expect(rangoDeMes('2028-02')).toEqual({ desde: '2028-02-01', hasta: '2028-02-29' })
    expect(rangoDeMes('2026-12')).toEqual({ desde: '2026-12-01', hasta: '2026-12-31' })
    expect(rangoDeMes('2026-13')).toBeNull()
    expect(rangoDeMes('2026-1')).toBeNull()
    expect(rangoDeMes("2026-01' OR 1=1")).toBeNull()
    expect(rangoDeMes('2026-00')).toBeNull()
    expect(rangoDeMes('2026-09-01')).toBeNull()
  })

  // Regresión (Testing): `?mes=0000-01` respondía 500 en un endpoint público.
  // Postgres no tiene año cero y el DATE de la consulta fallaba.
  it('rangoDeMes rechaza los años que una actividad no puede tener', () => {
    expect(rangoDeMes('0000-01')).toBeNull()
    expect(rangoDeMes('0000-12')).toBeNull()
    // Date.UTC confunde los años 0–99 con 1900–1999.
    expect(rangoDeMes('0050-02')).toBeNull()
    expect(rangoDeMes('0100-02')).toEqual({ desde: '0100-02-01', hasta: '0100-02-28' })
  })

  it('hoyEnMexico usa la hora de México, no la del servidor', () => {
    // 02:00 UTC del 18 todavía es la noche del 17 en Guadalajara.
    expect(hoyEnMexico(new Date('2026-09-18T02:00:00Z'))).toBe('2026-09-17')
    expect(hoyEnMexico(new Date('2026-09-18T07:00:00Z'))).toBe('2026-09-18')
  })
})

describe('archivos', () => {
  it('una fotografía solo puede ser una imagen que el navegador dibuje', () => {
    expect(esFotoWeb('taller.JPG')).toBe(true)
    expect(esFotoWeb('taller.webp')).toBe(true)
    expect(esFotoWeb('plano.dwg')).toBe(false)
    expect(esFotoWeb('escaneo.tiff')).toBe(false)
    expect(esFotoWeb('acta.pdf')).toBe(false)
  })

  it('rutaEnUploads no sale del directorio de subidas', () => {
    const base = join(process.cwd(), 'uploads')
    expect(rutaEnUploads(join(base, 'a.pdf'))).toBe(join(base, 'a.pdf'))
    expect(rutaEnUploads('seed/a.pdf')).toBe(join(base, 'seed/a.pdf'))
    expect(rutaEnUploads('../../etc/passwd')).toBeNull()
    expect(rutaEnUploads('/etc/passwd')).toBeNull()
    // Mismo prefijo, otro directorio: el caso que un startsWith ingenuo deja pasar.
    expect(rutaEnUploads(`${base}-otra/a.pdf`)).toBeNull()
    expect(rutaEnUploads(base)).toBeNull()
  })
})

describe('actualizarArchivo', () => {
  const AID = '550e8400-e29b-41d4-a716-446655440077'
  let espia: { mockRestore: () => void } | undefined
  afterEach(() => espia?.mockRestore())

  /** `sql` simulado: la consulta encuentra `nombre` (o nada) y el UPDATE cambia `cambiadas` filas. */
  function base(nombre: string | null, cambiadas: number): string[] {
    espia?.mockRestore()
    const consultas: string[] = []
    espia = spyOn(pool, 'sql').mockImplementation((async (partes: TemplateStringsArray) => {
      const texto = partes.join('?')
      consultas.push(texto)
      if (texto.includes('SELECT')) return nombre ? [{ nombre_original: nombre }] : []
      return Array.from({ length: cambiadas }, () => ({ id: AID }))
    }) as never)
    return consultas
  }

  it('corrige el tipo y el nombre visible', async () => {
    base('acta.pdf', 1)
    expect(await actualizarArchivo(AID, { tipo: 'Acta', titulo: 'Acta de la sesión' })).toBe('ok')
  })

  it('no marca como fotografía algo que no es imagen web, y no toca la base', async () => {
    const consultas = base('acta.pdf', 1)
    expect(await actualizarArchivo(AID, { tipo: 'Fotografía', titulo: '' })).toBe('no_es_foto')
    expect(consultas).toHaveLength(1)
  })

  // Regresión (Testing): si se borraba (sola o con su actividad) entre la
  // consulta y el UPDATE, el panel respondía «guardado» sin haber cambiado nada.
  it('no encontrado si no existe o se borra justo antes de guardar', async () => {
    base(null, 0)
    expect(await actualizarArchivo(AID, { tipo: 'Acta', titulo: '' })).toBe('no_encontrado')
    base('acta.pdf', 0)
    expect(await actualizarArchivo(AID, { tipo: 'Acta', titulo: '' })).toBe('no_encontrado')
  })
})
