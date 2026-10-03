// @vitest-environment jsdom
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import { renderToString } from 'remix/ui/server'

import { textoPlanoDe } from '../../utils/texto-rico.ts'
import { EditorTexto } from './editor-texto.tsx'

/**
 * `public/editor-texto.js` sobre el marcado real del servidor. jsdom no trae
 * `execCommand` (el comando que aplica el formato en el navegador), así que se
 * reemplaza por un doble que registra qué se pidió: aquí se prueba lo que hace
 * el script, no el editor del navegador.
 */
const SCRIPT = readFileSync(resolve(process.cwd(), 'public/editor-texto.js'), 'utf8')

const doc = document as unknown as {
  execCommand?: ReturnType<typeof vi.fn>
  queryCommandState?: (comando: string) => boolean
}
const comandos = vi.fn(() => true)

/** Deja que el observador del DOM procese lo que se acaba de montar. */
const esperar = () => new Promise((resolver) => setTimeout(resolver, 0))

async function montar(valor = '<p>Hola <strong>mundo</strong></p>', max?: number) {
  document.body.innerHTML = `<form>${await renderToString(
    <EditorTexto name="txt_x" label="Texto de prueba" valor={valor} />,
  )}<button type="submit">Guardar</button></form>`
  const editor = document.querySelector<HTMLElement>('[data-editor-texto]')!
  if (max) editor.setAttribute('data-max', String(max))
  await esperar()
  return {
    editor,
    formulario: document.querySelector('form')!,
    barra: editor.querySelector<HTMLElement>('[data-barra]')!,
    area: editor.querySelector<HTMLElement>('[data-area]')!,
    fuente: editor.querySelector<HTMLTextAreaElement>('textarea')!,
    aviso: editor.querySelector<HTMLElement>('[data-aviso]')!,
    boton: (comando: string) =>
      editor.querySelector<HTMLButtonElement>(`[data-comando="${comando}"]`)!,
  }
}

const escribir = (area: HTMLElement, html: string) => {
  area.innerHTML = html
  area.dispatchEvent(new Event('input', { bubbles: true }))
}

beforeAll(() => {
  doc.execCommand = comandos
  // jsdom no hace scroll.
  window.HTMLElement.prototype.scrollIntoView = vi.fn()
  new Function(SCRIPT)()
})

afterEach(() => {
  comandos.mockClear()
  doc.execCommand = comandos
  delete doc.queryCommandState
  document.body.innerHTML = ''
})

describe('editor de texto con formato (script)', () => {
  it('cambia el campo de texto por la barra y el área, también si llegan después', async () => {
    const { barra, area, fuente, editor } = await montar()
    expect(barra.hidden).toBe(false)
    expect(area.hidden).toBe(false)
    expect(fuente.hidden).toBe(true)
    expect(editor.hasAttribute('data-listo')).toBe(true)
  })

  it('el campo de respaldo sigue siendo el que viaja con el formulario', async () => {
    const { fuente, formulario } = await montar('<p>Hola</p>')
    expect(new FormData(formulario).get('txt_x')).toBe(fuente.value)
    expect(fuente.value).toContain('Hola')
  })

  it('sin execCommand (navegador sin soporte) queda el campo de texto', async () => {
    doc.execCommand = undefined
    const { barra, area, fuente, editor } = await montar()
    expect(barra.hidden).toBe(true)
    expect(area.hidden).toBe(true)
    expect(fuente.hidden).toBe(false)
    expect(editor.hasAttribute('data-listo')).toBe(false)
  })

  it('al escribir, el campo de respaldo recibe lo que se ve en el área', async () => {
    const { area, fuente } = await montar()
    escribir(area, '<p style="text-align: center;">Nuevo <b>texto</b></p>')
    expect(fuente.value).toBe('<p style="text-align: center;">Nuevo <b>texto</b></p>')
  })

  it('cada botón pide al navegador su formato', async () => {
    const { boton } = await montar()
    const esperado: Record<string, string> = {
      negrita: 'bold',
      izquierda: 'justifyLeft',
      centro: 'justifyCenter',
      derecha: 'justifyRight',
      justificado: 'justifyFull',
    }
    for (const [nombre, comando] of Object.entries(esperado)) {
      comandos.mockClear()
      boton(nombre).click()
      expect(comandos, nombre).toHaveBeenCalledWith(comando, false, null)
    }
  })

  it('pulsar un botón no quita la selección del texto que se va a formatear', async () => {
    const { boton } = await montar()
    const evento = new MouseEvent('mousedown', { bubbles: true, cancelable: true })
    boton('negrita').dispatchEvent(evento)
    expect(evento.defaultPrevented).toBe(true)
  })

  it('después de aplicar un formato, el campo de respaldo queda al día', async () => {
    const { area, fuente, boton } = await montar('<p>Hola</p>')
    comandos.mockImplementationOnce(() => {
      area.innerHTML = '<p style="text-align: justify;">Hola</p>'
      return true
    })
    boton('justificado').click()
    expect(fuente.value).toBe('<p style="text-align: justify;">Hola</p>')
  })

  it('la barra marca lo que tiene el texto donde está el cursor', async () => {
    const { area, boton } = await montar('<p>Hola <b>mundo</b></p>')
    doc.queryCommandState = (comando) => comando === 'bold' || comando === 'justifyCenter'
    const rango = document.createRange()
    rango.selectNodeContents(area.querySelector('strong')!)
    const seleccion = window.getSelection()!
    seleccion.removeAllRanges()
    seleccion.addRange(rango)
    document.dispatchEvent(new Event('selectionchange'))
    expect(boton('negrita').getAttribute('aria-pressed')).toBe('true')
    expect(boton('centro').getAttribute('aria-pressed')).toBe('true')
    expect(boton('izquierda').getAttribute('aria-pressed')).toBe('false')
    expect(boton('justificado').getAttribute('aria-pressed')).toBe('false')
  })

  describe('barra de herramientas con el teclado', () => {
    const tecla = (el: Element, key: string) =>
      el.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }))
    const tabindex = (editor: HTMLElement) =>
      [...editor.querySelectorAll('[data-comando]')].map((b) => b.getAttribute('tabindex'))

    it('solo un botón entra en el orden de tabulación', async () => {
      const { editor } = await montar()
      expect(tabindex(editor)).toEqual(['0', '-1', '-1', '-1', '-1'])
    })

    it('las flechas pasan de un botón a otro, dan la vuelta y Inicio/Fin saltan a los extremos', async () => {
      const { editor, boton } = await montar()
      boton('negrita').focus()
      tecla(boton('negrita'), 'ArrowRight')
      expect(document.activeElement).toBe(boton('izquierda'))
      expect(tabindex(editor)).toEqual(['-1', '0', '-1', '-1', '-1'])
      tecla(document.activeElement!, 'End')
      expect(document.activeElement).toBe(boton('justificado'))
      tecla(document.activeElement!, 'ArrowRight')
      expect(document.activeElement).toBe(boton('negrita'))
      tecla(document.activeElement!, 'ArrowLeft')
      expect(document.activeElement).toBe(boton('justificado'))
      tecla(document.activeElement!, 'Home')
      expect(document.activeElement).toBe(boton('negrita'))
    })

    it('otras teclas siguen su camino', async () => {
      const { boton } = await montar()
      const evento = new KeyboardEvent('keydown', { key: 'a', bubbles: true, cancelable: true })
      boton('negrita').dispatchEvent(evento)
      expect(evento.defaultPrevented).toBe(false)
    })
  })

  describe('pegar', () => {
    const pegar = (area: HTMLElement, datos: Record<string, string>) => {
      const evento = new Event('paste', { bubbles: true, cancelable: true })
      Object.defineProperty(evento, 'clipboardData', {
        value: { getData: (tipo: string) => datos[tipo] ?? '' },
      })
      area.dispatchEvent(evento)
      return evento
    }

    it('solo inserta el texto, nunca el HTML de donde se copió', async () => {
      const { area } = await montar()
      const evento = pegar(area, {
        'text/html': '<b style="color:red">AJENO</b><script>alert(1)</script>',
        'text/plain': 'solo texto',
      })
      expect(evento.defaultPrevented).toBe(true)
      expect(comandos).toHaveBeenCalledWith('insertText', false, 'solo texto')
      expect(comandos).not.toHaveBeenCalledWith('insertHTML', expect.anything(), expect.anything())
    })

    it('pegar algo sin texto no inserta nada', async () => {
      const { area } = await montar()
      const evento = pegar(area, { 'text/html': '<img src=x>' })
      expect(evento.defaultPrevented).toBe(true)
      expect(comandos).not.toHaveBeenCalledWith('insertText', expect.anything(), expect.anything())
    })

    it('no toca lo que se pega en otros campos del panel', async () => {
      await montar()
      const campo = document.createElement('input')
      document.body.append(campo)
      const evento = new Event('paste', { bubbles: true, cancelable: true })
      campo.dispatchEvent(evento)
      expect(evento.defaultPrevented).toBe(false)
    })

    it('soltar contenido arrastrado dentro del área no lo inserta', async () => {
      const { area } = await montar()
      const evento = new Event('drop', { bubbles: true, cancelable: true })
      area.dispatchEvent(evento)
      expect(evento.defaultPrevented).toBe(true)
    })
  })

  describe('tope de caracteres', () => {
    const guardar = (formulario: HTMLFormElement) => {
      const evento = new Event('submit', { bubbles: true, cancelable: true })
      formulario.dispatchEvent(evento)
      return evento
    }

    it('cerca del tope solo informa; no estorba al guardar', async () => {
      const { area, aviso, formulario } = await montar('<p>x</p>', 100)
      escribir(area, `<p>${'a'.repeat(92)}</p>`)
      expect(aviso.hidden).toBe(false)
      expect(aviso.textContent).toBe('92 / 100 caracteres')
      expect(aviso.getAttribute('data-error')).toBe('false')
      expect(area.hasAttribute('aria-invalid')).toBe(false)
      expect(guardar(formulario).defaultPrevented).toBe(false)
    })

    it('pasado el tope avisa, marca el área y no deja guardar hasta acortarlo', async () => {
      const { area, aviso, formulario } = await montar('<p>x</p>', 100)
      escribir(area, `<p>${'a'.repeat(101)}</p>`)
      expect(aviso.textContent).toBe(
        'El texto lleva 101 caracteres y el máximo es 100. Acórtalo para poder guardar.',
      )
      expect(aviso.getAttribute('data-error')).toBe('true')
      expect(area.getAttribute('aria-invalid')).toBe('true')
      expect(guardar(formulario).defaultPrevented).toBe(true)

      escribir(area, `<p>${'a'.repeat(100)}</p>`)
      expect(area.hasAttribute('aria-invalid')).toBe(false)
      expect(guardar(formulario).defaultPrevented).toBe(false)
    })

    it('lejos del tope no muestra nada', async () => {
      const { area, aviso } = await montar('<p>x</p>', 100)
      escribir(area, '<p>corto</p>')
      expect(aviso.hidden).toBe(true)
      expect(aviso.textContent).toBe('')
    })

    it('cuenta como el servidor: caracteres, un salto por <br> y uno entre párrafos', async () => {
      const textos = [
        '<p>uno</p><p>dos</p>',
        'suelto<div>otro</div>',
        '<p>a<br>b</p>',
        '<div><b>x</b>&nbsp;y</div><div><br></div>',
        '<p> espacios   dobles </p>',
        '<p>a</p><p><br></p><p>b</p>',
        '<p>línea<br><br>otra</p>',
        '<p>😀😀</p>',
        '<ul><li>a</li><li>b</li></ul>',
        '<p style="text-align: center;">Con <b>negrita</b> y <i>cursiva</i></p><p>Otro</p>',
        '<p>a<br></p>',
        'solo texto sin etiquetas',
      ]
      // Con el tope en 1 el aviso siempre dice cuántos caracteres cuenta; un párrafo
      // delante evita los textos de uno solo, que no pasan del tope.
      const { area, aviso } = await montar('<p>x</p>', 1)
      for (const html of textos) {
        escribir(area, `<p>zz</p>${html}`)
        const contado = Number(/lleva (\d+) caracteres/.exec(aviso.textContent ?? '')?.[1] ?? 0)
        expect(contado, html).toBe(Array.from(textoPlanoDe(`<p>zz</p>${html}`)).length)
      }
    })

    it('al guardar se mandan al día todos los editores antes de revisar el tope', async () => {
      const { area, fuente, formulario } = await montar('<p>x</p>', 50)
      area.innerHTML = '<p>cambio sin evento input</p>'
      expect(fuente.value).not.toContain('cambio')
      guardar(formulario)
      expect(fuente.value).toContain('cambio sin evento input')
    })
  })
})
