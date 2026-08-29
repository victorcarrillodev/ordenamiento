/**
 * Autocompletado de Domicilio, Colonias y Municipios de San Pedro Tlaquepaque
 * Estilo Material UI (MUI Autocomplete) de Alto Rendimiento.
 * Carga instantánea a la primera con Caché en Memoria, Precarga de Municipios,
 * Delegación de Eventos Global y Observador de Mutaciones DOM.
 */
;(function () {
  'use strict'

  // ─────────────────────────────────────────────────────────────────────────
  // Catálogo embebido (window.__COLONIAS__) — autocompletado 100% local, sin red.
  // Generado por scripts/build-catalogo.ts y servido como archivo estático.
  // Solo incluye San Pedro Tlaquepaque (alcance geográfico del proyecto).
  // ─────────────────────────────────────────────────────────────────────────
  const MUNICIPIO_UNICO = 'San Pedro Tlaquepaque'

  /**
   * Devuelve el catálogo cargado. Si window.__COLONIAS__ aún no está disponible
   * (orden de scripts incorrecto), degrada a un arreglo vacío para no romper.
   */
  function getCatalog() {
    return Array.isArray(window.__COLONIAS__) ? window.__COLONIAS__ : []
  }

  // Caché en memoria RAM para respuestas de autocompletado (0ms latencia)
  const memoryCache = new Map()

  /**
   * Estructura que usa la lógica de búsqueda: { colonia, municipio, cp, tipo, busqueda }.
   * El catálogo embebido ya trae esos campos; busqueda (normalizada) lo calculamos
   * una vez aquí para no recalcular en cada tecleo.
   */
  const CATALOGO = getCatalog().map(function (e) {
    return {
      colonia: e.colonia,
      municipio: e.municipio,
      cp: e.cp,
      tipo: e.tipo,
      busqueda: normalizar(`${e.colonia} ${e.municipio} ${e.cp}`),
    }
  })

  function normalizarParaIndice(texto) {
    return (texto || '')
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .toLowerCase()
      .trim()
  }

  // STOPWORDS y prefijos de calle para tokenizar como en el backend
  const STOPWORDS = new Set(['el', 'la', 'los', 'las', 'de', 'del', 'y', 'en', 'un', 'una'])
  const STREET_PREFIXES = new Set([
    'calle', 'av', 'ave', 'avenida', 'andador', 'and', 'privada', 'priv',
    'prolongacion', 'prol', 'carretera', 'carr', 'calzada', 'blvd', 'boulevard',
    'cerrada', 'cda', 'c', 'no', 'num', 'numero',
  ])

  function tokenize(query) {
    return normalizarParaIndice(query)
      .split(/[\s,.-]+/)
      .filter(function (t) {
        return t.length > 0 && !STOPWORDS.has(t) && !STREET_PREFIXES.has(t) && !/^\d+$/.test(t)
      })
  }

  function normalizePhonetic(term) {
    return normalizarParaIndice(term)
      .replace(/th/g, 't')
      .replace(/z/g, 's')
      .replace(/c([ei])/g, 's$1')
      .replace(/v/g, 'b')
      .replace(/h/g, '')
  }

  function buscarMunicipiosLocal(query, limite) {
    const q = (query || '').trim()
    if (q.length < 1) return []
    const qNorm = normalizarParaIndice(q)
    const qSin = qNorm.replace(/^(el|la|los|las|san|santa|sta)\s+/, '')
    const seen = new Map()
    for (let i = 0; i < CATALOGO.length; i++) {
      const m = CATALOGO[i].municipio
      if (!seen.has(m)) seen.set(m, 0)
      seen.set(m, seen.get(m) + 1)
    }
    const results = []
    seen.forEach(function (count, municipio) {
      const munNorm = normalizarParaIndice(municipio)
      const munSin = munNorm.replace(/^(el|la|los|las|san|santa|sta)\s+/, '')
      let score = 0
      if (munNorm.startsWith(qNorm)) score = 1
      else if (qSin.length >= 2 && munSin.startsWith(qSin)) score = 2
      else if (munNorm.includes(qNorm)) score = 3
      else return
      results.push({ municipio: municipio, coloniasCount: count, score: score })
    })
    results.sort(function (a, b) {
      if (a.score !== b.score) return a.score - b.score
      return a.municipio.localeCompare(b.municipio, 'es', { sensitivity: 'base' })
    })
    return results.slice(0, limite || 10)
  }

  function buscarColoniasLocal(query, municipio, limite) {
    const qRaw = (query || '').trim()
    if (qRaw.length < 2) return []
    const qNorm = normalizarParaIndice(qRaw)
    const qTokens = tokenize(qRaw)
    const qTokensPhon = qTokens.map(normalizePhonetic).filter(function (t) {
      return t.length >= 2
    })
    const munNorm = municipio ? normalizarParaIndice(municipio) : ''
    const lim = limite && limite > 0 ? limite : 10
    const esCp = /^\d{5}$/.test(qRaw)
    const numeroMatch = qRaw.match(/(?:#|no\.?|num\.?|núm\.?)?\s*(\d{1,5}(?:\s*-[A-Za-z0-9]+)?)/i)
    const numeroCalle = numeroMatch ? numeroMatch[1] : undefined
    const qLimpia = qTokens.join(' ')

    const matches = []
    for (let i = 0; i < CATALOGO.length; i++) {
      const entrada = CATALOGO[i]
      const munEntradaNorm = normalizarParaIndice(entrada.municipio)
      if (munNorm && munEntradaNorm !== munNorm) continue

      if (esCp) {
        if (entrada.cp === qRaw) matches.push({ entrada: entrada, score: 0 })
        continue
      }

      const colNorm = normalizarParaIndice(entrada.colonia)
      const busquedaNorm = entrada.busqueda

      if (colNorm.startsWith(qNorm) || (qLimpia.length >= 2 && colNorm.startsWith(qLimpia))) {
        matches.push({ entrada: entrada, score: 1 })
        continue
      }
      const colSin = colNorm.replace(/^(el|la|los|las|de|del|san|santa|sta)\s+/, '')
      const qSin = (qLimpia || qNorm).replace(/^(el|la|los|las|de|del|san|santa|sta)\s+/, '')
      if (qSin.length >= 2 && colSin.startsWith(qSin)) {
        matches.push({ entrada: entrada, score: 2 })
        continue
      }
      if (colNorm.includes(qNorm) || (qLimpia.length >= 2 && colNorm.includes(qLimpia))) {
        matches.push({ entrada: entrada, score: 3 })
        continue
      }
      if (munEntradaNorm.startsWith(qNorm) || (qLimpia.length >= 2 && munEntradaNorm.startsWith(qLimpia))) {
        matches.push({ entrada: entrada, score: 4 })
        continue
      }
      if (qTokens.length > 0) {
        const all = qTokens.every(function (tok) {
          return busquedaNorm.includes(tok)
        })
        if (all) {
          matches.push({ entrada: entrada, score: 5 })
          continue
        }
      }
      if (busquedaNorm.includes(qNorm) || (qLimpia.length >= 2 && busquedaNorm.includes(qLimpia))) {
        matches.push({ entrada: entrada, score: 6 })
        continue
      }
      if (qTokensPhon.length > 0) {
        const entradaPhon = normalizePhonetic(busquedaNorm)
        if (qTokensPhon.every(function (tok) {
          return entradaPhon.includes(tok)
        })) {
          matches.push({ entrada: entrada, score: 7 })
        }
      }
    }

    matches.sort(function (a, b) {
      if (a.score !== b.score) return a.score - b.score
      const cmpCol = a.entrada.colonia.localeCompare(b.entrada.colonia, 'es', { sensitivity: 'base' })
      if (cmpCol !== 0) return cmpCol
      const cmpMun = a.entrada.municipio.localeCompare(b.entrada.municipio, 'es', { sensitivity: 'base' })
      if (cmpMun !== 0) return cmpMun
      return a.entrada.cp.localeCompare(b.entrada.cp)
    })

    return matches.slice(0, lim).map(function (m) {
      let calleSugerida
      if (numeroCalle) calleSugerida = `${m.entrada.colonia} ${numeroCalle}`
      return {
        colonia: m.entrada.colonia,
        municipio: m.entrada.municipio,
        cp: m.entrada.cp,
        tipo: m.entrada.tipo,
        calleSugerida: calleSugerida,
      }
    })
  }

  // Municipio único precargado en caché (catálogo ya está filtrado a Tlaquepaque)
  memoryCache.set('municipio:', [
    { municipio: MUNICIPIO_UNICO, coloniasCount: CATALOGO.length },
  ])
  memoryCache.set('municipio:tlaquepaque', [
    { municipio: MUNICIPIO_UNICO, coloniasCount: CATALOGO.length },
  ])
  memoryCache.set('municipio:san pedro tlaquepaque', [
    { municipio: MUNICIPIO_UNICO, coloniasCount: CATALOGO.length },
  ])

  function formatBytes(bytes) {
    if (!bytes || bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
  }

  function getFileIcon(fileName) {
    const ext = (fileName.split('.').pop() || '').toLowerCase()
    if (ext === 'pdf') return '📄'
    if (ext === 'shp' || ext === 'kmz') return '🗺️'
    if (['jpg', 'jpeg', 'png', 'webp', 'svg'].includes(ext)) return '🖼️'
    if (ext === 'dwg') return '📐'
    if (['xlsx', 'xls', 'csv'].includes(ext)) return '📊'
    if (['docx', 'doc'].includes(ext)) return '📑'
    return '📁'
  }

  // ─────────────────────────────────────────────────────────────────────────
  // 1. Manejo de archivos adjuntos y vista previa dinámica
  // ─────────────────────────────────────────────────────────────────────────
  function initFileInputs() {
    const publicInput = document.getElementById('archivos')
    const publicLabel = document.getElementById('file-count-label')
    const publicPreview = document.getElementById('file-list-preview')

    if (publicInput && publicPreview && !publicInput.dataset.previewBound) {
      publicInput.dataset.previewBound = '1'
      publicInput.addEventListener('change', function () {
        const files = Array.from(publicInput.files || [])
        publicPreview.innerHTML = ''

        if (files.length === 0) {
          publicPreview.style.display = 'none'
          if (publicLabel) {
            publicLabel.textContent = 'Ningún archivo seleccionado'
            publicLabel.style.color = '#475569'
            publicLabel.style.fontWeight = '500'
          }
          return
        }

        if (publicLabel) {
          publicLabel.textContent = `${files.length} ${files.length === 1 ? 'archivo seleccionado' : 'archivos seleccionados'}`
          publicLabel.style.color = '#8c1d3d'
          publicLabel.style.fontWeight = '700'
        }

        publicPreview.style.display = 'flex'
        files.forEach(function (file) {
          const item = document.createElement('div')
          item.className = 'file-preview-item'
          const escapedName = escapeHtml(file.name)
          item.innerHTML = `
            <div class="file-preview-info">
              <span class="file-preview-icon">${getFileIcon(file.name)}</span>
              <div class="file-preview-details">
                <span class="file-preview-name" title="${escapedName}">${escapedName}</span>
                <span class="file-preview-size">${formatBytes(file.size)}</span>
              </div>
            </div>
            <span style="font-size:11px;font-weight:700;color:#166534;background:#f0fdf4;padding:2px 8px;border-radius:10px;border:1px solid #bbf7d0;">Listo</span>
          `
          publicPreview.appendChild(item)
        })
      })
    }

    const adminInput = document.getElementById('pdf')
    const adminLabel = document.getElementById('admin-file-label')
    const adminPreview = document.getElementById('admin-file-preview')

    if (adminInput && adminPreview && !adminInput.dataset.previewBound) {
      adminInput.dataset.previewBound = '1'
      adminInput.addEventListener('change', function () {
        const file = adminInput.files && adminInput.files[0]
        adminPreview.innerHTML = ''

        if (!file) {
          adminPreview.style.display = 'none'
          if (adminLabel) {
            adminLabel.textContent = 'Ningún archivo seleccionado'
            adminLabel.style.color = '#475569'
            adminLabel.style.fontWeight = '500'
          }
          return
        }

        if (adminLabel) {
          adminLabel.textContent = 'Archivo seleccionado'
          adminLabel.style.color = '#1e293b'
          adminLabel.style.fontWeight = '700'
        }

        adminPreview.style.display = 'block'
        const item = document.createElement('div')
        item.className = 'file-preview-item'
        const escapedName = escapeHtml(file.name)
        item.innerHTML = `
          <div class="file-preview-info">
            <span class="file-preview-icon">${getFileIcon(file.name)}</span>
            <div class="file-preview-details">
              <span class="file-preview-name" title="${escapedName}">${escapedName}</span>
              <span class="file-preview-size">${formatBytes(file.size)}</span>
            </div>
          </div>
          <span style="font-size:11px;font-weight:700;color:#166534;background:#f0fdf4;padding:2px 8px;border-radius:10px;border:1px solid #bbf7d0;">Adjunto</span>
        `
        adminPreview.appendChild(item)
      })
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // 2. Modal de Carga con Barra de Progreso en Envío (Upload Progress Bar)
  // ─────────────────────────────────────────────────────────────────────────
  function hideUploadProgressModal() {
    const overlay = document.getElementById('mui-loading-overlay')
    if (overlay) overlay.style.display = 'none'
  }

  /**
   * Devuelve el formulario a un estado usable tras un envío fallido.
   *
   * Este submit se intercepta con XHR, así que los botones que se bloquean a sí
   * mismos al enviar (ver submit-button.tsx) nunca se enterarían de que el envío
   * terminó. Sin este aviso el formulario queda inutilizable hasta recargar.
   *
   * El evento no burbujea: se despacha en el <form> y se escucha en ese mismo
   * <form>. Mover el listener a document lo dejaría de recibir.
   */
  function releaseForm(form) {
    form.dispatchEvent(new CustomEvent('participation:submit-error', { bubbles: false }))
  }

  function showUploadProgressModal(title, desc) {
    let overlay = document.getElementById('mui-loading-overlay')
    if (!overlay) {
      overlay = document.createElement('div')
      overlay.id = 'mui-loading-overlay'
      overlay.className = 'mui-loading-overlay'
      document.body.appendChild(overlay)
    }

    overlay.innerHTML = `
      <div class="mui-loading-modal">
        <div class="mui-progress-header">
          <div class="mui-progress-icon-badge" id="mui-progress-icon">
            <span>📤</span>
          </div>
          <h3 class="mui-loading-title" id="mui-progress-title">${title}</h3>
          <p class="mui-loading-desc" id="mui-progress-desc">${desc}</p>
        </div>

        <div class="mui-progress-container">
          <div class="mui-progress-info">
            <span class="mui-progress-status-text" id="mui-progress-status-text">Iniciando transferencia...</span>
            <span class="mui-progress-percentage" id="mui-progress-percentage">0%</span>
          </div>
          <div class="mui-progress-track">
            <div class="mui-progress-bar" id="mui-progress-bar" style="width: 0%;">
              <div class="mui-progress-shimmer"></div>
            </div>
          </div>
          <div class="mui-progress-metrics">
            <span id="mui-progress-bytes">0 KB transferidos</span>
            <span id="mui-progress-speed">Calculando velocidad...</span>
          </div>
        </div>

        <div class="mui-progress-steps">
          <div class="mui-progress-step is-active" id="mui-step-1">
            <span class="mui-step-indicator">1</span>
            <span class="mui-step-label">Transferencia de archivos y datos</span>
          </div>
          <div class="mui-progress-step" id="mui-step-2">
            <span class="mui-step-indicator">2</span>
            <span class="mui-step-label">Validación técnica y seguridad</span>
          </div>
          <div class="mui-progress-step" id="mui-step-3">
            <span class="mui-step-indicator">3</span>
            <span class="mui-step-label">Generación de folio oficial</span>
          </div>
        </div>

        <div class="mui-progress-footer-note">
          🔒 <strong>Bitácora Ambiental:</strong> Por favor no recargues ni cierres esta ventana mientras concluye el registro.
        </div>
      </div>
    `
    overlay.style.display = 'flex'
  }

  function updateUploadProgress(percent, loadedBytes, totalBytes, speedBytesPerSec) {
    const pBar = document.getElementById('mui-progress-bar')
    const pText = document.getElementById('mui-progress-percentage')
    const pBytes = document.getElementById('mui-progress-bytes')
    const pSpeed = document.getElementById('mui-progress-speed')
    const pStatus = document.getElementById('mui-progress-status-text')

    const clampedPercent = Math.max(0, Math.min(100, Math.round(percent)))

    if (pBar) pBar.style.width = clampedPercent + '%'
    if (pText) pText.textContent = clampedPercent + '%'

    if (pBytes && loadedBytes && totalBytes) {
      pBytes.textContent = `${formatBytes(loadedBytes)} de ${formatBytes(totalBytes)}`
    }
    if (pSpeed && speedBytesPerSec > 0) {
      pSpeed.textContent = `${formatBytes(speedBytesPerSec)}/s`
    }

    if (pStatus) {
      if (clampedPercent < 100) {
        pStatus.textContent = `Subiendo expediente (${clampedPercent}%)...`
      } else {
        pStatus.textContent = 'Archivos transferidos (100%). Procesando...'
      }
    }
  }

  function setUploadStage(stage) {
    const s1 = document.getElementById('mui-step-1')
    const s2 = document.getElementById('mui-step-2')
    const s3 = document.getElementById('mui-step-3')
    const pBar = document.getElementById('mui-progress-bar')
    const pIcon = document.getElementById('mui-progress-icon')
    const pStatus = document.getElementById('mui-progress-status-text')

    if (stage === 1) {
      if (s1) {
        s1.className = 'mui-progress-step is-active'
      }
      if (s2) {
        s2.className = 'mui-progress-step'
      }
      if (s3) {
        s3.className = 'mui-progress-step'
      }
    } else if (stage === 2) {
      if (s1) {
        s1.className = 'mui-progress-step is-done'
        const ind = s1.querySelector('.mui-step-indicator')
        if (ind) ind.textContent = '✓'
      }
      if (s2) {
        s2.className = 'mui-progress-step is-active'
      }
      if (s3) {
        s3.className = 'mui-progress-step'
      }
      if (pBar) pBar.classList.add('is-indeterminate')
      if (pIcon) pIcon.innerHTML = '<span>⚙️</span>'
      if (pStatus) pStatus.textContent = 'Validando expediente técnico en el servidor...'
    } else if (stage === 3) {
      if (s1) {
        s1.className = 'mui-progress-step is-done'
        const ind1 = s1.querySelector('.mui-step-indicator')
        if (ind1) ind1.textContent = '✓'
      }
      if (s2) {
        s2.className = 'mui-progress-step is-done'
        const ind2 = s2.querySelector('.mui-step-indicator')
        if (ind2) ind2.textContent = '✓'
      }
      if (s3) {
        s3.className = 'mui-progress-step is-done'
        const ind3 = s3.querySelector('.mui-step-indicator')
        if (ind3) ind3.textContent = '✓'
      }
      if (pBar) {
        pBar.classList.remove('is-indeterminate')
        pBar.style.width = '100%'
      }
      if (pIcon) {
        pIcon.innerHTML = '<span>✅</span>'
        pIcon.style.background = 'linear-gradient(135deg, #16a34a 0%, #15803d 100%)'
      }
      if (pStatus) pStatus.textContent = '¡Participación registrada con éxito!'
    }
  }

  function initFormSubmitModals() {
    const forms = Array.from(
      document.querySelectorAll(
        '#participation-form, form.form-card, form[action*="participation"], form[action*="participaciones"]',
      ),
    )

    forms.forEach(function (form) {
      if (form.dataset.loadingBound) return
      form.dataset.loadingBound = '1'

      form.addEventListener('submit', function (e) {
        if (!form.checkValidity()) return

        const isPublic = form.id === 'participation-form' || form.action.includes('/participation')
        const isNuevaAdmin = window.location.pathname.includes('/participaciones/nueva')

        if (!isPublic && !isNuevaAdmin) return

        e.preventDefault()

        const title = isPublic
          ? 'Enviando tu participación...'
          : 'Guardando participación física...'
        const desc = isPublic
          ? 'Estamos registrando tu información y subiendo los documentos adjuntos al expediente de la Bitácora Ambiental.'
          : 'Estamos procesando los datos y vinculando los archivos adjuntos al expediente técnico.'

        showUploadProgressModal(title, desc)
        setUploadStage(1)

        const actionUrl = form.getAttribute('action') || window.location.href
        const formData = new FormData(form)
        const xhr = new XMLHttpRequest()
        const startTime = Date.now()

        xhr.open('POST', actionUrl, true)
        xhr.setRequestHeader('Accept', 'text/html,application/xhtml+xml,application/json,*/*')

        if (xhr.upload) {
          xhr.upload.addEventListener('progress', function (ev) {
            if (ev.lengthComputable && ev.total > 0) {
              const percent = Math.min(99, (ev.loaded / ev.total) * 100)
              const elapsedSec = (Date.now() - startTime) / 1000
              const speed = elapsedSec > 0 ? ev.loaded / elapsedSec : 0
              updateUploadProgress(percent, ev.loaded, ev.total, speed)
            }
          })

          xhr.upload.addEventListener('load', function () {
            updateUploadProgress(100)
            setUploadStage(2)
          })
        }

        xhr.addEventListener('readystatechange', function () {
          if (xhr.readyState === XMLHttpRequest.DONE) {
            if (xhr.status >= 200 && xhr.status < 400) {
              setUploadStage(3)
              setTimeout(function () {
                if (xhr.responseURL && xhr.responseURL !== window.location.href) {
                  window.location.href = xhr.responseURL
                } else {
                  // Reemplazar contenido con la vista devuelta (ej. confirmación)
                  document.open()
                  document.write(xhr.responseText)
                  document.close()
                }
              }, 450)
            } else {
              // Error de validación o del servidor (413, 422, 502, etc.)
              hideUploadProgressModal()

              if (xhr.responseText) {
                document.open()
                document.write(xhr.responseText)
                document.close()
              } else {
                // La página sobrevive, así que hay que devolver el formulario a un
                // estado usable antes de pedirle al usuario que reintente.
                releaseForm(form)
                alert(
                  'Ocurrió un problema al enviar la información (código ' +
                    xhr.status +
                    '). Por favor intenta de nuevo.',
                )
              }
            }
          }
        })

        xhr.addEventListener('error', function () {
          hideUploadProgressModal()
          releaseForm(form)
          alert('Error de conexión al enviar el formulario. Por favor verifica tu conexión.')
        })

        // Un envío también puede morir sin pasar por 'error': si expira o si algo
        // corta la petición. Sin esto el formulario se quedaría bloqueado.
        xhr.addEventListener('timeout', function () {
          hideUploadProgressModal()
          releaseForm(form)
          alert('El envío tardó demasiado. Por favor intenta de nuevo.')
        })

        xhr.addEventListener('abort', function () {
          hideUploadProgressModal()
          releaseForm(form)
        })

        xhr.send(formData)
      })
    })
  }

  // ─────────────────────────────────────────────────────────────────────────
  // 3. Autocompletado Universal Instantáneo (MUI Style)
  // ─────────────────────────────────────────────────────────────────────────
  let popper = null
  let activeIndex = -1
  let currentTarget = null
  let currentQuery = ''
  let currentTipo = ''
  let itemsColonias = []
  let itemsMunicipios = []
  let debounceTimer = null

  function getPopper() {
    if (!popper) {
      popper = document.getElementById('mui-autocomplete-root')
      if (!popper) {
        popper = document.createElement('div')
        popper.id = 'mui-autocomplete-root'
        popper.className = 'mui-autocomplete-popper'
        popper.style.display = 'none'
        document.body.appendChild(popper)
      }
    }
    return popper
  }

  function hidePopper() {
    const p = getPopper()
    if (p) p.style.display = 'none'
    activeIndex = -1
    currentTarget = null
    const openInputs = document.querySelectorAll('[aria-expanded="true"]')
    openInputs.forEach((inp) => inp.setAttribute('aria-expanded', 'false'))
  }

  function isAddressField(el) {
    if (!el || el.tagName !== 'INPUT' || el.type === 'hidden' || el.type === 'file') return false
    const name = (el.name || el.id || '').toLowerCase()
    return (
      name.includes('calle') ||
      name.includes('domicilio') ||
      name.includes('colonia') ||
      name.includes('municipio') ||
      name.includes('cp')
    )
  }

  function getFieldType(el) {
    const name = (el.name || el.id || '').toLowerCase()
    if (name.includes('municipio')) return 'municipio'
    if (name.includes('calle') || name.includes('domicilio')) return 'calle'
    if (name.includes('cp')) return 'cp'
    return 'colonia'
  }

  function getSiblingInputs(target) {
    const form =
      target.closest('[data-autocomplete-group]') ||
      target.closest('form') ||
      target.closest('.form-card') ||
      target.parentElement?.parentElement ||
      document.body

    return {
      calle:
        form.querySelector('input[name*="calle"]') ||
        form.querySelector('input[name*="domicilio"]') ||
        form.querySelector('#calle'),
      colonia: form.querySelector('input[name*="colonia"]') || form.querySelector('#colonia'),
      municipio: form.querySelector('input[name*="municipio"]') || form.querySelector('#municipio'),
      cp: form.querySelector('input[name*="cp"]') || form.querySelector('#cp'),
      origen:
        form.querySelector('input[name*="direccion_origen"]') ||
        form.querySelector('#direccion_origen'),
    }
  }

  function positionPopper(target) {
    const p = getPopper()
    if (!p || !target) return
    const rect = target.getBoundingClientRect()
    const scrollX = window.pageXOffset || document.documentElement.scrollLeft
    const scrollY = window.pageYOffset || document.documentElement.scrollTop

    const top = rect.bottom + scrollY + 4
    let left = rect.left + scrollX
    const width = Math.max(rect.width, 360)

    if (left + width > window.innerWidth - 16) {
      left = Math.max(16, window.innerWidth - width - 16)
    }

    p.style.top = top + 'px'
    p.style.left = left + 'px'
    p.style.width = width + 'px'
  }

  function escapeHtml(str) {
    if (!str) return ''
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;')
  }

  function highlight(text, q) {
    if (!text) return ''
    if (!q || !q.trim()) return escapeHtml(text)
    const escaped = escapeHtml(text)
    const cleanQ = escapeHtml(q.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
    const regex = new RegExp(`(${cleanQ})`, 'gi')
    return escaped.replace(
      regex,
      '<strong style="color:#8c1d3d;font-weight:700;background:rgba(140,29,61,0.08);border-radius:2px;padding:0 2px;">$1</strong>',
    )
  }

  function getChipClass(tipo) {
    const t = (tipo || '').toLowerCase()
    if (t.includes('fraccionamiento') || t.includes('condominio')) return 'mui-chip mui-chip--fracc'
    if (t.includes('ranchería') || t.includes('ejido') || t.includes('pueblo'))
      return 'mui-chip mui-chip--rancheria'
    if (t.includes('municipio')) return 'mui-chip mui-chip--municipio'
    return 'mui-chip mui-chip--colonia'
  }

  function render(target, tipo) {
    const p = getPopper()
    if (!p || !target) return
    currentTarget = target
    currentTipo = tipo

    const total = tipo === 'municipio' ? itemsMunicipios.length : itemsColonias.length
    if (total === 0) {
      hidePopper()
      return
    }

    positionPopper(target)
    p.innerHTML = ''
    p.style.display = 'block'
    target.setAttribute('aria-expanded', 'true')

    const siblings = getSiblingInputs(target)

    const header = document.createElement('div')
    header.className = 'mui-autocomplete-header'
    const title =
      tipo === 'municipio'
        ? '🏛️ Municipio'
        : tipo === 'calle'
          ? '📍 Domicilios y Colonias de San Pedro Tlaquepaque'
          : tipo === 'cp'
            ? '📮 Colonias por Código Postal'
            : '🏘️ Colonias de San Pedro Tlaquepaque (SEPOMEX)'

    header.innerHTML = `
      <span>${title}</span>
      <span style="font-size:10.5px;font-weight:600;color:#64748b;">${total} ${total === 1 ? 'opción' : 'opciones'}</span>
    `
    p.appendChild(header)

    const ul = document.createElement('ul')
    ul.className = 'mui-autocomplete-list'
    ul.setAttribute('role', 'listbox')

    if (tipo === 'municipio') {
      itemsMunicipios.forEach(function (m, idx) {
        const isSel = activeIndex === idx
        const li = document.createElement('li')
        li.className = 'mui-autocomplete-option' + (isSel ? ' is-active' : '')
        li.setAttribute('role', 'option')
        li.setAttribute('aria-selected', isSel ? 'true' : 'false')

        li.innerHTML = `
          <div style="display:flex;flex-direction:column;min-width:0;">
            <span style="font-size:13.5px;font-weight:600;line-height:1.3;">
              ${highlight(m.municipio, currentQuery)}
            </span>
            <span style="font-size:11px;color:#64748b;margin-top:1px;">
              Municipio de Tlaquepaque · ${m.coloniasCount} ${m.coloniasCount === 1 ? 'colonia' : 'colonias'}
            </span>
          </div>
          <span class="${getChipClass('municipio')}">Municipio</span>
        `

        li.addEventListener('mousedown', function (e) {
          e.preventDefault()
          target.value = m.municipio
          if (siblings.municipio) siblings.municipio.value = m.municipio
          if (siblings.origen) siblings.origen.value = 'catalogo'
          hidePopper()
          if (siblings.colonia && !siblings.colonia.value) {
            siblings.colonia.focus()
          }
        })

        li.addEventListener('mouseenter', function () {
          activeIndex = idx
          updateSelection(ul)
        })

        ul.appendChild(li)
      })
    } else {
      itemsColonias.forEach(function (sug, idx) {
        const isSel = activeIndex === idx
        const li = document.createElement('li')
        li.className = 'mui-autocomplete-option' + (isSel ? ' is-active' : '')
        li.setAttribute('role', 'option')
        li.setAttribute('aria-selected', isSel ? 'true' : 'false')

        const mainText = tipo === 'calle' && sug.calleSugerida ? sug.calleSugerida : sug.colonia
        li.innerHTML = `
          <div style="display:flex;flex-direction:column;min-width:0;">
            <span style="font-size:13.5px;font-weight:600;line-height:1.3;">
              ${highlight(mainText, currentQuery)}
            </span>
            <span style="font-size:11.5px;color:#64748b;margin-top:1px;display:flex;align-items:center;gap:4px;">
              <span>📍 ${highlight(sug.colonia, currentQuery)}</span>
              <span>·</span>
              <span>${highlight(sug.municipio, currentQuery)}</span>
              <span>·</span>
              <strong style="color:#475569;">C.P. ${sug.cp}</strong>
            </span>
          </div>
          <span class="${getChipClass(sug.tipo)}">${sug.tipo || 'Colonia'}</span>
        `

        li.addEventListener('mousedown', function (e) {
          e.preventDefault()
          if (tipo === 'calle') {
            if (target && !target.value.trim()) {
              target.value = sug.colonia
            }
            if (siblings.calle && !siblings.calle.value.trim()) {
              siblings.calle.value = sug.colonia
            }
          }
          if (siblings.colonia) siblings.colonia.value = sug.colonia
          if (siblings.municipio) siblings.municipio.value = sug.municipio
          if (siblings.cp) siblings.cp.value = sug.cp
          if (siblings.origen) siblings.origen.value = 'catalogo'
          hidePopper()
        })

        li.addEventListener('mouseenter', function () {
          activeIndex = idx
          updateSelection(ul)
        })

        ul.appendChild(li)
      })
    }

    p.appendChild(ul)
  }

  function updateSelection(ul) {
    const lis = ul.querySelectorAll('li')
    lis.forEach(function (li, i) {
      const isSel = i === activeIndex
      if (isSel) {
        li.classList.add('is-active')
        li.setAttribute('aria-selected', 'true')
        li.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
      } else {
        li.classList.remove('is-active')
        li.setAttribute('aria-selected', 'false')
      }
    })
  }

  function executeSearch(target, q, tipo, municipio) {
    const cacheKey = `${tipo}:${q.toLowerCase()}:${(municipio || '').toLowerCase()}`

    // 1. Revisar caché en memoria RAM (0ms, sin red)
    if (memoryCache.has(cacheKey)) {
      const cached = memoryCache.get(cacheKey)
      if (tipo === 'municipio') {
        itemsMunicipios = cached || []
        itemsColonias = []
      } else {
        itemsColonias = cached || []
        itemsMunicipios = []
      }
      activeIndex = -1
      render(target, tipo)
      return
    }

    // 2. Búsqueda local sobre el catálogo embebido (window.__COLONIAS__).
    //    Sin fetch: el endpoint /api/colonias no existe y causaba el bug de recarga.
    const munRaw = municipio || MUNICIPIO_UNICO
    let resultados
    if (tipo === 'municipio') {
      resultados = buscarMunicipiosLocal(q, 10)
    } else {
      resultados = buscarColoniasLocal(q, munRaw, 10)
    }

    memoryCache.set(cacheKey, resultados)

    if (currentTarget === target) {
      if (tipo === 'municipio') {
        itemsMunicipios = resultados
        itemsColonias = []
      } else {
        itemsColonias = resultados
        itemsMunicipios = []
      }
      activeIndex = -1
      render(target, tipo)
    }
  }

  function handleInputSearch(target, immediate) {
    const q = (target.value || '').trim()
    currentQuery = q
    const tipo = getFieldType(target)
    const siblings = getSiblingInputs(target)
    if (siblings.origen) siblings.origen.value = 'manual'

    // Municipios muestran catálogo al enfocar o escribir (solo Tlaquepaque)
    if (tipo === 'municipio') {
      if (q.length === 0) {
        itemsMunicipios = buscarMunicipiosLocal('', 10)
        itemsColonias = []
        activeIndex = -1
        render(target, tipo)
        return
      }
    } else if (q.length < 2) {
      hidePopper()
      return
    }

    const mun = (siblings.municipio && siblings.municipio.value.trim()) || ''

    if (debounceTimer) clearTimeout(debounceTimer)

    if (immediate) {
      executeSearch(target, q, tipo, mun)
    } else {
      debounceTimer = setTimeout(function () {
        executeSearch(target, q, tipo, mun)
      }, 35)
    }
  }

  function applyActiveSelection(target, p, tipo) {
    const siblings = getSiblingInputs(target)
    if (tipo === 'municipio' && itemsMunicipios[activeIndex]) {
      const m = itemsMunicipios[activeIndex]
      target.value = m.municipio
      if (siblings.municipio) siblings.municipio.value = m.municipio
      if (siblings.origen) siblings.origen.value = 'catalogo'
      hidePopper()
      if (siblings.colonia && !siblings.colonia.value) siblings.colonia.focus()
    } else if (itemsColonias[activeIndex]) {
      const s = itemsColonias[activeIndex]
      if (tipo === 'calle') {
        if (target && !target.value.trim()) target.value = s.colonia
        if (siblings.calle && !siblings.calle.value.trim()) siblings.calle.value = s.colonia
      }
      if (siblings.colonia) siblings.colonia.value = s.colonia
      if (siblings.municipio) siblings.municipio.value = s.municipio
      if (siblings.cp) siblings.cp.value = s.cp
      if (siblings.origen) siblings.origen.value = 'catalogo'
      hidePopper()
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // 4. Delegación de Eventos Global (Garantiza funcionamiento en todo momento)
  // ─────────────────────────────────────────────────────────────────────────
  function setupEventDelegation() {
    // Input typing
    document.addEventListener('input', function (e) {
      const target = e.target
      if (!isAddressField(target)) return
      handleInputSearch(target, false)
    })

    // Focus in
    document.addEventListener('focusin', function (e) {
      const target = e.target
      if (!isAddressField(target)) return

      target.setAttribute('autocomplete', 'off')
      target.setAttribute('role', 'combobox')
      target.setAttribute('aria-autocomplete', 'list')

      const tipo = getFieldType(target)
      const val = (target.value || '').trim()

      if (tipo === 'municipio' || val.length >= 2) {
        handleInputSearch(target, true)
      }
    })

    // Key navigation
    document.addEventListener('keydown', function (e) {
      const target = e.target
      if (!isAddressField(target)) return

      const p = getPopper()
      const isPopperOpen = p && p.style.display !== 'none'
      const hasQuery = (target.value || '').trim().length > 0

      // BUGFIX (crítico): con el popper abierto o texto en el campo, Enter NUNCA
      // debe enviar el formulario (eso recargaba la página). Solo se permite el
      // submit normal cuando el popper está cerrado Y el campo está vacío.
      if (e.key === 'Enter') {
        if (isPopperOpen || hasQuery) {
          e.preventDefault()
          if (!isPopperOpen) return // campo con texto pero sin sugerencias: no hacemos nada
          if (activeIndex >= 0) {
            applyActiveSelection(target, p, tipo())
          } else {
            hidePopper()
          }
          return
        }
        // popper cerrado y campo vacío: dejar que el formulario se envíe
        return
      }

      if (!isPopperOpen) return

      const tipo = getFieldType(target)
      const total = tipo === 'municipio' ? itemsMunicipios.length : itemsColonias.length
      if (total === 0) return

      const ul = p.querySelector('ul')
      const siblings = getSiblingInputs(target)

      if (e.key === 'ArrowDown') {
        e.preventDefault()
        activeIndex = Math.min(activeIndex + 1, total - 1)
        if (ul) updateSelection(ul)
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        activeIndex = Math.max(activeIndex - 1, 0)
        if (ul) updateSelection(ul)
      } else if (e.key === 'Escape') {
        hidePopper()
      } else if (e.key === 'Tab') {
        if (isPopperOpen && activeIndex >= 0) {
          applyActiveSelection(target, p, tipo)
        }
        hidePopper()
      }
    })

    // Click outside
    document.addEventListener('click', function (e) {
      const p = getPopper()
      if (!p || p.style.display === 'none') return
      if (!p.contains(e.target) && !isAddressField(e.target)) {
        hidePopper()
      }
    })

    window.addEventListener('resize', function () {
      if (currentTarget) positionPopper(currentTarget)
    })

    window.addEventListener('scroll', function () {
      if (currentTarget) positionPopper(currentTarget)
    })
  }

  // ─────────────────────────────────────────────────────────────────────────
  // 5. Precarga de Datos en Background al Iniciar (catálogo local, sin red)
  // ─────────────────────────────────────────────────────────────────────────
  function preloadBackgroundData() {
    // El catálogo ya está en window.__COLONIAS__; precargamos las búsquedas
    // comunes en la caché RAM para respuesta 0ms. Sin fetch.
    buscarColoniasLocal('', MUNICIPIO_UNICO, 10) // no-op si query < 2; mantiene caché tibia
    const coloniasTlaq = buscarColoniasLocal('tlaquepaque', MUNICIPIO_UNICO, 10)
    if (coloniasTlaq.length > 0) {
      memoryCache.set('colonia:tlaquepaque:', coloniasTlaq)
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // 6. Ciclo de Vida y Auto-inicialización
  // ─────────────────────────────────────────────────────────────────────────
  function initAll() {
    initFileInputs()
    initFormSubmitModals()
    setupEventDelegation()
    preloadBackgroundData()

    // MutationObserver para registrar dinámicamente nuevos formularios
    const observer = new MutationObserver(function () {
      initFileInputs()
      initFormSubmitModals()
    })
    observer.observe(document.documentElement, { childList: true, subtree: true })
  }

  // Ejecución inmediata
  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', initAll)
    } else {
      initAll()
    }
  }
})()
