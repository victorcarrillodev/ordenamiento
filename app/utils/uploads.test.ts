import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import {
  ACCEPTED_UPLOADS,
  FORMATOS_DESTACADOS,
  MAX_FILE_BYTES,
  MAX_FILE_MB,
  MAX_FILES,
  MAX_TOTAL_BYTES,
  textoCantidadYPeso,
  textoLimites,
} from './uploads.ts'

describe('uploads utils', () => {
  it('calcula los bytes a partir de los MB y número de archivos', () => {
    expect(MAX_FILE_BYTES).toBe(MAX_FILE_MB * 1024 * 1024)
    expect(MAX_TOTAL_BYTES).toBe(MAX_FILE_BYTES * MAX_FILES)
  })

  it('genera el texto de límites derivado correctamente', () => {
    const texto = textoLimites(50, 5)
    expect(texto).toBe(
      'PDF, DOC(X), XLS(X), PPT(X), ODT/ODS/ODP, RTF, TXT, CSV, MD, JPG, PNG, GIF, WEBP, BMP, TIFF, ICO, DWG, SHP/SHX/DBF, GeoPackage (GPKG), KMZ, ZIP, RAR, 7Z, MP3, WAV, MP4, MOV, AVI, MKV · hasta 50 MB por archivo, máximo 5',
    )
  })

  it('redacta la cantidad y el peso máximos desde los límites reales', () => {
    expect(textoCantidadYPeso()).toBe(`Hasta ${MAX_FILES} archivos de ${MAX_FILE_MB} MB cada uno`)
    expect(textoCantidadYPeso(100, 5)).toBe('Hasta 5 archivos de 100 MB cada uno')
    expect(textoCantidadYPeso(20, 1)).toBe('Hasta 1 archivo de 20 MB')
  })

  it('los formatos destacados de la portada son formatos que sí se aceptan', () => {
    const aceptados = ACCEPTED_UPLOADS.split(',')
    for (const formato of FORMATOS_DESTACADOS) {
      expect(aceptados).toContain(formato.toLowerCase())
    }
  })

  it('el frontend acepta exactamente los formatos que el backend admite', () => {
    // El frontend no puede importar del backend (el Dockerfile de la web no lo
    // copia), así que la coincidencia se vigila aquí, leyendo su lista.
    const fuente = readFileSync(
      new URL('../../backend/src/services/upload-guard.ts', import.meta.url),
      'utf8',
    )
    const bloque = fuente.slice(
      fuente.indexOf('const ALLOWED_MIMES'),
      fuente.indexOf('// Formatos que el navegador'),
    )
    const admitidos = [...bloque.matchAll(/^\s+'?([a-z0-9]+)'?:\s+'/gm)].map((m) => m[1]).sort()
    const aceptados = ACCEPTED_UPLOADS.split(',')
      .map((ext) => ext.slice(1))
      .sort()
    expect(aceptados).toEqual(admitidos)
  })

  it('el texto de formatos nombra los que el backend admite', () => {
    const texto = textoLimites()
    for (const nombre of ['PDF', 'DWG', 'GPKG', 'KMZ', 'ZIP', 'MP4']) {
      expect(texto.toUpperCase()).toContain(nombre)
    }
  })
})
