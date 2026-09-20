import { describe, expect, it } from 'vitest'

import {
  acuseDe,
  cuerpoParaBackend,
  valoresDeActividad,
  valoresDeFormulario,
} from './actividad-datos.ts'

function formulario(): FormData {
  const fd = new FormData()
  fd.set('intent', 'guardar')
  fd.set('titulo', 'Sesión del Comité')
  fd.set('fase', 'Formulación')
  fd.set('tipo', 'Sesión del Comité')
  fd.set('estado', 'realizada')
  fd.set('fecha', '2026-09-10')
  fd.set('aviso_activo', '1')
  return fd
}

const pdf = (nombre: string) => new File(['%PDF-1.4'], nombre, { type: 'application/pdf' })
const png = (nombre: string) => new File(['png'], nombre, { type: 'image/png' })
const vacio = () => new File([], '', { type: 'application/octet-stream' })

describe('formulario de actividad → backend', () => {
  it('conserva los campos de texto y deja fuera los que no son de la actividad', () => {
    const valores = valoresDeFormulario(formulario())
    expect(valores.titulo).toBe('Sesión del Comité')
    expect(valores.aviso_activo).toBe('1')
    expect(valores).not.toHaveProperty('intent')
  })

  it('cada archivo viaja con su tipo, en el mismo orden', () => {
    const fd = formulario()
    fd.append('fotos', png('taller-1.png'))
    fd.append('fotos', png('taller-2.png'))
    fd.set('documentos_tipo_0', 'Acta')
    fd.append('documentos_0', pdf('acta.pdf'))
    fd.set('documentos_tipo_1', 'Lista de asistencia')
    fd.append('documentos_1', pdf('lista.pdf'))
    fd.append('documentos_2', vacio())

    const armado = cuerpoParaBackend(fd)
    expect(armado.ok).toBe(true)
    if (!armado.ok) return
    const nombres = armado.cuerpo.getAll('archivo').map((f) => (f as File).name)
    expect(nombres).toEqual(['taller-1.png', 'taller-2.png', 'acta.pdf', 'lista.pdf'])
    expect(armado.cuerpo.getAll('archivo_tipo')).toEqual([
      'Fotografía',
      'Fotografía',
      'Acta',
      'Lista de asistencia',
    ])
    expect(armado.cuerpo.get('titulo')).toBe('Sesión del Comité')
    expect(armado.cuerpo.has('intent')).toBe(false)
  })

  it('una fila con archivos pero sin tipo se rechaza con un mensaje claro', () => {
    const fd = formulario()
    fd.append('documentos_0', pdf('acta.pdf'))
    const armado = cuerpoParaBackend(fd)
    expect(armado.ok).toBe(false)
    if (!armado.ok) expect(armado.error).toContain('tipo de documento')
  })

  it('una fila no puede disfrazar documentos de «Fotografía»', () => {
    const fd = formulario()
    fd.set('documentos_tipo_0', 'Fotografía')
    fd.append('documentos_0', pdf('acta.pdf'))
    expect(cuerpoParaBackend(fd).ok).toBe(false)
  })

  it('una fila con tipo pero sin archivos se ignora', () => {
    const fd = formulario()
    fd.set('documentos_tipo_0', 'Acta')
    const armado = cuerpoParaBackend(fd)
    expect(armado.ok && armado.cuerpo.getAll('archivo')).toEqual([])
  })

  it('el formulario de edición parte del registro guardado', () => {
    const valores = valoresDeActividad({
      id: 'x',
      titulo: 'Foro',
      fase: 'Formulación',
      tipo: 'Foro',
      estado: 'programada',
      fecha: '2026-10-01',
      hora_inicio: '',
      hora_fin: '',
      lugar: '',
      direccion: '',
      latitud: '',
      longitud: '',
      descripcion: '',
      resultados: '',
      acuerdos: '',
      publicacion: 'borrador',
      aviso_activo: false,
      aviso_titulo: '',
      aviso_descripcion: '',
      aviso_inicio: null,
      aviso_fin: null,
      created_at: '',
      updated_at: '',
      total_archivos: 0,
      visibilidad: {
        proximas: false,
        calendario: false,
        avances: false,
        aviso: 'sin_aviso',
        fechaPasada: false,
      },
    })
    expect(valores.aviso_activo).toBe('')
    expect(valores.aviso_inicio).toBe('')
    expect(valores.publicacion).toBe('borrador')
  })

  it('los acuses llegan por código, nunca como texto libre', () => {
    expect(acuseDe('guardada')).toBe('guardada')
    expect(acuseDe('<script>')).toBeUndefined()
    expect(acuseDe('toString')).toBeUndefined()
    expect(acuseDe(null)).toBeUndefined()
  })
})
