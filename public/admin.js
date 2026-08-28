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
    }
  })

  // Inicializar reloj
  setInterval(updateLiveClock, 1000)
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', updateLiveClock)
  } else {
    updateLiveClock()
  }
})()
