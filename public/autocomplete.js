/**
 * Autocompletado de Domicilio, Colonias y Municipios de Jalisco
 * Estilo Material UI (MUI Autocomplete)
 * Vista previa interactiva de archivos y Modal de Carga en envío.
 */
;(function () {
  'use strict'

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
    // Público (#archivos)
    const publicInput = document.getElementById('archivos')
    const publicLabel = document.getElementById('file-count-label')
    const publicPreview = document.getElementById('file-list-preview')

    if (publicInput && publicPreview) {
      publicInput.addEventListener('change', function () {
        const files = Array.from(publicInput.files || [])
        publicPreview.innerHTML = ''

        if (files.length === 0) {
          publicPreview.style.display = 'none'
          if (publicLabel) publicLabel.textContent = 'Ningún archivo seleccionado'
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

    // Admin (#pdf)
    const adminInput = document.getElementById('pdf')
    const adminLabel = document.getElementById('admin-file-label')
    const adminPreview = document.getElementById('admin-file-preview')

    if (adminInput && adminPreview) {
      adminInput.addEventListener('change', function () {
        const file = adminInput.files && adminInput.files[0]
        adminPreview.innerHTML = ''

        if (!file) {
          adminPreview.style.display = 'none'
          if (adminLabel) adminLabel.textContent = 'Ningún archivo seleccionado'
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
  // 2. Modal de Carga durante el envío (Loading Modal)
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
    // Formulario de participación ciudadana (Público)
    const publicForm = document.getElementById('participation-form')
    if (publicForm && !publicForm.dataset.loadingBound) {
      publicForm.dataset.loadingBound = '1'
      publicForm.addEventListener('submit', function (e) {
        if (publicForm.checkValidity()) {
          showLoadingModal(
            'Enviando tu participación...',
            'Estamos registrando tu información y subiendo los documentos adjuntos al expediente de la Bitácora Ambiental. Por favor no cierres esta ventana.',
          )
        }
      })
    }

    // Formulario de participación física (Admin)
    const adminForms = Array.from(document.querySelectorAll('form.form-card, form[method="post"]'))
    adminForms.forEach(function (form) {
      if (form.id === 'participation-form' || form.dataset.loadingBound) return
      form.dataset.loadingBound = '1'
      form.addEventListener('submit', function (e) {
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
  // 3. Autocompletado de Jalisco Material UI
  // ─────────────────────────────────────────────────────────────────────────
  function initAutocomplete() {
    initFileInputs()
    initFormSubmitModals()

    const selector = [
      'input[name*="calle"]',
      'input[name*="domicilio"]',
      'input[name*="colonia"]',
      'input[name*="municipio"]',
      'input[name*="cp"]',
      '#calle',
      '#colonia',
      '#municipio',
      '#cp',
      '#domicilio',
    ].join(', ')

    const allInputs = Array.from(document.querySelectorAll(selector))
    if (allInputs.length === 0) return

    for (const inp of allInputs) {
      if (inp.dataset.muiBound === '1') continue
      inp.dataset.muiBound = '1'
      inp.setAttribute('autocomplete', 'off')
      inp.setAttribute('role', 'combobox')
      inp.setAttribute('aria-autocomplete', 'list')
      inp.setAttribute('aria-expanded', 'false')
    }

    let popper = document.getElementById('mui-autocomplete-root')
    if (!popper) {
      popper = document.createElement('div')
      popper.id = 'mui-autocomplete-root'
      popper.className = 'mui-autocomplete-popper'
      popper.style.display = 'none'
      document.body.appendChild(popper)
    }

    let itemsColonias = []
    let itemsMunicipios = []
    let activeIndex = -1
    let currentQuery = ''
    let currentTarget = null
    let abortCtrl = null
    let debounceTimer = null

    function hide() {
      if (popper) popper.style.display = 'none'
      activeIndex = -1
      currentTarget = null
      for (const inp of allInputs) {
        inp.setAttribute('aria-expanded', 'false')
      }
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
      if (t.includes('fraccionamiento') || t.includes('condominio'))
        return 'mui-chip mui-chip--fracc'
      if (t.includes('ranchería') || t.includes('ejido') || t.includes('pueblo'))
        return 'mui-chip mui-chip--rancheria'
      if (t.includes('municipio')) return 'mui-chip mui-chip--municipio'
      return 'mui-chip mui-chip--colonia'
    }

    function positionPopper(target) {
      if (!popper || !target) return
      const rect = target.getBoundingClientRect()
      const scrollX = window.pageXOffset || document.documentElement.scrollLeft
      const scrollY = window.pageYOffset || document.documentElement.scrollTop

      const top = rect.bottom + scrollY + 4
      let left = rect.left + scrollX
      const width = Math.max(rect.width, 360)

      if (left + width > window.innerWidth - 16) {
        left = Math.max(16, window.innerWidth - width - 16)
      }

      popper.style.top = top + 'px'
      popper.style.left = left + 'px'
      popper.style.width = width + 'px'
    }

    function getSiblingInputs(target) {
      const form = target.closest('form') || target.closest('.form-card') || document.body
      return {
        calle:
          form.querySelector('input[name*="calle"]') ||
          form.querySelector('input[name*="domicilio"]') ||
          form.querySelector('#calle'),
        colonia: form.querySelector('input[name*="colonia"]') || form.querySelector('#colonia'),
        municipio:
          form.querySelector('input[name*="municipio"]') || form.querySelector('#municipio'),
        cp: form.querySelector('input[name*="cp"]') || form.querySelector('#cp'),
        origen:
          form.querySelector('input[name*="direccion_origen"]') ||
          form.querySelector('#direccion_origen'),
      }
    }

    function render(target, tipo) {
      if (!popper || !target) return
      currentTarget = target

      const total = tipo === 'municipio' ? itemsMunicipios.length : itemsColonias.length
      if (total === 0) {
        hide()
        return
      }

      positionPopper(target)
      popper.innerHTML = ''
      popper.style.display = 'block'
      target.setAttribute('aria-expanded', 'true')

      const siblings = getSiblingInputs(target)

      const header = document.createElement('div')
      header.className = 'mui-autocomplete-header'
      const title =
        tipo === 'municipio'
          ? '🏛️ Municipios de Jalisco (125)'
          : tipo === 'calle'
            ? '📍 Domicilios y Colonias en Jalisco'
            : tipo === 'cp'
              ? '📮 Colonias de Jalisco por C.P.'
              : '🏘️ Colonias de Jalisco (SEPOMEX)'

      header.innerHTML = `
        <span>${title}</span>
        <span style="font-size:10.5px;font-weight:600;color:#64748b;">${total} ${total === 1 ? 'resultado' : 'resultados'}</span>
      `
      popper.appendChild(header)

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
            hide()
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
            hide()
          })

          li.addEventListener('mouseenter', function () {
            activeIndex = idx
            updateSelection(ul)
          })

          ul.appendChild(li)
        })
      }

      popper.appendChild(ul)
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

    function getFieldType(target) {
      const n = (target.name || target.id || '').toLowerCase()
      if (n.includes('municipio')) return 'municipio'
      if (n.includes('calle') || n.includes('domicilio')) return 'calle'
      if (n.includes('cp')) return 'cp'
      return 'colonia'
    }

    async function search(target) {
      if (debounceTimer) clearTimeout(debounceTimer)
      if (abortCtrl) abortCtrl.abort()

      const q = target.value.trim()
      currentQuery = q
      const siblings = getSiblingInputs(target)
      if (siblings.origen) siblings.origen.value = 'manual'

      const tipo = getFieldType(target)
      const minLen = tipo === 'municipio' ? 1 : 2

      if (q.length < minLen) {
        hide()
        return
      }

      debounceTimer = setTimeout(async function () {
        abortCtrl = new AbortController()
        const signal = abortCtrl.signal

        try {
          const endpoint = '/ordena/api/colonias'
          const url = new URL(endpoint, window.location.origin)
          url.searchParams.set('tipo', tipo)
          url.searchParams.set('q', q)
          if (
            (tipo === 'colonia' || tipo === 'calle') &&
            siblings.municipio &&
            siblings.municipio.value
          ) {
            url.searchParams.set('municipio', siblings.municipio.value.trim())
          }

          const res = await fetch(url.toString(), {
            signal: signal,
            headers: { Accept: 'application/json' },
          })
          if (!res.ok || signal.aborted) return

          const data = await res.json()
          if (tipo === 'municipio') {
            itemsMunicipios = data.items || []
            itemsColonias = []
          } else {
            itemsColonias = data.items || []
            itemsMunicipios = []
          }
          activeIndex = -1
          render(target, tipo)
        } catch {
          // Cancelado o error de red
        }
      }, 50)
    }

    function onKeydown(e) {
      if (!popper || popper.style.display === 'none') return
      const target = e.target
      const tipo = getFieldType(target)
      const total = tipo === 'municipio' ? itemsMunicipios.length : itemsColonias.length
      if (total === 0) return

      const ul = popper.querySelector('ul')
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
            hide()
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
            hide()
          }
        }
      } else if (e.key === 'Escape') {
        hide()
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
        hide()
      }
    }

    for (const inp of allInputs) {
      inp.addEventListener('input', function () {
        search(inp)
      })
      inp.addEventListener('focus', function () {
        if (inp.value.trim().length >= 1) search(inp)
      })
      inp.addEventListener('keydown', onKeydown)
    }

    document.addEventListener('click', function (e) {
      if (!popper) return
      if (!popper.contains(e.target) && !allInputs.some((inp) => inp.contains(e.target))) {
        hide()
      }
    })

    window.addEventListener('resize', function () {
      if (currentTarget && popper && popper.style.display !== 'none') {
        positionPopper(currentTarget)
      }
    })

    window.addEventListener('scroll', function () {
      if (currentTarget && popper && popper.style.display !== 'none') {
        positionPopper(currentTarget)
      }
    })
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAutocomplete)
  } else {
    initAutocomplete()
  }
})()
