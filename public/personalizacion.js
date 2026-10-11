/* Personalización y marca · el estudio de edición.
 *
 * Qué hace, sobre el HTML que ya sale completo del servidor (los atributos `data-pz-*` son
 * el contrato; ver app/actions/admin/personalizacion-*.tsx):
 *
 *  · Repinta la maqueta mientras se edita: cada color es una variable CSS en `.pz-vista`.
 *  · Recalcula el contraste de los textos contra su fondo y avisa cuando algo deja de leerse.
 *  · Marca qué cambió, lo resume ("Cambios que se guardarán") y avisa antes de perderlo.
 *  · Aplica paletas, deshace por campo o todo, ordena las fotos de la portada y reparte los
 *    archivos que se arrastran.
 *
 * Nada de esto es necesario para guardar: sin JavaScript el formulario se envía igual.
 *
 * Remix cambia el contenido de la página sin recargar el documento y NO ejecuta los scripts
 * del `<head>` de la página que llega (ver admin-layout.tsx). Por eso aquí no hay un
 * `DOMContentLoaded` por página: los eventos se atienden en `document` (delegación) y un
 * MutationObserver arranca cada formulario `.pz` que aparezca, sea en la carga completa o al
 * navegar desde otra pantalla del panel.
 *
 * Las fórmulas de color repiten las de app/utils/color.ts; una prueba comprueba que den lo
 * mismo (app/ui/admin/personalizacion-script.test.ts).
 */
;(function () {
  'use strict'

  if (window.__pzCargado) return
  window.__pzCargado = true

  // ── Color (espejo de app/utils/color.ts) ──────────────────────────────────

  function normalizarHex(valor) {
    if (typeof valor !== 'string') return null
    var m = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(valor.trim())
    if (!m) return null
    var c = m[1].toLowerCase()
    if (c.length === 3)
      c = c.charAt(0) + c.charAt(0) + c.charAt(1) + c.charAt(1) + c.charAt(2) + c.charAt(2)
    return '#' + c
  }

  function canales(hex) {
    var h = normalizarHex(hex)
    if (!h) return null
    return [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)]
  }

  function luminancia(c) {
    function canal(v) {
      var x = v / 255
      return x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4)
    }
    return 0.2126 * canal(c[0]) + 0.7152 * canal(c[1]) + 0.0722 * canal(c[2])
  }

  function razonDeContraste(a, b) {
    var ca = canales(a)
    var cb = canales(b)
    if (!ca || !cb) return null
    var la = luminancia(ca)
    var lb = luminancia(cb)
    return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05)
  }

  function nivelDeContraste(razon) {
    if (razon >= 7) return 'aaa'
    if (razon >= 4.5) return 'aa'
    if (razon >= 3) return 'grande'
    return 'bajo'
  }

  var ETIQUETA_NIVEL = {
    aaa: 'Excelente',
    aa: 'Bueno',
    grande: 'Solo texto grande',
    bajo: 'Insuficiente',
  }

  function textoDeContraste(razon) {
    return (
      (Math.round(razon * 10) / 10).toFixed(1) + ':1 · ' + ETIQUETA_NIVEL[nivelDeContraste(razon)]
    )
  }

  function redondear(n) {
    return Math.round(n * 1000) / 1000
  }

  function rgba(hex, alfa) {
    var c = canales(hex)
    if (!c) return null
    return 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',' + redondear(alfa) + ')'
  }

  var CAPA_BASE = { inicio: 0.82, centro: 0.7, fin: 0.75 }
  var CAPA_MIN = 30
  var CAPA_MAX = 100

  function capaDePortada(primario, intensidad) {
    var n = Number(intensidad)
    if (!isFinite(n)) n = 100
    var k = Math.min(CAPA_MAX, Math.max(CAPA_MIN, Math.round(n))) / 100
    return {
      inicio: rgba('#0f1117', CAPA_BASE.inicio * k),
      centro: rgba(primario, CAPA_BASE.centro * k) || rgba('#8c1d3d', CAPA_BASE.centro * k),
      fin: rgba('#0f1117', CAPA_BASE.fin * k),
    }
  }

  // ── Variables de la maqueta ────────────────────────────────────────────────

  /** Color (clave del formulario) → variables CSS de la maqueta que cambia. */
  var VARIABLES = {
    primario: ['--v-primario'],
    acento: ['--v-acento'],
    secundario: ['--v-secundario'],
    navbarFondo: ['--v-menu-fondo'],
    navbarTexto: ['--v-menu-texto'],
    footerFondo: ['--v-pie-fondo'],
    footerTexto: ['--v-pie-texto'],
    sidebarFondo: ['--v-lateral-fondo'],
    sidebarTexto: ['--v-lateral-texto'],
    topbarFondo: ['--v-barra-fondo'],
    topbarTexto: ['--v-barra-texto'],
    colorAcento: ['--v-acento'],
    adminBg: ['--v-fondo'],
  }

  /** Color → variable del formulario con la que los selectores de imagen pintan su fondo. */
  var FONDOS_DE_IMAGEN = {
    navbarFondo: '--pz-fondo-menu',
    footerFondo: '--pz-fondo-pie',
    sidebarFondo: '--pz-fondo-lateral',
  }

  var MAX_IMAGEN_BYTES = 20 * 1024 * 1024
  var SEGUNDOS_POR_FOTO = 5

  // ── Utilidades del DOM ─────────────────────────────────────────────────────

  function todos(selector, raiz) {
    return Array.prototype.slice.call((raiz || document).querySelectorAll(selector))
  }

  function formulario() {
    return document.querySelector('form.pz[data-pz]')
  }

  function formularioDe(elemento) {
    return elemento && elemento.closest ? elemento.closest('form.pz[data-pz]') : null
  }

  function disparar(elemento, tipo) {
    elemento.dispatchEvent(new Event(tipo, { bubbles: true }))
  }

  function pesoLegible(bytes) {
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1024 * 1024) return Math.round(bytes / 1024) + ' KB'
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
  }

  /** Las mismas reglas que `isSafeImageUrl` del servidor: ruta del sitio o https. */
  function direccionDeImagen(valor) {
    var url = String(valor || '').trim()
    if (url === '') return { ok: true, vacia: true, url: '' }
    if (/["'()\\\s]/.test(url)) {
      return { ok: false, motivo: 'La dirección no puede llevar espacios, comillas ni paréntesis.' }
    }
    if (/^http:\/\//i.test(url)) {
      return { ok: false, motivo: 'Las direcciones http:// no se muestran: usa https://.' }
    }
    if (url.charAt(0) === '/' || /^https:\/\//i.test(url)) return { ok: true, url: url }
    return {
      ok: false,
      motivo: 'Usa una ruta del sitio (que empiece con /) o una dirección https://.',
    }
  }

  function esImagen(archivo) {
    return archivo && typeof archivo.type === 'string' && archivo.type.indexOf('image/') === 0
  }

  /** Motivo por el que un archivo no se puede subir, o '' si está bien. */
  function problemaDeArchivo(archivo) {
    if (!esImagen(archivo)) return archivo.name + ' no es una imagen.'
    if (archivo.size > MAX_IMAGEN_BYTES) {
      return archivo.name + ' pesa ' + pesoLegible(archivo.size) + ' y el máximo es 20 MB.'
    }
    return ''
  }

  // Direcciones temporales de los archivos elegidos, para verlos antes de guardarlos.
  var urlsTemporales = []
  function urlTemporal(archivo) {
    var url = URL.createObjectURL(archivo)
    urlsTemporales.push(url)
    return url
  }

  // ── Color: lectura y escritura ─────────────────────────────────────────────

  function selectoresDeColor(form) {
    return todos('[data-pz-color]', form)
  }

  function colorDe(form, clave) {
    var c = form.querySelector('[data-pz-color="' + clave + '"]')
    return c ? c.value : null
  }

  function maqueta(form) {
    return form.querySelector('[data-pz-vista]')
  }

  /** Lleva los colores del formulario a las variables de la maqueta y a los fondos de las imágenes. */
  function pintarMaqueta(form) {
    var vista = maqueta(form)
    selectoresDeColor(form).forEach(function (input) {
      var clave = input.getAttribute('data-pz-color')
      var variables = VARIABLES[clave] || []
      if (vista)
        variables.forEach(function (v) {
          vista.style.setProperty(v, input.value)
        })
      if (FONDOS_DE_IMAGEN[clave]) form.style.setProperty(FONDOS_DE_IMAGEN[clave], input.value)
    })
    pintarCapa(form)
  }

  function pintarCapa(form) {
    var vista = maqueta(form)
    var control = form.querySelector('[data-pz-capa]')
    var primario = colorDe(form, 'primario')
    if (!vista || !control || !primario) return
    var capa = capaDePortada(primario, control.value)
    vista.style.setProperty('--v-capa-inicio', capa.inicio)
    vista.style.setProperty('--v-capa-centro', capa.centro)
    vista.style.setProperty('--v-capa-fin', capa.fin)
    var salida = form.querySelector('[data-pz-capa-valor]')
    if (salida) salida.textContent = control.value + ' %'
  }

  function pintarContrastes(form) {
    todos('[data-pz-contraste]', form).forEach(function (fila) {
      var clave = fila.getAttribute('data-clave-texto')
      var texto = clave ? colorDe(form, clave) : fila.getAttribute('data-texto-fijo')
      var fondo = colorDe(form, fila.getAttribute('data-clave-fondo'))
      var razon = razonDeContraste(texto, fondo)
      if (razon === null) return
      var nivel = nivelDeContraste(razon)
      fila.className =
        fila.className.replace(/\bpz-contraste--\w+/g, '').trim() + ' pz-contraste--' + nivel
      var etiqueta = fila.querySelector('[data-pz-razon]')
      if (etiqueta) etiqueta.textContent = textoDeContraste(razon)
      var muestra = fila.querySelector('.pz-contraste__muestra')
      if (muestra) {
        muestra.style.color = texto
        muestra.style.background = fondo
      }
    })
  }

  /** Pone un color en su selector y avisa, como si la persona lo hubiera elegido. */
  function ponerColor(form, clave, valor) {
    var input = form.querySelector('[data-pz-color="' + clave + '"]')
    var hex = normalizarHex(valor)
    if (!input || !hex) return
    input.value = hex
    disparar(input, 'input')
  }

  function sincronizarHex(input) {
    var texto = document.querySelector('[data-pz-hex="' + input.id + '"]')
    if (texto && document.activeElement !== texto) texto.value = input.value
  }

  // ── Paletas ────────────────────────────────────────────────────────────────

  function coloresDeLaPaleta(boton) {
    try {
      return JSON.parse(boton.getAttribute('data-colores') || '{}')
    } catch (e) {
      return {}
    }
  }

  function marcarPaletaEnUso(form) {
    var botones = todos('[data-pz-paleta]', form)
    if (botones.length === 0) return
    var activa = false
    botones.forEach(function (boton) {
      var colores = coloresDeLaPaleta(boton)
      var claves = Object.keys(colores)
      var igual =
        claves.length > 0 &&
        claves.every(function (clave) {
          return colorDe(form, clave) === colores[clave]
        })
      boton.setAttribute('aria-pressed', igual ? 'true' : 'false')
      if (igual) activa = true
    })
    var nota = form.querySelector('[data-pz-paleta-nota]')
    if (nota) nota.hidden = activa
  }

  // ── Fotos de la portada ────────────────────────────────────────────────────

  function filasDeFotos(form) {
    return todos('[data-pz-foto]', form)
  }

  function archivosDeLaPortada(form) {
    var input = form.querySelector('[data-pz-archivo-hero]')
    return input && input.files ? Array.prototype.slice.call(input.files) : []
  }

  /** Renumera las filas, actualiza sus textos accesibles y el aviso de cuántas fotos hay. */
  function ordenarFotos(form) {
    var filas = filasDeFotos(form)
    filas.forEach(function (fila, i) {
      var n = fila.querySelector('[data-pz-foto-n]')
      if (n) n.textContent = String(i + 1)
      var campo = fila.querySelector('[data-pz-url-foto]')
      if (campo) campo.setAttribute('aria-label', 'Dirección de la foto ' + (i + 1))
    })
    var conDireccion = filas.filter(function (fila) {
      var campo = fila.querySelector('[data-pz-url-foto]')
      return campo && campo.value.trim() !== ''
    })
    var total = conDireccion.length + archivosDeLaPortada(form).length
    var texto = form.querySelector('[data-pz-fotos-texto]')
    if (texto) {
      var estadoFotos = form.querySelector('[data-pz-fotos-estado]')
      var segundos =
        Number(estadoFotos && estadoFotos.getAttribute('data-segundos')) || SEGUNDOS_POR_FOTO
      texto.textContent =
        total <= 1
          ? '1 foto: la portada se muestra fija.'
          : total + ' fotos: la portada pasa a la siguiente cada ' + segundos + ' segundos.'
    }
    pintarFotoDeLaMaqueta(form, total)
  }

  function pintarFotoDeLaMaqueta(form, total) {
    var vista = maqueta(form)
    if (!vista) return
    var primera = ''
    var filas = filasDeFotos(form)
    for (var i = 0; i < filas.length; i++) {
      var campo = filas[i].querySelector('[data-pz-url-foto]')
      var d = direccionDeImagen(campo ? campo.value : '')
      if (d.ok && !d.vacia) {
        primera = d.url
        break
      }
    }
    if (!primera) {
      var archivos = archivosDeLaPortada(form).filter(function (a) {
        return !problemaDeArchivo(a)
      })
      if (archivos.length > 0) primera = urlTemporal(archivos[0])
    }
    if (primera) vista.style.setProperty('--v-foto', 'url("' + primera.replace(/"/g, '') + '")')
    var puntos = form.querySelector('[data-pz-v-puntos]')
    if (puntos) {
      var cuantos = Math.min(Math.max(total, 1), 6)
      while (puntos.children.length < cuantos) puntos.appendChild(document.createElement('i'))
      while (puntos.children.length > cuantos) puntos.removeChild(puntos.lastChild)
      puntos.hidden = total <= 1
    }
  }

  function miniaturaDeFila(fila) {
    var campo = fila.querySelector('[data-pz-url-foto]')
    var marco = fila.querySelector('.pz-foto__miniatura')
    if (!campo || !marco) return
    var img = marco.querySelector('[data-pz-foto-img]')
    var d = direccionDeImagen(campo.value)
    if (d.ok && !d.vacia) {
      if (!img) {
        img = document.createElement('img')
        img.alt = ''
        img.setAttribute('data-pz-foto-img', '')
        marco.appendChild(img)
      }
      img.src = d.url
    } else if (img) {
      // Sin una dirección válida no se deja una imagen sin `src`.
      marco.removeChild(img)
    }
  }

  function agregarFoto(form, direccion) {
    var plantilla = form.querySelector('[data-pz-foto-plantilla]')
    var lista = form.querySelector('[data-pz-fotos-lista]')
    if (!plantilla || !lista) return null
    var fragmento = plantilla.content ? plantilla.content.cloneNode(true) : null
    if (!fragmento) return null
    var fila = fragmento.querySelector('[data-pz-foto]')
    if (!fila) return null
    fila.classList.add('pz-foto--nueva')
    var campo = fila.querySelector('[data-pz-url-foto]')
    if (campo) campo.value = direccion || ''
    lista.appendChild(fragmento)
    return lista.lastElementChild
  }

  function moverFoto(fila, hacia) {
    var lista = fila.parentNode
    if (hacia < 0 && fila.previousElementSibling)
      lista.insertBefore(fila, fila.previousElementSibling)
    if (hacia > 0 && fila.nextElementSibling) lista.insertBefore(fila.nextElementSibling, fila)
  }

  /** Vuelve la lista de fotos a la que había al abrir la pantalla. */
  function restaurarFotos(form) {
    var contenedor = form.querySelector('[data-pz-fotos]')
    var lista = form.querySelector('[data-pz-fotos-lista]')
    if (!contenedor || !lista) return
    var inicial = []
    try {
      inicial = JSON.parse(contenedor.getAttribute('data-inicial') || '[]')
    } catch (e) {
      inicial = []
    }
    while (lista.firstChild) lista.removeChild(lista.firstChild)
    inicial.forEach(function (url) {
      var fila = agregarFoto(form, url)
      if (fila) {
        fila.classList.remove('pz-foto--nueva')
        miniaturaDeFila(fila)
      }
    })
    var archivos = form.querySelector('[data-pz-archivo-hero]')
    if (archivos) archivos.value = ''
    listarArchivosDeLaPortada(form)
  }

  function listarArchivosDeLaPortada(form) {
    var zona = form.querySelector('[data-pz-zona-subida]')
    if (!zona) return
    var anterior = zona.parentNode.querySelector('.pz-subida__archivos')
    if (anterior) anterior.parentNode.removeChild(anterior)
    var archivos = archivosDeLaPortada(form)
    if (archivos.length === 0) return
    var ul = document.createElement('ul')
    ul.className = 'pz-subida__archivos'
    archivos.forEach(function (a) {
      var li = document.createElement('li')
      li.textContent =
        '✓ ' + a.name + ' (' + pesoLegible(a.size) + ') — se sumará al carrusel al guardar'
      ul.appendChild(li)
    })
    zona.parentNode.appendChild(ul)
  }

  /** Deja en la selección solo las imágenes válidas y explica por qué se quitaron las otras. */
  function depurarArchivos(input, aviso) {
    var archivos = input.files ? Array.prototype.slice.call(input.files) : []
    var problemas = []
    var buenos = archivos.filter(function (a) {
      var p = problemaDeArchivo(a)
      if (p) problemas.push(p)
      return !p
    })
    if (problemas.length > 0 && typeof DataTransfer === 'function') {
      var dt = new DataTransfer()
      buenos.forEach(function (a) {
        dt.items.add(a)
      })
      input.files = dt.files
    }
    if (aviso) {
      aviso.textContent = problemas.join(' ')
      aviso.hidden = problemas.length === 0
    }
    return buenos
  }

  // ── Imágenes sueltas (logotipos, ilustraciones) ────────────────────────────

  /** Imagen de la maqueta que acompaña a cada campo de dirección. */
  var DESTINOS_DE_IMAGEN = {
    logo_navbar: '[data-pz-v-logo-menu]',
    logo_footer: '[data-pz-v-logo-pie]',
    imagen_ecologia: '[data-pz-v-ecologia]',
    imagen_programa: '[data-pz-v-programa]',
    panel_admin_logo: '[data-pz-vp-logo]',
  }

  function mostrarImagenDelSelector(tarjeta, origen) {
    var vista = tarjeta.querySelector('.pz-imagen__vista')
    if (!vista) return
    var img = vista.querySelector('[data-pz-imagen-vista]')
    var vacia = vista.querySelector('[data-pz-imagen-vacia]')
    if (origen) {
      if (!img) {
        img = document.createElement('img')
        img.setAttribute('data-pz-imagen-vista', '')
        img.alt = ''
        vista.insertBefore(img, vista.firstChild)
      }
      img.src = origen
      img.hidden = false
      if (vacia) vacia.hidden = true
    } else {
      if (img) {
        img.removeAttribute('src')
        img.hidden = true
      }
      if (vacia) vacia.hidden = false
    }
  }

  function actualizarImagen(form, tarjeta, archivoElegido) {
    var campo = tarjeta.querySelector('[data-pz-url-imagen]')
    var aviso = tarjeta.querySelector('[data-pz-imagen-aviso]')
    if (!campo) return
    var defecto = campo.getAttribute('data-defecto') || ''
    var origen = ''
    var mensaje = ''

    if (archivoElegido) {
      origen = urlTemporal(archivoElegido)
    } else {
      var d = direccionDeImagen(campo.value)
      if (!d.ok) mensaje = d.motivo
      origen = d.ok && !d.vacia ? d.url : d.ok ? defecto : ''
    }
    mostrarImagenDelSelector(tarjeta, origen)

    var destino = DESTINOS_DE_IMAGEN[campo.name]
    var elemento = destino ? form.querySelector(destino) : null
    if (elemento && origen) elemento.src = origen

    if (aviso) {
      aviso.textContent = mensaje
      aviso.hidden = mensaje === ''
    }
    campo.setAttribute('aria-invalid', mensaje ? 'true' : 'false')
  }

  // ── Íconos ─────────────────────────────────────────────────────────────────

  function actualizarIcono(form, campo) {
    var tarjeta = campo.closest('[data-pz-icono]')
    var valor = campo.value.trim() || campo.defaultValue
    var actual = tarjeta ? tarjeta.querySelector('[data-pz-icono-actual]') : null
    if (actual) actual.textContent = valor
    var destino = form.querySelector(
      '[data-pz-v-icono="' + campo.getAttribute('data-pz-icono-campo') + '"]',
    )
    if (destino) destino.textContent = valor
    if (tarjeta) {
      todos('[data-pz-emoji]', tarjeta).forEach(function (chip) {
        chip.setAttribute(
          'aria-pressed',
          chip.getAttribute('data-pz-emoji') === campo.value.trim() ? 'true' : 'false',
        )
      })
    }
  }

  // ── Cambios: qué se modificó ───────────────────────────────────────────────

  function controlesSeguidos(form) {
    return todos('input[name], textarea[name], select[name]', form).filter(function (el) {
      if (el.closest('[data-pz-ignorar]')) return false
      if (el.type === 'hidden' || el.type === 'submit' || el.type === 'button') return false
      if (el.name === 'motivo') return false
      if (el.name === 'hero_imagenes[]') return false
      return true
    })
  }

  function valorGuardado(el) {
    if (el.type === 'checkbox' || el.type === 'radio') return el.defaultChecked ? 'on' : ''
    if (el.tagName === 'SELECT') {
      var elegida = todos('option', el).filter(function (o) {
        return o.defaultSelected
      })[0]
      return elegida ? elegida.value : el.options.length > 0 ? el.options[0].value : ''
    }
    return el.defaultValue
  }

  function cambioDe(el) {
    if (el.type === 'file') return !!(el.files && el.files.length > 0)
    if (el.type === 'checkbox' || el.type === 'radio') return el.checked !== el.defaultChecked
    return el.value !== valorGuardado(el)
  }

  /** Sección del editor (`data-pz-seccion`) en la que está un control. */
  function seccionDe(el) {
    var s = el.closest('[data-pz-seccion]')
    return s ? s.getAttribute('data-pz-seccion') : ''
  }

  /** Qué clave de motivo sugerido corresponde a una sección. */
  var MOTIVO_DE_SECCION = {
    colores: 'colores',
    paletas: 'colores',
    fotos: 'fotos',
    imagenes: 'logos',
    iconos: 'iconos',
    identidad: 'panel',
  }

  function fotosCambiaron(form) {
    var contenedor = form.querySelector('[data-pz-fotos]')
    if (!contenedor) return null
    var inicial = []
    try {
      inicial = JSON.parse(contenedor.getAttribute('data-inicial') || '[]')
    } catch (e) {
      inicial = []
    }
    var actuales = filasDeFotos(form)
      .map(function (fila) {
        var campo = fila.querySelector('[data-pz-url-foto]')
        return campo ? campo.value.trim() : ''
      })
      .filter(Boolean)
    var nuevas = archivosDeLaPortada(form).length
    if (nuevas === 0 && actuales.join('\n') === inicial.join('\n')) return null
    var detalle = []
    var quitadas = inicial.filter(function (u) {
      return actuales.indexOf(u) === -1
    }).length
    var agregadas =
      actuales.filter(function (u) {
        return inicial.indexOf(u) === -1
      }).length + nuevas
    if (agregadas) detalle.push(agregadas + (agregadas === 1 ? ' foto nueva' : ' fotos nuevas'))
    if (quitadas) detalle.push(quitadas + (quitadas === 1 ? ' foto quitada' : ' fotos quitadas'))
    if (!agregadas && !quitadas) detalle.push('nuevo orden')
    return {
      de: inicial.length + (inicial.length === 1 ? ' foto' : ' fotos'),
      a: detalle.join(', '),
    }
  }

  /** Lista de lo que cambió: `{ seccion, etiqueta, de, a, color }`. */
  function cambios(form) {
    var lista = []
    controlesSeguidos(form).forEach(function (el) {
      if (!cambioDe(el)) return
      var etiqueta = el.getAttribute('data-etiqueta') || el.name
      var item = {
        seccion: seccionDe(el),
        etiqueta: etiqueta,
        de: '',
        a: '',
        colorDe: '',
        colorA: '',
      }
      if (el.type === 'file') {
        item.a = Array.prototype.slice
          .call(el.files)
          .map(function (f) {
            return f.name
          })
          .join(', ')
        item.de = 'imagen guardada'
      } else if (el.hasAttribute('data-pz-color')) {
        item.de = valorGuardado(el)
        item.a = el.value
        item.colorDe = item.de
        item.colorA = item.a
      } else if (el.hasAttribute('data-pz-capa')) {
        item.de = valorGuardado(el) + ' %'
        item.a = el.value + ' %'
      } else {
        item.de = valorGuardado(el) || '(vacío)'
        item.a = el.value || '(vacío)'
      }
      lista.push(item)
    })
    var fotos = fotosCambiaron(form)
    if (fotos) {
      lista.push({
        seccion: 'fotos',
        etiqueta: 'Fotos de la portada',
        de: fotos.de,
        a: fotos.a,
        colorDe: '',
        colorA: '',
      })
    }
    return lista
  }

  var estado = { form: null, cambios: [], enviando: false }

  function plural(n, uno, varios) {
    return n + ' ' + (n === 1 ? uno : varios)
  }

  function dibujarResumen(form, lista) {
    var ul = form.querySelector('[data-pz-resumen]')
    if (!ul) return
    var vacio = ul.querySelector('[data-pz-resumen-vacio]')
    todos('li:not([data-pz-resumen-vacio])', ul).forEach(function (li) {
      ul.removeChild(li)
    })
    if (vacio) vacio.hidden = lista.length > 0
    lista.forEach(function (c) {
      var li = document.createElement('li')
      var etiqueta = document.createElement('span')
      etiqueta.className = 'pz-resumen__etiqueta'
      etiqueta.textContent = c.etiqueta
      li.appendChild(etiqueta)
      // Un espacio de verdad entre la etiqueta y los valores: con solo el hueco del `flex`
      // un lector de pantalla (o copiar el texto) oye «fotos100 %».
      li.appendChild(document.createTextNode(' '))
      var valores = document.createElement('span')
      valores.className = 'pz-resumen__valores'
      function valor(texto, color) {
        var envoltura = document.createElement('span')
        if (color) {
          var m = document.createElement('span')
          m.className = 'pz-resumen__muestra'
          m.style.background = color
          envoltura.appendChild(m)
          envoltura.appendChild(document.createTextNode(' '))
        }
        var code = document.createElement('code')
        code.textContent = texto
        envoltura.appendChild(code)
        return envoltura
      }
      valores.appendChild(valor(c.de, c.colorDe))
      valores.appendChild(document.createTextNode(' → '))
      valores.appendChild(valor(c.a, c.colorA))
      li.appendChild(valores)
      ul.appendChild(li)
    })
  }

  /** Recalcula todo lo que depende de «qué cambió» y lo dibuja. */
  function refrescarCambios(form) {
    var lista = cambios(form)
    estado.form = form
    estado.cambios = lista
    var n = lista.length

    var conteo = form.querySelector('[data-pz-conteo]')
    if (conteo) conteo.textContent = String(n)
    dibujarResumen(form, lista)

    var barra = form.querySelector('[data-pz-barra]')
    if (barra) barra.hidden = n === 0
    var textoBarra = form.querySelector('[data-pz-barra-texto]')
    if (textoBarra) textoBarra.textContent = plural(n, 'cambio sin guardar', 'cambios sin guardar')

    var vista = form.querySelector('[data-pz-estado-vista]')
    if (vista) {
      vista.textContent = n === 0 ? 'Igual que lo publicado' : 'Con cambios sin guardar'
      vista.classList.toggle('pz-previa__vivo--cambios', n > 0)
    }

    todos('[data-pz-descartar]', form).forEach(function (b) {
      b.disabled = n === 0
    })
    var guardar = form.querySelector('[data-pz-guardar]')
    if (guardar) guardar.disabled = n === 0

    // Marcas por sección y por campo.
    var porSeccion = {}
    var motivos = {}
    lista.forEach(function (c) {
      porSeccion[c.seccion] = (porSeccion[c.seccion] || 0) + 1
      if (MOTIVO_DE_SECCION[c.seccion]) motivos[MOTIVO_DE_SECCION[c.seccion]] = true
    })
    todos('[data-pz-estado-seccion]', form).forEach(function (chip) {
      var cuantos = porSeccion[chip.getAttribute('data-pz-estado-seccion')] || 0
      chip.hidden = cuantos === 0
      chip.textContent = plural(cuantos, 'cambio', 'cambios')
    })
    controlesSeguidos(form).forEach(function (el) {
      var cambiado = cambioDe(el)
      var color = el.closest('.pz-color')
      if (color) color.classList.toggle('pz-color--cambiado', cambiado)
      var deshacer = color ? color.querySelector('[data-pz-deshacer]') : null
      if (deshacer) deshacer.hidden = !cambiado
      var imagen = el.closest('.pz-imagen')
      if (imagen) {
        var enlaceDeImagen = imagen.querySelector('[data-pz-url-imagen]')
        var archivoDeImagen = imagen.querySelector('[data-pz-archivo]')
        var imagenCambiada =
          (enlaceDeImagen && cambioDe(enlaceDeImagen)) ||
          (archivoDeImagen && cambioDe(archivoDeImagen))
        imagen.classList.toggle('pz-imagen--cambiada', !!imagenCambiada)
      }
      var icono = el.closest('.pz-icono')
      if (icono) icono.classList.toggle('pz-icono--cambiado', cambiado)
    })
    todos('[data-pz-motivo-de]', form).forEach(function (chip) {
      chip.classList.toggle(
        'pz-sugerencia--sugerida',
        !!motivos[chip.getAttribute('data-pz-motivo-de')],
      )
    })
  }

  // ── Arranque de cada formulario ────────────────────────────────────────────

  function refrescarTodo(form) {
    pintarMaqueta(form)
    pintarContrastes(form)
    marcarPaletaEnUso(form)
    todos('[data-pz-icono-campo]', form).forEach(function (campo) {
      actualizarIcono(form, campo)
    })
    todos('[data-pz-imagen]', form).forEach(function (tarjeta) {
      actualizarImagen(form, tarjeta, null)
    })
    ordenarFotos(form)
    var titulo = form.querySelector('[data-pz-titulo-panel]')
    if (titulo) actualizarTituloDelPanel(form, titulo)
    selectoresDeColor(form).forEach(sincronizarHex)
    refrescarCambios(form)
  }

  function actualizarTituloDelPanel(form, campo) {
    var destino = form.querySelector('[data-pz-vp-titulo]')
    if (destino) destino.textContent = campo.value
    var contador = form.querySelector('[data-pz-contador="' + campo.name + '"]')
    if (contador) contador.textContent = String(Array.from(campo.value).length)
  }

  /** Con la sección «Guardar» a la vista la barra fija sobra: se esconde mientras se ve. */
  function vigilarGuardar(form) {
    var seccion = form.querySelector('#pz-guardar')
    var barra = form.querySelector('[data-pz-barra]')
    if (!seccion || !barra || typeof IntersectionObserver !== 'function') return
    new IntersectionObserver(function (entradas) {
      entradas.forEach(function (entrada) {
        barra.classList.toggle('pz-barra--fuera', entrada.isIntersecting)
      })
    }).observe(seccion)
  }

  function arrancar(form) {
    if (form.getAttribute('data-pz-listo') === '1') return
    form.setAttribute('data-pz-listo', '1')
    // Un formulario nuevo (por ejemplo, tras guardar) empieza limpio.
    estado.enviando = false
    vigilarGuardar(form)
    refrescarTodo(form)
  }

  function arrancarPendientes() {
    todos('form.pz[data-pz]:not([data-pz-listo])').forEach(arrancar)
  }

  // ── Eventos (delegados en `document`) ──────────────────────────────────────

  document.addEventListener('input', function (e) {
    var el = e.target
    if (!el || !el.closest) return

    // Filtro del historial (no necesita formulario).
    if (el.hasAttribute && el.hasAttribute('data-pz-filtro')) return filtrarHistorial(el)

    var form = formularioDe(el)
    if (!form) return

    if (el.hasAttribute('data-pz-color')) {
      sincronizarHex(el)
      pintarMaqueta(form)
      pintarContrastes(form)
      marcarPaletaEnUso(form)
    } else if (el.hasAttribute('data-pz-hex')) {
      var picker = document.getElementById(el.getAttribute('data-pz-hex'))
      var hex = normalizarHex(el.value)
      var contenedor = el.closest('.pz-color')
      var invalido = el.value.trim() !== '' && !hex
      if (contenedor) {
        contenedor.classList.toggle('pz-color--invalido', invalido)
        var error = contenedor.querySelector('[data-pz-hex-error]')
        if (error) error.hidden = !invalido
      }
      if (picker && hex && picker.value !== hex) {
        picker.value = hex
        disparar(picker, 'input')
      }
    } else if (el.hasAttribute('data-pz-capa')) {
      pintarCapa(form)
    } else if (el.hasAttribute('data-pz-url-foto')) {
      miniaturaDeFila(el.closest('[data-pz-foto]'))
      ordenarFotos(form)
    } else if (el.hasAttribute('data-pz-url-imagen')) {
      actualizarImagen(form, el.closest('[data-pz-imagen]'), null)
    } else if (el.hasAttribute('data-pz-icono-campo')) {
      actualizarIcono(form, el)
    } else if (el.hasAttribute('data-pz-titulo-panel')) {
      actualizarTituloDelPanel(form, el)
    }
    refrescarCambios(form)
  })

  document.addEventListener('change', function (e) {
    var el = e.target
    var form = formularioDe(el)
    if (!form) return

    if (el.hasAttribute('data-pz-hex')) {
      // Al salir del campo, el texto vuelve a ser el color vigente (escrito en forma normal).
      var picker = document.getElementById(el.getAttribute('data-pz-hex'))
      if (picker) el.value = picker.value
      var contenedor = el.closest('.pz-color')
      if (contenedor) {
        contenedor.classList.remove('pz-color--invalido')
        var error = contenedor.querySelector('[data-pz-hex-error]')
        if (error) error.hidden = true
      }
    } else if (el.hasAttribute('data-pz-archivo-hero')) {
      depurarArchivos(el, form.querySelector('[data-pz-fotos-aviso]'))
      listarArchivosDeLaPortada(form)
      ordenarFotos(form)
    } else if (el.hasAttribute('data-pz-archivo')) {
      var tarjeta = el.closest('[data-pz-imagen]')
      var buenos = depurarArchivos(el, tarjeta.querySelector('[data-pz-imagen-aviso]'))
      actualizarImagen(form, tarjeta, buenos[0] || null)
    }
    refrescarCambios(form)
  })

  document.addEventListener('click', function (e) {
    var el = e.target
    if (!el || !el.closest) return

    // Motivos sugeridos: sirven también a la pantalla de textos (cualquier formulario).
    var sugerido = el.closest('[data-pz-motivo-sugerido]')
    if (sugerido) {
      var f = sugerido.closest('form')
      var campo = f ? f.querySelector('[data-pz-motivo], input[name="motivo"]') : null
      if (campo) {
        campo.value = sugerido.getAttribute('data-pz-motivo-sugerido') || ''
        campo.focus()
        disparar(campo, 'input')
      }
      return
    }

    var form = formularioDe(el)

    // Guardia: salir de la pantalla con cambios sin guardar pide confirmación.
    var enlace = el.closest('a[href]')
    if (
      enlace &&
      estado.form &&
      document.contains(estado.form) &&
      estado.cambios.length > 0 &&
      !enlace.hasAttribute('data-pz-ir-guardar') &&
      !enlace.target &&
      !/^#/.test(enlace.getAttribute('href') || '') &&
      !enlace.closest('.pz-vista')
    ) {
      if (!window.confirm('Tienes cambios sin guardar. ¿Salir sin guardarlos?')) {
        e.preventDefault()
        e.stopPropagation()
        return
      }
    }

    if (!form) return

    var paleta = el.closest('[data-pz-paleta]')
    if (paleta) {
      var colores = coloresDeLaPaleta(paleta)
      Object.keys(colores).forEach(function (clave) {
        ponerColor(form, clave, colores[clave])
      })
      return
    }

    var deshacer = el.closest('[data-pz-deshacer]')
    if (deshacer) {
      var selector = document.getElementById(deshacer.getAttribute('data-pz-deshacer'))
      if (selector) {
        selector.value = selector.defaultValue
        disparar(selector, 'input')
      }
      return
    }

    var emoji = el.closest('[data-pz-emoji]')
    if (emoji) {
      var tarjetaIcono = emoji.closest('[data-pz-icono]')
      var entrada = tarjetaIcono ? tarjetaIcono.querySelector('[data-pz-icono-campo]') : null
      if (entrada) {
        entrada.value = emoji.getAttribute('data-pz-emoji') || ''
        disparar(entrada, 'input')
      }
      return
    }

    var accion = el.closest('[data-pz-foto-accion]')
    if (accion) {
      var fila = accion.closest('[data-pz-foto]')
      var tipo = accion.getAttribute('data-pz-foto-accion')
      if (tipo === 'subir') moverFoto(fila, -1)
      else if (tipo === 'bajar') moverFoto(fila, 1)
      else if (tipo === 'quitar' && filasDeFotos(form).length > 1) fila.parentNode.removeChild(fila)
      ordenarFotos(form)
      refrescarCambios(form)
      return
    }

    if (el.closest('[data-pz-agregar-foto]')) {
      var nueva = agregarFoto(form, '')
      ordenarFotos(form)
      if (nueva) {
        var campoNuevo = nueva.querySelector('[data-pz-url-foto]')
        if (campoNuevo) campoNuevo.focus()
      }
      refrescarCambios(form)
      return
    }

    var quitarImagen = el.closest('[data-pz-quitar-imagen]')
    if (quitarImagen) {
      var t = quitarImagen.closest('[data-pz-imagen]')
      var url = t.querySelector('[data-pz-url-imagen]')
      var archivo = t.querySelector('[data-pz-archivo]')
      if (url) url.value = ''
      if (archivo) archivo.value = ''
      actualizarImagen(form, t, null)
      refrescarCambios(form)
      return
    }

    if (el.closest('[data-pz-descartar]')) {
      if (estado.cambios.length === 0) return
      if (
        !window.confirm(
          '¿Descartar ' + plural(estado.cambios.length, 'cambio', 'cambios') + ' sin guardar?',
        )
      )
        return
      form.reset()
      restaurarFotos(form)
      refrescarTodo(form)
      return
    }

    var dispositivo = el.closest('[data-pz-dispositivo]')
    if (dispositivo) {
      var vista = maqueta(form)
      var nombre = dispositivo.getAttribute('data-pz-dispositivo')
      if (vista) vista.setAttribute('data-dispositivo', nombre)
      todos('[data-pz-dispositivo]', form).forEach(function (b) {
        b.setAttribute('aria-pressed', b === dispositivo ? 'true' : 'false')
      })
      return
    }

    // Un clic en la maqueta lleva a lo que cambia esa parte.
    var destino = el.closest('.pz-vista [data-ir]')
    if (destino) {
      var seccion = document.getElementById(destino.getAttribute('data-ir'))
      if (seccion) {
        if (seccion.tagName === 'DETAILS') seccion.open = true
        seccion.scrollIntoView({ behavior: 'smooth', block: 'start' })
        seccion.classList.add('pz-seccion--destello')
        window.setTimeout(function () {
          seccion.classList.remove('pz-seccion--destello')
        }, 1500)
      }
    }
  })

  // Al enfocar o pasar el ratón por un control se ilumina en la maqueta lo que pinta.
  function resaltar(form, zona, encender) {
    todos('.pz-vista [data-zona~="' + zona + '"]', form).forEach(function (el) {
      el.classList.toggle('pz-resalte', encender)
    })
  }

  function zonaDe(el) {
    if (!el || !el.closest || el.closest('.pz-vista')) return null
    var c = el.closest('form.pz [data-zona]')
    return c ? c.getAttribute('data-zona') : null
  }

  ;['focusin', 'mouseover'].forEach(function (tipo) {
    document.addEventListener(tipo, function (e) {
      var zona = zonaDe(e.target)
      var form = formularioDe(e.target)
      if (zona && form) resaltar(form, zona, true)
    })
  })
  ;['focusout', 'mouseout'].forEach(function (tipo) {
    document.addEventListener(tipo, function (e) {
      var zona = zonaDe(e.target)
      var form = formularioDe(e.target)
      if (zona && form) resaltar(form, zona, false)
    })
  })

  // Arrastrar fotos sobre la zona de subida.
  document.addEventListener('dragover', function (e) {
    var zona = e.target.closest && e.target.closest('[data-pz-zona-subida]')
    if (!zona) return
    e.preventDefault()
    zona.classList.add('pz-subida--sobre')
  })
  document.addEventListener('dragleave', function (e) {
    var zona = e.target.closest && e.target.closest('[data-pz-zona-subida]')
    if (zona) zona.classList.remove('pz-subida--sobre')
  })
  document.addEventListener('drop', function (e) {
    var zona = e.target.closest && e.target.closest('[data-pz-zona-subida]')
    if (!zona) return
    e.preventDefault()
    zona.classList.remove('pz-subida--sobre')
    var entrada = zona.querySelector('[data-pz-archivo-hero]')
    if (!entrada || !e.dataTransfer || typeof DataTransfer !== 'function') return
    var dt = new DataTransfer()
    Array.prototype.slice.call(entrada.files || []).forEach(function (a) {
      dt.items.add(a)
    })
    Array.prototype.slice.call(e.dataTransfer.files || []).forEach(function (a) {
      dt.items.add(a)
    })
    entrada.files = dt.files
    disparar(entrada, 'change')
  })

  // Enviar: nada que guardar no se envía; con algo, no se pregunta al salir.
  document.addEventListener('submit', function (e) {
    var form = formularioDe(e.target)
    if (!form || e.target !== form) return
    if (cambios(form).length === 0) {
      e.preventDefault()
      return
    }
    estado.enviando = true
  })

  window.addEventListener('beforeunload', function (e) {
    if (estado.enviando || !estado.form || !document.contains(estado.form)) return
    if (estado.cambios.length === 0) return
    e.preventDefault()
    e.returnValue = ''
  })

  // ── Buscador del historial ─────────────────────────────────────────────────

  function filtrarHistorial(entrada) {
    var id = entrada.getAttribute('data-pz-filtro')
    var cuerpo = document.getElementById(id)
    if (!cuerpo) return
    var consulta = entrada.value.trim().toLowerCase()
    var filas = todos('tr[data-busqueda]', cuerpo)
    var visibles = 0
    filas.forEach(function (fila) {
      var coincide =
        consulta === '' || (fila.getAttribute('data-busqueda') || '').indexOf(consulta) !== -1
      fila.hidden = !coincide
      if (coincide) visibles++
    })
    var conteo = document.querySelector('[data-pz-filtro-conteo="' + id + '"]')
    if (conteo) {
      conteo.textContent =
        consulta === ''
          ? plural(filas.length, 'versión', 'versiones')
          : visibles + ' de ' + plural(filas.length, 'versión', 'versiones')
    }
    var vacio = document.querySelector('[data-pz-filtro-vacio="' + id + '"]')
    if (vacio) vacio.hidden = visibles > 0
  }

  // ── Arranque ───────────────────────────────────────────────────────────────

  new MutationObserver(arrancarPendientes).observe(document.documentElement, {
    childList: true,
    subtree: true,
  })
  if (document.readyState === 'loading')
    document.addEventListener('DOMContentLoaded', arrancarPendientes)
  else arrancarPendientes()

  // Con fines de prueba: las fórmulas de color, para compararlas con app/utils/color.ts.
  window.__pz = {
    normalizarHex: normalizarHex,
    razonDeContraste: razonDeContraste,
    nivelDeContraste: nivelDeContraste,
    capaDePortada: capaDePortada,
    direccionDeImagen: direccionDeImagen,
    cambios: function () {
      var f = formulario()
      return f ? cambios(f) : []
    },
  }
})()
