import { describe, expect, it } from 'bun:test'

import { linea, parrafos } from './texto.ts'

const NEL = String.fromCodePoint(0x85) // salto de línea C1
const RLO = String.fromCodePoint(0x202e) // anulación de dirección
const ZWSP = String.fromCodePoint(0x200b) // espacio de ancho cero

describe('texto', () => {
  it('linea deja una sola línea, sin controles ni espacios de más', () => {
    expect(linea(' Sesión\tdel\nComité  ')).toBe('Sesión del Comité')
    expect(linea(`Acta${String.fromCodePoint(7)}firmada`)).toBe('Acta firmada')
    expect(linea(undefined)).toBe('')
  })

  it('parrafos conserva los saltos de línea y los tabuladores', () => {
    expect(parrafos('Uno\r\nDos\tcon tabulador ')).toBe('Uno\nDos\tcon tabulador')
    expect(parrafos(`Uno${String.fromCodePoint(7)}Dos`)).toBe('UnoDos')
  })

  // Regresión (Testing): los controles C1 y los formatos invisibles pasaban
  // enteros. Un nombre con una anulación de dirección se muestra al revés de
  // como está guardado, y el de ancho cero esconde dónde corta una palabra.
  it('tampoco deja pasar los controles C1 ni los caracteres invisibles', () => {
    expect(linea(`Antes${NEL}Después`)).toBe('Antes Después')
    expect(parrafos(`Antes${NEL}Después`)).toBe('AntesDespués')
    expect(linea(`Meta 2026${RLO}odatluco`)).not.toContain(RLO)
    expect(parrafos(`Meta 2026${RLO}odatluco`)).not.toContain(RLO)
    expect(linea(`pa${ZWSP}labra`)).toBe('pa labra')
    expect(parrafos(`pa${ZWSP}labra`)).toBe('palabra')
    // Texto escondido con etiquetas de Unicode (copian el ASCII sin dibujarse).
    const escondido = Array.from('secreto', (c) =>
      String.fromCodePoint(0xe0000 + c.codePointAt(0)!),
    ).join('')
    expect(parrafos(`Indicador${escondido}`)).toBe('Indicador')
    // Los emojis compuestos siguen intactos: su unión no es un invisible de estos.
    const familia = '👩‍👧'
    expect(linea(familia)).toBe(familia)
  })

  // Regresión (Testing): U+200C (ZWNJ) queda fuera de INVISIBLES a propósito
  // —unir palabras en árabe/persa y separar letras en el resto de emojis
  // compuestos—, y las banderas regionales (dos puntos de código fuera del
  // BMP) no son controles de ningún rango de los que filtra esControl. Ambos
  // deben sobrevivir intactos.
  it('conserva ZWNJ y las banderas regionales, que no son invisibles de esta lista', () => {
    const ZWNJ = String.fromCodePoint(0x200c)
    expect(linea(`disc${ZWNJ}connect`)).toBe(`disc${ZWNJ}connect`)
    expect(parrafos(`disc${ZWNJ}connect`)).toBe(`disc${ZWNJ}connect`)

    const banderaMexico = String.fromCodePoint(0x1f1f2, 0x1f1fd) // 🇲🇽
    expect(linea(`México ${banderaMexico}`)).toBe(`México ${banderaMexico}`)
    expect(parrafos(`Sede: México ${banderaMexico}`)).toBe(`Sede: México ${banderaMexico}`)
  })
})
