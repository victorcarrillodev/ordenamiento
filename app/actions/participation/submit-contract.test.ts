import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

/**
 * El envío se intercepta con XHR en `public/autocomplete.js` para poder mostrar
 * el progreso de subida, mientras que el botón que se bloquea a sí mismo vive en
 * un clientEntry de Remix. Los dos se comunican por un evento DOM cuyo nombre
 * viaja como literal a ambos lados, sin import que los ate.
 *
 * Estas pruebas son análisis estático del fuente —lo único posible sin jsdom— y
 * existen para que un renombre parcial rompa aquí en vez de dejar el formulario
 * bloqueado en producción.
 */
const BOTON = readFileSync(
  resolve(process.cwd(), 'app/actions/participation/public/submit-button.tsx'),
  'utf-8',
)
const AUTOCOMPLETE = readFileSync(resolve(process.cwd(), 'public/autocomplete.js'), 'utf-8')

const EVENTO = 'participation:submit-error'

describe('contrato del evento participation:submit-error', () => {
  it('usa el mismo nombre de evento en los dos lados', () => {
    expect(BOTON).toContain(EVENTO)
    expect(AUTOCOMPLETE).toContain(EVENTO)
  })

  it('lo emite en el form y lo escucha en ese mismo form', () => {
    // bubbles:false obliga a que emisor y receptor coincidan en el nodo.
    expect(AUTOCOMPLETE).toContain(`new CustomEvent('${EVENTO}'`)
    expect(AUTOCOMPLETE).toContain('bubbles: false')
    expect(BOTON).toContain('form.addEventListener')
    expect(BOTON).toContain('SUBMIT_ERROR_EVENT')
    expect(BOTON).not.toContain('document.addEventListener')
  })

  it('libera el formulario en todos los finales que dejan la página viva', () => {
    // Un final que no reemplaza el documento y no libera el botón lo deja
    // inutilizable hasta recargar: ese era el bug.
    for (const evento of ['error', 'timeout', 'abort']) {
      const bloque = AUTOCOMPLETE.split(`xhr.addEventListener('${evento}'`)[1]
      expect(bloque, `falta el manejador de '${evento}'`).toBeDefined()
      expect(bloque.slice(0, 400), `'${evento}' no libera el formulario`).toContain(
        'releaseForm(form)',
      )
    }
  })

  it('libera el formulario cuando el servidor falla sin devolver cuerpo', () => {
    // Con cuerpo se hace document.write y la página se reemplaza entera, así
    // que ahí no hay nada que liberar.
    expect(AUTOCOMPLETE).toContain('if (xhr.responseText)')
    const sinCuerpo = AUTOCOMPLETE.split('if (xhr.responseText)')[1].split('} else {')[1]
    expect(sinCuerpo.slice(0, 300)).toContain('releaseForm(form)')
  })

  it('oculta el modal de progreso al fallar', () => {
    expect(AUTOCOMPLETE).toContain('function hideUploadProgressModal()')
    expect(AUTOCOMPLETE).toContain('hideUploadProgressModal()')
  })
})
