/**
 * Texto con formato de «Textos del portal»: negritas y alineación del párrafo
 * (izquierda, centrada, derecha o justificada), nada más.
 *
 * Es lo que deja canónico el valor que llega del panel antes de guardarlo: lee
 * lo que mande el navegador (el HTML de un editor, o el texto plano de antes de
 * que existiera) y lo vuelve a escribir con solo `<p>`, `<strong>`, `<br>` y, si
 * se eligió, `style="text-align:…"`. Lo demás (otras etiquetas, atributos,
 * estilos, scripts) no se conserva, y el texto visible se limita a
 * `LIMITE_TEXTO_RICO` caracteres, un tope de seguridad.
 *
 * El frontend repite el lector en `app/utils/texto-rico.ts` (la web no puede
 * importar del backend) para dibujar el texto sin insertarlo nunca como HTML;
 * `app/utils/texto-rico-contrato.test.ts` vigila que los dos entiendan lo mismo.
 */

export const ALINEACIONES = ['izquierda', 'centro', 'derecha', 'justificado'] as const
export type Alineacion = (typeof ALINEACIONES)[number]

/** Valor CSS de cada alineación. */
export const CSS_ALINEACION: Record<Alineacion, string> = {
  izquierda: 'left',
  centro: 'center',
  derecha: 'right',
  justificado: 'justify',
}

/**
 * Caracteres visibles que admite un texto con formato. Es un tope de seguridad,
 * no editorial: el párrafo más largo del portal tiene unos 460 y los textos
 * sin formato nunca tuvieron límite, así que no debe recortar nada legítimo; solo
 * impide que una entrada desmedida llegue a la base de datos. El backend aplica el mismo.
 */
export const LIMITE_TEXTO_RICO = 5000

/** Lo más que se lee de un valor: protege al lector de entradas desmedidas. */
const MAX_ENTRADA = 20_000

export type Parte = { texto: string; negrita: boolean } | { salto: true }

export interface Parrafo {
  /** Vacía: el párrafo toma la alineación que le da el diseño de la página. */
  alineacion: Alineacion | ''
  partes: Parte[]
}

const DESDE_CSS: Record<string, Alineacion> = {
  left: 'izquierda',
  start: 'izquierda',
  center: 'centro',
  right: 'derecha',
  end: 'derecha',
  justify: 'justificado',
}

const ENTIDADES: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: ' ',
}

/** Elementos que abren un párrafo nuevo. */
const BLOQUES = new Set([
  'p',
  'div',
  'li',
  'ul',
  'ol',
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'blockquote',
  'pre',
  'section',
  'article',
  'tr',
])

/** Elementos sin contenido ni cierre. */
const VACIOS = new Set(['img', 'hr', 'input', 'wbr', 'meta', 'link'])

/** Un token es un comentario, una etiqueta completa (con comillas que pueden llevar «>») o texto. */
const TOKENS = /<!--[\s\S]*?-->|<[a-z/!?](?:[^>"']|"[^"]*"|'[^']*')*>|[^<]+|</gi
const ETIQUETA = /^<(\/?)([a-z][a-z0-9]*)((?:[^>"']|"[^"]*"|'[^']*')*)>$/i

/** Caracteres que no deben llegar al texto: controles (el NUL no cabe en una columna JSON) e invisibles. */
function descartable(codigo: number): boolean {
  return (
    (codigo < 32 && codigo !== 9 && codigo !== 10 && codigo !== 13) ||
    (codigo >= 127 && codigo <= 159) ||
    codigo === 0x200b ||
    codigo === 0x200e ||
    codigo === 0x200f ||
    (codigo >= 0x202a && codigo <= 0x202e) ||
    (codigo >= 0x2066 && codigo <= 0x2069) ||
    codigo === 0xfeff ||
    (codigo >= 0xe0000 && codigo <= 0xe007f)
  )
}

const sinDescartables = (texto: string) =>
  Array.from(texto, (c) => (descartable(c.codePointAt(0) ?? 0) ? '' : c)).join('')

function decodificar(texto: string): string {
  return texto.replace(
    /&(?:#(\d{1,7})|#x([0-9a-f]{1,6})|([a-z]+));/gi,
    (entidad, decimal?: string, hexa?: string, nombre?: string) => {
      if (nombre) return ENTIDADES[nombre.toLowerCase()] ?? entidad
      const codigo = decimal ? Number(decimal) : parseInt(hexa ?? '', 16)
      const valido = codigo > 0 && codigo <= 0x10ffff && !(codigo >= 0xd800 && codigo <= 0xdfff)
      return valido ? String.fromCodePoint(codigo) : ''
    },
  )
}

const escapar = (texto: string) =>
  texto.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

/** Alineación que declaran los atributos de una etiqueta, o '' si no declaran ninguna. */
function alineacionDe(atributos: string): Alineacion | '' {
  const declarada =
    /text-align\s*:\s*([a-z-]+)/i.exec(atributos)?.[1] ??
    /\balign\s*=\s*["']?([a-z-]+)/i.exec(atributos)?.[1] ??
    ''
  return DESDE_CSS[declarada.toLowerCase()] ?? ''
}

/**
 * ¿Pone en negrita el contenido de una etiqueta? Si declara el grosor, manda lo
 * declarado: los editores del navegador (y Google Docs al pegar) envuelven texto
 * normal en `<b style="font-weight:normal">`.
 */
function esNegrita(nombre: string, atributos: string): boolean {
  const peso = /font-weight\s*:\s*([a-z0-9]+)/i.exec(atributos)?.[1]?.toLowerCase()
  if (peso) return peso === 'bold' || peso === 'bolder' || Number(peso) >= 600
  return nombre === 'strong' || nombre === 'b'
}

/** Quita lo que sobra al principio y al final de un renglón o del párrafo. */
function recortarFinal(partes: Parte[]): void {
  for (;;) {
    const ultima = partes.at(-1)
    if (!ultima) return
    if ('salto' in ultima) {
      partes.pop()
      continue
    }
    ultima.texto = ultima.texto.replace(/ $/, '')
    if (ultima.texto !== '') return
    partes.pop()
  }
}

/**
 * Deja las partes como las dibuja el navegador: los espacios y saltos de línea
 * de la fuente colapsan en un espacio, sobran al principio y al final del
 * párrafo y al lado de un salto, y el texto contiguo con el mismo grosor se une.
 */
function normalizar(partes: Parte[]): Parte[] {
  const salida: Parte[] = []
  let alInicio = true
  for (const parte of partes) {
    if ('salto' in parte) {
      const previa = salida.at(-1)
      if (previa && 'texto' in previa) previa.texto = previa.texto.replace(/ $/, '')
      if (salida.length > 0) salida.push(parte)
      alInicio = true
      continue
    }
    let texto = parte.texto.replace(/\s+/g, ' ')
    if (alInicio) texto = texto.replace(/^ /, '')
    if (texto === '') continue
    alInicio = texto.endsWith(' ')
    const previa = salida.at(-1)
    if (previa && 'texto' in previa && previa.negrita === parte.negrita) previa.texto += texto
    else salida.push({ texto, negrita: parte.negrita })
  }
  recortarFinal(salida)
  return salida
}

/** Texto sin etiquetas: una línea en blanco separa párrafos; un salto simple queda dentro del párrafo. */
function desdePlano(valor: string): Parrafo[] {
  return sinDescartables(valor.replace(/\r\n?/g, '\n'))
    .split(/\n\s*\n/)
    .map((bloque) =>
      normalizar(
        bloque
          .split('\n')
          .flatMap<Parte>((linea, i) =>
            i === 0
              ? [{ texto: linea, negrita: false }]
              : [{ salto: true }, { texto: linea, negrita: false }],
          ),
      ),
    )
    .filter((partes) => partes.length > 0)
    .map((partes) => ({ alineacion: '', partes }))
}

/**
 * Lee un valor guardado (HTML mínimo o texto plano) como párrafos. Es tolerante:
 * una etiqueta desconocida se ignora y se conserva su texto, y nada de lo que
 * venga en el valor se interpreta como marcado.
 */
export function parsearTextoRico(valor: string | null | undefined): Parrafo[] {
  const texto = typeof valor === 'string' ? valor.slice(0, MAX_ENTRADA) : ''
  if (!/<\/?[a-z][^>]*>/i.test(texto)) return desdePlano(texto)

  const parrafos: Parrafo[] = []
  let actual: Parrafo | null = null
  /** Bloques abiertos, con la alineación que rige dentro de cada uno (la propia o la heredada). */
  const bloques: { nombre: string; alineacion: Alineacion | '' }[] = []
  /** Elementos de texto abiertos y si cada uno pone negrita. */
  const abiertos: { nombre: string; negrita: boolean }[] = []

  const cerrarParrafo = () => {
    if (!actual) return
    const partes = normalizar(actual.partes)
    if (partes.length > 0) parrafos.push({ alineacion: actual.alineacion, partes })
    actual = null
  }
  const poner = (parte: Parte) => {
    actual ??= { alineacion: bloques.at(-1)?.alineacion ?? '', partes: [] }
    actual.partes.push(parte)
  }

  // El contenido de estos elementos no es texto del portal.
  const contenido = texto.replace(/<(script|style|template)\b[\s\S]*?<\/\1\s*>/gi, '')

  for (const token of contenido.match(TOKENS) ?? []) {
    const etiqueta = ETIQUETA.exec(token)
    if (!etiqueta) {
      if (token.length > 1 && token.startsWith('<')) continue // comentario, doctype o etiqueta rota
      const limpio = sinDescartables(decodificar(token))
      if (limpio !== '') poner({ texto: limpio, negrita: abiertos.some((e) => e.negrita) })
      continue
    }
    const [, cierra, crudo, atributos] = etiqueta
    const nombre = crudo.toLowerCase()

    if (nombre === 'br') {
      if (!cierra) poner({ salto: true })
    } else if (VACIOS.has(nombre)) {
      // Sin contenido que conservar.
    } else if (BLOQUES.has(nombre)) {
      cerrarParrafo()
      if (cierra) {
        const indice = bloques.map((b) => b.nombre).lastIndexOf(nombre)
        if (indice !== -1) bloques.length = indice
      } else {
        // `<p>` dentro de otro `<p>` sin cerrar: el primero termina donde empieza el segundo.
        if (nombre === 'p' && bloques.at(-1)?.nombre === 'p') bloques.pop()
        const propia = alineacionDe(atributos)
        bloques.push({ nombre, alineacion: propia || (bloques.at(-1)?.alineacion ?? '') })
      }
    } else if (cierra) {
      const indice = abiertos.map((e) => e.nombre).lastIndexOf(nombre)
      if (indice !== -1) abiertos.length = indice
    } else if (!/\/\s*$/.test(atributos)) {
      abiertos.push({ nombre, negrita: esNegrita(nombre, atributos) })
    }
  }
  cerrarParrafo()
  return parrafos
}

/** HTML mínimo y canónico de unos párrafos: lo que se guarda en la base de datos. */
export function serializarTextoRico(parrafos: Parrafo[]): string {
  return parrafos
    .map((p) => {
      const interior = p.partes
        .map((parte) => {
          if ('salto' in parte) return '<br>'
          const texto = escapar(parte.texto)
          return parte.negrita ? `<strong>${texto}</strong>` : texto
        })
        .join('')
      const estilo = p.alineacion ? ` style="text-align:${CSS_ALINEACION[p.alineacion]}"` : ''
      return `<p${estilo}>${interior}</p>`
    })
    .join('')
}

/**
 * Recorta los párrafos a `maximo` caracteres visibles (un salto de línea o el
 * cambio de párrafo cuenta como uno), sin romper el formato de lo que queda.
 */
export function truncarTextoRico(parrafos: Parrafo[], maximo: number): Parrafo[] {
  let restante = maximo
  const salida: Parrafo[] = []
  for (const [indice, parrafo] of parrafos.entries()) {
    if (indice > 0) restante -= 1
    if (restante <= 0) break
    const partes: Parte[] = []
    for (const parte of parrafo.partes) {
      if (restante <= 0) break
      if ('salto' in parte) {
        partes.push(parte)
        restante -= 1
        continue
      }
      const letras = Array.from(parte.texto)
      partes.push(
        letras.length <= restante
          ? parte
          : { texto: letras.slice(0, restante).join(''), negrita: parte.negrita },
      )
      restante -= letras.length
    }
    const recortadas = normalizar(partes)
    if (recortadas.length > 0) salida.push({ alineacion: parrafo.alineacion, partes: recortadas })
  }
  return salida
}

/**
 * Lo que se guarda: el texto, leído y vuelto a escribir en su forma canónica y,
 * con `maximo`, recortado a esa cantidad de caracteres visibles.
 */
export function canonizarTextoRico(valor: string | null | undefined, maximo?: number): string {
  const parrafos = parsearTextoRico(valor)
  return serializarTextoRico(maximo === undefined ? parrafos : truncarTextoRico(parrafos, maximo))
}

/** El texto sin formato: un salto de línea por cada salto y entre párrafos. */
export function textoPlanoDe(valor: string | null | undefined): string {
  return parsearTextoRico(valor)
    .map((p) => p.partes.map((parte) => ('salto' in parte ? '\n' : parte.texto)).join(''))
    .join('\n')
}

/**
 * El texto guardado si tiene algo que mostrar; si no (vacío, o solo espacios y
 * marcas), el que trae el portal por defecto.
 */
export function textoDelPortal(valor: string | null | undefined, porDefecto: string): string {
  return typeof valor === 'string' && textoPlanoDe(valor) !== '' ? valor : porDefecto
}
