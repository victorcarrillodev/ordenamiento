/**
 * Presencia en el panel: avisa al servidor que la persona sigue ahí, y solo
 * cuando es cierto. Con esos avisos la bitácora de sesiones sabe cuánto tiempo
 * se USÓ el panel (y quién está en línea), en lugar de contar el que lleva
 * abierta una sesión que nadie cerró.
 *
 * La persona está presente cuando:
 *  · hay una pestaña del panel a la vista (no oculta ni minimizada), y
 *  · hizo algo en los últimos 2 minutos: un clic, una tecla, desplazarse o mover
 *    el puntero. Un visor de documentos (PDF, vista previa) se lee sin tocar la
 *    página, y el navegador no avisa de lo que pasa dentro de él: mientras el
 *    puntero está encima cuenta hasta 10 minutos sin otra señal.
 *
 * Mientras es así avisa cada 30 s, de inmediato al volver o al cargar una pantalla,
 * y una vez más al ocultar la pestaña o salir de la página, para no perder los
 * últimos segundos. Si no es así, no avisa: no hay nada que contar.
 *
 * No manda duraciones ni lo que se hace: es un «sigo aquí» sin cuerpo. El
 * servidor cuenta el tiempo entre avisos con su reloj (services/sesiones.ts) y
 * tolera huecos de hasta 90 s; uno mayor es una ausencia y no suma.
 *
 * Sin JavaScript no hay medición: la sesión queda sin tiempo de uso, que es lo
 * correcto cuando no se sabe. Si el servidor responde 401 (la sesión terminó, aquí
 * o en otra pestaña) deja de avisar.
 *
 * La dirección del aviso la pone el servidor en `data-latido` de la raíz del panel
 * (así respeta el prefijo público del portal), y se lee cada vez: si la pantalla
 * que se ve no es del panel (Remix cambia el contenido sin recargar el documento),
 * no hay marca y no se avisa.
 */
;(function () {
  'use strict'

  /** Dirección del aviso en la pantalla actual, o null si no es una pantalla del panel. */
  function direccion() {
    var raiz = document.querySelector('[data-latido]')
    return (raiz && raiz.getAttribute('data-latido')) || null
  }

  /** Cada cuánto avisa mientras la persona está. El servidor espera uno cada 30 s. */
  var LATIDO_MS = 30000
  /** Sin hacer nada durante este tiempo, la persona se fue. */
  var AUSENTE_MS = 120000
  /** Tope de un visor de documentos con el puntero encima y sin otra señal. */
  var VISOR_MS = 600000
  /** Nunca dos avisos más juntos que esto. */
  var ENTRE_AVISOS_MS = 3000
  /** Cada cuánto revisa si toca avisar. */
  var REVISION_MS = 5000

  var ultimaInteraccion = Date.now()
  var ultimoAviso = 0
  /** Desde cuándo está el puntero sobre un visor de documentos; 0 si no lo está. */
  var enVisorDesde = 0
  var detenido = false
  var temporizador = null

  function visible() {
    return document.visibilityState === 'visible'
  }

  /** ¿Ha hecho algo hace poco, o está leyendo un documento? (Sin mirar si la pestaña se ve.) */
  function activo(ahora) {
    if (ahora - ultimaInteraccion < AUSENTE_MS) return true
    return enVisorDesde !== 0 && ahora - Math.max(ultimaInteraccion, enVisorDesde) < VISOR_MS
  }

  function presente(ahora) {
    return !detenido && visible() && direccion() !== null && activo(ahora)
  }

  function detener() {
    detenido = true
    if (temporizador !== null) clearInterval(temporizador)
    temporizador = null
  }

  function avisar(ahora) {
    var url = direccion()
    if (detenido || url === null || ahora - ultimoAviso < ENTRE_AVISOS_MS) return
    ultimoAviso = ahora
    try {
      // `keepalive` deja que el aviso salga aunque la página se esté cerrando.
      fetch(url, { method: 'POST', credentials: 'same-origin', cache: 'no-store', keepalive: true })
        .then(function (respuesta) {
          if (respuesta && respuesta.status === 401) detener()
        })
        .catch(function () {
          // Sin red no pasa nada: el siguiente aviso lo intenta otra vez.
        })
    } catch (e) {
      // Un navegador sin fetch no mide.
    }
  }

  /** La persona hizo algo: cuenta como presencia y, si venía de una pausa, avisa al momento. */
  function interaccion() {
    var ahora = Date.now()
    // El puntero y el desplazamiento disparan decenas de eventos por segundo: si la
    // persona acaba de hacer algo y todavía no toca avisar, solo se anota la hora.
    if (ultimoAviso !== 0 && ahora - ultimaInteraccion < 1000 && ahora - ultimoAviso < LATIDO_MS) {
      ultimaInteraccion = ahora
      return
    }
    var veniaDePausa = !presente(ahora)
    ultimaInteraccion = ahora
    if (veniaDePausa || ahora - ultimoAviso >= LATIDO_MS) avisar(ahora)
  }

  function revisar() {
    var ahora = Date.now()
    if (presente(ahora) && ahora - ultimoAviso >= LATIDO_MS) avisar(ahora)
  }

  // Lo que cuenta como «hacer algo». Los eventos de mucho tráfico (puntero,
  // desplazamiento) solo guardan la hora: avisar lo decide `interaccion`.
  var EVENTOS = ['pointerdown', 'keydown', 'wheel', 'touchstart', 'scroll', 'mousemove', 'focusin']
  EVENTOS.forEach(function (nombre) {
    document.addEventListener(nombre, interaccion, { passive: true, capture: true })
  })

  // El puntero sobre un visor de documentos: el navegador no avisa de lo que se
  // hace dentro, así que estar encima es la señal.
  function esVisor(nodo) {
    return !!(nodo && nodo.closest && nodo.closest('iframe, object, embed'))
  }
  document.addEventListener('mouseover', function (e) {
    if (esVisor(e.target) && enVisorDesde === 0) enVisorDesde = Date.now()
  })
  document.addEventListener('mouseout', function (e) {
    if (esVisor(e.target) && !esVisor(e.relatedTarget)) enVisorDesde = 0
  })

  // Al ocultar la pestaña se avisa una última vez, para contar los segundos desde
  // el aviso anterior; al volver a verla se avisa al instante.
  document.addEventListener('visibilitychange', function () {
    if (detenido) return
    if (visible()) {
      interaccion()
    } else if (activo(Date.now())) {
      avisar(Date.now())
    }
  })
  window.addEventListener('pagehide', function () {
    if (!detenido && activo(Date.now())) avisar(Date.now())
  })

  temporizador = setInterval(revisar, REVISION_MS)

  // Cargar una pantalla es presencia (la persona acaba de llegar a ella); si se
  // cargó en una pestaña oculta, avisará cuando la vea.
  if (visible()) interaccion()
})()
