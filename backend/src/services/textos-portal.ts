/**
 * «Textos del portal» que admiten formato (negritas y alineación del párrafo).
 *
 * Son los textos de párrafo: descripciones, párrafos y mensajes. Los títulos,
 * etiquetas, botones y enlaces quedan como texto plano, porque su aspecto lo
 * decide el diseño de la página (un botón no se justifica ni lleva negritas
 * sueltas). El panel marca los mismos con `rico` en
 * `app/actions/admin/personalizacion-textos-defs.ts`; una prueba de contrato
 * vigila que las dos listas no se separen.
 */
import { canonizarTextoRico, LIMITE_TEXTO_RICO } from './texto-rico.ts'

export const CLAVES_TEXTO_RICO = [
  'heroSubtitulo',
  'queEsParrafo1',
  'queEsParrafo2',
  'infoDescripcion',
  'fasesDesc',
  'avancesDesc',
  'calendarioDesc',
  'seguimientoDesc',
  'seguimientoDescPendiente',
  'programaParrafo1',
  'programaParrafo2',
  'programaParrafo3',
  'timelinePaso1Desc',
  'timelinePaso2Desc',
  'timelinePaso3Desc',
  'timelinePaso4Desc',
  'timelinePaso5Desc',
  'ctaParrafo',
  'proximasVacio',
  'footerDesc',
  'footerContacto',
] as const

const CON_FORMATO = new Set<string>(CLAVES_TEXTO_RICO)

export const esTextoConFormato = (clave: string): boolean => CON_FORMATO.has(clave)

/**
 * Deja canónicos los textos con formato de una configuración antes de guardarla:
 * el navegador manda el HTML de su editor (o texto plano) y se guarda solo lo
 * que el portal sabe dibujar, con el tope de caracteres visibles. El resto de
 * la configuración pasa igual y la original no se modifica.
 */
export function canonizarTextosConFormato<T extends object>(config: T): T {
  const { usuario } = config as { usuario?: { textos?: Record<string, unknown> } }
  const textos = usuario?.textos
  if (!textos || typeof textos !== 'object') return config

  const canonicos: Record<string, unknown> = { ...textos }
  for (const clave of CLAVES_TEXTO_RICO) {
    const valor = canonicos[clave]
    if (typeof valor === 'string') canonicos[clave] = canonizarTextoRico(valor, LIMITE_TEXTO_RICO)
  }
  return { ...config, usuario: { ...usuario, textos: canonicos } }
}
