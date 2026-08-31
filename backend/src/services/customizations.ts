import { isSafeCssColor, isSafeImageUrl, logger, sanitizeText } from '../utils.ts'
import { mkdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { sql } from '../db/pool.ts'

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
      heroCintillo: string
      heroTitulo: string
      heroTituloResaltado: string
      heroSubtitulo: string
      heroBtn1: string
      heroBtn2: string
      queEsCintillo: string
      queEsTitulo: string
      queEsParrafo1: string
      queEsParrafo2: string
      card1Titulo: string
      card1Desc: string
      card2Titulo: string
      card2Desc: string
      card3Titulo: string
      card3Desc: string
      card4Titulo: string
      card4Desc: string
      footerEntidad: string
      footerDesc: string
      footerContacto: string
      footerEmail: string
      footerCopyright: string
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
      logoNavbar: 'https://ordenamiento.tlaquepaque.gob.mx/img/image5.png',
      logoFooter: '',
      heroImagenes: [
        'https://imgs.search.brave.com/8f1SgJygGgIrQH2BcZXess4TRcaOtm3FXVfawE9VxRE/rs:fit:860:0:0:0/g:ce/aHR0cHM6Ly9tZWRp/YS5pc3RvY2twaG90/by5jb20vaWQvMTEy/NTUyNzc3Mi9lcy9m/b3RvL3RsYXF1ZXBh/cXVlLmpwZz9zPTYx/Mng2MTImdz0wJms9/MjAmYz1VU3FwdjNw/OEJxbG9LY0JaY01q/YUdPNkpQWW1Va0xl/N1FYUGx5YVREM1Zz/PQ',
      ],
      imagenEcologia: '/ordena/images/ecology-split.jpg',
      imagenPrograma: '/ordena/images/ecology-split.jpg',
    },
    iconos: {
      cardPrograma: '🏛️',
      cardProceso: '⚙️',
      cardCalendario: '📅',
      cardDocumentos: '📄',
    },
    textos: {
      navbarTitulo: 'Portal de Ordenamiento Territorial',
      heroCintillo: 'BITÁCORA AMBIENTAL · SAN PEDRO TLAQUEPAQUE',
      heroTitulo: 'Programa de Ordenamiento Ecológico Territorial y de Desarrollo Urbano',
      heroTituloResaltado: 'Ecológico Territorial',
      heroSubtitulo:
        'Un proceso participativo para planificar el territorio de forma sustentable, preservando nuestro patrimonio natural y construyendo el municipio que merecemos.',
      heroBtn1: 'Conoce el programa',
      heroBtn2: 'Registra tu participación',
      queEsCintillo: '¿Qué es este sitio?',
      queEsTitulo: 'Tu ventana al ordenamiento territorial del municipio',
      queEsParrafo1:
        'Este portal es la Bitácora Ambiental del Municipio de San Pedro Tlaquepaque — un espacio oficial y transparente donde los ciudadanos, investigadores y funcionarios pueden dar seguimiento al avance del Programa de Ordenamiento Ecológico Territorial y de Desarrollo Urbano.',
      queEsParrafo2:
        'Aquí encontrarás documentos técnicos, calendarios de actividades, las fases del proceso y un mecanismo directo para registrar tus observaciones y participar en la toma de decisiones sobre el territorio que habitamos.',
      card1Titulo: 'Conoce el Programa',
      card1Desc:
        'Explora los fundamentos legales, objetivos y alcances del Programa de Ordenamiento Ecológico Territorial y de Desarrollo Urbano.',
      card2Titulo: 'Conoce el Proceso',
      card2Desc:
        'Entiende las cinco fases del proceso: desde la formulación hasta la evaluación continua del ordenamiento territorial.',
      card3Titulo: 'Calendario de Actividades',
      card3Desc:
        'Consulta las fechas de talleres, mesas de trabajo, consultas públicas y sesiones técnicas del programa.',
      card4Titulo: 'Consulta Documentos',
      card4Desc:
        'Accede a la memoria técnica, estudios de diagnóstico, cartografía y acuerdos oficiales del proceso de ordenamiento.',
      footerEntidad: 'Municipio de San Pedro Tlaquepaque',
      footerDesc:
        'Portal oficial de la Bitácora Ambiental del Programa de Ordenamiento Ecológico Territorial y de Desarrollo Urbano.',
      footerContacto:
        'Dirección de Medio Ambiente y Ecología\nH. Ayuntamiento de San Pedro Tlaquepaque\nJalisco, México',
      footerEmail: 'ordenamiento@tlaquepaque.gob.mx',
      footerCopyright:
        '© 2026 H. Ayuntamiento de San Pedro Tlaquepaque. Todos los derechos reservados.',
    },
  },
  panel: {
    sidebarFondo: '#ffffff',
    sidebarTexto: '#475066',
    topbarFondo: '#2e3440',
    topbarTexto: '#ffffff',
    colorAcento: '#2563eb',
    adminBg: '#f4f6fb',
    adminLogo: '/ordena/images/tlaquepaque.png',
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

export async function getCustomizations(): Promise<ThemeConfig> {
  try {
    // Columna JSONB de forma dinámica: el tipo en crudo es un objeto plano.
    const rows = await sql<Array<{ config: Record<string, unknown> }>>`
      SELECT config FROM site_customizations WHERE id = 1 LIMIT 1
    `
    if (rows.length === 0 || !rows[0].config || Object.keys(rows[0].config).length === 0) {
      return DEFAULT_THEME_CONFIG
    }
    return deepMerge(DEFAULT_THEME_CONFIG, rows[0].config)
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
  return {
    url: `/api/settings/assets/${uniqueName}`,
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
