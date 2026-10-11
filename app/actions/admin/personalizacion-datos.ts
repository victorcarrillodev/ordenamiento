/**
 * Personalización y marca: lo que se puede cambiar y con qué valores de partida.
 *
 * Una sola fuente para la pantalla, el controlador y las pruebas: los campos de color
 * (con su nombre de formulario, su ayuda y su color de fábrica), las paletas listas
 * para aplicar, los íconos de los accesos y las ranuras de imagen. Antes cada color era
 * un bloque de JSX copiado a mano (con su nombre repetido en el controlador), y un campo
 * nuevo obligaba a tocar cinco sitios sin que nada avisara si uno se olvidaba.
 *
 * Los colores de fábrica son los de `DEFAULT_THEME_CONFIG` del backend
 * (`backend/src/services/customizations.ts`); una prueba comprueba que no se separen.
 */

import { normalizarHex } from '../../utils/color.ts'

// ---------------------------------------------------------------------------
// Portal ciudadano · colores
// ---------------------------------------------------------------------------

export interface ColoresPortal {
  primario: string
  acento: string
  secundario: string
  navbarFondo: string
  navbarTexto: string
  footerFondo: string
  footerTexto: string
}

export const COLORES_PORTAL_POR_DEFECTO: ColoresPortal = {
  primario: '#8c1d3d',
  acento: '#e0b84a',
  secundario: '#2d6a4f',
  navbarFondo: '#ffffff',
  navbarTexto: '#1a1d26',
  footerFondo: '#0f1117',
  footerTexto: '#ffffff',
}

export type GrupoColor = 'marca' | 'menu' | 'pie'

export interface CampoColor<Clave extends string = string> {
  /** Clave en `usuario.colores` (o en `panel`) del tema. */
  clave: Clave
  /** `name` del campo del formulario; el controlador lo lee con este mismo nombre. */
  name: string
  etiqueta: string
  /** Qué pinta en el portal, en una frase. */
  ayuda: string
  /** Zona de la vista previa que se ilumina al enfocar el campo. */
  zona: string
}

export const GRUPOS_COLOR_PORTAL: Array<{
  id: GrupoColor
  titulo: string
  descripcion: string
  icono: string
  campos: Array<CampoColor<keyof ColoresPortal>>
}> = [
  {
    id: 'marca',
    titulo: 'Colores de la marca',
    descripcion: 'Los tres colores que dan identidad al portal.',
    icono: 'mdi:palette-outline',
    campos: [
      {
        clave: 'primario',
        name: 'color_primario',
        etiqueta: 'Color primario',
        ayuda: 'Botón del menú, tinte de la portada, encabezados y el primer acceso.',
        zona: 'primario',
      },
      {
        clave: 'acento',
        name: 'color_acento',
        etiqueta: 'Color de acento',
        ayuda: 'Frase destacada de la portada, su primer botón y los resaltados.',
        zona: 'acento',
      },
      {
        clave: 'secundario',
        name: 'color_secundario',
        etiqueta: 'Color secundario',
        ayuda: 'Segundo acceso de «Sobre el Programa» y la línea de las fases.',
        zona: 'secundario',
      },
    ],
  },
  {
    id: 'menu',
    titulo: 'Menú superior',
    descripcion: 'La barra con el logotipo que acompaña al visitante en todo el portal.',
    icono: 'mdi:dock-top',
    campos: [
      {
        clave: 'navbarFondo',
        name: 'color_navbar_fondo',
        etiqueta: 'Fondo del menú',
        ayuda: 'Color de la barra superior.',
        zona: 'menu',
      },
      {
        clave: 'navbarTexto',
        name: 'color_navbar_texto',
        etiqueta: 'Texto del menú',
        ayuda: 'Color de los enlaces de la barra superior.',
        zona: 'menu',
      },
    ],
  },
  {
    id: 'pie',
    titulo: 'Pie de página',
    descripcion: 'El bloque con los datos de contacto al final de cada página.',
    icono: 'mdi:dock-bottom',
    campos: [
      {
        clave: 'footerFondo',
        name: 'color_footer_fondo',
        etiqueta: 'Fondo del pie',
        ayuda: 'Color del bloque final.',
        zona: 'pie',
      },
      {
        clave: 'footerTexto',
        name: 'color_footer_texto',
        etiqueta: 'Texto del pie',
        ayuda: 'Color de los textos del bloque final.',
        zona: 'pie',
      },
    ],
  },
]

export const CAMPOS_COLOR_PORTAL = GRUPOS_COLOR_PORTAL.flatMap((g) => g.campos)

/**
 * Pares de colores que tienen que leerse entre sí. La pantalla muestra su contraste en
 * vivo; «blanco» es el color del texto de un botón que se pinta con el color primario.
 */
export interface ParContraste {
  id: string
  etiqueta: string
  /** `clave` del color del texto; `#ffffff` cuando es fijo. */
  texto: keyof ColoresPortal | '#ffffff'
  /** `clave` del color del fondo. */
  fondo: keyof ColoresPortal
  zona: string
}

export const PARES_CONTRASTE_PORTAL: ParContraste[] = [
  {
    id: 'menu',
    etiqueta: 'Texto del menú',
    texto: 'navbarTexto',
    fondo: 'navbarFondo',
    zona: 'menu',
  },
  { id: 'pie', etiqueta: 'Texto del pie', texto: 'footerTexto', fondo: 'footerFondo', zona: 'pie' },
  {
    id: 'boton',
    etiqueta: 'Botón del menú',
    texto: '#ffffff',
    fondo: 'primario',
    zona: 'primario',
  },
]

// ---------------------------------------------------------------------------
// Portal ciudadano · paletas
// ---------------------------------------------------------------------------

export interface PaletaPortal {
  id: string
  nombre: string
  descripcion: string
  colores: ColoresPortal
}

/**
 * Combinaciones ya probadas: todas cumplen un contraste cómodo (4.5:1 o más) en el menú,
 * en el pie y en el botón primario. Una prueba lo comprueba, para que añadir una paleta
 * bonita pero ilegible no sea posible.
 */
export const PALETAS_PORTAL: PaletaPortal[] = [
  {
    id: 'oficial',
    nombre: 'Tlaquepaque Oficial',
    descripcion: 'Vino institucional, oro y verde',
    colores: { ...COLORES_PORTAL_POR_DEFECTO },
  },
  {
    id: 'bosque',
    nombre: 'Bosque Ecológico',
    descripcion: 'Verde esmeralda y menta natural',
    colores: {
      primario: '#1b4332',
      acento: '#52b788',
      secundario: '#2d6a4f',
      navbarFondo: '#ffffff',
      navbarTexto: '#081c15',
      footerFondo: '#081c15',
      footerTexto: '#d8f3dc',
    },
  },
  {
    id: 'metropolitano',
    nombre: 'Azul Metropolitano',
    descripcion: 'Azul marino, zafiro y celeste',
    colores: {
      primario: '#1e3a8a',
      acento: '#38bdf8',
      secundario: '#0d9488',
      navbarFondo: '#ffffff',
      navbarTexto: '#0f172a',
      footerFondo: '#0f172a',
      footerTexto: '#e2e8f0',
    },
  },
  {
    id: 'noche',
    nombre: 'Noche Elegante',
    descripcion: 'Oscuro profundo y destellos de oro',
    colores: {
      primario: '#4c0519',
      acento: '#fbbf24',
      secundario: '#b45309',
      navbarFondo: '#18181b',
      navbarTexto: '#ffffff',
      footerFondo: '#09090b',
      footerTexto: '#fafafa',
    },
  },
  {
    id: 'atardecer',
    nombre: 'Atardecer Tapatío',
    descripcion: 'Terracota, ámbar y verde azulado',
    colores: {
      primario: '#9a3412',
      acento: '#f59e0b',
      secundario: '#0f766e',
      navbarFondo: '#fffbeb',
      navbarTexto: '#431407',
      footerFondo: '#431407',
      footerTexto: '#ffedd5',
    },
  },
  {
    id: 'grafito',
    nombre: 'Grafito Sobrio',
    descripcion: 'Gris pizarra con un toque de ámbar',
    colores: {
      primario: '#334155',
      acento: '#f59e0b',
      secundario: '#0e7490',
      navbarFondo: '#f8fafc',
      navbarTexto: '#0f172a',
      footerFondo: '#0f172a',
      footerTexto: '#e2e8f0',
    },
  },
]

// ---------------------------------------------------------------------------
// Portal ciudadano · íconos de «Sobre el Programa»
// ---------------------------------------------------------------------------

export interface IconoDeAcceso {
  clave: 'cardPrograma' | 'cardProceso' | 'cardCalendario' | 'cardDocumentos'
  name: string
  /** El acceso al que acompaña, tal como se lee en el portal. */
  titulo: string
  porDefecto: string
  /** Sugerencias a un clic; se puede escribir cualquier otro emoji. */
  sugeridos: string[]
}

export const ICONOS_PORTAL: IconoDeAcceso[] = [
  {
    clave: 'cardPrograma',
    name: 'ico_card1',
    titulo: 'Conoce las fases',
    porDefecto: '🧭',
    sugeridos: ['🧭', '🗺️', '🧩', '🏞️', '🌳', '📍', '🏛️', '♻️'],
  },
  {
    clave: 'cardProceso',
    name: 'ico_card2',
    titulo: 'Avances del Programa',
    porDefecto: '📊',
    sugeridos: ['📊', '📈', '✅', '🚀', '🛠️', '📌', '🔄', '📣'],
  },
  {
    clave: 'cardCalendario',
    name: 'ico_card3',
    titulo: 'Calendario de actividades',
    porDefecto: '📅',
    sugeridos: ['📅', '🗓️', '⏰', '📆', '🎯', '🤝', '📢', '🕒'],
  },
  {
    clave: 'cardDocumentos',
    name: 'ico_card4',
    titulo: 'Seguimiento y evaluación',
    porDefecto: '📈',
    sugeridos: ['📈', '📉', '📋', '🔎', '📑', '🧮', '✔️', '📚'],
  },
]

// ---------------------------------------------------------------------------
// Portal ciudadano · imágenes
// ---------------------------------------------------------------------------

/** Tamaño máximo que acepta el servidor (en MB) y formatos admitidos; no incluye SVG. */
export const MAX_IMAGEN_MB = 20
export const FORMATOS_IMAGEN = 'JPG, PNG, WebP o GIF'

export interface RanuraImagen {
  clave: 'logoNavbar' | 'logoFooter' | 'imagenEcologia' | 'imagenPrograma' | 'adminLogo'
  /** `name` del campo de texto con la dirección de la imagen. */
  urlName: string
  /** `name` del campo para subir un archivo nuevo. */
  archivoName: string
  titulo: string
  /** Dónde se ve en el portal. */
  dondeSale: string
  recomendado: string
  /** Sobre qué color se ve: el selector de imagen lo reproduce detrás de la vista previa. */
  fondo: 'menu' | 'pie' | 'claro' | 'lateral'
  forma: 'logo' | 'ilustracion'
  /** Zona de la vista previa que se ilumina al enfocar el campo. */
  zona: string
}

export const RANURAS_IMAGEN_PORTAL: RanuraImagen[] = [
  {
    clave: 'logoNavbar',
    urlName: 'logo_navbar',
    archivoName: 'archivo_logo_navbar',
    titulo: 'Logotipo del menú superior',
    dondeSale: 'Esquina izquierda de la barra superior.',
    recomendado: 'Horizontal, con fondo transparente (PNG o WebP), de unos 400 × 120 px.',
    fondo: 'menu',
    forma: 'logo',
    zona: 'menu',
  },
  {
    clave: 'logoFooter',
    urlName: 'logo_footer',
    archivoName: 'archivo_logo_footer',
    titulo: 'Logotipo del pie de página',
    dondeSale: 'Bloque final de cada página, sobre el color del pie.',
    recomendado: 'Versión clara si el pie es oscuro; fondo transparente (PNG o WebP).',
    fondo: 'pie',
    forma: 'logo',
    zona: 'pie',
  },
  {
    clave: 'imagenEcologia',
    urlName: 'imagen_ecologia',
    archivoName: 'archivo_imagen_ecologia',
    titulo: 'Ilustración de «¿Qué es este sitio?»',
    dondeSale: 'Junto al texto que explica la Bitácora.',
    recomendado: 'Ilustración o fotografía de proporción 4:3, de al menos 800 × 600 px.',
    fondo: 'claro',
    forma: 'ilustracion',
    zona: 'secciones',
  },
  {
    clave: 'imagenPrograma',
    urlName: 'imagen_programa',
    archivoName: 'archivo_imagen_programa',
    titulo: 'Ilustración de «¿Qué es el Programa?»',
    dondeSale: 'Junto al texto que explica el Programa.',
    recomendado: 'Ilustración o fotografía de proporción 4:3; distinta de la anterior.',
    fondo: 'claro',
    forma: 'ilustracion',
    zona: 'secciones',
  },
]

/** El logotipo del menú lateral del panel (pestaña «Panel administrativo»). */
export const RANURA_LOGO_PANEL: RanuraImagen = {
  clave: 'adminLogo',
  urlName: 'panel_admin_logo',
  archivoName: 'archivo_admin_logo',
  titulo: 'Logotipo del menú lateral',
  dondeSale: 'Parte alta del menú de la izquierda, sobre el color del menú.',
  recomendado: 'Horizontal, con fondo transparente (PNG o WebP), de unos 400 × 120 px.',
  fondo: 'lateral',
  forma: 'logo',
  zona: 'sidebar',
}

/** Cuánto tarda el carrusel de la portada en pasar a la foto siguiente (ver home-page.tsx). */
export const SEGUNDOS_POR_FOTO = 5

// ---------------------------------------------------------------------------
// Panel administrativo
// ---------------------------------------------------------------------------

export interface ColoresPanel {
  sidebarFondo: string
  sidebarTexto: string
  topbarFondo: string
  topbarTexto: string
  colorAcento: string
  adminBg: string
}

export const COLORES_PANEL_POR_DEFECTO: ColoresPanel = {
  sidebarFondo: '#ffffff',
  sidebarTexto: '#475066',
  topbarFondo: '#2e3440',
  topbarTexto: '#ffffff',
  colorAcento: '#2563eb',
  adminBg: '#f4f6fb',
}

export const CAMPOS_COLOR_PANEL: Array<CampoColor<keyof ColoresPanel>> = [
  {
    clave: 'topbarFondo',
    name: 'panel_topbar_fondo',
    etiqueta: 'Fondo de la barra superior',
    ayuda: 'La franja oscura con el título de cada pantalla y tu nombre.',
    zona: 'topbar',
  },
  {
    clave: 'topbarTexto',
    name: 'panel_topbar_texto',
    etiqueta: 'Texto de la barra superior',
    ayuda: 'Color del título y del nombre en esa franja.',
    zona: 'topbar',
  },
  {
    clave: 'sidebarFondo',
    name: 'panel_sidebar_fondo',
    etiqueta: 'Fondo del menú lateral',
    ayuda: 'La columna de la izquierda con las secciones del panel.',
    zona: 'sidebar',
  },
  {
    clave: 'sidebarTexto',
    name: 'panel_sidebar_texto',
    etiqueta: 'Texto del menú lateral',
    ayuda: 'Color de las opciones del menú.',
    zona: 'sidebar',
  },
  {
    clave: 'colorAcento',
    name: 'panel_color_acento',
    etiqueta: 'Color de acento',
    ayuda: 'Opción activa del menú, enlaces, pestañas y el borde al escribir.',
    zona: 'acento',
  },
  {
    clave: 'adminBg',
    name: 'panel_admin_bg',
    etiqueta: 'Fondo de las pantallas',
    ayuda: 'El color detrás de los paneles y las tablas.',
    zona: 'fondo',
  },
]

export const PARES_CONTRASTE_PANEL: Array<{
  id: string
  etiqueta: string
  texto: keyof ColoresPanel
  fondo: keyof ColoresPanel
  zona: string
}> = [
  {
    id: 'topbar',
    etiqueta: 'Texto de la barra superior',
    texto: 'topbarTexto',
    fondo: 'topbarFondo',
    zona: 'topbar',
  },
  {
    id: 'sidebar',
    etiqueta: 'Texto del menú lateral',
    texto: 'sidebarTexto',
    fondo: 'sidebarFondo',
    zona: 'sidebar',
  },
  {
    id: 'acento',
    etiqueta: 'Acento sobre el fondo',
    texto: 'colorAcento',
    fondo: 'adminBg',
    zona: 'acento',
  },
]

export interface PaletaPanel {
  id: string
  nombre: string
  descripcion: string
  colores: ColoresPanel
}

export const PALETAS_PANEL: PaletaPanel[] = [
  {
    id: 'institucional',
    nombre: 'Institucional',
    descripcion: 'Barra oscura y menú claro (por defecto)',
    colores: { ...COLORES_PANEL_POR_DEFECTO },
  },
  {
    id: 'grafito',
    nombre: 'Grafito',
    descripcion: 'Menú y barra oscuros, acento azul',
    colores: {
      sidebarFondo: '#1f2937',
      sidebarTexto: '#e5e7eb',
      topbarFondo: '#111827',
      topbarTexto: '#ffffff',
      colorAcento: '#0284c7',
      adminBg: '#f3f4f6',
    },
  },
  {
    id: 'bosque',
    nombre: 'Bosque',
    descripcion: 'Verde profundo sobre fondo suave',
    colores: {
      sidebarFondo: '#ffffff',
      sidebarTexto: '#14532d',
      topbarFondo: '#14532d',
      topbarTexto: '#ffffff',
      colorAcento: '#15803d',
      adminBg: '#f0fdf4',
    },
  },
  {
    id: 'guinda',
    nombre: 'Guinda',
    descripcion: 'El color del Municipio en la barra superior',
    colores: {
      sidebarFondo: '#ffffff',
      sidebarTexto: '#4a2c35',
      topbarFondo: '#8c1d3d',
      topbarTexto: '#ffffff',
      colorAcento: '#9f1239',
      adminBg: '#fdf5f7',
    },
  },
]

/** Título del panel por omisión; el campo admite dos líneas. */
export const TITULO_PANEL_POR_DEFECTO = 'ADMINISTRADOR\nBITÁCORA'
export const MAX_TITULO_PANEL = 60

// ---------------------------------------------------------------------------
// Motivo del cambio
// ---------------------------------------------------------------------------

/** Sugerencias de motivo a un clic, según lo que se tocó. */
export const MOTIVOS_SUGERIDOS: Record<string, string> = {
  colores: 'Actualización de colores y diseño',
  fotos: 'Actualización de las fotos de la portada',
  logos: 'Cambio de logotipos e imágenes',
  iconos: 'Cambio de íconos de los accesos',
  panel: 'Ajuste de la apariencia del panel',
}

// ---------------------------------------------------------------------------
// Lectura del tema guardado
// ---------------------------------------------------------------------------

type Tema = Record<string, unknown> | null | undefined

function objeto(valor: unknown): Record<string, unknown> {
  return valor && typeof valor === 'object' && !Array.isArray(valor)
    ? (valor as Record<string, unknown>)
    : {}
}

/**
 * Los colores del portal tal como los muestra el formulario: lo guardado, o el de fábrica
 * si falta o no es un color sólido (`<input type="color">` solo entiende `#rrggbb`: un
 * `rgba(…)` guardado a mano lo dejaría en negro y se perdería al guardar).
 */
export function coloresDelPortal(tema: Tema): ColoresPortal {
  const guardados = objeto(objeto(tema?.usuario).colores)
  const salida = { ...COLORES_PORTAL_POR_DEFECTO }
  for (const clave of Object.keys(salida) as Array<keyof ColoresPortal>) {
    const hex = normalizarHex(guardados[clave])
    if (hex) salida[clave] = hex
  }
  return salida
}

export function coloresDelPanel(tema: Tema): ColoresPanel {
  const guardados = objeto(tema?.panel)
  const salida = { ...COLORES_PANEL_POR_DEFECTO }
  for (const clave of Object.keys(salida) as Array<keyof ColoresPanel>) {
    const hex = normalizarHex(guardados[clave])
    if (hex) salida[clave] = hex
  }
  return salida
}

/** Los cuatro emojis de los accesos; el predeterminado si falta o está vacío. */
export function iconosDelPortal(tema: Tema): Record<IconoDeAcceso['clave'], string> {
  const guardados = objeto(objeto(tema?.usuario).iconos)
  const salida = {} as Record<IconoDeAcceso['clave'], string>
  for (const icono of ICONOS_PORTAL) {
    const valor = guardados[icono.clave]
    salida[icono.clave] =
      typeof valor === 'string' && valor.trim() !== '' ? valor.trim() : icono.porDefecto
  }
  return salida
}

/** Las direcciones de las fotos de la portada, sin vacías ni repetidas. */
export function fotosDeLaPortada(tema: Tema, porDefecto: string): string[] {
  const guardadas = objeto(objeto(tema?.usuario).imagenes).heroImagenes
  const fotos = Array.isArray(guardadas)
    ? [...new Set(guardadas.filter((f): f is string => typeof f === 'string' && f.trim() !== ''))]
    : []
  return fotos.length > 0 ? fotos : [porDefecto]
}
