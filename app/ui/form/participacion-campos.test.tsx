import { describe, expect, it } from 'vitest'
import { renderToString } from 'remix/ui/server'

import { LIMITES, TEMATICAS } from '../../data/participacion.ts'
import { ParticipacionCampos, type ParticipacionCamposProps } from './participacion-campos.tsx'

const render = (props: Partial<ParticipacionCamposProps> = {}) =>
  renderToString(<ParticipacionCampos coloniasEndpoint="/ordena/api/colonias" {...props} />)

/** El `<label>` de un campo, con su asterisco si lo tiene. */
const etiquetaDe = (html: string, id: string) =>
  html.match(new RegExp(`<label[^>]*for="${id}"[^>]*>[\\s\\S]*?</label>`))?.[0] ?? ''

describe('ParticipacionCampos', () => {
  it('ya no pregunta el municipio de la propuesta', async () => {
    const html = await render()
    expect(html).not.toMatch(/name="municipio"/)
    expect(html).not.toContain('Ej. San Pedro Tlaquepaque')
  })

  it('ofrece «Todo el municipio» y «Lugar o predio específico»', async () => {
    const html = await render()
    expect(html).toContain('Todo el municipio')
    expect(html).toContain('Lugar o predio específico')
    expect(html).toMatch(/name="alcance_ubicacion"[^>]*value="municipio"/)
    expect(html).toMatch(/name="alcance_ubicacion"[^>]*value="especifico"/)
  })

  it('sin elegir, la propuesta es de un lugar específico: domicilio y colonia obligatorios', async () => {
    const html = await render()
    expect(html).toMatch(/value="especifico"[^>]*checked|checked[^>]*value="especifico"/)
    for (const id of ['calle', 'colonia']) {
      expect(html).toMatch(new RegExp(`<input[^>]*id="${id}"[^>]*required`))
      expect(etiquetaDe(html, id)).toContain('*')
    }
  })

  it('con «Todo el municipio» los datos de ubicación son opcionales y sin asterisco', async () => {
    const html = await render({ values: { alcance_ubicacion: 'municipio' } })
    expect(html).toMatch(/value="municipio"[^>]*checked|checked[^>]*value="municipio"/)
    for (const id of ['calle', 'colonia']) {
      expect(html).not.toMatch(new RegExp(`<input[^>]*id="${id}"[^>]*required`))
      expect(etiquetaDe(html, id)).not.toContain('*')
    }
    expect(html).toContain('son opcionales')
  })

  it('nombre, correo y propuesta llevan asterisco; la empresa no', async () => {
    const html = await render()
    for (const id of ['nombre', 'email', 'observacion']) {
      expect(etiquetaDe(html, id), id).toContain('*')
    }
    expect(etiquetaDe(html, 'institucion')).toContain(
      'Empresa, institución u organización (opcional)',
    )
    expect(etiquetaDe(html, 'institucion')).not.toContain('*')
  })

  it('la propuesta muestra su indicación, su tope y un contador visible', async () => {
    const html = await render({ values: { observacion: 'Hola' } })
    expect(html).toContain('Describe tu observación o propuesta sobre el Proyecto del Programa.')
    expect(html).toMatch(new RegExp(`<textarea[^>]*maxlength="${LIMITES.observacion}"`))
    expect(html).toMatch(/data-contador="observacion"[^>]*>\s*4 \/ 500/)
    expect(html).toContain('incluidos los espacios')
  })

  it('la empresa también muestra su tope y su contador', async () => {
    const html = await render()
    expect(html).toMatch(
      new RegExp(`<input[^>]*id="institucion"[^>]*maxlength="${LIMITES.institucion}"`),
    )
    expect(html).toContain('data-contador="institucion"')
  })

  it('la temática va junto a la propuesta, con todas sus opciones y «Otra»', async () => {
    const html = await render()
    expect(html.indexOf('id="observacion"')).toBeLessThan(html.indexOf('id="tematica"'))
    expect(html.indexOf('id="tematica"')).toBeLessThan(html.indexOf('Datos complementarios'))
    for (const tematica of TEMATICAS) expect(html).toContain(`value="${tematica}"`)
  })

  it('«Otra» abre su campo de especificación solo cuando está elegida', async () => {
    const cerrado = await render({ values: { tematica: 'Vivienda' } })
    expect(cerrado).toMatch(/id="tematica_otra-campo"[^>]*hidden/)
    const abierto = await render({ values: { tematica: 'Otra', tematica_otra: 'Arbolado' } })
    expect(abierto).not.toMatch(/id="tematica_otra-campo"[^>]*hidden/)
    expect(abierto).toContain('Arbolado')
    expect(abierto).toMatch(
      new RegExp(`id="tematica_otra"[^>]*maxlength="${LIMITES.tematica_otra}"`),
    )
  })

  it('las listas abren en «Selecciona una opción» y no obligan a elegir', async () => {
    const html = await render()
    expect(html).not.toContain('Sin especificar')
    for (const id of ['tematica', 'fuente', 'genero']) {
      const lista = html.match(new RegExp(`<select[^>]*id="${id}"[\\s\\S]*?</select>`))?.[0] ?? ''
      expect(lista, id).toContain('Selecciona una opción')
      expect(lista, id).not.toMatch(/required/)
    }
    expect(html).toContain('Mujer')
    expect(html).toContain('Prefiero no responder')
    expect(html).toContain('Persona a título individual')
    expect(html).toContain('Institución académica')
  })

  it('conserva los datos complementarios como opcionales con su aclaración', async () => {
    const html = await render()
    expect(html).toContain(
      'Estos datos corresponden a quien participa y pueden ser distintos de la ubicación de la propuesta.',
    )
    for (const id of ['domicilio', 'municipio_participante', 'ocupacion']) {
      expect(html).not.toMatch(new RegExp(`<input[^>]*id="${id}"[^>]*required`))
    }
    expect(html).toContain('Municipio de residencia')
  })

  it('los adjuntos son opcionales y se aclara', async () => {
    const html = await render()
    expect(html).toContain('Puedes participar con o sin archivos adjuntos.')
    expect(html).not.toMatch(/<input[^>]*type="file"[^>]*required/)
  })

  it('repinta los errores junto a cada campo', async () => {
    const html = await render({
      errors: { calle: 'Indica el domicilio', observacion: 'Demasiado larga' },
    })
    expect(html).toContain('Indica el domicilio')
    expect(html).toContain('Demasiado larga')
  })
})
