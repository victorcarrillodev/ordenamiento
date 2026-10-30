/**
 * De un formulario de Personalización a la configuración que se manda al backend.
 *
 * Separado del controlador para poder probarlo sin servidor. Las reglas que importan:
 *
 *  · Un campo que NO viene en el formulario no se toca. Antes cada campo caía en un color de
 *    fábrica si faltaba, así que un formulario incompleto devolvía a fábrica lo que no
 *    mencionaba. Un campo que viene VACÍO sí cuenta (en una imagen significa «quitar la mía y
 *    usar la que trae el proyecto»).
 *  · Un color escrito mal NO se corrige a escondidas: se manda tal cual y el backend responde
 *    «Color inválido en …», que es lo que la persona necesita leer.
 *  · La capa sobre las fotos (`hero_capa`) y el color primario producen los tres tramos del
 *    degradado de la portada y del banner de participación (ver `capaDePortada`).
 */
import { capaDePortada, normalizarHex } from '../../utils/color.ts'
import {
  CAMPOS_COLOR_PANEL,
  CAMPOS_COLOR_PORTAL,
  ICONOS_PORTAL,
  MAX_TITULO_PANEL,
  RANURAS_IMAGEN_PORTAL,
  RANURA_LOGO_PANEL,
  type ColoresPortal,
} from './personalizacion-datos.ts'

/** Los colores que se mandan: los siete del formulario y, si hay control de capa, los tres tramos del degradado. */
export type ColoresGuardados = Partial<Record<keyof ColoresPortal, string>> & {
  heroGradienteInicio?: string
  heroGradienteCentro?: string
  heroGradienteFin?: string
}

/** Cuántos caracteres admite el emoji de un acceso (los compuestos, con modificadores, miden varios). */
export const MAX_ICONO = 8

/** Lo que el controlador sube antes de armar la configuración, por campo de archivo. */
export interface ImagenesSubidas {
  /** Fotos nuevas de la portada, en el orden en que se eligieron. */
  hero: string[]
  /** `name` del campo de archivo → dirección de la imagen subida. */
  porCampo: Record<string, string>
}

function texto(formData: FormData, name: string): string | null {
  const valor = formData.get(name)
  return typeof valor === 'string' ? valor : null
}

/** Primeros `max` caracteres (por carácter visible, sin partir un emoji a la mitad). */
function recortar(valor: string, max: number): string {
  return Array.from(valor).slice(0, max).join('')
}

/** Los colores de una lista de campos: solo los que vienen, con `#rrggbb` si se puede. */
function colores<Clave extends string>(
  formData: FormData,
  campos: Array<{ clave: Clave; name: string }>,
): Partial<Record<Clave, string>> {
  const salida: Partial<Record<Clave, string>> = {}
  for (const campo of campos) {
    const valor = texto(formData, campo.name)
    if (valor === null || valor.trim() === '') continue
    salida[campo.clave] = normalizarHex(valor) ?? valor.trim()
  }
  return salida
}

/**
 * Las fotos de la portada: las direcciones que quedaron en la lista (en su orden) y,
 * detrás, las subidas. Sin repetidas ni vacías; si no queda ninguna, `undefined` (no se
 * toca lo guardado: el carrusel nunca se queda en cero).
 */
export function fotosDeLaPortadaDelFormulario(
  formData: FormData,
  subidas: string[],
): string[] | undefined {
  const direcciones = formData
    .getAll('hero_imagenes[]')
    .map((v) => String(v).trim())
    .filter(Boolean)
  const fotos = [...new Set([...direcciones, ...subidas])]
  return fotos.length > 0 ? fotos : undefined
}

export function configuracionDelPortal(formData: FormData, subidas: ImagenesSubidas) {
  const c: ColoresGuardados = colores(formData, CAMPOS_COLOR_PORTAL)

  // La capa sobre las fotos sigue al color primario y se gradúa con el control.
  const intensidad = texto(formData, 'hero_capa')
  if (intensidad !== null && intensidad.trim() !== '' && c.primario) {
    const capa = capaDePortada(c.primario, Number(intensidad))
    c.heroGradienteInicio = capa.inicio
    c.heroGradienteCentro = capa.centro
    c.heroGradienteFin = capa.fin
  }

  const imagenes: Record<string, string | string[] | undefined> = {}
  for (const ranura of RANURAS_IMAGEN_PORTAL) {
    const subida = subidas.porCampo[ranura.archivoName]
    const url = texto(formData, ranura.urlName)
    if (subida) imagenes[ranura.clave] = subida
    else if (url !== null) imagenes[ranura.clave] = url.trim()
  }
  const hero = fotosDeLaPortadaDelFormulario(formData, subidas.hero)
  if (hero) imagenes.heroImagenes = hero

  const iconos: Record<string, string> = {}
  for (const icono of ICONOS_PORTAL) {
    const valor = texto(formData, icono.name)
    if (valor !== null) iconos[icono.clave] = recortar(valor.trim(), MAX_ICONO)
  }

  return { usuario: { colores: c, imagenes, iconos } }
}

/** El título del panel: saltos de línea normales, sin renglones de más y con tope. */
export function tituloDelPanel(valor: string): string {
  const lineas = valor
    .replace(/\r\n?/g, '\n')
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
  return recortar(lineas.slice(0, 2).join('\n'), MAX_TITULO_PANEL)
}

export function configuracionDelPanel(formData: FormData, logoSubido?: string) {
  const panel: Record<string, string> = { ...colores(formData, CAMPOS_COLOR_PANEL) }

  const logo = texto(formData, RANURA_LOGO_PANEL.urlName)
  if (logoSubido) panel.adminLogo = logoSubido
  else if (logo !== null) panel.adminLogo = logo.trim()

  const titulo = texto(formData, 'panel_admin_titulo')
  if (titulo !== null) panel.adminTitulo = tituloDelPanel(titulo)

  return { panel }
}
