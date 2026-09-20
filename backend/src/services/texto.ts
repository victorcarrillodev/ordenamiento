/**
 * Saneo del texto capturado, compartido por los formularios del panel.
 *
 * Además de dejarlo presentable, quita los caracteres de control: el byte nulo
 * no cabe en una columna `text` de Postgres (falla la codificación UTF8) y un
 * salto de línea dentro de un nombre acaba en el asunto de un correo.
 */

/** ¿Carácter de control (ASCII < 32 o DEL) que no esté entre los que se conservan? */
function esControl(caracter: string, conservar: string): boolean {
  const codigo = caracter.codePointAt(0) ?? 0
  return (codigo < 32 || codigo === 127) && !conservar.includes(caracter)
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
