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
  clase: string
  icono: string
}

export const ETAPAS: Etapa[] = ['En proceso', 'Dictaminada', 'Notificada']

export const INFO_ETAPA: Record<Etapa, EtapaInfo> = {
  'En proceso': {
    etapa: 'En proceso',
    titulo: 'En proceso',
    pendiente: 'Falta dictaminar',
    clase: 'etapa--proceso',
    icono: '⏳',
  },
  Dictaminada: {
    etapa: 'Dictaminada',
    titulo: 'Terminada',
    pendiente: 'Falta avisar al ciudadano',
    clase: 'etapa--dictaminada',
    icono: '◐',
  },
  Notificada: {
    etapa: 'Notificada',
    titulo: 'Datos enviados',
    pendiente: '',
    clase: 'etapa--notificada',
    icono: '✓',
  },
}

export function infoEtapa(p: ConEtapa): EtapaInfo {
  return INFO_ETAPA[etapaDe(p)]
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
