/**
 * Etapa del trámite tal como la ve el panel y el ciudadano.
 *
 * Es DERIVADA de `estado` + `notificado_en`, nunca una columna propia: así no
 * pueden quedar en desacuerdo (una participación marcada "Notificada" sin que
 * el correo haya salido, por ejemplo). Espeja `etapaDe` del backend
 * (`backend/src/services/participations.ts`).
 */
export type Etapa = 'En proceso' | 'Dictaminada' | 'Notificada'

export interface ConEtapa {
  estado: string
  notificado_en?: string | null
}

export function etapaDe(p: ConEtapa): Etapa {
  if (p.notificado_en) return 'Notificada'
  if (p.estado === 'Procedente' || p.estado === 'No procedente') return 'Dictaminada'
  return 'En proceso'
}

export interface EtapaInfo {
  etapa: Etapa
  /** Lo que el admin necesita leer de un vistazo en la tabla. */
  titulo: string
  /** Qué falta por hacer, o nada si el trámite ya cerró. */
  pendiente: string
  /** Qué significa estar en esta etapa; sale como ayuda en el filtro. */
  ayuda: string
  clase: string
  /** Nombre del icono (`mdi:…`), para el componente `Icon`. */
  icono: string
}

export const ETAPAS: Etapa[] = ['En proceso', 'Dictaminada', 'Notificada']

export const INFO_ETAPA: Record<Etapa, EtapaInfo> = {
  'En proceso': {
    etapa: 'En proceso',
    titulo: 'En proceso',
    pendiente: 'Falta dictaminar',
    ayuda: 'Registradas que todavía no tienen dictamen',
    clase: 'etapa--proceso',
    icono: 'mdi:progress-clock',
  },
  Dictaminada: {
    etapa: 'Dictaminada',
    titulo: 'Terminada',
    pendiente: 'Falta avisar al ciudadano',
    ayuda: 'Con dictamen, pero sin avisar todavía al ciudadano',
    clase: 'etapa--dictaminada',
    icono: 'mdi:clipboard-check-outline',
  },
  Notificada: {
    etapa: 'Notificada',
    titulo: 'Datos enviados',
    pendiente: '',
    ayuda: 'Con dictamen y con el correo ya enviado al ciudadano',
    clase: 'etapa--notificada',
    icono: 'mdi:email-check-outline',
  },
}

export function infoEtapa(p: ConEtapa): EtapaInfo {
  return INFO_ETAPA[etapaDe(p)]
}

/** Resultado del dictamen. Es el mismo texto que guarda la columna `estado`. */
export const DICTAMENES = ['Procedente', 'En proceso', 'No procedente'] as const
export type Dictamen = (typeof DICTAMENES)[number]

/**
 * Cuántas participaciones hay en cada etapa y con cada dictamen, tal como las
 * devuelve `GET /api/participations/resumen`. Las etiquetas de los filtros las
 * muestran para que el admin sepa dónde hay trabajo sin tener que abrir cada filtro.
 */
export interface ResumenParticipaciones {
  total: number
  etapas: Record<Etapa, number>
  estados: Record<Dictamen, number>
}

/**
 * Lee el resumen que respondió el backend. Devuelve `null` si trae otra forma
 * (un backend viejo, una respuesta de error): sin cifras confiables la pantalla
 * muestra los filtros sin número, que es mejor que mostrar `NaN` o un cero falso.
 */
export function leerResumen(crudo: unknown): ResumenParticipaciones | null {
  if (!crudo || typeof crudo !== 'object') return null
  const { total, etapas, estados } = crudo as Record<string, unknown>
  const cifra = (v: unknown): number | null =>
    typeof v === 'number' && Number.isFinite(v) && v >= 0 ? v : null
  const totalOk = cifra(total)
  if (totalOk === null || !etapas || typeof etapas !== 'object') return null
  if (!estados || typeof estados !== 'object') return null

  const porEtapa = {} as Record<Etapa, number>
  for (const e of ETAPAS) {
    const n = cifra((etapas as Record<string, unknown>)[e])
    if (n === null) return null
    porEtapa[e] = n
  }
  const porEstado = {} as Record<Dictamen, number>
  for (const d of DICTAMENES) {
    const n = cifra((estados as Record<string, unknown>)[d])
    if (n === null) return null
    porEstado[d] = n
  }
  return { total: totalOk, etapas: porEtapa, estados: porEstado }
}

/** Texto largo de cada paso, para la línea de tiempo del detalle. */
export const PASOS: Array<{ etapa: Etapa; titulo: string; detalle: string }> = [
  {
    etapa: 'En proceso',
    titulo: 'Recibida',
    detalle: 'La participación está registrada con folio y el ciudadano tiene su acuse.',
  },
  {
    etapa: 'Dictaminada',
    titulo: 'Terminada',
    detalle: 'La autoridad ya resolvió si procede o no, y dejó asentado el motivo.',
  },
  {
    etapa: 'Notificada',
    titulo: 'Datos enviados',
    detalle: 'Se envió al ciudadano el correo formal con la resolución.',
  },
]
