/**
 * Editor de texto con formato (negritas y alineación del párrafo) de «Textos del
 * portal». Es una mejora progresiva: el servidor deja cada campo como un
 * `<textarea>` con el código del texto, y este script lo cambia por una barra de
 * formato y un área editable. El `<textarea>` se oculta pero sigue siendo el
 * campo que viaja con el formulario: aquí se mantiene al día con lo que se ve.
 *
 * Lo que se manda es el HTML del navegador; el backend lo deja canónico (solo
 * párrafos, negritas, saltos de línea y alineación) antes de guardarlo, así que
 * nada de lo que haga o pegue este script llega a la base de datos sin pasar por
 * ese filtro.
 *
 *  1. Barra con negrita y las cuatro alineaciones; marca (aria-pressed) lo que
 *     tiene el texto donde está el cursor. Se recorre con las flechas: un solo
 *     botón por barra entra en el orden de tabulación.
 *  2. Pegar inserta texto sin formato: lo que se ve en el área es lo que se guarda.
 *  3. Avisa cuando el texto pasa del tope y no deja guardar hasta acortarlo.
 *
 * Usa delegación de eventos en `document` y un observador del DOM: sigue
 * funcionando si la página se reemplaza (el envío del formulario la reescribe).
 */
;(function () {
  'use strict'

  var COMANDOS = {
    negrita: 'bold',
    izquierda: 'justifyLeft',
    centro: 'justifyCenter',
    derecha: 'justifyRight',
    justificado: 'justifyFull',
  }
  var BLOQUES = /^(P|DIV|LI|UL|OL|H[1-6]|BLOCKQUOTE|PRE|SECTION|ARTICLE|TR)$/
  /** Marca de un salto de línea dentro de un párrafo al contar caracteres. */
  var SALTO = '\u0001'

  /** Último rango que tuvo cada área: la barra lo recupera al aplicar un formato. */
  var rangos = typeof WeakMap === 'function' ? new WeakMap() : null

  function partes(editor) {
    return {
      area: editor.querySelector('[data-area]'),
      barra: editor.querySelector('[data-barra]'),
      fuente: editor.querySelector('textarea'),
      aviso: editor.querySelector('[data-aviso]'),
    }
  }

  function editorDe(nodo) {
    var elemento = nodo && nodo.nodeType === 3 ? nodo.parentNode : nodo
    return elemento && elemento.closest ? elemento.closest('[data-editor-texto]') : null
  }

  /** Caracteres visibles como los cuenta el backend: los de cada párrafo, un salto por <br> y uno entre párrafos. */
  function medir(area) {
    var parrafos = []
    var actual = null
    function cerrar() {
      if (actual !== null) parrafos.push(actual)
      actual = null
    }
    function recorrer(nodo) {
      for (var hijo = nodo.firstChild; hijo; hijo = hijo.nextSibling) {
        if (hijo.nodeType === 3) {
          actual = (actual || '') + hijo.nodeValue
        } else if (hijo.nodeType === 1) {
          if (hijo.nodeName === 'BR') actual = (actual || '') + SALTO
          else if (BLOQUES.test(hijo.nodeName)) {
            cerrar()
            recorrer(hijo)
            cerrar()
          } else if (hijo.nodeName !== 'SCRIPT' && hijo.nodeName !== 'STYLE') recorrer(hijo)
        }
      }
    }
    recorrer(area)
    cerrar()

    var total = 0
    var con_texto = 0
    parrafos.forEach(function (parrafo) {
      var texto = parrafo
        .replace(/\s+/g, ' ')
        .replace(/ ?\u0001 ?/g, '\n')
        .trim()
        .replace(/^\n+|\n+$/g, '')
        .trim()
      if (texto === '') return
      con_texto += 1
      total += Array.from(texto).length
    })
    return total + Math.max(0, con_texto - 1)
  }

  function mostrarAviso(aviso, mensaje, esError) {
    if (!aviso) return
    if (mensaje === '') {
      if (!aviso.hidden) aviso.hidden = true
      if (aviso.textContent !== '') aviso.textContent = ''
      return
    }
    if (aviso.textContent !== mensaje) aviso.textContent = mensaje
    aviso.setAttribute('data-error', esError ? 'true' : 'false')
    if (aviso.hidden) aviso.hidden = false
  }

  /** Pone el campo de texto al día con el área y avisa si el texto pasa del tope. */
  function sincronizar(editor) {
    var p = partes(editor)
    if (!p.area || !p.fuente) return
    p.fuente.value = p.area.innerHTML

    var maximo = Number(editor.getAttribute('data-max')) || 0
    var largo = medir(p.area)
    var excede = maximo > 0 && largo > maximo
    if (excede) p.area.setAttribute('aria-invalid', 'true')
    else p.area.removeAttribute('aria-invalid')
    if (excede) {
      mostrarAviso(
        p.aviso,
        'El texto lleva ' +
          largo +
          ' caracteres y el máximo es ' +
          maximo +
          '. Acórtalo para poder guardar.',
        true,
      )
    } else if (maximo > 0 && largo >= maximo * 0.9) {
      mostrarAviso(p.aviso, largo + ' / ' + maximo + ' caracteres', false)
    } else {
      mostrarAviso(p.aviso, '', false)
    }
  }

  /** Marca en la barra lo que tiene el texto donde está el cursor. */
  function actualizarBarra(editor) {
    var p = partes(editor)
    if (!p.barra) return
    p.barra.querySelectorAll('[data-comando]').forEach(function (boton) {
      var activo = false
      try {
        activo = document.queryCommandState(COMANDOS[boton.getAttribute('data-comando')])
      } catch (e) {
        activo = false
      }
      var valor = activo ? 'true' : 'false'
      if (boton.getAttribute('aria-pressed') !== valor) boton.setAttribute('aria-pressed', valor)
    })
  }

  /** Cambia el campo de texto por la barra y el área; idempotente. */
  function activar(editor) {
    var p = partes(editor)
    if (!p.area || !p.barra || !p.fuente) return
    if (typeof document.execCommand !== 'function') return // sin soporte: queda el campo de texto

    var recienActivado = !editor.hasAttribute('data-listo')
    editor.setAttribute('data-listo', '')
    if (p.barra.hidden) p.barra.hidden = false
    if (p.area.hidden) p.area.hidden = false
    if (!p.fuente.hidden) p.fuente.hidden = true
    if (!recienActivado) return

    try {
      // Enter abre un párrafo (<p>) y no un <div>: es la estructura que se guarda.
      document.execCommand('defaultParagraphSeparator', false, 'p')
    } catch (e) {
      // Un navegador sin este comando usa <div>, que el backend lee igual.
    }
    var botones = p.barra.querySelectorAll('[data-comando]')
    botones.forEach(function (boton, i) {
      boton.setAttribute('tabindex', i === 0 ? '0' : '-1')
    })
    sincronizar(editor)
  }

  function activarTodos() {
    document.querySelectorAll('[data-editor-texto]').forEach(activar)
  }

  /** Aplica un formato al texto seleccionado. */
  function ejecutar(editor, nombre) {
    var p = partes(editor)
    if (!p.area || !COMANDOS[nombre]) return
    p.area.focus()
    var rango = rangos && rangos.get(p.area)
    var seleccion = window.getSelection()
    if (rango && seleccion && !p.area.contains(seleccion.anchorNode)) {
      seleccion.removeAllRanges()
      seleccion.addRange(rango)
    }
    document.execCommand(COMANDOS[nombre], false, null)
    sincronizar(editor)
    actualizarBarra(editor)
  }

  document.addEventListener('mousedown', function (e) {
    // Pulsar un botón no debe quitar la selección del texto que se va a formatear.
    if (e.target.closest && e.target.closest('[data-barra] [data-comando]')) e.preventDefault()
  })

  document.addEventListener('click', function (e) {
    if (!e.target.closest) return
    var boton = e.target.closest('[data-barra] [data-comando]')
    if (boton) {
      var editor = editorDe(boton)
      if (editor) ejecutar(editor, boton.getAttribute('data-comando'))
      return
    }
    var etiqueta = e.target.closest('.editor-texto__etiqueta')
    if (etiqueta) {
      var contenedor = editorDe(etiqueta)
      var area = contenedor && contenedor.querySelector('[data-area]')
      if (area && !area.hidden) area.focus()
    }
  })

  // Barra de herramientas: las flechas pasan de un botón a otro.
  document.addEventListener('keydown', function (e) {
    var boton = e.target.closest && e.target.closest('[data-barra] [data-comando]')
    if (!boton) return
    var botones = Array.prototype.slice.call(boton.parentNode.querySelectorAll('[data-comando]'))
    var i = botones.indexOf(boton)
    var siguiente = -1
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') siguiente = (i + 1) % botones.length
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp')
      siguiente = (i - 1 + botones.length) % botones.length
    else if (e.key === 'Home') siguiente = 0
    else if (e.key === 'End') siguiente = botones.length - 1
    if (siguiente === -1) return
    e.preventDefault()
    botones.forEach(function (b, j) {
      b.setAttribute('tabindex', j === siguiente ? '0' : '-1')
    })
    botones[siguiente].focus()
  })

  document.addEventListener('input', function (e) {
    var area = e.target.closest && e.target.closest('[data-area]')
    var editor = area && editorDe(area)
    if (editor) sincronizar(editor)
  })

  // Pegar: solo el texto, sin el formato (ni el HTML) de donde se copió.
  document.addEventListener('paste', function (e) {
    var area = e.target.closest && e.target.closest('[data-area]')
    if (!area) return
    e.preventDefault()
    var datos = e.clipboardData || window.clipboardData
    var texto = datos ? datos.getData('text/plain') || datos.getData('Text') : ''
    if (texto) document.execCommand('insertText', false, texto)
  })

  // Soltar contenido arrastrado metería HTML ajeno; se pega con Ctrl+V.
  document.addEventListener('drop', function (e) {
    if (e.target.closest && e.target.closest('[data-area]')) e.preventDefault()
  })

  document.addEventListener('selectionchange', function () {
    var seleccion = window.getSelection()
    if (!seleccion || seleccion.rangeCount === 0) return
    var editor = editorDe(seleccion.anchorNode)
    if (!editor) return
    var area = editor.querySelector('[data-area]')
    if (!area || !area.contains(seleccion.anchorNode)) return
    if (rangos) rangos.set(area, seleccion.getRangeAt(0).cloneRange())
    actualizarBarra(editor)
  })

  // Con el texto fuera del tope no se guarda: se avisa en lugar de recortarlo en silencio.
  document.addEventListener(
    'submit',
    function (e) {
      var formulario = e.target
      if (!formulario.querySelectorAll) return
      var primero = null
      formulario.querySelectorAll('[data-editor-texto][data-listo]').forEach(function (editor) {
        sincronizar(editor)
        var area = editor.querySelector('[data-area]')
        if (area && area.getAttribute('aria-invalid') === 'true' && !primero) primero = area
      })
      if (primero) {
        e.preventDefault()
        e.stopImmediatePropagation()
        primero.focus()
        primero.scrollIntoView({ block: 'center' })
      }
    },
    true,
  )

  function iniciar() {
    activarTodos()
    if (typeof MutationObserver !== 'function' || !document.body) return
    // Un editor que llega después (la página se reescribe al guardar) también se activa.
    new MutationObserver(function () {
      if (document.querySelector('[data-editor-texto]:not([data-listo])')) activarTodos()
    }).observe(document.body, { childList: true, subtree: true })
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', iniciar)
  else iniciar()
})()
