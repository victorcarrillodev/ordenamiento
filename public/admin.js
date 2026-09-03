/**
 * Admin Panel Client Runtime
 * Bitácora Ambiental - San Pedro Tlaquepaque
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
      if (dateEl) dateEl.textContent = mapa.day + ' de ' + mapa.month + ' de ' + mapa.year
    } catch (e) {
      if (timeEl) timeEl.textContent = new Date().toLocaleTimeString('es-MX')
    }
  }

  // 2. Delegación de eventos para el Calendario Interactivo
  document.addEventListener('click', function (e) {
    // A) Abrir modal al hacer clic en un evento del calendario
    var btn = e.target.closest('.cal-event-btn')
    if (btn) {
      e.preventDefault()
      var tipo = btn.getAttribute('data-tipo') || 'aviso'
      var titulo = btn.getAttribute('data-titulo') || ''
      var fecha = btn.getAttribute('data-fecha') || ''
      var hora = btn.getAttribute('data-hora') || ''
      var ubicacion = btn.getAttribute('data-ubicacion') || ''
      var desc = btn.getAttribute('data-desc') || ''
      var href = btn.getAttribute('data-href') || ''
      var linktext = btn.getAttribute('data-linktext') || 'Ver más'

      var modal = document.getElementById('cal-detail-modal')
      var tagEl = document.getElementById('cal-m-tag')
      var titleEl = document.getElementById('cal-m-title')
      var fechaEl = document.getElementById('cal-m-fecha')
      var horaEl = document.getElementById('cal-m-hora')
      var lugarEl = document.getElementById('cal-m-lugar')
      var descEl = document.getElementById('cal-m-desc')
      var linkEl = document.getElementById('cal-m-link')
      // El icono vive en su propio elemento; el texto se escribe en el span
      // interior para no borrarlo. Si no existe, se cae al contenedor.
      var tagIcon = document.getElementById('cal-m-tag-icon')
      var tagTxt = document.getElementById('cal-m-tag-txt') || tagEl
      var fechaTxt = document.getElementById('cal-m-fecha-txt') || fechaEl
      var horaTxt = document.getElementById('cal-m-hora-txt') || horaEl
      var lugarTxt = document.getElementById('cal-m-lugar-txt') || lugarEl

      if (titleEl) titleEl.textContent = titulo
      if (fechaTxt) fechaTxt.textContent = 'Fecha: ' + fecha

      if (horaEl) {
        if (hora) {
          if (horaTxt) horaTxt.textContent = 'Horario: ' + hora
          horaEl.style.display = 'block'
        } else {
          horaEl.style.display = 'none'
        }
      }

      if (lugarEl) {
        if (ubicacion) {
          if (lugarTxt) lugarTxt.textContent = 'Ubicación: ' + ubicacion
          lugarEl.style.display = 'block'
        } else {
          lugarEl.style.display = 'none'
        }
      }

      if (descEl) descEl.textContent = desc
      if (linkEl) {
        // Sin destino no se enseña el botón: un enlace a `#` que no lleva a
        // ningún lado es peor que no ofrecerlo.
        if (href) {
          linkEl.href = href
          linkEl.textContent = linktext
          linkEl.hidden = false
        } else {
          linkEl.removeAttribute('href')
          linkEl.hidden = true
        }
      }

      if (tagEl) {
        var icono = 'mdi:bullhorn-outline'
        var etiqueta = 'Aviso Oficial'
        var fondo = '#FAF5FF'
        var tinta = '#7E22CE'
        if (tipo === 'reunion') {
          icono = 'mdi:account-group-outline'
          etiqueta = 'Reunión de Trabajo'
          fondo = '#F0FDF4'
          tinta = '#166534'
        } else if (tipo === 'poel') {
          icono = 'mdi:bank-outline'
          etiqueta = 'Sesión POEL'
          fondo = '#FEFCE8'
          tinta = '#854D0E'
        }
        if (tagIcon) tagIcon.setAttribute('icon', icono)
        if (tagTxt) tagTxt.textContent = etiqueta
        tagEl.style.background = fondo
        tagEl.style.color = tinta
      }

      if (modal) {
        modal.style.display = 'flex'
      }
      return
    }

    // B) Cerrar modal al pulsar botón de cerrar o el fondo oscuro
    if (
      e.target.closest('#cal-m-close') ||
      e.target.closest('#cal-m-btn-close') ||
      (e.target && e.target.id === 'cal-detail-modal')
    ) {
      var m = document.getElementById('cal-detail-modal')
      if (m) m.style.display = 'none'
    }
  })

  // Cerrar modal con tecla Escape
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
      var m = document.getElementById('cal-detail-modal')
      if (m && m.style.display !== 'none') {
        m.style.display = 'none'
      }
      var mp = document.getElementById('mini-preview-modal')
      if (mp) mp.classList.remove('mp-modal--abierto')
    }
  })

  // ── Personalización y Marca (CSP-compliant, sin onclick inline) ──────────
  function initPersonalizacion() {
    // Mini preview modal
    var btnOpenPreview = document.getElementById('btn-open-preview')
    var btnClosePreview = document.getElementById('btn-close-preview')
    var miniModal = document.getElementById('mini-preview-modal')
    if (btnOpenPreview && miniModal) {
      btnOpenPreview.addEventListener('click', function () {
        miniModal.classList.add('mp-modal--abierto')
      })
    }
    if (btnClosePreview && miniModal) {
      btnClosePreview.addEventListener('click', function () {
        miniModal.classList.remove('mp-modal--abierto')
      })
    }
    if (miniModal) {
      miniModal.addEventListener('click', function (e) {
        if (e.target === miniModal) miniModal.classList.remove('mp-modal--abierto')
      })
    }
    initMiniPreviewBindings()

    // Paletas rápidas en 1 clic
    document.addEventListener('click', function (e) {
      var palette = e.target.closest('.palette-btn')
      if (palette) {
        var map = {
          'c-primario': palette.getAttribute('data-primario'),
          'c-acento': palette.getAttribute('data-acento'),
          'c-secundario': palette.getAttribute('data-secundario'),
          'c-nav-bg': palette.getAttribute('data-nav-bg'),
          'c-nav-text': palette.getAttribute('data-nav-text'),
          'c-footer-bg': palette.getAttribute('data-footer-bg'),
          'c-footer-text': palette.getAttribute('data-footer-text'),
        }
        Object.keys(map).forEach(function (id) {
          var val = map[id]
          var el = document.getElementById(id)
          if (el && val) {
            el.value = val
            el.dispatchEvent(new Event('input', { bubbles: true }))
            el.dispatchEvent(new Event('change', { bubbles: true }))
          }
        })
        // también actualizar los inputs de texto sincronizados
        document.querySelectorAll('.sync-color-text').forEach(function (inp) {
          var target = inp.getAttribute('data-target')
          var src = document.getElementById(target)
          if (src) inp.value = src.value
        })
      }

      // Agregar foto al carrusel
      var addHero = e.target.closest('#btn-add-hero')
      if (addHero) {
        addHeroImageInput()
      }

      // Quitar fila de hero
      var rm = e.target.closest('.hero-remove')
      if (rm) {
        var row = rm.closest('.hero-image-row')
        if (row) row.remove()
      }

      // Sugerencias rápidas de motivo
      var sug = e.target.closest('.motivo-suggest')
      if (sug) {
        var motivo = sug.getAttribute('data-motivo') || ''
        var input =
          document.getElementById('motivo-input-usuario') ||
          document.getElementById('motivo-input-panel') ||
          document.querySelector('input[name="motivo"]')
        if (input) {
          input.value = motivo
          input.focus()
        }
      }
    })

    // Sincronización color texto -> color picker (input/change delegada)
    document.addEventListener('input', function (e) {
      var t = e.target
      if (t && t.classList && t.classList.contains('sync-color-text')) {
        var targetId = t.getAttribute('data-target')
        var picker = document.getElementById(targetId)
        if (picker) {
          // validar que parezca hex
          var v = t.value.trim()
          if (/^#[0-9A-Fa-f]{3,8}$/.test(v)) {
            picker.value = v
          }
        }
      }
    })

    // Confirmar restaurar versión
    document.addEventListener('submit', function (e) {
      var form = e.target
      if (form && form.classList && form.classList.contains('restore-form')) {
        if (!confirm('¿Seguro que deseas restaurar la configuración exacta de este registro?')) {
          e.preventDefault()
        }
      }
    })

    // Ocultar imágenes rotas del hero
    document.querySelectorAll('.hero-img-preview').forEach(function (img) {
      img.addEventListener('error', function () {
        img.style.display = 'none'
      })
    })
  }

  // Refleja en vivo, dentro de la maqueta del mini-previsualizador, lo que se
  // va escribiendo en la pestaña "Vista de Usuario". Si esa pestaña no está
  // activa los campos no existen en el DOM y los listeners simplemente no se
  // registran: la maqueta queda mostrando el último valor guardado.
  function initMiniPreviewBindings() {
    var COLOR_TARGETS = {
      'c-primario': [{ id: 'mp-btn1', prop: 'backgroundColor' }],
      'c-acento': [
        { id: 'mp-resaltado', prop: 'color' },
        { id: 'mp-card-icon-1', prop: 'color' },
        { id: 'mp-card-icon-2', prop: 'color' },
        { id: 'mp-card-icon-3', prop: 'color' },
        { id: 'mp-card-icon-4', prop: 'color' },
      ],
      'c-secundario': [
        { id: 'mp-btn2', prop: 'borderColor' },
        { id: 'mp-btn2', prop: 'color' },
      ],
      'c-nav-bg': [{ id: 'mp-nav', prop: 'backgroundColor' }],
      'c-nav-text': [{ id: 'mp-nav', prop: 'color' }],
      'c-footer-bg': [{ id: 'mp-footer', prop: 'backgroundColor' }],
      'c-footer-text': [{ id: 'mp-footer', prop: 'color' }],
    }

    Object.keys(COLOR_TARGETS).forEach(function (id) {
      var input = document.getElementById(id)
      if (!input) return
      input.addEventListener('input', function () {
        COLOR_TARGETS[id].forEach(function (t) {
          var el = document.getElementById(t.id)
          if (el) el.style[t.prop] = input.value
        })
      })
    })

    var TEXT_TARGETS = {
      txt_hero_cintillo: 'mp-cintillo',
      txt_hero_titulo: 'mp-titulo',
      txt_hero_resaltado: 'mp-resaltado',
      txt_hero_subtitulo: 'mp-subtitulo',
      txt_hero_btn1: 'mp-btn1',
      txt_hero_btn2: 'mp-btn2',
      ico_card1: 'mp-card-icon-1',
      txt_card1_titulo: 'mp-card-titulo-1',
      ico_card2: 'mp-card-icon-2',
      txt_card2_titulo: 'mp-card-titulo-2',
      ico_card3: 'mp-card-icon-3',
      txt_card3_titulo: 'mp-card-titulo-3',
      ico_card4: 'mp-card-icon-4',
      txt_card4_titulo: 'mp-card-titulo-4',
      txt_footer_entidad: 'mp-footer-entidad',
      txt_footer_email: 'mp-footer-email',
    }

    Object.keys(TEXT_TARGETS).forEach(function (name) {
      var input = document.querySelector('[name="' + name + '"]')
      var el = document.getElementById(TEXT_TARGETS[name])
      if (!input || !el) return
      input.addEventListener('input', function () {
        el.textContent = input.value
      })
    })

    var LOGO_TARGETS = { logo_navbar: 'mp-nav-logo', logo_footer: 'mp-footer-logo' }
    Object.keys(LOGO_TARGETS).forEach(function (name) {
      var input = document.querySelector('[name="' + name + '"]')
      var el = document.getElementById(LOGO_TARGETS[name])
      if (!input || !el) return
      input.addEventListener('input', function () {
        if (!input.value) return
        // Sin logo guardado la maqueta muestra un <span> de respaldo (emoji);
        // hay que sustituirlo por un <img> real la primera vez que se escribe una URL.
        if (el.tagName !== 'IMG') {
          var img = document.createElement('img')
          img.id = el.id
          img.alt = 'Logo'
          el.replaceWith(img)
          el = img
        }
        el.src = input.value
      })
    })

    var hero = document.getElementById('mp-hero')
    if (hero) {
      document.addEventListener('input', function (e) {
        if (!e.target || e.target.name !== 'hero_imagenes[]') return
        var inputs = document.querySelectorAll('input[name="hero_imagenes[]"]')
        for (var i = 0; i < inputs.length; i++) {
          if (inputs[i].value) {
            hero.style.backgroundImage =
              'linear-gradient(180deg, rgba(15,23,42,.35), rgba(15,23,42,.65)), url("' +
              inputs[i].value.replace(/"/g, '') +
              '")'
            return
          }
        }
      })
    }
  }

  function addHeroImageInput() {
    var container = document.getElementById('hero-images-container')
    if (!container) return
    var count = container.querySelectorAll('.hero-image-row').length + 1
    var row = document.createElement('div')
    row.className = 'hero-image-row'
    row.style.cssText =
      'display: flex; gap: 10px; align-items: center; background: #f8fafc; padding: 10px; border-radius: 8px; border: 1px solid #e2e8f0;'
    var label = document.createElement('span')
    label.style.cssText = 'font-size: 12px; font-weight: 800; color: #64748b; width: 60px;'
    label.textContent = 'Foto #' + count
    var input = document.createElement('input')
    input.type = 'text'
    input.name = 'hero_imagenes[]'
    input.placeholder = 'https://ejemplo.com/foto.jpg'
    input.style.cssText =
      'flex: 1; border: 1px solid #cbd5e1; border-radius: 6px; padding: 8px 10px; font-size: 13px;'
    var btn = document.createElement('button')
    btn.type = 'button'
    btn.className = 'hero-remove'
    btn.style.cssText =
      'background: #fee2e2; color: #b91c1c; border: none; border-radius: 6px; padding: 8px 12px; font-size: 12px; font-weight: 700; cursor: pointer;'
    btn.textContent = '✕ Quitar'
    row.appendChild(label)
    row.appendChild(input)
    row.appendChild(btn)
    container.appendChild(row)
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
