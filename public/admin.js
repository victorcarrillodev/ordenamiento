/* global document, setInterval */
/**
 * Admin Panel Client Runtime
 * BitÃƒÆ’Ã‚Â¡cora Ambiental - San Pedro Tlaquepaque
 */
(function () {
  // 1. Reloj en tiempo real de MÃƒÆ’Ã‚Â©xico
  function updateLiveClock() {
    var timeEl = document.getElementById('live-clock-time');
    var dateEl = document.getElementById('live-clock-date');
    if (!timeEl && !dateEl) return;

    var now = new Date();
    try {
      var timeFmt = new Intl.DateTimeFormat('es-MX', {
        timeZone: 'America/Mexico_City',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true,
      });
      var dateFmt = new Intl.DateTimeFormat('es-MX', {
        timeZone: 'America/Mexico_City',
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      });

      if (timeEl) timeEl.textContent = timeFmt.format(now);
      if (dateEl) {
        var formattedDate = dateFmt.format(now);
        dateEl.textContent = formattedDate.charAt(0).toUpperCase() + formattedDate.slice(1);
      }
    } catch {
      if (timeEl) timeEl.textContent = now.toLocaleTimeString('es-MX');
    }
  }

  // 2. DelegaciÃƒÆ’Ã‚Â³n de eventos para el Calendario Interactivo
  document.addEventListener('click', function (e) {
    // A) Abrir modal al hacer clic en un evento del calendario
    var btn = e.target.closest('.cal-event-btn');
    if (btn) {
      e.preventDefault();
      var tipo = btn.getAttribute('data-tipo') || 'aviso';
      var titulo = btn.getAttribute('data-titulo') || '';
      var fecha = btn.getAttribute('data-fecha') || '';
      var hora = btn.getAttribute('data-hora') || '';
      var ubicacion = btn.getAttribute('data-ubicacion') || '';
      var desc = btn.getAttribute('data-desc') || '';
      var href = btn.getAttribute('data-href') || '#';
      var linktext = btn.getAttribute('data-linktext') || 'Ver mÃƒÆ’Ã‚Â¡s';

      var modal = document.getElementById('cal-detail-modal');
      var tagEl = document.getElementById('cal-m-tag');
      var titleEl = document.getElementById('cal-m-title');
      var fechaEl = document.getElementById('cal-m-fecha');
      var horaEl = document.getElementById('cal-m-hora');
      var lugarEl = document.getElementById('cal-m-lugar');
      var descEl = document.getElementById('cal-m-desc');
      var linkEl = document.getElementById('cal-m-link');

      if (titleEl) titleEl.textContent = titulo;
      if (fechaEl) fechaEl.textContent = 'ÃƒÂ°Ã…Â¸Ã¢â‚¬Å“Ã¢â‚¬Â¦ Fecha: ' + fecha;

      if (horaEl) {
        if (hora) {
          horaEl.textContent = 'ÃƒÂ°Ã…Â¸Ã¢â‚¬Â¢Ã¢â‚¬â„¢ Horario: ' + hora;
          horaEl.style.display = 'block';
        } else {
          horaEl.style.display = 'none';
        }
      }

      if (lugarEl) {
        if (ubicacion) {
          lugarEl.textContent = 'ÃƒÂ°Ã…Â¸Ã¢â‚¬Å“Ã‚Â UbicaciÃƒÆ’Ã‚Â³n: ' + ubicacion;
          lugarEl.style.display = 'block';
        } else {
          lugarEl.style.display = 'none';
        }
      }

      if (descEl) descEl.textContent = desc;
      if (linkEl) {
        linkEl.href = href;
        linkEl.textContent = linktext;
      }

      if (tagEl) {
        if (tipo === 'reunion') {
          tagEl.textContent = 'ÃƒÂ°Ã…Â¸Ã¢â‚¬ËœÃ‚Â¥ ReuniÃƒÆ’Ã‚Â³n de Trabajo';
          tagEl.style.background = '#F0FDF4';
          tagEl.style.color = '#166534';
        } else if (tipo === 'poel') {
          tagEl.textContent = 'ÃƒÂ°Ã…Â¸Ã‚ÂÃ¢â‚¬ÂºÃƒÂ¯Ã‚Â¸Ã‚Â SesiÃƒÆ’Ã‚Â³n POEL';
          tagEl.style.background = '#FEFCE8';
          tagEl.style.color = '#854D0E';
        } else {
          tagEl.textContent = 'ÃƒÂ°Ã…Â¸Ã¢â‚¬Å“Ã‚Â¢ Aviso Oficial';
          tagEl.style.background = '#FAF5FF';
          tagEl.style.color = '#7E22CE';
        }
      }

      if (modal) {
        modal.style.display = 'flex';
      }
      return;
    }

    // B) Cerrar modal al pulsar botÃƒÆ’Ã‚Â³n de cerrar o el fondo oscuro
    if (
      e.target.closest('#cal-m-close') ||
      e.target.closest('#cal-m-btn-close') ||
      (e.target && e.target.id === 'cal-detail-modal')
    ) {
      var m = document.getElementById('cal-detail-modal');
      if (m) m.style.display = 'none';
    }
  });

  // Cerrar modal con tecla Escape
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
      var m = document.getElementById('cal-detail-modal');
      if (m && m.style.display !== 'none') {
        m.style.display = 'none';
      }
    }
  });

  // Inicializar reloj
  setInterval(updateLiveClock, 1000);
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', updateLiveClock);
  } else {
    updateLiveClock();
  }
})();
