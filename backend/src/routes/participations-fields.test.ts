import { afterEach, beforeEach, describe, expect, it, spyOn } from 'bun:test'
import * as pool from '../db/pool.ts'
import * as folios from '../services/folio.ts'
import * as mail from '../services/mail.ts'
import { handleCreateParticipation } from './participations.ts'

let restore: Array<() => void>
let saved: Record<string, unknown>
beforeEach(() => {
  saved = {}
  const tx = Object.assign(
    (query: TemplateStringsArray, ...values: unknown[]) => {
      const columns =
        query
          .join('?')
          .match(/INSERT INTO participations \(([\s\S]*?)\)/)?.[1]
          .split(',')
          .map((v) => v.trim()) ?? []
      for (let i = 0; i < columns.length; i++) saved[columns[i]] = values[i]
      return Promise.resolve([{ id: '00000000-0000-4000-8000-000000000001' }])
    },
    { unsafe: () => Promise.resolve([]) },
  )
  const begin = spyOn(pool.sql, 'begin').mockImplementation(((
    work: (db: typeof tx) => Promise<unknown>,
  ) => work(tx)) as never)
  const folio = spyOn(folios, 'nextFolio').mockResolvedValue('PRUEBA-1')
  const correo = spyOn(mail, 'mailConfigurado').mockReturnValue(false)
  restore = [() => begin.mockRestore(), () => folio.mockRestore(), () => correo.mockRestore()]
})
afterEach(() => restore.forEach((fn) => fn()))

function form() {
  const data = new FormData()
  data.set('nombre', 'Persona de prueba')
  data.set('correo', 'prueba@example.com')
  data.set('consentimiento', '1')
  data.set('observacion', 'Una propuesta para el municipio')
  return data
}

describe('persistencia de complementarios por la API', () => {
  it('guarda los campos opcionales de la participación digital en sus columnas', async () => {
    const data = form()
    const fields = {
      domicilio: 'Calle del hogar 12',
      municipio_participante: 'Guadalajara',
      ocupacion: 'Docente',
      fuente: 'Persona ciudadana',
      genero: 'Prefiero no responder',
      tematica: 'Movilidad',
    }
    for (const [key, value] of Object.entries(fields)) data.set(key, value)
    const response = await handleCreateParticipation(
      new Request('http://local/api/participations', { method: 'POST', body: data }),
      null,
    )
    expect(response.status).toBe(201)
    for (const [key, value] of Object.entries(fields)) expect(saved[key]).toBe(value)
  })
  it('permite omitir los complementarios y rechaza texto excesivo antes de persistir', async () => {
    const data = form()
    const response = await handleCreateParticipation(
      new Request('http://local/api/participations', { method: 'POST', body: data }),
      null,
    )
    expect(response.status).toBe(201)
    expect(saved.fuente).toBe('')
    expect(saved.domicilio).toBe('')
    saved = {}
    data.set('ocupacion', 'x'.repeat(201))
    const invalid = await handleCreateParticipation(
      new Request('http://local/api/participations', { method: 'POST', body: data }),
      null,
    )
    expect(invalid.status).toBe(422)
    expect(saved).toEqual({})
  })

  // Regresión (Testing): el texto del formulario ciudadano llegaba crudo a la
  // base. Un carácter de control no cabe en una columna `text` y un nombre
  // larguísimo rompe su índice: cualquiera de los dos perdía la participación
  // con un 500, y `nombre` y `observacion` alimentan además la búsqueda.
  it('sanea el texto y acota los campos, sin perder la propuesta', async () => {
    const data = form()
    const nulo = String.fromCharCode(0)
    const invisible = String.fromCodePoint(0x202e)
    data.set('nombre', `Persona${nulo} de prueba`)
    data.set('colonia', `Centro${invisible}`)
    data.set('observacion', `Primer párrafo${nulo}\r\nSegundo párrafo`)
    const response = await handleCreateParticipation(
      new Request('http://local/api/participations', { method: 'POST', body: data }),
      null,
    )
    expect(response.status).toBe(201)
    expect(saved.nombre).toBe('Persona de prueba')
    expect(saved.colonia).toBe('Centro')
    // La propuesta conserva sus párrafos; solo se va lo que no se dibuja.
    expect(saved.observacion).toBe('Primer párrafo\nSegundo párrafo')

    saved = {}
    data.set('nombre', 'a'.repeat(301))
    expect(
      (
        await handleCreateParticipation(
          new Request('http://local/api/participations', { method: 'POST', body: data }),
          null,
        )
      ).status,
    ).toBe(422)
    expect(saved).toEqual({})
  })

  it('una propuesta larga de verdad sigue entrando', async () => {
    const data = form()
    data.set('observacion', 'Propuesta muy detallada. '.repeat(400))
    const response = await handleCreateParticipation(
      new Request('http://local/api/participations', { method: 'POST', body: data }),
      null,
    )
    expect(response.status).toBe(201)
    expect(String(saved.observacion)).toHaveLength(9999)
  })

  // Regresión (Testing): el borde exacto de observacion (20000) no tenía
  // prueba propia. El límite se aplica DESPUÉS de sanear (parrafos quita el
  // byte nulo antes de medir), así que un envío de 20000 caracteres válidos
  // más un byte nulo de propina también debe entrar en 20000, no rechazarse
  // por parecer 20001 en crudo.
  it('la propuesta admite hasta 20000 caracteres exactos tras sanear, ni uno más', async () => {
    const data = form()
    data.set('observacion', 'x'.repeat(20000 - 1) + String.fromCharCode(0) + 'x')
    const enElBorde = await handleCreateParticipation(
      new Request('http://local/api/participations', { method: 'POST', body: data }),
      null,
    )
    expect(enElBorde.status).toBe(201)
    expect(String(saved.observacion)).toHaveLength(20000)

    saved = {}
    data.set('observacion', 'x'.repeat(20001))
    const excede = await handleCreateParticipation(
      new Request('http://local/api/participations', { method: 'POST', body: data }),
      null,
    )
    expect(excede.status).toBe(422)
    expect(saved).toEqual({})
  })
})

describe('participación física: requiere rol admin, no solo sesión ausente', () => {
  function formFisica() {
    const data = form()
    data.set('origen', 'fisica')
    return data
  }

  it('sin sesión → 403, no se persiste nada', async () => {
    const response = await handleCreateParticipation(
      new Request('http://local/api/participations', { method: 'POST', body: formFisica() }),
      null,
    )
    expect(response.status).toBe(403)
    expect(saved).toEqual({})
  })

  // La ciudadanía con cuenta (rol "user") tampoco puede dar de alta una
  // física: sólo root/admin (puedeEntrarAlPanel). No basta con probar "sin
  // sesión": una sesión válida pero de rango bajo es el caso de IDOR/
  // escalada real.
  it('con sesión de rol "user" → 403, no se persiste nada', async () => {
    const response = await handleCreateParticipation(
      new Request('http://local/api/participations', { method: 'POST', body: formFisica() }),
      { id: 'u1', name: 'Ciudadano', email: 'ciudadano@example.com', role: 'user' },
    )
    expect(response.status).toBe(403)
    expect(saved).toEqual({})
  })

  it('con sesión de rol "admin" → crea la participación física', async () => {
    const response = await handleCreateParticipation(
      new Request('http://local/api/participations', { method: 'POST', body: formFisica() }),
      { id: 'a1', name: 'Admin', email: 'admin@example.com', role: 'admin' },
    )
    expect(response.status).toBe(201)
    expect(saved.origen).toBe('fisica')
    expect(saved.creado_por).toBe('a1')
  })
})

describe('camposDelFormulario: casos límite de tipos y repetición', () => {
  it('un campo de texto enviado como archivo se rechaza (no se guarda vacío en silencio)', async () => {
    const data = form()
    data.set('nombre', new File(['contenido'], 'nombre.txt'))
    const response = await handleCreateParticipation(
      new Request('http://local/api/participations', { method: 'POST', body: data }),
      null,
    )
    expect(response.status).toBe(422)
    expect(saved).toEqual({})
  })

  it('valores repetidos del mismo campo: se queda con el primero, como form.get()', async () => {
    const data = form() // ya trae un 'nombre'
    data.append('nombre', 'Segundo valor, no debería usarse')
    const response = await handleCreateParticipation(
      new Request('http://local/api/participations', { method: 'POST', body: data }),
      null,
    )
    expect(response.status).toBe(201)
    expect(saved.nombre).toBe('Persona de prueba')
  })

  it('latitud/longitud se acotan a 50 caracteres, igual que el resto de los campos', async () => {
    const data = form()
    data.set('latitud', '9'.repeat(51))
    const response = await handleCreateParticipation(
      new Request('http://local/api/participations', { method: 'POST', body: data }),
      null,
    )
    expect(response.status).toBe(422)
    expect(saved).toEqual({})
  })
})

// Regresión (Testing): los dos formularios exigen nombre y correo, pero eso
// solo corre en el navegador. `/api/participations` es pública y sin sesión
// para origen digital, y un texto hecho de caracteres invisibles se quedaba en
// blanco al sanearlo: la participación se guardaba sin forma de identificar ni
// responder a quien la mandó.
describe('lo obligatorio y lo malformado', () => {
  it('un nombre o un correo que quedan vacíos tras sanear se rechazan', async () => {
    for (const [campo, valor] of [
      ['nombre', String.fromCodePoint(0x200b, 0x202e, 0xfeff)],
      ['correo', String.fromCodePoint(0x200b, 0xfeff)],
      ['nombre', '   '],
    ] as const) {
      const data = form()
      data.set(campo, valor)
      const response = await handleCreateParticipation(
        new Request('http://local/api/participations', { method: 'POST', body: data }),
        null,
      )
      expect(response.status).toBe(422)
      expect(saved).toEqual({})
    }
  })

  // Un multipart roto es culpa de quien lo manda: 400, como en el alta de
  // actividades, y no un error interno en una ruta pública.
  it('un formulario malformado se explica con un 400', async () => {
    const response = await handleCreateParticipation(
      new Request('http://local/api/participations', {
        method: 'POST',
        headers: { 'content-type': 'multipart/form-data; boundary=BOUNDARY123' },
        body: '--BOUNDARY123\r\nContent-Disposition: form-data; name="nombre"\r\n\r\nRoto sin cierre',
      }),
      null,
    )
    expect(response.status).toBe(400)
  })
})
