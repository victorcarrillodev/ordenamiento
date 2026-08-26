/**
 * Autocompletado de Domicilio, Colonias y Municipios de Jalisco
 * Estilo Material UI (MUI Autocomplete)
 */
;(function () {
  'use strict'

  function initAutocomplete() {
    // Buscar inputs en formularios públicos o admin
    const inputCalle =
      document.querySelector('input[name="calle"]') ||
      document.querySelector('input[name="aporte_calle"]') ||
      document.getElementById('calle')
    const inputColonia =
      document.querySelector('input[name="colonia"]') ||
      document.querySelector('input[name="aporte_colonia"]') ||
      document.getElementById('colonia')
    const inputMunicipio =
      document.querySelector('input[name="municipio"]') ||
      document.querySelector('input[name="aporte_municipio"]') ||
      document.getElementById('municipio')
    const inputCp =
      document.querySelector('input[name="cp"]') ||
      document.querySelector('input[name="aporte_cp"]') ||
      document.getElementById('cp')
    const inputOrigen =
      document.querySelector('input[name="direccion_origen"]') ||
      document.querySelector('input[name="aporte_direccion_origen"]') ||
      document.getElementById('direccion_origen')

    if (!inputColonia && !inputMunicipio && !inputCalle) return

    const inputs = [inputCalle, inputColonia, inputMunicipio, inputCp].filter(Boolean)

    for (const inp of inputs) {
      inp.setAttribute('autocomplete', 'off')
      inp.setAttribute('role', 'combobox')
      inp.setAttribute('aria-autocomplete', 'list')
      inp.setAttribute('aria-expanded', 'false')
    }

    // Crear o recuperar el contenedor de Popper adjunto al body
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
      for (const inp of inputs) {
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

      // Evitar salir de la pantalla por la derecha
      if (left + width > window.innerWidth - 16) {
        left = Math.max(16, window.innerWidth - width - 16)
      }

      popper.style.top = top + 'px'
      popper.style.left = left + 'px'
      popper.style.width = width + 'px'
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

      // Header estilo Material UI
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
            if (inputMunicipio) inputMunicipio.value = m.municipio
            if (inputOrigen) inputOrigen.value = 'catalogo'
            hide()
            if (inputColonia && !inputColonia.value) {
              inputColonia.focus()
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
              if (inputCalle && !inputCalle.value.trim()) {
                inputCalle.value = sug.colonia
              }
            }
            if (inputColonia) inputColonia.value = sug.colonia
            if (inputMunicipio) inputMunicipio.value = sug.municipio
            if (inputCp) inputCp.value = sug.cp
            if (inputOrigen) inputOrigen.value = 'catalogo'
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
      if (n.includes('calle')) return 'calle'
      if (n.includes('cp')) return 'cp'
      return 'colonia'
    }

    async function search(target) {
      if (debounceTimer) clearTimeout(debounceTimer)
      if (abortCtrl) abortCtrl.abort()

      const q = target.value.trim()
      currentQuery = q
      if (inputOrigen) inputOrigen.value = 'manual'

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
          if ((tipo === 'colonia' || tipo === 'calle') && inputMunicipio && inputMunicipio.value) {
            url.searchParams.set('municipio', inputMunicipio.value.trim())
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
        } catch (err) {
          // Solicitud cancelada o error de red
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
            if (inputMunicipio) inputMunicipio.value = m.municipio
            if (inputOrigen) inputOrigen.value = 'catalogo'
            hide()
            if (inputColonia && !inputColonia.value) inputColonia.focus()
          } else if (itemsColonias[activeIndex]) {
            const s = itemsColonias[activeIndex]
            if (tipo === 'calle' && inputCalle && !inputCalle.value.trim()) {
              inputCalle.value = s.colonia
            }
            if (inputColonia) inputColonia.value = s.colonia
            if (inputMunicipio) inputMunicipio.value = s.municipio
            if (inputCp) inputCp.value = s.cp
            if (inputOrigen) inputOrigen.value = 'catalogo'
            hide()
          }
        }
      } else if (e.key === 'Escape') {
        hide()
      } else if (e.key === 'Tab') {
        if (activeIndex >= 0) {
          if (tipo === 'municipio' && itemsMunicipios[activeIndex]) {
            const m = itemsMunicipios[activeIndex]
            if (inputMunicipio) inputMunicipio.value = m.municipio
            if (inputOrigen) inputOrigen.value = 'catalogo'
          } else if (itemsColonias[activeIndex]) {
            const s = itemsColonias[activeIndex]
            if (inputColonia) inputColonia.value = s.colonia
            if (inputMunicipio) inputMunicipio.value = s.municipio
            if (inputCp) inputCp.value = s.cp
            if (inputOrigen) inputOrigen.value = 'catalogo'
          }
        }
        hide()
      }
    }

    for (const inp of inputs) {
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
      if (!popper.contains(e.target) && !inputs.some((inp) => inp.contains(e.target))) {
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
