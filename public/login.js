/**
 * Login / recuperación — mejoras progresivas de las pantallas de acceso.
 *
 * Todo lo de aquí es opcional: sin JavaScript los formularios siguen
 * funcionando. Por eso el botón de mostrar contraseña se envía `hidden` desde
 * el servidor y es este script el que lo revela; así no queda un control
 * muerto para quien tenga JS desactivado.
 */
;(function () {
  'use strict'

  function marcarBoton(boton, visible) {
    boton.classList.toggle('is-visible', visible)
    boton.setAttribute('aria-pressed', visible ? 'true' : 'false')
    boton.setAttribute('aria-label', visible ? 'Ocultar contraseña' : 'Mostrar contraseña')
  }

  function initToggles() {
    var botones = document.querySelectorAll('[data-password-toggle]')
    for (var i = 0; i < botones.length; i++) {
      ;(function (boton) {
        var input = document.getElementById(boton.getAttribute('data-password-toggle'))
        if (!input) return

        boton.hidden = false
        marcarBoton(boton, false)

        boton.addEventListener('click', function () {
          var mostrar = input.type === 'password'
          input.type = mostrar ? 'text' : 'password'
          marcarBoton(boton, mostrar)
          // Devolver el foco al campo deja el cursor donde estaba en vez de
          // dejarlo atrapado en el botón después de mirar la contraseña.
          input.focus()
        })
      })(botones[i])
    }
  }

  /**
   * Aviso inmediato cuando la confirmación no coincide, sin esperar al viaje
   * al servidor. La validación real sigue estando en el servidor.
   */
  function initConfirmacion() {
    var password = document.getElementById('password')
    var confirmacion = document.getElementById('confirmacion')
    if (!password || !confirmacion) return

    function revisar() {
      if (!confirmacion.value) {
        confirmacion.setCustomValidity('')
        return
      }
      confirmacion.setCustomValidity(
        password.value === confirmacion.value ? '' : 'Las contraseñas no coinciden',
      )
      confirmacion.reportValidity()
    }

    confirmacion.addEventListener('blur', revisar)
    password.addEventListener('input', function () {
      if (confirmacion.value) confirmacion.setCustomValidity('')
    })
  }

  function init() {
    initToggles()
    initConfirmacion()
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init)
  } else {
    init()
  }
})()
