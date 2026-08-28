import { describe, expect, it } from 'bun:test'
import { createParticipation, type ParticipationInput } from './participations.ts'

/**
 * Sustituye al tag `sql` para capturar la consulta sin necesidad de Postgres.
 *
 * Se hace pasar por `Sql` como lo detecta createParticipation: una función que
 * además expone `unsafe`.
 */
function dbFalso() {
  const capturado = { consulta: '', valores: [] as unknown[] }

  const db = (plantilla: TemplateStringsArray, ...valores: unknown[]) => {
    capturado.consulta = plantilla.join('?')
    capturado.valores = valores
    return Promise.resolve([{ id: 1 }])
  }
  db.unsafe = () => Promise.resolve([])

  return { db, capturado }
}

/** Devuelve las columnas del INSERT en el orden en que se declararon. */
function columnasDelInsert(consulta: string): string[] {
  const lista = consulta.match(/INSERT INTO participations \(([\s\S]*?)\)/)?.[1] ?? ''
  return lista
    .split(',')
    .map((columna) => columna.trim())
    .filter(Boolean)
}

async function insertar(input: Partial<ParticipationInput> = {}) {
  const { db, capturado } = dbFalso()

  await createParticipation(
    db as never,
    { nombre: 'Quien Participa', correo: 'participa@ejemplo.com', ...input },
    'FIS-2026-001',
  )

  return { capturado, columnas: columnasDelInsert(capturado.consulta) }
}

describe('services/participations · createParticipation', () => {
  it('persiste el domicilio de quien participa y el del aporte por separado', async () => {
    const { capturado, columnas } = await insertar({
      domicilio: 'Av. Juárez 100, Centro',
      municipio_participante: 'Guadalajara',
      calle: 'Prolongación Colón 500',
      colonia: 'Santa Anita',
      municipio: 'Tlajomulco de Zúñiga',
    })

    expect(columnas).toContain('domicilio')
    expect(columnas).toContain('municipio_participante')

    // Cada valor tiene que caer en la posición de su columna: si el INSERT se
    // desalinea, los datos entran en la columna equivocada sin fallar.
    expect(capturado.valores[columnas.indexOf('domicilio')]).toBe('Av. Juárez 100, Centro')
    expect(capturado.valores[columnas.indexOf('municipio_participante')]).toBe('Guadalajara')
    expect(capturado.valores[columnas.indexOf('municipio')]).toBe('Tlajomulco de Zúñiga')
    expect(capturado.valores[columnas.indexOf('colonia')]).toBe('Santa Anita')
  })

  it('deja vacíos los campos del participante cuando no se capturaron', async () => {
    const { capturado, columnas } = await insertar({ municipio: 'San Pedro Tlaquepaque' })

    // La participación ciudadana no captura estos dos campos.
    expect(capturado.valores[columnas.indexOf('domicilio')]).toBe('')
    expect(capturado.valores[columnas.indexOf('municipio_participante')]).toBe('')
    expect(capturado.valores[columnas.indexOf('municipio')]).toBe('San Pedro Tlaquepaque')
  })

  it('declara un valor por cada columna del INSERT', async () => {
    const { capturado, columnas } = await insertar()

    expect(capturado.valores).toHaveLength(columnas.length)
  })
})
