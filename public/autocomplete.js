/**
 * Motor de Autocompletado Instantáneo de Jalisco (0 ms de latencia)
 * Ejecución 100% en Memoria del Navegador con Índice Local Precargado
 * Estilo Material UI (MUI Autocomplete) · Sin esperas de red · Ultra-rápido
 */
;(function () {
  'use strict'

  function normalizeStr(str) {
    return (str || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim()
  }

  // ─────────────────────────────────────────────────────────────────────────
  // 1. Motor de Búsqueda Local en Memoria RAM (< 1 ms de respuesta)
  // ─────────────────────────────────────────────────────────────────────────
  let preparedIndex = null

  function initLocalIndex() {
    if (preparedIndex) return preparedIndex
    const raw = typeof window !== 'undefined' ? window.__JALISCO_DATA__ : null
    if (!raw || !raw.c || !raw.m) return null

    const rows = raw.c
    const count = rows.length
    const searchables = new Array(count)
    const normColonia = new Array(count)
    const normMun = raw.m.map(normalizeStr)

    for (let i = 0; i < count; i++) {
      const r = rows[i]
      const colNorm = normalizeStr(r[0])
      normColonia[i] = colNorm
      searchables[i] = colNorm + ' ' + normMun[r[1]] + ' ' + r[2]
    }

    const munCounts = new Map()
    for (let i = 0; i < count; i++) {
      const munIdx = rows[i][1]
      munCounts.set(munIdx, (munCounts.get(munIdx) || 0) + 1)
    }

    const municipiosList = raw.m.map(function (name, idx) {
      return {
        municipio: name,
        coloniasCount: munCounts.get(idx) || 1,
        norm: normMun[idx],
      }
    })

    preparedIndex = {
      m: raw.m,
      t: raw.t,
      c: rows,
      count: count,
      searchables: searchables,
      normColonia: normColonia,
      normMun: normMun,
      municipiosList: municipiosList,
    }

    return preparedIndex
  }

  function searchLocal(q, tipo, munFilter) {
    const idx = initLocalIndex()
    if (!idx) return null // Fallback a API si el índice local no ha cargado

    const normQ = normalizeStr(q)

    // Búsqueda de Municipios
    if (tipo === 'municipio') {
      if (!normQ) {
        return idx.municipiosList.slice(0, 15)
      }
      const exact = []
      const contains = []
      for (let i = 0; i < idx.municipiosList.length; i++) {
        const item = idx.municipiosList[i]
        if (item.norm.startsWith(normQ)) {
          exact.push(item)
        } else if (item.norm.includes(normQ)) {
          contains.push(item)
        }
        if (exact.length + contains.length >= 15) break
      }
      return exact.concat(contains).slice(0, 12)
    }

    // Búsqueda de Colonias / Domicilios / C.P.
    if (!normQ || normQ.length < 2) return []

    const munNorm = munFilter ? normalizeStr(munFilter) : ''
    const exactPrefix = []
    const containsMatch = []
    const limit = 12

    for (let i = 0; i < idx.count; i++) {
      const munIdx = idx.c[i][1]
      if (munNorm && !idx.normMun[munIdx].includes(munNorm)) continue

      const s = idx.searchables[i]
      if (s.includes(normQ)) {
        const item = {
          colonia: idx.c[i][0],
          municipio: idx.m[munIdx],
          cp: idx.c[i][2],
          tipo: idx.t[idx.c[i][3]],
        }

        if (idx.normColonia[i].startsWith(normQ) || idx.c[i][2].startsWith(normQ)) {
          exactPrefix.push(item)
        } else {
          containsMatch.push(item)
        }

        if (exactPrefix.length + containsMatch.length >= 20) break
      }
    }

    return exactPrefix.concat(containsMatch).slice(0, limit)
  }

  // Caché de peticiones de red (fallback)
  const apiCache = new Map()

  // ─────────────────────────────────────────────────────────────────────────
  // 2. Manejo de archivos adjuntos y vista previa dinámica
  // ─────────────────────────────────────────────────────────────────────────
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
  // 3. Modal de Carga en Envío (Loading Modal)
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
  // 4. Interfaz Visual Material UI (MUI Autocomplete)
  // ─────────────────────────────────────────────────────────────────────────
  let popper = null
  let activeIndex = -1
  let currentTarget = null
  let currentQuery = ''
  let currentTipo = ''
  let itemsColonias = []
  let itemsMunicipios = []
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
    openInputs.forEach(function (inp) {
      inp.setAttribute('aria-expanded', 'false')
    })
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
        ? '🏛️ Municipios de Jalisco (125)'
        : tipo === 'calle'
          ? '📍 Domicilios y Colonias de Jalisco'
          : tipo === 'cp'
            ? '📮 Colonias de Jalisco por C.P.'
            : '🏘️ Colonias de Jalisco (SEPOMEX)'

    header.innerHTML = `
      <span>${title}</span>
      <span style="font-size:10.5px;font-weight:600;color:#64748b;">${total} ${total === 1 ? 'resultado' : 'resultados'}</span>
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

  // ─────────────────────────────────────────────────────────────────────────
  // 5. Ejecución Instantánea (Local 0ms -> Fallback Red)
  // ─────────────────────────────────────────────────────────────────────────
  async function performSearch(target) {
    const q = (target.value || '').trim()
    currentQuery = q
    const tipo = getFieldType(target)
    const siblings = getSiblingInputs(target)
    if (siblings.origen) siblings.origen.value = 'manual'

    if (tipo !== 'municipio' && q.length < 2) {
      hidePopper()
      return
    }

    const mun = (siblings.municipio && siblings.municipio.value.trim()) || ''

    // 1. Intentar búsqueda local en memoria RAM (0.3 ms)
    const localResults = searchLocal(q, tipo, mun)
    if (localResults !== null) {
      if (tipo === 'municipio') {
        itemsMunicipios = localResults
        itemsColonias = []
      } else {
        itemsColonias = localResults
        itemsMunicipios = []
      }
      activeIndex = -1
      render(target, tipo)
      return
    }

    // 2. Fallback a API si el índice local todavía estuviera cargando
    const cacheKey = `${tipo}:${q.toLowerCase()}:${mun.toLowerCase()}`
    if (apiCache.has(cacheKey)) {
      const cached = apiCache.get(cacheKey)
      if (tipo === 'municipio') {
        itemsMunicipios = cached
        itemsColonias = []
      } else {
        itemsColonias = cached
        itemsMunicipios = []
      }
      activeIndex = -1
      render(target, tipo)
      return
    }

    if (abortCtrl) abortCtrl.abort()
    abortCtrl = new AbortController()

    try {
      const url = new URL('/ordena/api/colonias', window.location.origin)
      url.searchParams.set('tipo', tipo)
      url.searchParams.set('q', q)
      if (mun) url.searchParams.set('municipio', mun)

      const res = await fetch(url.toString(), {
        signal: abortCtrl.signal,
        headers: { Accept: 'application/json' },
      })
      if (!res.ok) return
      const data = await res.json()
      const items = data.items || []
      apiCache.set(cacheKey, items)

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
      // Ignorar cancelaciones
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // 6. Delegación de Eventos Global (Instantáneo al enfocar o teclear)
  // ─────────────────────────────────────────────────────────────────────────
  function setupDelegation() {
    initLocalIndex()

    document.addEventListener('input', function (e) {
      const target = e.target
      if (!isAddressField(target)) return
      performSearch(target)
    })

    document.addEventListener('focusin', function (e) {
      const target = e.target
      if (!isAddressField(target)) return

      target.setAttribute('autocomplete', 'off')
      target.setAttribute('role', 'combobox')
      target.setAttribute('aria-autocomplete', 'list')

      performSearch(target)
    })

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
  // 7. Inicialización de ciclo de vida
  // ─────────────────────────────────────────────────────────────────────────
  function initAll() {
    initLocalIndex()
    initFileInputs()
    initFormSubmitModals()
    setupDelegation()

    const observer = new MutationObserver(function () {
      initFileInputs()
      initFormSubmitModals()
    })
    observer.observe(document.documentElement, { childList: true, subtree: true })
  }

  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', initAll)
    } else {
      initAll()
    }
  }
})()
