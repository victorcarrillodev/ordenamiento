/**
 * Búsqueda de texto en la lista de actividades del panel.
 *
 * Se hace aquí y no en el backend porque la lista de gestión es corta (decenas de
 * actividades, sin paginar) y porque `ILIKE` distingue acentos: quien escribe «sesion»
 * espera encontrar «Sesión del Comité». Todas las palabras escritas deben aparecer
 * (en cualquier orden): «foro consulta» encuentra «Foro de consulta pública».
 */
import type { ActividadGestion } from '../../data/programa.ts'

/** Mínimo de letras para que una búsqueda cuente. Igual que en participaciones. */
export const MIN_BUSQUEDA = 2

/** Minúsculas y sin acentos: «Sesión» y «sesion» son la misma palabra. */
export function normalizar(texto: string): string {
  return texto.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase()
}

/** Lo que se busca, recortado y acotado; vacío si es demasiado corto para filtrar. */
export function terminoDeBusqueda(crudo: string | null | undefined): string {
  const termino = (crudo ?? '').trim().slice(0, 80)
  return termino.length >= MIN_BUSQUEDA ? termino : ''
}

type Buscable = Pick<ActividadGestion, 'titulo' | 'tipo' | 'fase' | 'lugar' | 'direccion'>

/** Las actividades que contienen TODAS las palabras de `termino` en su título, tipo, fase o lugar. */
export function buscarActividades<T extends Buscable>(actividades: T[], termino: string): T[] {
  const palabras = normalizar(termino).split(/\s+/).filter(Boolean)
  if (palabras.length === 0) return actividades
  return actividades.filter((a) => {
    const texto = normalizar([a.titulo, a.tipo, a.fase, a.lugar, a.direccion].join(' '))
    return palabras.every((palabra) => texto.includes(palabra))
  })
}
