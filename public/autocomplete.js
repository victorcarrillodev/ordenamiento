/**
 * Autocompletado de Domicilio, Colonias y Municipios de Jalisco
 * Estilo Material UI (MUI Autocomplete) de Alto Rendimiento.
 * Carga instantánea a la primera con Caché en Memoria, Precarga de Municipios,
 * Delegación de Eventos Global y Observador de Mutaciones DOM.
 */
;(function () {
  'use strict'

  // ─────────────────────────────────────────────────────────────────────────
  // Catálogo base de Municipios de Jalisco (Fallback y precarga instantánea 0ms)
  // ─────────────────────────────────────────────────────────────────────────
  const JALISCO_MUNICIPIOS_BASE = [
    { municipio: 'San Pedro Tlaquepaque', coloniasCount: 184 },
    { municipio: 'Guadalajara', coloniasCount: 520 },
    { municipio: 'Zapopan', coloniasCount: 612 },
    { municipio: 'Tlajomulco de Zúñiga', coloniasCount: 298 },
    { municipio: 'Tonalá', coloniasCount: 245 },
    { municipio: 'El Salto', coloniasCount: 86 },
    { municipio: 'Ixtlahuacán de los Membrillos', coloniasCount: 42 },
    { municipio: 'Juanacatlán', coloniasCount: 28 },
    { municipio: 'Zapotlanejo', coloniasCount: 65 },
    { municipio: 'Chapala', coloniasCount: 54 },
    { municipio: 'Puerto Vallarta', coloniasCount: 210 },
    { municipio: 'Lagos de Moreno', coloniasCount: 140 },
    { municipio: 'Tepatitlán de Morelos', coloniasCount: 95 },
    { municipio: 'Ciudad Guzmán (Zapotlán el Grande)', coloniasCount: 88 },
    { municipio: 'Ocotlán', coloniasCount: 62 },
    { municipio: 'Autlán de Navarro', coloniasCount: 51 },
    { municipio: 'Ameca', coloniasCount: 48 },
    { municipio: 'Arandas', coloniasCount: 52 },
    { municipio: 'Tala', coloniasCount: 39 },
    { municipio: 'Sayula', coloniasCount: 32 },
  ]

  // Caché en memoria RAM para respuestas de autocompletado (0ms latencia)
  const memoryCache = new Map()

  // Guardar municipios base en caché inmediatamente
  memoryCache.set('municipio:', JALISCO_MUNICIPIOS_BASE)
  memoryCache.set('municipio:tlaquepaque', [
    { municipio: 'San Pedro Tlaquepaque', coloniasCount: 184 },
  ])
  memoryCache.set('municipio:san pedro tlaquepaque', [
    { municipio: 'San Pedro Tlaquepaque', coloniasCount: 184 },
  ])
  memoryCache.set('municipio:guadalajara', [{ municipio: 'Guadalajara', coloniasCount: 520 }])
  memoryCache.set('municipio:zapopan', [{ municipio: 'Zapopan', coloniasCount: 612 }])

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
          item.innerHTML = `
            <div class="file-preview-info">
              <span class="file-preview-icon">${getFileIcon(file.name)}</span>
              <div class="file-preview-details">
                <span class="file-preview-name" title="${file.name}">${file.name}</span>
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
        item.innerHTML = `
          <div class="file-preview-info">
            <span class="file-preview-icon">${getFileIcon(file.name)}</span>
            <div class="file-preview-details">
              <span class="file-preview-name" title="${file.name}">${file.name}</span>
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
  // 2. Modal de Carga en Envío (Loading Modal)
  // ─────────────────────────────────────────────────────────────────────────
  function showLoadingModal(title, desc) {
    let overlay = document.getElementById('mui-loading-overlay')
    if (!overlay) {
      overlay = document.createElement('div')
      overlay.id = 'mui-loading-overlay'
      overlay.className = 'mui-loading-overlay'
      document.body.appendChild(overlay)
    }

    overlay.innerHTML = `
      <div class="mui-loading-modal">
        <div class="mui-loading-spinner-box">
          <div class="mui-loading-spinner-ring"></div>
          <div class="mui-loading-spinner-ring mui-loading-spinner-ring--inner"></div>
        </div>
        <h3 class="mui-loading-title">${title}</h3>
        <p class="mui-loading-desc">${desc}</p>
        <div class="mui-loading-dots">
          <div class="mui-loading-dot"></div>
          <div class="mui-loading-dot"></div>
          <div class="mui-loading-dot"></div>
        </div>
      </div>
    `
    overlay.style.display = 'flex'
  }

  function initFormSubmitModals() {
    const publicForm = document.getElementById('participation-form')
    if (publicForm && !publicForm.dataset.loadingBound) {
      publicForm.dataset.loadingBound = '1'
      publicForm.addEventListener('submit', function () {
        if (publicForm.checkValidity()) {
          showLoadingModal(
            'Enviando tu participación...',
            'Estamos registrando tu información y subiendo los documentos adjuntos al expediente de la Bitácora Ambiental. Por favor no cierres esta ventana.',
          )
        }
      })
    }

    const adminForms = Array.from(document.querySelectorAll('form.form-card, form[method="post"]'))
    adminForms.forEach(function (form) {
      if (form.id === 'participation-form' || form.dataset.loadingBound) return
      form.dataset.loadingBound = '1'
      form.addEventListener('submit', function () {
        if (form.checkValidity()) {
          const isNueva = window.location.pathname.includes('/participaciones/nueva')
          if (isNueva) {
            showLoadingModal(
              'Guardando participación física...',
              'Estamos procesando los datos y vinculando los archivos adjuntos al expediente técnico.',
            )
          }
        }
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
  let abortCtrl = null

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
        ? '🏛️ Municipios de Jalisco'
        : tipo === 'calle'
          ? '📍 Domicilios y Colonias de Jalisco'
          : tipo === 'cp'
            ? '📮 Colonias por Código Postal'
            : '🏘️ Colonias de Jalisco (SEPOMEX)'

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
              Estado de Jalisco · ${m.coloniasCount} ${m.coloniasCount === 1 ? 'colonia' : 'colonias'}
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

  async function executeSearch(target, q, tipo, municipio) {
    const cacheKey = `${tipo}:${q.toLowerCase()}:${(municipio || '').toLowerCase()}`

    // 1. Revisar caché en memoria RAM (0ms)
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

    // 2. Si no está en caché, consultar API
    if (abortCtrl) abortCtrl.abort()
    abortCtrl = new AbortController()

    try {
      const url = new URL('/ordena/api/colonias', window.location.origin)
      url.searchParams.set('tipo', tipo)
      url.searchParams.set('q', q)
      if (municipio) {
        url.searchParams.set('municipio', municipio)
      }

      const res = await fetch(url.toString(), {
        signal: abortCtrl.signal,
        headers: { Accept: 'application/json' },
      })

      if (!res.ok) return
      const data = await res.json()
      const items = data.items || []

      // Guardar en caché
      memoryCache.set(cacheKey, items)

      if (currentTarget === target) {
        if (tipo === 'municipio') {
          itemsMunicipios = items
          itemsColonias = []
        } else {
          itemsColonias = items
          itemsMunicipios = []
        }
        activeIndex = -1
        render(target, tipo)
      }
    } catch {
      // Petición cancelada o error de red
    }
  }

  function handleInputSearch(target, immediate) {
    const q = (target.value || '').trim()
    currentQuery = q
    const tipo = getFieldType(target)
    const siblings = getSiblingInputs(target)
    if (siblings.origen) siblings.origen.value = 'manual'

    // Municipios muestran catálogo al enfocar o escribir
    if (tipo === 'municipio') {
      if (q.length === 0) {
        itemsMunicipios = JALISCO_MUNICIPIOS_BASE
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
      if (!p || p.style.display === 'none') return

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
      } else if (e.key === 'Enter') {
        if (activeIndex >= 0) {
          e.preventDefault()
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
      } else if (e.key === 'Escape') {
        hidePopper()
      } else if (e.key === 'Tab') {
        if (activeIndex >= 0) {
          if (tipo === 'municipio' && itemsMunicipios[activeIndex]) {
            const m = itemsMunicipios[activeIndex]
            target.value = m.municipio
            if (siblings.municipio) siblings.municipio.value = m.municipio
            if (siblings.origen) siblings.origen.value = 'catalogo'
          } else if (itemsColonias[activeIndex]) {
            const s = itemsColonias[activeIndex]
            if (siblings.colonia) siblings.colonia.value = s.colonia
            if (siblings.municipio) siblings.municipio.value = s.municipio
            if (siblings.cp) siblings.cp.value = s.cp
            if (siblings.origen) siblings.origen.value = 'catalogo'
          }
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
  // 5. Precarga de Datos en Background al Iniciar
  // ─────────────────────────────────────────────────────────────────────────
  function preloadBackgroundData() {
    try {
      fetch('/ordena/api/colonias?tipo=municipio&q=')
        .then((r) => (r.ok ? r.json() : null))
        .then((data) => {
          if (data && data.items && data.items.length > 0) {
            memoryCache.set('municipio:', data.items)
          }
        })
        .catch(() => {})

      fetch('/ordena/api/colonias?tipo=colonia&q=tlaquepaque')
        .then((r) => (r.ok ? r.json() : null))
        .then((data) => {
          if (data && data.items) {
            memoryCache.set('colonia:tlaquepaque:', data.items)
          }
        })
        .catch(() => {})
    } catch {
      // Ignorar errores de red en precarga
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
