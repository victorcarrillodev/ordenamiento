import { clientEntry, css, type Handle, type RemixNode, type SerializableProps } from 'remix/ui'

export interface Sugerencia {
  colonia: string
  municipio: string
  cp: string
  tipo: string
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

          const inputs = [inputCalle, inputColonia, inputMunicipio].filter(
            Boolean,
          ) as HTMLInputElement[]
          for (const inp of inputs) {
            inp.setAttribute('autocomplete', 'off')
            inp.setAttribute('role', 'combobox')
            inp.setAttribute('aria-autocomplete', 'list')
            inp.setAttribute('aria-expanded', 'false')
          }

          // Crear elemento de dropdown flotante
          let dropdown = container.querySelector<HTMLUListElement>('.direccion-dropdown-list')
          if (!dropdown) {
            dropdown = document.createElement('ul')
            dropdown.className = 'direccion-dropdown-list'
            dropdown.setAttribute('role', 'listbox')
            dropdown.style.cssText = `
              position: absolute;
              display: none;
              z-index: 9999;
              background: #ffffff;
              border: 1.5px solid rgba(140, 29, 61, 0.2);
              border-radius: 8px;
              box-shadow: 0 12px 32px rgba(0, 0, 0, 0.18);
              margin: 0;
              padding: 6px 0;
              list-style: none;
              max-height: 280px;
              overflow-y: auto;
              font-family: 'Montserrat', 'Helvetica Neue', Arial, sans-serif;
            `
            container.appendChild(dropdown)
          }

          let itemsColonias: Sugerencia[] = []
          let itemsMunicipios: MunicipioSugerencia[] = []
          let activeIndex = -1
          let currentAbortController: AbortController | null = null

          function hideDropdown() {
            if (dropdown) dropdown.style.display = 'none'
            activeIndex = -1
            for (const inp of inputs) {
              inp.setAttribute('aria-expanded', 'false')
            }
          }

          function renderDropdown(
            target: HTMLInputElement,
            tipo: 'municipio' | 'colonia' | 'calle',
          ) {
            if (!dropdown) return

            const total = tipo === 'municipio' ? itemsMunicipios.length : itemsColonias.length
            if (total === 0) {
              hideDropdown()
              return
            }

            const targetRect = target.getBoundingClientRect()
            const contRect = container!.getBoundingClientRect()
            let left = Math.max(0, targetRect.left - contRect.left)
            const top = targetRect.bottom - contRect.top + 4
            const width = Math.min(Math.max(target.offsetWidth, 320), contRect.width)

            if (left + width > contRect.width) {
              left = Math.max(0, contRect.width - width)
            }

            dropdown.style.left = `${left}px`
            dropdown.style.top = `${top}px`
            dropdown.style.width = `${width}px`
            dropdown.style.display = 'block'
            dropdown.innerHTML = ''
            target.setAttribute('aria-expanded', 'true')

            if (tipo === 'municipio') {
              itemsMunicipios.forEach((m, idx) => {
                const li = document.createElement('li')
                li.setAttribute('role', 'option')
                li.setAttribute('aria-selected', activeIndex === idx ? 'true' : 'false')
                li.style.cssText = `
                  padding: 10px 14px;
                  font-size: 13px;
                  color: ${activeIndex === idx ? '#8c1d3d' : '#2c3140'};
                  background: ${activeIndex === idx ? '#fdf2f4' : 'transparent'};
                  font-weight: ${activeIndex === idx ? '600' : '400'};
                  cursor: pointer;
                  display: flex;
                  align-items: center;
                  justify-content: space-between;
                  border-bottom: 1px solid rgba(0,0,0,0.04);
                  transition: background 120ms ease;
                `
                li.innerHTML = `
                  <span>
                    <strong>${m.municipio}</strong>
                    <span style="font-size:11px;color:#9a9faf;margin-left:6px;">Jalisco</span>
                  </span>
                  <span style="font-size:11px;color:#9a9faf;font-weight:500;">${m.coloniasCount} colonias</span>
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
                  renderDropdown(target, tipo)
                })
                dropdown!.appendChild(li)
              })
            } else {
              itemsColonias.forEach((sug, idx) => {
                const li = document.createElement('li')
                li.setAttribute('role', 'option')
                li.setAttribute('aria-selected', activeIndex === idx ? 'true' : 'false')
                li.style.cssText = `
                  padding: 10px 14px;
                  font-size: 13px;
                  color: ${activeIndex === idx ? '#8c1d3d' : '#2c3140'};
                  background: ${activeIndex === idx ? '#fdf2f4' : 'transparent'};
                  font-weight: ${activeIndex === idx ? '600' : '400'};
                  cursor: pointer;
                  display: flex;
                  align-items: center;
                  justify-content: space-between;
                  border-bottom: 1px solid rgba(0,0,0,0.04);
                  transition: background 120ms ease;
                `
                li.innerHTML = `
                  <span>
                    <strong>${sug.colonia}</strong>
                    <span style="font-size:11px;color:#9a9faf;margin-left:6px;">· ${sug.municipio} · ${sug.cp}</span>
                  </span>
                  <span style="font-size:11px;color:#9a9faf;font-weight:500;">${sug.tipo}</span>
                `
                li.addEventListener('mousedown', (e) => {
                  e.preventDefault()
                  if (inputColonia) inputColonia.value = sug.colonia
                  if (inputMunicipio) inputMunicipio.value = sug.municipio
                  if (inputCp) inputCp.value = sug.cp
                  if (inputOrigen) inputOrigen.value = 'catalogo'
                  hideDropdown()
                })
                li.addEventListener('mouseenter', () => {
                  activeIndex = idx
                  renderDropdown(target, tipo)
                })
                dropdown!.appendChild(li)
              })
            }
          }

          let debounceTimer: ReturnType<typeof setTimeout> | null = null

          async function doSearch(target: HTMLInputElement) {
            if (debounceTimer) clearTimeout(debounceTimer)
            if (currentAbortController) currentAbortController.abort()

            const q = target.value.trim()
            const name = target.name

            if (inputOrigen) inputOrigen.value = 'manual'

            const tipo =
              name === names.municipio ? 'municipio' : name === names.calle ? 'calle' : 'colonia'
            const minLength = tipo === 'municipio' ? 1 : 2

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
                if (tipo === 'colonia' && inputMunicipio?.value) {
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
            }, 100)
          }

          function handleKeydown(e: KeyboardEvent) {
            const target = e.target as HTMLInputElement
            if (!dropdown || dropdown.style.display === 'none') return

            const tipo =
              target.name === names.municipio
                ? 'municipio'
                : target.name === names.calle
                  ? 'calle'
                  : 'colonia'
            const total = tipo === 'municipio' ? itemsMunicipios.length : itemsColonias.length
            if (total === 0) return

            if (e.key === 'ArrowDown') {
              e.preventDefault()
              activeIndex = Math.min(activeIndex + 1, total - 1)
              renderDropdown(target, tipo)
            } else if (e.key === 'ArrowUp') {
              e.preventDefault()
              activeIndex = Math.max(activeIndex - 1, 0)
              renderDropdown(target, tipo)
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
            inp.addEventListener('input', () => doSearch(inp), { signal })
            inp.addEventListener(
              'focus',
              () => {
                if (inp.value.trim().length >= 1) doSearch(inp)
              },
              { signal },
            )
            inp.addEventListener('keydown', handleKeydown, { signal })
          }

          document.addEventListener(
            'click',
            (e) => {
              if (!container.contains(e.target as Node)) {
                hideDropdown()
              }
            },
            { signal },
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
