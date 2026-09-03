import { isSafeCssColor, isSafeImageUrl, sanitizeText } from '../utils.ts'

import { logger } from '../utils.ts'
import { mkdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { sql } from '../db/pool.ts'

/**
 * Prefijo publico del portal. Las imagenes por defecto y las que sube el
 * administrador se sirven bajo el, y estaba escrito a mano como '/ordena' en
 * ocho sitios: cambiar BASE_PATH dejaba todas las imagenes rotas.
 */
const BASE_PATH = (process.env.BASE_PATH ?? '/ordena').replace(/\/+$/, '')

/** Imagenes que vienen con el proyecto, servidas desde public/assets. */
export const IMAGEN = {
  logo: `${BASE_PATH}/assets/img/logo/logo-200x60.webp`,
  hero: `${BASE_PATH}/assets/img/hero/hero.webp`,
  ecologia: `${BASE_PATH}/assets/img/vector/vector_1.webp`,
  programa: `${BASE_PATH}/assets/img/vector/vector_2.webp`,
} as const

/** URL publica de una imagen subida en Personalizacion. */
export function urlImagenDeMarca(filename: string): string {
  return `${BASE_PATH}/marca/${filename}`
}

/**
 * Rutas heredadas que ya no resuelven y hay que reemplazar por la imagen por
 * defecto. Son valores guardados en la base por versiones anteriores del
 * proyecto: hoy dejan un icono de imagen rota en la portada.
 *
 *  · `/ordena/images/...`      → la carpeta se llama `assets/img`, no `images`
 *  · `ecology-split.*`         → ilustracion retirada del repositorio
 */
function esRutaMuerta(src: string): boolean {
  return /\/images\//.test(src) || /ecology-split\./.test(src)
}

/**
 * Normaliza una imagen guardada en la configuracion.
 *
 * Cubre tres casos que dejaban imagenes rotas en produccion: el valor vacio,
 * las rutas de versiones viejas, y las imagenes subidas cuya URL apuntaba a
 * una ruta interna del backend (`/api/settings/assets/...`) a la que el
 * navegador no llega.
 */
export function normalizarImagen(src: unknown, porDefecto: string): string {
  if (typeof src !== 'string' || src.trim() === '') return porDefecto
  const limpio = src.trim()
  if (esRutaMuerta(limpio)) return porDefecto

  if (limpio.startsWith('/api/')) {
    const subida = limpio.match(/^\/api\/settings\/assets\/([A-Za-z0-9_.-]+)$/)
    // Cualquier otra ruta de /api/ es inalcanzable desde el navegador.
    return subida ? urlImagenDeMarca(subida[1]) : porDefecto
  }

  return limpio
}

export interface ThemeConfig {
  usuario: {
    colores: {
      primario: string
      acento: string
      secundario: string
      navbarFondo: string
      navbarTexto: string
      footerFondo: string
      footerTexto: string
      heroGradienteInicio: string
      heroGradienteCentro: string
      heroGradienteFin: string
    }
    imagenes: {
      logoNavbar: string
      logoFooter: string
      heroImagenes: string[]
      imagenEcologia: string
      imagenPrograma: string
    }
    iconos: {
      cardPrograma: string
      cardProceso: string
      cardCalendario: string
      cardDocumentos: string
    }
    textos: {
      navbarTitulo: string
      navEnlaceInicio: string
      navEnlacePoetdum: string
      navCtaRegistrar: string
      heroCintillo: string
      heroTitulo: string
      heroTituloResaltado: string
      heroSubtitulo: string
      heroBtn1: string
      heroBtn2: string
      heroScrollIndicador: string
      queEsCintillo: string
      queEsTitulo: string
      queEsParrafo1: string
      queEsParrafo2: string
      queEsBullet1: string
      queEsBullet2: string
      queEsBullet3: string
      queEsBullet4: string
      queEsPieImagen: string
      tarjetasEyebrow: string
      tarjetasTitulo: string
      card1Titulo: string
      card1Desc: string
      card1Eyebrow: string
      card1Cta: string
      card2Titulo: string
      card2Desc: string
      card2Eyebrow: string
      card2Cta: string
      card3Titulo: string
      card3Desc: string
      card3Eyebrow: string
      card3Cta: string
      card4Titulo: string
      card4Desc: string
      card4Eyebrow: string
      card4Cta: string
      programaTitulo: string
      programaParrafo1: string
      programaParrafo2: string
      programaPregunta1: string
      programaPregunta2: string
      programaPregunta3: string
      programaPregunta4: string
      timelineEyebrow: string
      timelineTitulo: string
      timelinePaso1Titulo: string
      timelinePaso1Desc: string
      timelinePaso2Titulo: string
      timelinePaso2Desc: string
      timelinePaso3Titulo: string
      timelinePaso3Desc: string
      timelinePaso4Titulo: string
      timelinePaso4Desc: string
      timelinePaso5Titulo: string
      timelinePaso5Desc: string
      ctaEyebrow: string
      ctaTitulo: string
      ctaParrafo: string
      ctaBoton: string
      footerEntidad: string
      footerDesc: string
      footerContacto: string
      footerEmail: string
      footerCopyright: string
      footerFirma: string
    }
  }
  panel: {
    sidebarFondo: string
    sidebarTexto: string
    topbarFondo: string
    topbarTexto: string
    colorAcento: string
    adminBg: string
    adminLogo: string
    adminTitulo: string
  }
}

export const DEFAULT_THEME_CONFIG: ThemeConfig = {
  usuario: {
    colores: {
      primario: '#8c1d3d',
      acento: '#e0b84a',
      secundario: '#2d6a4f',
      navbarFondo: '#ffffff',
      navbarTexto: '#1a1d26',
      footerFondo: '#0f1117',
      footerTexto: '#ffffff',
      heroGradienteInicio: 'rgba(15,17,23,0.82)',
      heroGradienteCentro: 'rgba(140,29,61,0.70)',
      heroGradienteFin: 'rgba(15,17,23,0.75)',
    },
    imagenes: {
      logoNavbar: IMAGEN.logo,
      logoFooter: IMAGEN.logo,
      heroImagenes: [IMAGEN.hero],
      imagenEcologia: IMAGEN.ecologia,
      imagenPrograma: IMAGEN.programa,
    },
    iconos: {
      cardPrograma: '🏛️',
      cardProceso: '⚙️',
      cardCalendario: '📅',
      cardDocumentos: '📄',
    },
    textos: {
      navbarTitulo: 'Inicio – Portal de Ordenamiento Territorial',
      navEnlaceInicio: 'Inicio y proceso',
      navEnlacePoetdum: 'Elaboración del POETDUM',
      navCtaRegistrar: 'Registra tu participación',
      heroCintillo: 'BITÁCORA AMBIENTAL Y ORDENAMIENTO TERRITORIAL · SAN PEDRO TLAQUEPAQUE',
      heroTitulo: 'Bitácora Ambiental y Ordenamiento Territorial',
      heroTituloResaltado: 'Ordenamiento Territorial',
      heroSubtitulo:
        'Un espacio público y transparente que reúne información, facilita la participación ciudadana y permite dar seguimiento a la elaboración y aplicación del Programa de Ordenamiento Ecológico Territorial y de Desarrollo Urbano.',
      heroBtn1: 'Conoce la Bitácora',
      heroBtn2: 'Registra tu participación',
      heroScrollIndicador: 'Explorar',
      queEsCintillo: '¿QUÉ ES ESTE SITIO?',
      queEsTitulo: 'Conoce la Bitácora Ambiental y de Ordenamiento Territorial',
      queEsParrafo1:
        'Este sitio forma parte de la Bitácora Ambiental y de Ordenamiento Territorial del Municipio de San Pedro Tlaquepaque, un espacio público y transparente en el que se registra, organiza y difunde la información relacionada con el Programa de Ordenamiento Ecológico Territorial y de Desarrollo Urbano.',
      queEsParrafo2:
        'La Bitácora permite conocer y dar seguimiento a la elaboración, actualización, aplicación y evaluación del Programa; consultar los acuerdos, avances, resultados y documentos técnicos generados, así como conocer las actividades relacionadas con la planeación del territorio municipal. También facilita la participación de la ciudadanía, al permitir la presentación de observaciones, propuestas y documentos durante los mecanismos de consulta pública establecidos.',
      queEsBullet1: 'Consulta de documentos técnicos, acuerdos, avances y resultados.',
      queEsBullet2: 'Seguimiento a la elaboración, actualización y aplicación del Programa.',
      queEsBullet3: 'Acceso al calendario de actividades y mecanismos de consulta pública.',
      queEsBullet4:
        'Registro de observaciones, propuestas y documentos de la ciudadanía (durante los tiempos oficiales de consulta pública).',
      queEsPieImagen: 'Equilibrio ecológico • Jalisco, México',
      tarjetasEyebrow: 'Explora lo que puedes hacer aquí',
      tarjetasTitulo: 'Todo lo que necesitas para estar informado y participar',
      card1Titulo: 'Proceso de Elaboración',
      card1Desc:
        'Consulta las etapas del proceso de elaboración del Programa, su estado de avance, actividades realizadas, productos obtenidos y documentos relacionados.',
      card1Eyebrow: 'Proceso de elaboración',
      card1Cta: 'Ver proceso',
      card2Titulo: 'Actividades y Participación',
      card2Desc:
        'Consulta las actividades próximas y realizadas: talleres, mesas de trabajo, consultas públicas y sesiones técnicas, con sus resultados y documentos.',
      card2Eyebrow: 'Actividades y participación',
      card2Cta: 'Ver actividades',
      card3Titulo: 'Documentos del Proceso',
      card3Desc:
        'Accede al repositorio de convenios, actas, acuerdos, documentos técnicos, cartografía y avances generados durante el proceso.',
      card3Eyebrow: 'Repositorio técnico',
      card3Cta: 'Ver documentos',
      card4Titulo: 'Seguimiento y Evaluación',
      card4Desc:
        'Consulta los indicadores ambientales y los resultados de la evaluación del cumplimiento y efectividad del Programa.',
      card4Eyebrow: 'Seguimiento y evaluación',
      card4Cta: 'Ver indicadores',
      programaTitulo:
        '¿Qué es el Programa de Ordenamiento Ecológico Territorial y de Desarrollo Urbano?',
      programaParrafo1:
        'Es una herramienta que permite organizar el territorio del municipio, definiendo qué actividades pueden realizarse en cada zona y en qué condiciones, con el objetivo de proteger el medio ambiente y orientar el desarrollo urbano de manera ordenada.',
      programaParrafo2:
        'Para elaborarlo se analizan las características del territorio, sus recursos naturales y las actividades que se desarrollan en él, con el propósito de encontrar un equilibrio entre la protección del medio ambiente y el desarrollo urbano del municipio. A partir de estos análisis se busca responder preguntas como:',
      programaPregunta1: '¿Qué zonas deben conservarse o protegerse por su valor ambiental?',
      programaPregunta2: '¿Dónde es adecuado el crecimiento y desarrollo urbano del municipio?',
      programaPregunta3:
        '¿Qué tipo de actividades pueden desarrollarse en las distintas zonas del territorio?',
      programaPregunta4:
        '¿En qué condiciones deben realizarse estas actividades para evitar impactos negativos en el ambiente y en el entorno urbano? Una vez aprobado, el Programa de Ordenamiento Ecológico Territorial y de Desarrollo Urbano establece los criterios y lineamientos que orientan el uso, ocupación y aprovechamiento del territorio, así como las reglas que guiarán el desarrollo urbano del municipio.',
      timelineEyebrow: 'Fases del proceso',
      timelineTitulo: 'Cinco etapas hacia un territorio ordenado y sustentable',
      timelinePaso1Titulo: 'Formulación',
      timelinePaso1Desc:
        'Diagnóstico territorial, caracterización del área y elaboración de la propuesta inicial del programa con participación ciudadana.',
      timelinePaso2Titulo: 'Expedición',
      timelinePaso2Desc:
        'Consulta pública, revisión técnica, aprobación por el Ayuntamiento y publicación oficial del programa en el Periódico Oficial.',
      timelinePaso3Titulo: 'Ejecución',
      timelinePaso3Desc:
        'Implementación de acciones, programas e instrumentos para materializar los lineamientos del ordenamiento territorial.',
      timelinePaso4Titulo: 'Evaluación',
      timelinePaso4Desc:
        'Monitoreo de indicadores, revisión periódica de avances y verificación del cumplimiento de metas establecidas.',
      timelinePaso5Titulo: 'Modificación',
      timelinePaso5Desc:
        'Actualización del programa con base en nuevas condiciones territoriales, ambientales o socioeconómicas del municipio.',
      ctaEyebrow: 'Participación ciudadana',
      ctaTitulo: 'Tu voz transforma el territorio de Tlaquepaque',
      ctaParrafo:
        'Registra tus observaciones, propuestas y documentos técnicos. Tu participación es fundamental para construir el Programa de Ordenamiento que refleje las necesidades reales del municipio.',
      ctaBoton: 'Registra tu participación',
      footerEntidad: 'Municipio de San Pedro Tlaquepaque',
      footerDesc:
        'Portal oficial de la Bitácora Ambiental del Programa de Ordenamiento Ecológico Territorial y de Desarrollo Urbano.',
      footerContacto:
        'Dirección de Medio Ambiente y Ecología\nH. Ayuntamiento de San Pedro Tlaquepaque\nJalisco, México',
      footerEmail: 'ordenamiento@tlaquepaque.gob.mx',
      footerCopyright:
        '© 2026 H. Ayuntamiento de San Pedro Tlaquepaque. Todos los derechos reservados.',
      footerFirma: 'Portal de Ordenamiento Territorial · Bitácora Ambiental',
    },
  },
  panel: {
    sidebarFondo: '#ffffff',
    sidebarTexto: '#475066',
    topbarFondo: '#2e3440',
    topbarTexto: '#ffffff',
    colorAcento: '#2563eb',
    adminBg: '#f4f6fb',
    adminLogo: IMAGEN.logo,
    adminTitulo: 'ADMINISTRADOR BITÁCORA AMBIENTAL',
  },
}

const BRANDING_UPLOAD_DIR = join(process.cwd(), 'uploads', 'branding')

// Fusión recursiva genérica de objetos anidados de forma arbitraria (la
// config JSONB de site_customizations); un tipo recursivo preciso aquí no
// aportaría seguridad real sobre datos que ya vienen sin tipar desde la BD.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function deepMerge(target: any, source: any): any {
  if (!source || typeof source !== 'object') return target
  const output = { ...target }
  for (const key of Object.keys(source)) {
    // Protección contra prototype pollution: nunca permitir sobrescribir
    // __proto__/constructor/prototype desde un payload no confiable (el admin
    // puede guardar JSON arbitrario vía saveCustomizations).
    if (key === '__proto__' || key === 'constructor' || key === 'prototype') continue
    if (
      source[key] &&
      typeof source[key] === 'object' &&
      !Array.isArray(source[key]) &&
      target[key] &&
      typeof target[key] === 'object'
    ) {
      output[key] = deepMerge(target[key], source[key])
    } else if (source[key] !== undefined) {
      output[key] = source[key]
    }
  }
  return output
}

/**
 * Repasa todas las imagenes del tema guardado y sustituye las que ya no
 * resuelven. Se aplica al LEER y no al guardar porque las filas problematicas
 * ya estan en la base: arreglarlo solo en el guardado dejaria rota la portada
 * hasta que alguien volviera a pasar por Personalizacion.
 *
 * `imagenPrograma` ademas no puede quedarse con la ilustracion de ecologia:
 * son dos secciones distintas de la portada y repetir la imagen se lee como
 * un error de carga.
 */
export function normalizarImagenesDelTema(tema: ThemeConfig): ThemeConfig {
  const img = tema.usuario?.imagenes
  if (img) {
    img.logoNavbar = normalizarImagen(img.logoNavbar, IMAGEN.logo)
    img.logoFooter = normalizarImagen(img.logoFooter, IMAGEN.logo)
    img.imagenEcologia = normalizarImagen(img.imagenEcologia, IMAGEN.ecologia)
    img.imagenPrograma = normalizarImagen(img.imagenPrograma, IMAGEN.programa)
    if (img.imagenPrograma === img.imagenEcologia) {
      img.imagenPrograma = IMAGEN.programa
    }

    const hero = Array.isArray(img.heroImagenes)
      ? img.heroImagenes.map((src) => normalizarImagen(src, IMAGEN.hero))
      : []
    // Sin fotos no hay carrusel; y si todas se normalizaron a la misma, basta
    // con una: el carrusel no debe pasar tres veces por la misma imagen.
    img.heroImagenes = hero.length > 0 ? [...new Set(hero)] : [IMAGEN.hero]
  }

  if (tema.panel) {
    tema.panel.adminLogo = normalizarImagen(tema.panel.adminLogo, IMAGEN.logo)
  }

  return tema
}

export async function getCustomizations(): Promise<ThemeConfig> {
  try {
    // Columna JSONB de forma dinámica: el tipo en crudo es un objeto plano.
    const rows = await sql<Array<{ config: Record<string, unknown> }>>`
      SELECT config FROM site_customizations WHERE id = 1 LIMIT 1
    `
    if (rows.length === 0 || !rows[0].config || Object.keys(rows[0].config).length === 0) {
      return DEFAULT_THEME_CONFIG
    }
    const merged = deepMerge(DEFAULT_THEME_CONFIG, rows[0].config)
    return normalizarImagenesDelTema(merged)
  } catch (err) {
    // M3: el error es visible (logger), pero se mantiene el fallback para que
    // el sitio siga renderizando con el tema por defecto en vez de caer 500.
    logger.error('customizations.getCustomizations', err)
    return DEFAULT_THEME_CONFIG
  }
}

export interface SaveCustomizationParams {
  config: Partial<ThemeConfig>
  user: { id: string; name: string; email: string; role?: string }
  motivo: string
  section?: 'usuario' | 'panel' | 'general'
}

export async function saveCustomizations(params: SaveCustomizationParams): Promise<ThemeConfig> {
  const current = await getCustomizations()
  const merged = deepMerge(current, params.config)

  const motivoLimpio = params.motivo.trim() || 'Actualización de diseño y marca'
  const section = params.section || 'general'

  // Guardar o actualizar registro id = 1
  await sql`
    INSERT INTO site_customizations (id, config, updated_by, updated_at)
    VALUES (1, ${sql.json(merged)}, ${params.user.id}, now())
    ON CONFLICT (id) DO UPDATE SET
      config = EXCLUDED.config,
      updated_by = EXCLUDED.updated_by,
      updated_at = now()
  `

  // Registrar en bitácora de auditoría estricta
  const summary = `Cambios aplicados en sección [${section}]. Motivo: ${motivoLimpio}`
  await sql`
    INSERT INTO customization_audit_logs (user_id, user_name, user_email, motivo, section, changes_summary, snapshot, created_at)
    VALUES (
      ${params.user.id},
      ${params.user.name},
      ${params.user.email},
      ${motivoLimpio},
      ${section},
      ${summary},
      ${sql.json(merged)},
      now()
    )
  `

  return merged
}

export interface AuditLogEntry {
  id: string
  user_id: string | null
  user_name: string
  user_email: string
  motivo: string
  section: string
  changes_summary: string
  snapshot: ThemeConfig
  created_at: string
}

export async function listAuditLogs(limit = 50): Promise<AuditLogEntry[]> {
  try {
    const rows = await sql<
      Array<{
        id: string
        user_id: string | null
        user_name: string
        user_email: string
        motivo: string
        section: string
        changes_summary: string
        // Columna JSONB de forma dinámica: objeto plano en crudo.
        snapshot: Record<string, unknown>
        created_at: string
      }>
    >`
      SELECT id::text AS id, user_id::text AS user_id, user_name, user_email, motivo, section, changes_summary, snapshot, created_at::text
      FROM customization_audit_logs
      ORDER BY created_at DESC
      LIMIT ${limit}
    `
    return rows.map((r) => ({
      ...r,
      snapshot: deepMerge(DEFAULT_THEME_CONFIG, r.snapshot),
    }))
  } catch (err) {
    // M3: error visible con logger; se mantiene [] para no romper el panel.
    logger.error('customizations.listAuditLogs', err)
    return []
  }
}

export async function restoreAuditSnapshot(
  logId: string,
  user: { id: string; name: string; email: string },
  motivo = 'Restauración de versión anterior desde auditoría',
): Promise<ThemeConfig | null> {
  // Columna JSONB de forma dinámica: objeto plano en crudo.
  const rows = await sql<Array<{ snapshot: Record<string, unknown> }>>`
    SELECT snapshot FROM customization_audit_logs WHERE id = ${logId} LIMIT 1
  `
  if (rows.length === 0) return null

  const snapshot = deepMerge(DEFAULT_THEME_CONFIG, rows[0].snapshot)
  return saveCustomizations({
    config: snapshot,
    user,
    motivo: `${motivo} (Restaurado desde registro #${logId})`,
    section: 'general',
  })
}

export async function saveUploadedBrandingImage(
  fileBuffer: Buffer,
  originalFilename: string,
): Promise<{ url: string; filename: string }> {
  await mkdir(BRANDING_UPLOAD_DIR, { recursive: true })
  const cleanName = originalFilename.replace(/[^a-zA-Z0-9_.-]/g, '_')
  const uniqueName = `brand-${Date.now()}-${cleanName}`
  const fullPath = join(BRANDING_UPLOAD_DIR, uniqueName)
  await writeFile(fullPath, fileBuffer)
  // URL publica, no la ruta interna del backend: el navegador nunca habla
  // directamente con el backend, asi que `/api/settings/assets/...` daba 404.
  return {
    url: urlImagenDeMarca(uniqueName),
    filename: uniqueName,
  }
}

/**
 * Valida y sanitiza la configuración de tema.
 * Devuelve un string con el error si hay problemas, o null si es válido.
 * Modifica el objeto config in-place para sanitizar textos libres.
 */
export function validarYSanitizarThemeConfig(config: Partial<ThemeConfig>): string | null {
  // Procesar usuario.colores si existen
  if (config.usuario?.colores) {
    for (const [key, color] of Object.entries(config.usuario.colores)) {
      if (color && color !== '') {
        if (!isSafeCssColor(color)) {
          return `Color inválido en ${key}: ${color}`
        }
      }
    }
  }

  // Procesar usuario.imagenes si existen
  if (config.usuario?.imagenes) {
    const images = config.usuario.imagenes

    // Validar URLs individuales
    for (const [key, value] of Object.entries(images)) {
      if (key === 'heroImagenes') {
        // heroImagenes debe ser un array
        if (value && !Array.isArray(value)) {
          return 'heroImagenes debe ser un array'
        }
        // Validar cada URL en el array
        if (Array.isArray(value)) {
          for (const url of value) {
            if (url && url !== '' && !isSafeImageUrl(url)) {
              return `URL de imagen inválida en ${key}`
            }
          }
        }
      } else {
        // Para las demás imágenes (logoNavbar, logoFooter, imagenEcologia, imagenPrograma)
        if (value && value !== '' && !isSafeImageUrl(value)) {
          return `URL de imagen inválida en ${key}`
        }
      }
    }
  }

  // Procesar usuario.textos si existen - sanitizar in-place
  if (config.usuario?.textos) {
    for (const [key, text] of Object.entries(config.usuario.textos)) {
      if (text && typeof text === 'string') {
        config.usuario.textos[key as keyof typeof config.usuario.textos] = sanitizeText(text, 500)
      }
    }
  }

  // panel.colores si existen
  if (config.panel?.colorAcento) {
    if (!isSafeCssColor(config.panel.colorAcento)) {
      return `Color inválido en panel.colorAcento`
    }
  }

  // panel.adminLogo si existe
  if (config.panel?.adminLogo && config.panel.adminLogo !== '') {
    if (!isSafeImageUrl(config.panel.adminLogo)) {
      return 'URL de imagen inválida en panel.adminLogo'
    }
  }

  return null
}
