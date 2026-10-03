/**
 * Comportamiento del formulario de participación (el ciudadano y las capturas
 * presenciales del panel). Es una mejora progresiva: el servidor ya pinta cada
 * parte en su estado correcto y valida lo mismo, así que sin JavaScript el
 * formulario sigue siendo correcto; esto solo lo hace responder al instante.
 *
 *  1. Contadores «n / máximo» de los campos con tope de caracteres.
 *  2. «Ubicación de la propuesta»: con «Lugar o predio específico» el domicilio
 *     o referencia y la colonia o zona son obligatorios (con asterisco); con
 *     «Todo el municipio» son opcionales.
 *  3. Listas con «Otra»: abren el campo para especificarla solo con esa opción.
 *  4. Tope de saltos de línea de la propuesta (cada uno ocupa un renglón del acuse).
 *
 * Usa delegación de eventos en `document`: sigue funcionando si la página se
 * reemplaza (el envío por XHR reescribe el documento al fallar la validación).
 */
;(function () {
  'use strict'

  var CAMPOS_DE_UBICACION = ['calle', 'colonia']
  var MARCA = 'data-marca-obligatorio'

  /** Caracteres como los cuenta el servidor: un emoji es uno, no dos. */
  function largo(texto) {
    return Array.from(texto || '').length
  }

  function actualizarContador(campo) {
    var contador = document.querySelector('[data-contador="' + campo.id + '"]')
    if (!contador) return
    var maximo = Number(contador.getAttribute('data-max')) || 0
    var actual = largo(campo.value)
    contador.textContent = actual + ' / ' + maximo
    contador.setAttribute(
      'data-estado',
      actual >= maximo ? 'lleno' : maximo > 0 && actual >= maximo * 0.9 ? 'cerca' : '',
    )
  }

  function saltosDe(campo) {
    return campo.value.split('\n').length - 1
  }

  /** Lo que pase del tope de saltos de línea (al pegar texto) se convierte en espacios. */
  function limitarSaltos(campo) {
    var maximo = Number(campo.getAttribute('data-max-saltos')) || 0
    if (!maximo || saltosDe(campo) <= maximo) return
    var partes = campo.value.split('\n')
    campo.value = partes.slice(0, maximo + 1).join('\n') + ' ' + partes.slice(maximo + 1).join(' ')
  }

  function iniciarContadores() {
    document.querySelectorAll('[data-contador]').forEach(function (contador) {
      var campo = document.getElementById(contador.getAttribute('data-contador'))
      if (campo) actualizarContador(campo)
    })
  }

  /** Pone o quita el asterisco de la etiqueta de un campo. */
  function marcarObligatorio(campo, obligatorio) {
    campo.required = obligatorio
    if (obligatorio) campo.setAttribute('aria-required', 'true')
    else campo.removeAttribute('aria-required')

    var etiqueta = document.querySelector('label[for="' + campo.id + '"]')
    if (!etiqueta) return
    var marca = etiqueta.querySelector('[' + MARCA + ']')
    if (obligatorio && !marca) {
      // Las etiquetas del panel traen su propio asterisco (.req); las del portal, un span.
      if (etiqueta.querySelector('.req') || etiqueta.querySelector('[aria-hidden="true"]')) return
      marca = document.createElement('span')
      marca.setAttribute(MARCA, '')
      marca.setAttribute('aria-hidden', 'true')
      marca.style.color = '#8c1d3d'
      marca.textContent = ' *'
      etiqueta.appendChild(marca)
    } else if (!obligatorio) {
      if (marca) marca.remove()
      etiqueta.querySelectorAll('.req, [aria-hidden="true"]').forEach(function (el) {
        el.remove()
      })
    }
  }

  function aplicarAlcance(formulario, alcance) {
    var especifico = alcance === 'especifico'
    CAMPOS_DE_UBICACION.forEach(function (nombre) {
      var campo = formulario.querySelector(
        '[data-autocomplete-group] input[name$="' + nombre + '"]',
      )
      if (campo) marcarObligatorio(campo, especifico)
    })
    var nota = document.getElementById('ubicacion-nota')
    if (nota) {
      nota.textContent = especifico
        ? 'Indica el domicilio o una referencia que permita identificar el lugar o predio, y su colonia o zona.'
        : 'La propuesta abarca todo el municipio: los datos de ubicación son opcionales.'
    }
  }

  function iniciarAlcance() {
    document.querySelectorAll('input[name="alcance_ubicacion"]:checked').forEach(function (radio) {
      var formulario = radio.closest('form')
      if (formulario) aplicarAlcance(formulario, radio.value)
    })
  }

  /** Muestra u oculta el campo de «Otra» de una lista. Oculto no se envía. */
  function aplicarOtra(lista) {
    var id = lista.getAttribute('data-otra')
    var contenedor = id && document.getElementById(id)
    if (!contenedor) return
    var visible = lista.value === 'Otra'
    contenedor.hidden = !visible
    contenedor.querySelectorAll('input').forEach(function (campo) {
      campo.disabled = !visible
    })
  }

  function iniciarListas() {
    document.querySelectorAll('select[data-otra]').forEach(aplicarOtra)
  }

  document.addEventListener('input', function (evento) {
    var campo = evento.target
    if (campo && campo.hasAttribute && campo.hasAttribute('data-max-saltos')) limitarSaltos(campo)
    if (campo && campo.id && document.querySelector('[data-contador="' + campo.id + '"]')) {
      actualizarContador(campo)
    }
  })

  // Con el tope de saltos alcanzado, Enter no agrega otro renglón.
  document.addEventListener('keydown', function (evento) {
    var campo = evento.target
    if (evento.key !== 'Enter' || !campo || !campo.hasAttribute) return
    var maximo = Number(campo.getAttribute('data-max-saltos')) || 0
    if (maximo && saltosDe(campo) >= maximo) evento.preventDefault()
  })

  document.addEventListener('change', function (evento) {
    var campo = evento.target
    if (!campo || !campo.matches) return
    if (campo.matches('input[name="alcance_ubicacion"]')) {
      var formulario = campo.closest('form')
      if (formulario) aplicarAlcance(formulario, campo.value)
    } else if (campo.matches('select[data-otra]')) {
      aplicarOtra(campo)
    }
  })

  function iniciar() {
    iniciarContadores()
    iniciarAlcance()
    iniciarListas()
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', iniciar)
  else iniciar()
})()
