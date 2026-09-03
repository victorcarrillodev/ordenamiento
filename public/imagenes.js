/**
 * Respaldo para las imágenes configurables del portal.
 *
 * Las imágenes de la portada las elige el administrador en Personalización, y
 * puede pegar una URL externa que más adelante deje de existir — pasó con una
 * de un dominio del municipio que se retiró. Cuando eso ocurre el navegador
 * enseña el icono de imagen rota, que en la página pública se ve peor que
 * cualquier imagen.
 *
 * Solo actúan las imágenes que declaran `data-imagen-alterna`. A propósito NO
 * se aplica en las vistas previas de Personalización: ahí el administrador
 * necesita ver que su URL está mal, no que se la tapemos.
 */
;(function () {
  'use strict'

  function instalar(img) {
    // `data-imagen-fallida` evita el bucle si la propia alterna tampoco carga.
    if (img.hasAttribute('data-imagen-fallida')) return
    var alterna = img.getAttribute('data-imagen-alterna')
    if (!alterna || img.src === alterna) return

    img.setAttribute('data-imagen-fallida', '1')
    img.src = alterna
  }

  function revisar(img) {
    // `complete` con `naturalWidth` en cero es una imagen que ya falló antes de
    // que este script se registrara: sin esto, las que fallan durante la carga
    // inicial se quedan rotas.
    if (img.complete) {
      if (img.naturalWidth === 0) instalar(img)
      return
    }
    img.addEventListener('error', function () {
      instalar(img)
    })
  }

  /**
   * Lo mismo para los fondos CSS. El hero de la portada es un
   * `background-image`, no un `<img>`, y ahí el navegador no avisa de nada: si
   * la URL no carga, el fondo se queda vacío sin más. Se comprueba cargando la
   * imagen aparte y, si falla, se cambia el fondo por el de respaldo.
   */
  function revisarFondo(el) {
    var alterna = el.getAttribute('data-fondo-alterna')
    if (!alterna) return

    var actual = getComputedStyle(el).backgroundImage
    var m = actual && actual.match(/url\(["']?([^"')]+)["']?\)/)
    if (!m) return

    var url = m[1]
    if (url === alterna || url.indexOf(alterna) !== -1) return

    var sonda = new Image()
    sonda.onerror = function () {
      el.style.backgroundImage = 'url(' + alterna + ')'
    }
    sonda.src = url
  }

  function init() {
    var imgs = document.querySelectorAll('img[data-imagen-alterna]')
    for (var i = 0; i < imgs.length; i++) revisar(imgs[i])

    var fondos = document.querySelectorAll('[data-fondo-alterna]')
    for (var j = 0; j < fondos.length; j++) revisarFondo(fondos[j])
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init)
  } else {
    init()
  }
})()
