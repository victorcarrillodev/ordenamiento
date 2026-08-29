export interface EntradaCatalogo {
  colonia: string
  municipio: string
  cp: string
  tipo: string
  busqueda: string
}

/**
 * Normaliza texto para búsqueda insensible a mayúsculas y acentos.
 */
export function normalizar(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
}

/**
 * Parsea el contenido de texto plano oficial de SEPOMEX (delimitado por pipes |).
 * Estructura esperada de campos:
 * 0: d_codigo (CP)
 * 1: d_asenta (Colonia / Asentamiento)
 * 2: d_tipo_asenta (Tipo de asentamiento)
 * 3: D_mnpio (Municipio)
 * 4: d_estado (Estado)
 */
export function parseSepomex(
  rawText: string,
  estadoFiltro = 'Jalisco',
  municipioFiltro?: string,
): EntradaCatalogo[] {
  const lineas = rawText.split(/\r?\n/)
  if (lineas.length === 0) return []

  const estadoFiltroNorm = normalizar(estadoFiltro)
  const municipioFiltroNorm = municipioFiltro ? normalizar(municipioFiltro) : ''
  const entradasMap = new Map<string, EntradaCatalogo>()

  for (const linea of lineas) {
    if (!linea || linea.startsWith('#') || !linea.includes('|')) continue

    const campos = linea.split('|').map((c) => c.trim())
    if (campos.length < 5) continue

    // Ignorar encabezado oficial si coincide con los nombres de columna
    if (campos[0] === 'd_codigo' && campos[1] === 'd_asenta') continue

    const cp = campos[0]
    const colonia = campos[1]
    const tipo = campos[2] || 'Colonia'
    const municipio = campos[3]
    const estado = campos[4]

    if (estadoFiltroNorm && normalizar(estado) !== estadoFiltroNorm) {
      continue
    }

    // Restringe a un municipio concreto cuando se indica (ej. San Pedro Tlaquepaque).
    // Se usa includes (no igualdad exacta) porque SEPOMEX a veces publica el
    // municipio como "Tlaquepaque" sin el prefijo "San Pedro".
    if (municipioFiltroNorm && !normalizar(municipio).includes(municipioFiltroNorm)) {
      continue
    }

    if (!colonia || !municipio || !cp) continue

    const key = `${normalizar(colonia)}|${normalizar(municipio)}|${cp}`
    if (!entradasMap.has(key)) {
      entradasMap.set(key, {
        colonia,
        municipio,
        cp,
        tipo,
        busqueda: normalizar(`${colonia} ${municipio} ${cp}`),
      })
    }
  }

  const entradas = Array.from(entradasMap.values())
  return indexar(entradas)
}

/**
 * Ordena reproduciblemente las entradas del catálogo.
 */
export function indexar(entradas: EntradaCatalogo[]): EntradaCatalogo[] {
  return [...entradas].sort((a, b) => {
    const cmpMun = a.municipio.localeCompare(b.municipio, 'es', { sensitivity: 'base' })
    if (cmpMun !== 0) return cmpMun
    const cmpCol = a.colonia.localeCompare(b.colonia, 'es', { sensitivity: 'base' })
    if (cmpCol !== 0) return cmpCol
    return a.cp.localeCompare(b.cp)
  })
}
