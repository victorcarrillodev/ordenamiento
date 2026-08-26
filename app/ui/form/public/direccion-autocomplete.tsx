import { clientEntry, css, type Handle, type RemixNode, type SerializableProps } from 'remix/ui'

export interface Sugerencia {
  colonia: string
  municipio: string
  cp: string
  tipo: string
  calleSugerida?: string
}

export interface MunicipioSugerencia {
  municipio: string
  coloniasCount: number
}

export interface DireccionAutocompleteProps extends SerializableProps {
  endpoint: string
  names: {
    calle: string
    colonia: string
    municipio: string
    cp: string
    direccion_origen: string
  }
  initial: {
    calle?: string
    colonia?: string
    municipio?: string
    cp?: string
    direccion_origen?: string
  }
  appearance: 'civic' | 'admin'
  children: RemixNode
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

function highlightMatch(text: string, query: string): string {
  if (!query || !query.trim()) return escapeHtml(text)
  const escapedText = escapeHtml(text)
  const escapedQuery = escapeHtml(query.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
  const regex = new RegExp(`(${escapedQuery})`, 'gi')
  return escapedText.replace(
    regex,
    '<strong style="color: #8c1d3d; font-weight: 700; background: rgba(140, 29, 61, 0.08); border-radius: 2px; padding: 0 1px;">$1</strong>',
  )
}

function getChipColor(tipo: string): { bg: string; color: string; border: string } {
  const t = (tipo || '').toLowerCase()
  if (t.includes('fraccionamiento') || t.includes('condominio')) {
    return { bg: '#f0fdf4', color: '#166534', border: '#bbf7d0' }
  }
  if (t.includes('ranchería') || t.includes('ejido') || t.includes('pueblo')) {
    return { bg: '#fffbeb', color: '#92400e', border: '#fde68a' }
  }
  if (t.includes('municipio')) {
    return { bg: '#eff6ff', color: '#1e40af', border: '#bfdbfe' }
  }
  return { bg: '#f8fafc', color: '#475569', border: '#e2e8f0' }
}

export const DireccionAutocomplete = clientEntry(
  import.meta.url,
  function DireccionAutocomplete(handle: Handle<DireccionAutocompleteProps>) {
    let taskQueued = false

    return () => {
      if (!taskQueued) {
        taskQueued = true
        handle.queueTask((signal) => {
          const container = document.getElementById(handle.id)
          if (!container) return

          const listenerOpts = signal instanceof AbortSignal ? { signal } : undefined
          const { names, endpoint } = handle.props
          const inputCalle = container.querySelector<HTMLInputElement>(
            `input[name="${names.calle}"]`,
          )
          const inputColonia = container.querySelector<HTMLInputElement>(
            `input[name="${names.colonia}"]`,
          )
          const inputMunicipio = container.querySelector<HTMLInputElement>(
            `input[name="${names.municipio}"]`,
          )
          const inputCp = container.querySelector<HTMLInputElement>(`input[name="${names.cp}"]`)
          const inputOrigen = container.querySelector<HTMLInputElement>(
            `input[name="${names.direccion_origen}"]`,
          )

          const inputs = [inputCalle, inputColonia, inputMunicipio, inputCp].filter(
            Boolean,
          ) as HTMLInputElement[]
          for (const inp of inputs) {
            inp.setAttribute('autocomplete', 'off')
            inp.setAttribute('role', 'combobox')
            inp.setAttribute('aria-autocomplete', 'list')
            inp.setAttribute('aria-expanded', 'false')
          }

          // Crear elemento flotante estilo Material UI Paper
          let dropdown = container.querySelector<HTMLDivElement>('.mui-autocomplete-popper')
          if (!dropdown) {
            dropdown = document.createElement('div')
            dropdown.className = 'mui-autocomplete-popper'
            dropdown.setAttribute('role', 'presentation')
            dropdown.style.cssText = `
              position: absolute;
              display: none;
              z-index: 10000;
              background-color: #ffffff;
              border-radius: 8px;
              box-shadow: 0px 5px 5px -3px rgba(0,0,0,0.06), 0px 8px 10px 1px rgba(0,0,0,0.05), 0px 3px 14px 2px rgba(0,0,0,0.04), 0px 14px 28px rgba(0,0,0,0.12);
              border: 1px solid rgba(0, 0, 0, 0.1);
              margin-top: 4px;
              padding: 0;
              max-height: 320px;
              overflow-y: auto;
              font-family: 'Montserrat', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
              animation: muiFadeIn 140ms cubic-bezier(0.4, 0, 0.2, 1);
            `
            container.appendChild(dropdown)
          }

          let itemsColonias: Sugerencia[] = []
          let itemsMunicipios: MunicipioSugerencia[] = []
          let activeIndex = -1
          let currentQuery = ''
          let currentAbortController: AbortController | null = null
          let currentTargetInput: HTMLInputElement | null = null

          function hideDropdown() {
            if (dropdown) dropdown.style.display = 'none'
            activeIndex = -1
            currentTargetInput = null
            for (const inp of inputs) {
              inp.setAttribute('aria-expanded', 'false')
            }
          }

          function renderDropdown(
            target: HTMLInputElement,
            tipo: 'municipio' | 'colonia' | 'calle' | 'cp',
          ) {
            if (!dropdown) return
            currentTargetInput = target

            const total = tipo === 'municipio' ? itemsMunicipios.length : itemsColonias.length
            if (total === 0) {
              hideDropdown()
              return
            }

            const targetRect = target.getBoundingClientRect()
            const contRect = container!.getBoundingClientRect()
            let left = Math.max(0, targetRect.left - contRect.left)
            const top = targetRect.bottom - contRect.top + 4
            const width = Math.min(Math.max(target.offsetWidth, 360), contRect.width)

            if (left + width > contRect.width) {
              left = Math.max(0, contRect.width - width)
            }

            dropdown.style.left = `${left}px`
            dropdown.style.top = `${top}px`
            dropdown.style.width = `${width}px`
            dropdown.style.display = 'block'
            dropdown.innerHTML = ''
            target.setAttribute('aria-expanded', 'true')

            // Header estilo Material UI
            const header = document.createElement('div')
            header.style.cssText = `
              padding: 8px 14px 6px;
              font-size: 11px;
              font-weight: 700;
              text-transform: uppercase;
              letter-spacing: 0.06em;
              color: #8c1d3d;
              background: #fdf8f9;
              border-bottom: 1px solid rgba(140, 29, 61, 0.08);
              display: flex;
              align-items: center;
              justify-content: space-between;
              border-top-left-radius: 8px;
              border-top-right-radius: 8px;
            `
            const headerTitle =
              tipo === 'municipio'
                ? '🏛️ Municipios de Jalisco (125)'
                : tipo === 'calle'
                  ? '📍 Domicilios y Colonias en Jalisco'
                  : tipo === 'cp'
                    ? '📮 Colonias de Jalisco por C.P.'
                    : '🏘️ Colonias de Jalisco (SEPOMEX)'

            header.innerHTML = `
              <span>${headerTitle}</span>
              <span style="font-size: 10.5px; font-weight: 600; color: #64748b;">${total} ${total === 1 ? 'resultado' : 'resultados'}</span>
            `
            dropdown.appendChild(header)

            const list = document.createElement('ul')
            list.setAttribute('role', 'listbox')
            list.style.cssText = `
              list-style: none;
              margin: 0;
              padding: 4px 0;
              max-height: 260px;
              overflow-y: auto;
            `

            if (tipo === 'municipio') {
              itemsMunicipios.forEach((m, idx) => {
                const isSelected = activeIndex === idx
                const li = document.createElement('li')
                li.setAttribute('role', 'option')
                li.setAttribute('aria-selected', isSelected ? 'true' : 'false')
                const chip = getChipColor('municipio')
                li.style.cssText = `
                  min-height: 44px;
                  padding: 8px 14px;
                  font-size: 13.5px;
                  color: ${isSelected ? '#8c1d3d' : '#1e293b'};
                  background-color: ${isSelected ? 'rgba(140, 29, 61, 0.08)' : 'transparent'};
                  border-left: ${isSelected ? '3px solid #8c1d3d' : '3px solid transparent'};
                  cursor: pointer;
                  display: flex;
                  align-items: center;
                  justify-content: space-between;
                  gap: 10px;
                  border-bottom: 1px solid rgba(0, 0, 0, 0.04);
                  transition: background-color 120ms ease, color 120ms ease;
                `
                li.innerHTML = `
                  <div style="display: flex; flex-direction: column; min-width: 0;">
                    <span style="font-size: 13.5px; font-weight: 600; line-height: 1.3;">
                      ${highlightMatch(m.municipio, currentQuery)}
                    </span>
                    <span style="font-size: 11px; color: #64748b; margin-top: 1px;">
                      Estado de Jalisco · ${m.coloniasCount} ${m.coloniasCount === 1 ? 'colonia' : 'colonias'}
                    </span>
                  </div>
                  <span style="font-size: 11px; font-weight: 600; padding: 2px 7px; border-radius: 10px; background: ${chip.bg}; color: ${chip.color}; border: 1px solid ${chip.border}; white-space: nowrap;">
                    Municipio
                  </span>
                `
                li.addEventListener('mousedown', (e) => {
                  e.preventDefault()
                  if (inputMunicipio) inputMunicipio.value = m.municipio
                  if (inputOrigen) inputOrigen.value = 'catalogo'
                  hideDropdown()
                  if (inputColonia && !inputColonia.value) {
                    inputColonia.focus()
                  }
                })
                li.addEventListener('mouseenter', () => {
                  activeIndex = idx
                  updateActiveStyle(list, idx)
                })
                list.appendChild(li)
              })
            } else {
              itemsColonias.forEach((sug, idx) => {
                const isSelected = activeIndex === idx
                const li = document.createElement('li')
                li.setAttribute('role', 'option')
                li.setAttribute('aria-selected', isSelected ? 'true' : 'false')
                const chip = getChipColor(sug.tipo)

                li.style.cssText = `
                  min-height: 48px;
                  padding: 8px 14px;
                  font-size: 13.5px;
                  color: ${isSelected ? '#8c1d3d' : '#1e293b'};
                  background-color: ${isSelected ? 'rgba(140, 29, 61, 0.08)' : 'transparent'};
                  border-left: ${isSelected ? '3px solid #8c1d3d' : '3px solid transparent'};
                  cursor: pointer;
                  display: flex;
                  align-items: center;
                  justify-content: space-between;
                  gap: 12px;
                  border-bottom: 1px solid rgba(0, 0, 0, 0.04);
                  transition: background-color 120ms ease, color 120ms ease;
                `

                const mainText =
                  tipo === 'calle' && sug.calleSugerida ? sug.calleSugerida : sug.colonia
                li.innerHTML = `
                  <div style="display: flex; flex-direction: column; min-width: 0;">
                    <span style="font-size: 13.5px; font-weight: 600; line-height: 1.3;">
                      ${highlightMatch(mainText, currentQuery)}
                    </span>
                    <span style="font-size: 11.5px; color: #64748b; margin-top: 1px; display: flex; align-items: center; gap: 4px;">
                      <span>📍 ${highlightMatch(sug.colonia, currentQuery)}</span>
                      <span>·</span>
                      <span>${highlightMatch(sug.municipio, currentQuery)}</span>
                      <span>·</span>
                      <strong style="color: #475569;">C.P. ${sug.cp}</strong>
                    </span>
                  </div>
                  <span style="font-size: 11px; font-weight: 600; padding: 2px 7px; border-radius: 10px; background: ${chip.bg}; color: ${chip.color}; border: 1px solid ${chip.border}; white-space: nowrap;">
                    ${sug.tipo || 'Colonia'}
                  </span>
                `

                li.addEventListener('mousedown', (e) => {
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
                  hideDropdown()
                })
                li.addEventListener('mouseenter', () => {
                  activeIndex = idx
                  updateActiveStyle(list, idx)
                })
                list.appendChild(li)
              })
            }

            dropdown.appendChild(list)
          }

          function updateActiveStyle(list: HTMLUListElement, activeIdx: number) {
            const items = list.querySelectorAll<HTMLLIElement>('li')
            items.forEach((item, i) => {
              const isSel = i === activeIdx
              item.style.backgroundColor = isSel ? 'rgba(140, 29, 61, 0.08)' : 'transparent'
              item.style.borderLeft = isSel ? '3px solid #8c1d3d' : '3px solid transparent'
              item.setAttribute('aria-selected', isSel ? 'true' : 'false')
              if (isSel) {
                item.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
              }
            })
          }

          let debounceTimer: ReturnType<typeof setTimeout> | null = null

          async function doSearch(target: HTMLInputElement) {
            if (debounceTimer) clearTimeout(debounceTimer)
            if (currentAbortController) currentAbortController.abort()

            const q = target.value.trim()
            const name = target.name
            currentQuery = q

            if (inputOrigen) inputOrigen.value = 'manual'

            const tipo: 'municipio' | 'colonia' | 'calle' | 'cp' =
              name === names.municipio
                ? 'municipio'
                : name === names.calle
                  ? 'calle'
                  : name === names.cp
                    ? 'cp'
                    : 'colonia'

            const minLength = tipo === 'municipio' ? 1 : tipo === 'cp' ? 2 : 2

            if (q.length < minLength) {
              hideDropdown()
              return
            }

            debounceTimer = setTimeout(async () => {
              currentAbortController = new AbortController()
              const fetchSignal = currentAbortController.signal

              try {
                const url = new URL(endpoint, location.origin)
                url.searchParams.set('tipo', tipo)
                url.searchParams.set('q', q)
                if ((tipo === 'colonia' || tipo === 'calle') && inputMunicipio?.value) {
                  url.searchParams.set('municipio', inputMunicipio.value)
                }

                const res = await fetch(url, {
                  signal: fetchSignal,
                  headers: { accept: 'application/json' },
                })
                if (!res.ok || fetchSignal.aborted) return

                const data = await res.json()
                if (tipo === 'municipio') {
                  itemsMunicipios = data.items ?? []
                  itemsColonias = []
                } else {
                  itemsColonias = data.items ?? []
                  itemsMunicipios = []
                }
                activeIndex = -1
                renderDropdown(target, tipo)
              } catch {
                // Silencioso
              }
            }, 60)
          }

          function handleKeydown(e: KeyboardEvent) {
            const target = e.target as HTMLInputElement
            if (!dropdown || dropdown.style.display === 'none') return

            const tipo =
              target.name === names.municipio
                ? 'municipio'
                : target.name === names.calle
                  ? 'calle'
                  : target.name === names.cp
                    ? 'cp'
                    : 'colonia'
            const total = tipo === 'municipio' ? itemsMunicipios.length : itemsColonias.length
            if (total === 0) return

            const list = dropdown.querySelector('ul')

            if (e.key === 'ArrowDown') {
              e.preventDefault()
              activeIndex = Math.min(activeIndex + 1, total - 1)
              if (list) updateActiveStyle(list, activeIndex)
            } else if (e.key === 'ArrowUp') {
              e.preventDefault()
              activeIndex = Math.max(activeIndex - 1, 0)
              if (list) updateActiveStyle(list, activeIndex)
            } else if (e.key === 'Enter') {
              if (activeIndex >= 0) {
                e.preventDefault()
                if (tipo === 'municipio' && itemsMunicipios[activeIndex]) {
                  const m = itemsMunicipios[activeIndex]
                  if (inputMunicipio) inputMunicipio.value = m.municipio
                  if (inputOrigen) inputOrigen.value = 'catalogo'
                  hideDropdown()
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
                  hideDropdown()
                }
              }
            } else if (e.key === 'Escape') {
              hideDropdown()
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
              hideDropdown()
            }
          }

          for (const inp of inputs) {
            inp.addEventListener('input', () => doSearch(inp), listenerOpts)
            inp.addEventListener(
              'focus',
              () => {
                if (inp.value.trim().length >= 1) doSearch(inp)
              },
              listenerOpts,
            )
            inp.addEventListener('keydown', handleKeydown, listenerOpts)
          }

          document.addEventListener(
            'click',
            (e) => {
              if (!container.contains(e.target as Node)) {
                hideDropdown()
              }
            },
            listenerOpts,
          )

          window.addEventListener(
            'resize',
            () => {
              if (currentTargetInput && dropdown && dropdown.style.display !== 'none') {
                const tipo =
                  currentTargetInput.name === names.municipio
                    ? 'municipio'
                    : currentTargetInput.name === names.calle
                      ? 'calle'
                      : currentTargetInput.name === names.cp
                        ? 'cp'
                        : 'colonia'
                renderDropdown(currentTargetInput, tipo)
              }
            },
            listenerOpts,
          )
        })
      }

      return (
        <div id={handle.id} mix={css({ position: 'relative' })}>
          {handle.props.children}
        </div>
      )
    }
  },
)
