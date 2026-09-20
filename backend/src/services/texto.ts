/**
 * Saneo del texto capturado, compartido por los formularios del panel.
 *
 * Además de dejarlo presentable, quita los caracteres de control: el byte nulo
 * no cabe en una columna `text` de Postgres (falla la codificación UTF8) y un
 * salto de línea dentro de un nombre acaba en el asunto de un correo. También
 * los invisibles, que no se dibujan pero reordenan o esconden lo que se lee.
 */

/**
 * Formatos invisibles: no son controles en el sentido ASCII, pero reordenan lo
 * que se lee (marcas bidi) o esconden texto (ancho cero), así que un nombre
 * puede mostrarse al revés de como está guardado.
 */
const INVISIBLES = new Set([
  0x200b, // espacio de ancho cero
  0x200e, // marca de izquierda a derecha
  0x200f, // marca de derecha a izquierda
  0x202a,
  0x202b,
  0x202c,
  0x202d,
  0x202e, // incrustación y anulación de dirección
  0x2066,
  0x2067,
  0x2068,
  0x2069, // aislamiento de dirección
  0xfeff, // marca de orden de bytes
])

/** ¿Carácter que no debe llegar al texto guardado, salvo los que se conservan? */
function esControl(caracter: string, conservar: string): boolean {
  if (conservar.includes(caracter)) return false
  const codigo = caracter.codePointAt(0) ?? 0
  // Controles C0 y DEL, los C1 (U+0085 es un salto de línea para muchos
  // sistemas) y los formatos invisibles.
  if (codigo < 32 || codigo === 127 || (codigo >= 0x80 && codigo <= 0x9f)) return true
  // Las etiquetas de Unicode (U+E0000–U+E007F) copian el alfabeto ASCII sin
  // dibujar nada: sirven para esconder un texto dentro de otro.
  if (codigo >= 0xe0000 && codigo <= 0xe007f) return true
  return INVISIBLES.has(codigo)
}

/** Una sola línea: sin saltos ni controles. */
export function linea(valor: string | undefined): string {
  return Array.from(valor ?? '', (c) => (esControl(c, '') ? ' ' : c))
    .join('')
    .replace(/\s+/g, ' ')
    .trim()
}

/** Texto libre: conserva saltos de línea y tabuladores; quita el resto de controles. */
export function parrafos(valor: string | undefined): string {
  return Array.from((valor ?? '').replace(/\r\n?/g, '\n'), (c) => (esControl(c, '\n\t') ? '' : c))
    .join('')
    .trim()
}
