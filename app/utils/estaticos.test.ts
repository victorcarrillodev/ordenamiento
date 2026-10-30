import { mkdtempSync, rmSync, utimesSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { crearVersionador, urlEstatica as urlDeLaApp } from './estaticos.ts'

/**
 * La dirección de cada archivo de `public/` lleva una huella de su contenido: así,
 * tras una actualización el navegador pide la hoja de estilos nueva en vez de
 * quedarse con la vieja, y mientras no cambie la puede guardar un año.
 */

let carpeta: string

beforeEach(() => {
  carpeta = mkdtempSync(join(tmpdir(), 'estaticos-'))
})
afterEach(() => rmSync(carpeta, { recursive: true, force: true }))

/** Escribe el archivo y le pone una fecha de modificación distinta de la anterior. */
function escribir(archivo: string, contenido: string, segundo: number) {
  const ruta = join(carpeta, archivo)
  writeFileSync(ruta, contenido)
  utimesSync(ruta, segundo, segundo)
}

describe('crearVersionador', () => {
  it('da la misma huella al mismo contenido y otra al contenido distinto', () => {
    escribir('a.css', 'body{}', 1000)
    escribir('b.css', 'body{}', 2000)
    escribir('c.css', 'body{color:red}', 3000)
    const v = crearVersionador(carpeta)
    expect(v.versionDe('a.css')).toBe(v.versionDe('b.css'))
    expect(v.versionDe('a.css')).not.toBe(v.versionDe('c.css'))
    expect(v.versionDe('a.css')).toMatch(/^[a-f0-9]{10}$/)
  })

  it('la huella cambia cuando cambia el archivo', () => {
    escribir('admin.css', '.a{}', 1000)
    const v = crearVersionador(carpeta)
    const antes = v.versionDe('admin.css')
    escribir('admin.css', '.a{color:blue}', 2000)
    expect(v.versionDe('admin.css')).not.toBe(antes)
  })

  it('no vuelve a leer el archivo mientras su fecha no cambie', () => {
    escribir('admin.js', 'let a = 1', 1000)
    const v = crearVersionador(carpeta)
    const primera = v.versionDe('admin.js')
    // Cambia el contenido pero se conserva la fecha: la huella guardada sigue valiendo.
    writeFileSync(join(carpeta, 'admin.js'), 'let a = 2')
    utimesSync(join(carpeta, 'admin.js'), 1000, 1000)
    expect(v.versionDe('admin.js')).toBe(primera)
  })

  it('un archivo que no existe da «0» y no rompe la página', () => {
    const v = crearVersionador(carpeta)
    expect(v.versionDe('no-existe.css')).toBe('0')
    expect(v.urlEstatica('no-existe.css')).toMatch(/\/no-existe\.css\?v=0$/)
  })

  it('la dirección lleva el prefijo del portal y la huella', () => {
    escribir('admin.css', '.a{}', 1000)
    const v = crearVersionador(carpeta)
    expect(v.urlEstatica('admin.css')).toBe(`/ordena/admin.css?v=${v.versionDe('admin.css')}`)
  })
})

describe('urlEstatica de la aplicación', () => {
  it('apunta a los archivos reales de public/', () => {
    expect(urlDeLaApp('admin.css')).toMatch(/^\/ordena\/admin\.css\?v=[a-f0-9]{10}$/)
    expect(urlDeLaApp('login.css')).toMatch(/\?v=[a-f0-9]{10}$/)
  })
})
