import { afterEach, beforeEach, describe, expect, it, spyOn } from 'bun:test'
import * as pool from '../db/pool.ts'
import * as folios from '../services/folio.ts'
import * as mail from '../services/mail.ts'
import { GENEROS, TEMATICAS, TIPOS_PARTICIPANTE } from '../services/participacion-campos.ts'
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
  data.set('alcance_ubicacion', 'municipio')
  data.set('observacion', 'Una propuesta para el municipio')
  return data
}

async function enviar(data: FormData) {
  return handleCreateParticipation(
    new Request('http://local/api/participations', { method: 'POST', body: data }),
    null,
  )
}

describe('persistencia de complementarios por la API', () => {
  it('guarda los campos opcionales de la participación digital en sus columnas', async () => {
    const data = form()
    const fields = {
      domicilio: 'Calle del hogar 12',
      municipio_participante: 'Guadalajara',
      ocupacion: 'Docente',
      fuente: 'Persona a título individual',
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
    data.set('ocupacion', 'x'.repeat(101))
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
    data.set('nombre', 'a'.repeat(101))
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

  // El límite de la propuesta se mide DESPUÉS de sanear (parrafos quita el byte
  // nulo antes de contar) y en caracteres, no en unidades UTF-16: 500 emojis son
  // 500 caracteres para quien los escribe, aunque ocupen 1000 unidades.
  it('la propuesta admite hasta 500 caracteres exactos tras sanear, ni uno más', async () => {
    const data = form()
    data.set('observacion', 'x'.repeat(500 - 1) + String.fromCharCode(0) + 'x')
    const enElBorde = await enviar(data)
    expect(enElBorde.status).toBe(201)
    expect(String(saved.observacion)).toHaveLength(500)

    saved = {}
    data.set('observacion', '😀'.repeat(500))
    expect((await enviar(data)).status).toBe(201)

    saved = {}
    data.set('observacion', 'x'.repeat(501))
    const excede = await enviar(data)
    expect(excede.status).toBe(422)
    expect(await excede.json()).toEqual({ error: expect.stringContaining('500 caracteres') })
    expect(saved).toEqual({})
  })

  it('la propuesta es obligatoria', async () => {
    const data = form()
    data.set('observacion', '   ')
    expect((await enviar(data)).status).toBe(422)
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

describe('ubicación de la propuesta: todo el municipio o un lugar específico', () => {
  it('sin indicar el alcance se rechaza: no se adivina', async () => {
    const data = form()
    data.delete('alcance_ubicacion')
    const response = await enviar(data)
    expect(response.status).toBe(422)
    expect(await response.json()).toEqual({ error: expect.stringContaining('todo el municipio') })
    expect(saved).toEqual({})
  })

  it('un alcance inventado se rechaza', async () => {
    const data = form()
    data.set('alcance_ubicacion', 'otro')
    expect((await enviar(data)).status).toBe(422)
    expect(saved).toEqual({})
  })

  it('«Todo el municipio»: la ubicación es opcional y se guarda lo que se dé', async () => {
    const data = form()
    expect((await enviar(data)).status).toBe(201)
    expect(saved.alcance_ubicacion).toBe('municipio')
    expect(saved.calle).toBe('')
    expect(saved.colonia).toBe('')

    saved = {}
    data.set('calle', 'Av. Juárez 100')
    data.set('colonia', 'Centro')
    expect((await enviar(data)).status).toBe(201)
    expect(saved.calle).toBe('Av. Juárez 100')
    expect(saved.colonia).toBe('Centro')
  })

  it('«Lugar o predio específico»: exige el domicilio o referencia y la colonia o zona', async () => {
    const data = form()
    data.set('alcance_ubicacion', 'especifico')

    const sinNada = await enviar(data)
    expect(sinNada.status).toBe(422)
    expect(await sinNada.json()).toEqual({
      error: expect.stringContaining('domicilio o una referencia'),
    })

    data.set('calle', 'Frente al mercado, junto al puente')
    const sinColonia = await enviar(data)
    expect(sinColonia.status).toBe(422)
    expect(await sinColonia.json()).toEqual({ error: expect.stringContaining('colonia o zona') })
    expect(saved).toEqual({})

    data.set('colonia', 'Santa Anita')
    expect((await enviar(data)).status).toBe(201)
    expect(saved.alcance_ubicacion).toBe('especifico')
    expect(saved.calle).toBe('Frente al mercado, junto al puente')
    expect(saved.colonia).toBe('Santa Anita')
  })

  it('una referencia hecha de caracteres invisibles cuenta como vacía', async () => {
    const data = form()
    data.set('alcance_ubicacion', 'especifico')
    data.set('calle', String.fromCodePoint(0x200b, 0xfeff))
    data.set('colonia', 'Centro')
    expect((await enviar(data)).status).toBe(422)
  })

  it('el municipio no se pregunta: siempre es San Pedro Tlaquepaque', async () => {
    const data = form()
    data.set('municipio', 'Zapopan')
    expect((await enviar(data)).status).toBe(201)
    expect(saved.municipio).toBe('San Pedro Tlaquepaque')
  })

  it('el domicilio y la colonia admiten 100 y 60 caracteres, ni uno más', async () => {
    const data = form()
    data.set('calle', 'c'.repeat(100))
    data.set('colonia', 'k'.repeat(60))
    expect((await enviar(data)).status).toBe(201)

    for (const [campo, largo] of [
      ['calle', 101],
      ['colonia', 61],
    ] as const) {
      const largoData = form()
      largoData.set(campo, 'x'.repeat(largo))
      saved = {}
      expect((await enviar(largoData)).status).toBe(422)
      expect(saved).toEqual({})
    }
  })

  it('el código postal, si se da, son 5 dígitos', async () => {
    const data = form()
    data.set('codigo_postal', '45500')
    expect((await enviar(data)).status).toBe(201)
    for (const malo of ['4550', '455001', '45 50', 'abcde']) {
      const d = form()
      d.set('codigo_postal', malo)
      saved = {}
      expect((await enviar(d)).status).toBe(422)
    }
  })
})

describe('listas con «Otra» y límites de lo que llega al acuse', () => {
  it('«Otra» conserva lo que se especificó, hasta 60 caracteres', async () => {
    const data = form()
    data.set('tematica', 'Otra')
    data.set('tematica_otra', 'Arbolado urbano')
    data.set('fuente', 'Otra')
    data.set('fuente_otra', 'Colectivo vecinal')
    expect((await enviar(data)).status).toBe(201)
    expect(saved.tematica_otra).toBe('Arbolado urbano')
    expect(saved.fuente_otra).toBe('Colectivo vecinal')

    for (const campo of ['tematica_otra', 'fuente_otra']) {
      const d = form()
      d.set('tematica', 'Otra')
      d.set('fuente', 'Otra')
      d.set(campo, 'x'.repeat(61))
      saved = {}
      expect((await enviar(d)).status).toBe(422)
      expect(saved).toEqual({})
    }
  })

  it('«Otra» sin especificar es válida: la especificación es opcional', async () => {
    const data = form()
    data.set('tematica', 'Otra')
    expect((await enviar(data)).status).toBe(201)
    expect(saved.tematica_otra).toBe('')
  })

  it('con otra opción la especificación sobra y se descarta', async () => {
    const data = form()
    data.set('tematica', 'Vivienda')
    data.set('tematica_otra', 'residuo de una selección anterior')
    data.set('fuente', 'Empresa')
    data.set('fuente_otra', 'residuo')
    expect((await enviar(data)).status).toBe(201)
    expect(saved.tematica_otra).toBe('')
    expect(saved.fuente_otra).toBe('')
  })

  it('acepta todas las opciones de los tres catálogos', async () => {
    for (const [campo, opciones] of [
      ['tematica', TEMATICAS],
      ['fuente', TIPOS_PARTICIPANTE],
      ['genero', GENEROS],
    ] as const) {
      for (const opcion of opciones) {
        const data = form()
        data.set(campo, opcion)
        saved = {}
        expect((await enviar(data)).status, `${campo}: ${opcion}`).toBe(201)
        expect(saved[campo]).toBe(opcion)
      }
    }
  })

  it('una opción que no está en el catálogo se rechaza', async () => {
    for (const [campo, valor] of [
      ['tematica', 'Servicios Ambientales'], // la mayúscula vieja ya no es una opción
      ['fuente', 'Dependencia'],
      ['genero', 'Otro'],
      ['genero', 'Prefiero no decir'],
    ] as const) {
      const data = form()
      data.set(campo, valor)
      saved = {}
      expect((await enviar(data)).status, `${campo}: ${valor}`).toBe(422)
      expect(saved).toEqual({})
    }
  })

  it('el correo debe parecer un correo y caber en el acuse (100 caracteres)', async () => {
    for (const malo of ['sin-arroba', 'a@b', 'dos@@x.mx', 'con espacio@x.mx']) {
      const data = form()
      data.set('correo', malo)
      saved = {}
      expect((await enviar(data)).status, malo).toBe(422)
    }
    const largo = form()
    largo.set('correo', `${'a'.repeat(96)}@x.mx`)
    expect((await enviar(largo)).status).toBe(422)
  })

  it('la empresa, institución u organización admite 100 caracteres, ni uno más', async () => {
    const data = form()
    data.set('institucion', 'i'.repeat(100))
    expect((await enviar(data)).status).toBe(201)
    data.set('institucion', 'i'.repeat(101))
    saved = {}
    expect((await enviar(data)).status).toBe(422)
    expect(saved).toEqual({})
  })
})
