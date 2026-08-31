/**
 * Admin Panel Client Runtime
 * Bitácora Ambiental - San Pedro Tlaquepaque
 */
;(function () {
  // 1. Reloj en tiempo real de México
  function updateLiveClock() {
    var timeEl = document.getElementById('live-clock-time')
    var dateEl = document.getElementById('live-clock-date')
    if (!timeEl && !dateEl) return

    var now = new Date()
    try {
      var timeFmt = new Intl.DateTimeFormat('es-MX', {
        timeZone: 'America/Mexico_City',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true,
      })
      var dateFmt = new Intl.DateTimeFormat('es-MX', {
        timeZone: 'America/Mexico_City',
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })

      if (timeEl) timeEl.textContent = timeFmt.format(now)
      if (dateEl) {
        var formattedDate = dateFmt.format(now)
        dateEl.textContent = formattedDate.charAt(0).toUpperCase() + formattedDate.slice(1)
      }
    } catch (e) {
      if (timeEl) timeEl.textContent = now.toLocaleTimeString('es-MX')
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
      var href = btn.getAttribute('data-href') || '#'
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
        linkEl.href = href
        linkEl.textContent = linktext
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

    // Historial: búsqueda / filtrado en vivo
    var searchInput = document.getElementById('historial-search')
    if (searchInput) {
      searchInput.addEventListener('input', function () {
        var q = searchInput.value.toLowerCase().trim()
        var rows = document.querySelectorAll('#historial-tbody tr[data-search]')
        rows.forEach(function (row) {
          var haystack = (row.getAttribute('data-search') || '').toLowerCase()
          row.style.display = !q || haystack.indexOf(q) !== -1 ? '' : 'none'
        })
        var visible = 0
        rows.forEach(function (r) {
          if (r.style.display !== 'none') visible++
        })
        var emptyRow = document.getElementById('historial-empty')
        if (emptyRow) emptyRow.style.display = visible === 0 ? '' : 'none'
        var countEl = document.getElementById('historial-count')
        if (countEl) countEl.textContent = visible + ' registros'
      })
    }

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

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initPersonalizacion)
  } else {
    initPersonalizacion()
  }

  // Inicializar reloj
  setInterval(updateLiveClock, 1000)
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', updateLiveClock)
  } else {
    updateLiveClock()
  }
})()
