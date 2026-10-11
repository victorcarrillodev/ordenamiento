/**
 * Admin Panel Client Runtime
 * Bitácora - San Pedro Tlaquepaque
 */
;(function () {
  // 1. Reloj en tiempo real de México
  //
  // Debe producir EXACTAMENTE el mismo formato que el render del servidor en
  // app/actions/admin/page.tsx (hora `hh:mm am/pm`, saludo, día y fecha larga):
  // si difieren, la tarjeta cambia de aspecto al primer tic y se ve como un
  // parpadeo. Antes había además una copia de esta lógica embebida en la
  // página, y las dos escribían en los mismos nodos cada segundo pisándose.
  function saludoPara(hora) {
    if (hora >= 12 && hora < 19) return 'Buenas tardes'
    if (hora >= 19 || hora < 5) return 'Buenas noches'
    return 'Buenos días'
  }

  function updateLiveClock() {
    var timeEl = document.getElementById('live-clock-time')
    var dateEl = document.getElementById('live-clock-date')
    var dayEl = document.getElementById('live-clock-day')
    var greetingEl = document.getElementById('live-clock-greeting')
    if (!timeEl && !dateEl && !dayEl && !greetingEl) return

    try {
      var partes = new Intl.DateTimeFormat('es-MX', {
        timeZone: 'America/Mexico_City',
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: 'numeric',
        minute: 'numeric',
        hour12: false,
      }).formatToParts(new Date())

      var mapa = {}
      for (var i = 0; i < partes.length; i++) mapa[partes[i].type] = partes[i].value

      var hora = parseInt(mapa.hour, 10) || 0
      var minuto = (mapa.minute || '00').padStart(2, '0')
      var hora12 = hora % 12 === 0 ? 12 : hora % 12

      if (timeEl) {
        timeEl.textContent =
          (hora12 < 10 ? '0' + hora12 : hora12) + ':' + minuto + ' ' + (hora < 12 ? 'am' : 'pm')
      }
      if (greetingEl) greetingEl.textContent = saludoPara(hora)
      if (dayEl && mapa.weekday) {
        dayEl.textContent = mapa.weekday.charAt(0).toUpperCase() + mapa.weekday.slice(1)
      }
      // Fecha corta, igual que la que escribe el servidor: la tarjeta es angosta.
      if (dateEl) dateEl.textContent = mapa.day + ' ' + mapa.month.slice(0, 3) + ' ' + mapa.year
    } catch (e) {
      if (timeEl) timeEl.textContent = new Date().toLocaleTimeString('es-MX')
    }
  }

  // 2. Acciones que no se deshacen (borrar una actividad, quitar un archivo):
  //    cualquier formulario con `data-confirmar` pregunta antes de enviarse. Va
  //    aquí y no en un `onsubmit` en línea porque la CSP no admite manejadores
  //    en línea.
  document.addEventListener('submit', function (e) {
    var form = e.target
    var mensaje = form && form.getAttribute ? form.getAttribute('data-confirmar') : null
    if (mensaje && !confirm(mensaje)) e.preventDefault()
  })

  // ── Personalización y marca ───────────────────────────────────────────────
  // El estudio (paletas, vista previa en vivo, fotos, historial…) vive en
  // `public/personalizacion.js`, que no depende de que esta función corra. Aquí solo queda
  // lo de la pantalla «Textos del portal», que todavía no se ha movido allí.
  function initPersonalizacion() {
    initTextosAutoGrow()

    // Sugerencias rápidas de motivo
    document.addEventListener('click', function (e) {
      var sug = e.target.closest('.motivo-suggest')
      if (!sug) return
      var input = document.querySelector('input[name="motivo"]')
      if (input) {
        input.value = sug.getAttribute('data-motivo') || ''
        input.focus()
      }
    })
  }

  /**
   * Auto-grow de los textareas de la mini-página de textos (`.textos`).
   *
   * Cada caja arranca con la altura justa de su contenido pre-guardado y se
   * expande/contrae en cada `input` a su `scrollHeight`: el admin siempre ve
   * todo lo que escribe, sin scroll interno ni tirador manual (ver
   * `.textos textarea` en admin.css). Alcance limitado a `.textos textarea`
   * para no tocar los textareas de otras páginas del panel.
   */
  function initTextosAutoGrow() {
    var cajas = document.querySelectorAll('.textos textarea')
    if (!cajas || cajas.length === 0) return

    function ajustar(caja) {
      caja.style.height = 'auto'
      caja.style.height = caja.scrollHeight + 'px'
    }

    cajas.forEach(function (caja) {
      ajustar(caja)
      caja.addEventListener('input', function () {
        ajustar(caja)
      })
    })
  }

  /**
   * Filtrado en vivo de cualquier tabla del panel, declarado en el markup:
   *
   *   <input data-filter-rows="tbody-id"      // dónde están las filas
   *          data-filter-empty="fila-vacia"   // fila «sin resultados» (opcional)
   *          data-filter-count="contador"     // dónde escribir el total (opcional)
   *          data-filter-noun="cuentas">      // palabra del contador
   *
   * Las filas filtrables llevan `data-search` con el texto donde buscar. Es
   * mejora progresiva: sin JavaScript la tabla se ve completa, que es la
   * respuesta correcta cuando no se puede filtrar.
   */
  function initTableFilter() {
    document.querySelectorAll('input[data-filter-rows]').forEach(function (input) {
      var cuerpo = document.getElementById(input.getAttribute('data-filter-rows'))
      if (!cuerpo) return

      var filaVacia = document.getElementById(input.getAttribute('data-filter-empty') || '')
      var contador = document.getElementById(input.getAttribute('data-filter-count') || '')
      // «singular|plural»: el español no forma el plural quitando la -s
      // (sesiones → sesión), así que ambas formas se declaran en el markup.
      var formas = (input.getAttribute('data-filter-noun') || 'resultado|resultados').split('|')
      var singular = formas[0]
      var plural = formas[1] || formas[0]

      input.addEventListener('input', function () {
        var q = input.value.toLowerCase().trim()
        var filas = cuerpo.querySelectorAll('tr[data-search]')
        var visibles = 0

        filas.forEach(function (fila) {
          var texto = (fila.getAttribute('data-search') || '').toLowerCase()
          var coincide = !q || texto.indexOf(q) !== -1
          fila.style.display = coincide ? '' : 'none'
          if (coincide) visibles++
        })

        if (filaVacia) filaVacia.style.display = visibles === 0 ? '' : 'none'
        if (contador) {
          contador.textContent = visibles + ' ' + (visibles === 1 ? singular : plural)
        }
      })
    })
  }

  /**
   * Confirmación antes de dar de baja una cuenta.
   *
   * Es una acción que no se deshace y el botón está a un clic dentro de un
   * desplegable, justo al lado de los de cambiar rango y contraseña.
   */
  function initEliminarCuenta() {
    document.addEventListener('submit', function (e) {
      var form = e.target
      if (!form || !form.classList || !form.classList.contains('eliminar-cuenta')) return
      if (!confirm('¿Eliminar esta cuenta? La persona perderá el acceso de inmediato.')) {
        e.preventDefault()
      }
    })
  }

  /**
   * Foto de perfil: vista previa antes de guardar y arrastrar-y-soltar.
   *
   * El botón «Guardar foto» nace deshabilitado y solo se activa cuando hay un
   * archivo válido elegido: así no se manda un formulario vacío ni una imagen
   * de 40 MB que el backend va a rechazar después de subirla entera.
   */
  function initAvatar() {
    var input = document.querySelector('[data-avatar-input]')
    if (!input) return

    var preview = document.getElementById(input.getAttribute('data-avatar-preview') || '')
    var fallback = document.getElementById(input.getAttribute('data-avatar-fallback') || '')
    var etiqueta = document.getElementById(input.getAttribute('data-avatar-label') || '')
    var boton = document.getElementById(input.getAttribute('data-avatar-submit') || '')
    var maxBytes = (parseFloat(input.getAttribute('data-avatar-max-mb')) || 5) * 1024 * 1024
    var zona = document.getElementById('avatar-drop')
    var textoInicial = etiqueta ? etiqueta.textContent : ''
    var urlPrevia = null

    function avisar(mensaje) {
      if (etiqueta) etiqueta.textContent = mensaje
      if (boton) boton.disabled = true
    }

    function mostrar(archivo) {
      if (!archivo) {
        if (etiqueta) etiqueta.textContent = textoInicial
        if (boton) boton.disabled = true
        return
      }
      if (archivo.size > maxBytes) {
        input.value = ''
        avisar('La imagen pesa más de 5 MB')
        return
      }
      if (!/^image\/(jpeg|png|webp|gif)$/.test(archivo.type)) {
        input.value = ''
        avisar('Formato no admitido (usa JPG, PNG, WEBP o GIF)')
        return
      }

      if (etiqueta) etiqueta.textContent = archivo.name
      if (boton) boton.disabled = false

      // Se libera la URL anterior: cada createObjectURL retiene el blob en
      // memoria hasta que se revoca, y aquí se puede elegir foto varias veces.
      if (urlPrevia) URL.revokeObjectURL(urlPrevia)
      urlPrevia = URL.createObjectURL(archivo)

      if (preview) {
        preview.src = urlPrevia
      } else if (fallback && zona) {
        var img = document.createElement('img')
        img.className = 'avatar-drop__img'
        img.alt = 'Vista previa de la foto de perfil'
        img.src = urlPrevia
        fallback.replaceWith(img)
        preview = img
        fallback = null
      }
    }

    input.addEventListener('change', function () {
      mostrar(input.files && input.files[0])
    })

    if (!zona) return

    ;['dragenter', 'dragover'].forEach(function (evento) {
      zona.addEventListener(evento, function (e) {
        e.preventDefault()
        zona.classList.add('is-dragging')
      })
    })
    ;['dragleave', 'drop'].forEach(function (evento) {
      zona.addEventListener(evento, function (e) {
        e.preventDefault()
        zona.classList.remove('is-dragging')
      })
    })
    zona.addEventListener('drop', function (e) {
      var archivos = e.dataTransfer && e.dataTransfer.files
      if (!archivos || archivos.length === 0) return
      // DataTransfer se asigna al input para que el archivo viaje con el
      // formulario: soltar sobre la zona equivale a elegirlo con el botón.
      try {
        var dt = new DataTransfer()
        dt.items.add(archivos[0])
        input.files = dt.files
      } catch (err) {
        return
      }
      mostrar(archivos[0])
    })
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initPersonalizacion)
    document.addEventListener('DOMContentLoaded', initTableFilter)
    document.addEventListener('DOMContentLoaded', initAvatar)
    document.addEventListener('DOMContentLoaded', initEliminarCuenta)
  } else {
    initPersonalizacion()
    initTableFilter()
    initAvatar()
    initEliminarCuenta()
  }

  // Inicializar reloj
  setInterval(updateLiveClock, 1000)
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', updateLiveClock)
  } else {
    updateLiveClock()
  }
})()
