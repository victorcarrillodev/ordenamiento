// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest'

/**
 * Verificación de comportamiento del reset del botón de envío.
 *
 * El envío real lo intercepta `public/autocomplete.js` con XHR, y el botón que
 * se bloquea a sí mismo vive en un clientEntry de Remix. Los dos se comunican
 * por el evento `participation:submit-error`, sin import que los ate.
 *
 * Aquí se reproduce ese contrato sobre un DOM real: no se prueba el fuente de
 * ninguno de los dos, sino que la mecánica en la que ambos se apoyan —despachar
 * en el form, escuchar en el form, sin burbujeo— efectivamente devuelve el botón
 * a un estado usable. Si el evento dejara de llegar, el formulario quedaría
 * bloqueado hasta recargar la página.
 */
const SUBMIT_ERROR_EVENT = 'participation:submit-error'

/** Reproduce el ciclo bloquear/liberar del clientEntry sobre un form real. */
function montarFormulario() {
  document.body.innerHTML = `
    <form id="participation-form">
      <input name="observacion" required value="algo" />
      <button id="enviar" type="submit">Enviar</button>
    </form>
  `

  const form = document.getElementById('participation-form') as HTMLFormElement
  const boton = document.getElementById('enviar') as HTMLButtonElement

  let pendiente = false
  const pintar = () => {
    boton.style.pointerEvents = pendiente ? 'none' : 'auto'
    boton.textContent = pendiente ? 'Enviando…' : 'Enviar'
  }

  form.addEventListener('submit', (evento) => {
    evento.preventDefault()
    if (pendiente) return
    pendiente = true
    pintar()
  })

  form.addEventListener(SUBMIT_ERROR_EVENT, () => {
    if (!pendiente) return
    pendiente = false
    pintar()
  })

  return {
    form,
    boton,
    enviar: () => form.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true })),
    // Lo que hace releaseForm() en autocomplete.js.
    fallar: () => form.dispatchEvent(new CustomEvent(SUBMIT_ERROR_EVENT, { bubbles: false })),
    estaBloqueado: () => boton.style.pointerEvents === 'none',
  }
}

describe('reset del botón de envío tras un fallo', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  it('bloquea el botón al enviar', () => {
    const ui = montarFormulario()
    expect(ui.estaBloqueado()).toBe(false)

    ui.enviar()

    expect(ui.estaBloqueado()).toBe(true)
    expect(ui.boton.textContent).toBe('Enviando…')
  })

  it('lo desbloquea cuando el envío falla', () => {
    const ui = montarFormulario()
    ui.enviar()

    ui.fallar()

    expect(ui.estaBloqueado()).toBe(false)
    expect(ui.boton.textContent).toBe('Enviar')
  })

  it('permite reintentar después de un fallo', () => {
    const ui = montarFormulario()

    ui.enviar()
    ui.fallar()
    ui.enviar()

    // Sin el reset, este segundo envío no llegaría a dispararse nunca.
    expect(ui.estaBloqueado()).toBe(true)
  })

  it('soporta varios fallos seguidos', () => {
    const ui = montarFormulario()

    for (let intento = 0; intento < 3; intento++) {
      ui.enviar()
      expect(ui.estaBloqueado()).toBe(true)
      ui.fallar()
      expect(ui.estaBloqueado()).toBe(false)
    }
  })

  it('ignora el aviso de fallo si no había un envío en curso', () => {
    const ui = montarFormulario()

    ui.fallar()

    expect(ui.estaBloqueado()).toBe(false)
  })

  it('no llega al botón si el evento se escucha en document en vez del form', () => {
    // El evento se despacha con bubbles:false: mover el listener fuera del form
    // lo dejaría sin recibir, que es la forma silenciosa de revivir el bug.
    const ui = montarFormulario()
    let recibidoEnDocument = false
    document.addEventListener(SUBMIT_ERROR_EVENT, () => {
      recibidoEnDocument = true
    })

    ui.enviar()
    ui.fallar()

    expect(recibidoEnDocument).toBe(false)
    expect(ui.estaBloqueado()).toBe(false)
  })
})
