export interface CampoTexto {
  key: string
  name: string
  label: string
  rows: number
  full?: boolean
}

export interface GrupoTextos {
  id: string
  titulo: string
  campos: CampoTexto[]
}

export const GRUPOS_TEXTOS: GrupoTextos[] = [
  {
    id: 'navbar',
    titulo: 'Barra de navegación',
    campos: [
      {
        key: 'navbarTitulo',
        name: 'txt_navbar_titulo',
        label: 'Título del portal (aria-label de la marca)',
        rows: 2,
      },
      {
        key: 'navEnlaceInicio',
        name: 'txt_nav_enlace_inicio',
        label: 'Enlace «Inicio y proceso»',
        rows: 1,
      },
      {
        key: 'navEnlacePoetdum',
        name: 'txt_nav_enlace_poetdum',
        label: 'Enlace «Elaboración del POETDUM»',
        rows: 1,
      },
      {
        key: 'navCtaRegistrar',
        name: 'txt_nav_cta_registrar',
        label: 'Botón «Registra tu participación»',
        rows: 1,
      },
    ],
  },
  {
    id: 'hero',
    titulo: 'Portada (Hero)',
    campos: [
      { key: 'heroCintillo', name: 'txt_hero_cintillo', label: 'Cintillo superior', rows: 2 },
      { key: 'heroTitulo', name: 'txt_hero_titulo', label: 'Título principal', rows: 2 },
      {
        key: 'heroTituloResaltado',
        name: 'txt_hero_resaltado',
        label: 'Frase resaltada en oro',
        rows: 2,
      },
      {
        key: 'heroSubtitulo',
        name: 'txt_hero_subtitulo',
        label: 'Subtítulo descriptivo',
        rows: 4,
        full: true,
      },
      { key: 'heroBtn1', name: 'txt_hero_btn1', label: 'Texto botón principal', rows: 1 },
      { key: 'heroBtn2', name: 'txt_hero_btn2', label: 'Texto botón participar', rows: 1 },
      {
        key: 'heroScrollIndicador',
        name: 'txt_hero_scroll',
        label: 'Indicador de scroll («Explorar»)',
        rows: 1,
      },
    ],
  },
  {
    id: 'que-es',
    titulo: '¿Qué es este sitio?',
    campos: [
      { key: 'queEsCintillo', name: 'txt_que_es_cintillo', label: 'Cintillo de sección', rows: 1 },
      { key: 'queEsTitulo', name: 'txt_que_es_titulo', label: 'Título de sección', rows: 3 },
      {
        key: 'queEsParrafo1',
        name: 'txt_que_es_parrafo1',
        label: 'Párrafo 1',
        rows: 4,
        full: true,
      },
      {
        key: 'queEsParrafo2',
        name: 'txt_que_es_parrafo2',
        label: 'Párrafo 2',
        rows: 5,
        full: true,
      },
      { key: 'queEsBullet1', name: 'txt_que_es_bullet1', label: 'Viñeta 1', rows: 2 },
      { key: 'queEsBullet2', name: 'txt_que_es_bullet2', label: 'Viñeta 2', rows: 2 },
      { key: 'queEsBullet3', name: 'txt_que_es_bullet3', label: 'Viñeta 3', rows: 2 },
      { key: 'queEsBullet4', name: 'txt_que_es_bullet4', label: 'Viñeta 4', rows: 2 },
      { key: 'queEsPieImagen', name: 'txt_que_es_pie_imagen', label: 'Pie de imagen', rows: 1 },
    ],
  },
  {
    id: 'informacion',
    titulo: 'Sobre el Programa · Información y avances',
    campos: [
      { key: 'infoEyebrow', name: 'txt_info_eyebrow', label: 'Antetítulo de la sección', rows: 1 },
      { key: 'infoTitulo', name: 'txt_info_titulo', label: 'Título de la sección', rows: 2 },
      {
        key: 'infoDescripcion',
        name: 'txt_info_descripcion',
        label: 'Descripción de la sección',
        rows: 3,
        full: true,
      },
      {
        key: 'fasesEyebrow',
        name: 'txt_fases_eyebrow',
        label: 'Conoce las fases · antetítulo',
        rows: 1,
      },
      { key: 'fasesTitulo', name: 'txt_fases_titulo', label: 'Conoce las fases · título', rows: 1 },
      {
        key: 'fasesDesc',
        name: 'txt_fases_desc',
        label: 'Conoce las fases · descripción',
        rows: 3,
        full: true,
      },
      { key: 'fasesCta', name: 'txt_fases_cta', label: 'Conoce las fases · enlace', rows: 1 },
      {
        key: 'avancesEyebrow',
        name: 'txt_avances_eyebrow',
        label: 'Avances · antetítulo',
        rows: 1,
      },
      { key: 'avancesTitulo', name: 'txt_avances_titulo', label: 'Avances · título', rows: 1 },
      {
        key: 'avancesDesc',
        name: 'txt_avances_desc',
        label: 'Avances · descripción',
        rows: 3,
        full: true,
      },
      { key: 'avancesCta', name: 'txt_avances_cta', label: 'Avances · enlace', rows: 1 },
      {
        key: 'calendarioEyebrow',
        name: 'txt_calendario_eyebrow',
        label: 'Calendario · antetítulo',
        rows: 1,
      },
      {
        key: 'calendarioTitulo',
        name: 'txt_calendario_titulo',
        label: 'Calendario · título',
        rows: 1,
      },
      {
        key: 'calendarioDesc',
        name: 'txt_calendario_desc',
        label: 'Calendario · descripción',
        rows: 3,
        full: true,
      },
      { key: 'calendarioCta', name: 'txt_calendario_cta', label: 'Calendario · enlace', rows: 1 },
      {
        key: 'seguimientoEyebrow',
        name: 'txt_seguimiento_eyebrow',
        label: 'Seguimiento · antetítulo',
        rows: 1,
      },
      {
        key: 'seguimientoTitulo',
        name: 'txt_seguimiento_titulo',
        label: 'Seguimiento · título',
        rows: 1,
      },
      {
        key: 'seguimientoDesc',
        name: 'txt_seguimiento_desc',
        label: 'Seguimiento · descripción (Programa aprobado)',
        rows: 3,
        full: true,
      },
      {
        key: 'seguimientoDescPendiente',
        name: 'txt_seguimiento_desc_pendiente',
        label: 'Seguimiento · descripción (en elaboración)',
        rows: 3,
        full: true,
      },
      {
        key: 'seguimientoCta',
        name: 'txt_seguimiento_cta',
        label: 'Seguimiento · enlace (Programa aprobado)',
        rows: 1,
      },
      {
        key: 'seguimientoCtaPendiente',
        name: 'txt_seguimiento_cta_pendiente',
        label: 'Seguimiento · leyenda (en elaboración)',
        rows: 1,
      },
    ],
  },
  {
    id: 'programa',
    titulo: '¿Qué es el Programa?',
    campos: [
      {
        key: 'programaTitulo',
        name: 'txt_programa_titulo',
        label: 'Título de la sección',
        rows: 3,
      },
      {
        key: 'programaParrafo1',
        name: 'txt_programa_parrafo1',
        label: 'Párrafo 1',
        rows: 4,
        full: true,
      },
      {
        key: 'programaParrafo2',
        name: 'txt_programa_parrafo2',
        label: 'Párrafo 2',
        rows: 4,
        full: true,
      },
      {
        key: 'programaParrafo3',
        name: 'txt_programa_parrafo3',
        label: 'Párrafo 3 (después de las preguntas)',
        rows: 4,
        full: true,
      },
      { key: 'programaPregunta1', name: 'txt_programa_pregunta1', label: 'Pregunta 1', rows: 2 },
      { key: 'programaPregunta2', name: 'txt_programa_pregunta2', label: 'Pregunta 2', rows: 2 },
      { key: 'programaPregunta3', name: 'txt_programa_pregunta3', label: 'Pregunta 3', rows: 2 },
      { key: 'programaPregunta4', name: 'txt_programa_pregunta4', label: 'Pregunta 4', rows: 2 },
    ],
  },
  {
    id: 'timeline',
    titulo: 'Proceso (Timeline)',
    campos: [
      {
        key: 'timelineEyebrow',
        name: 'txt_timeline_eyebrow',
        label: 'Antetítulo de la sección',
        rows: 1,
      },
      {
        key: 'timelineTitulo',
        name: 'txt_timeline_titulo',
        label: 'Título de la sección',
        rows: 3,
      },
      {
        key: 'timelinePaso1Titulo',
        name: 'txt_timeline_paso1_titulo',
        label: 'Paso 1 · título',
        rows: 1,
      },
      {
        key: 'timelinePaso1Desc',
        name: 'txt_timeline_paso1_desc',
        label: 'Paso 1 · descripción',
        rows: 3,
        full: true,
      },
      {
        key: 'timelinePaso2Titulo',
        name: 'txt_timeline_paso2_titulo',
        label: 'Paso 2 · título',
        rows: 1,
      },
      {
        key: 'timelinePaso2Desc',
        name: 'txt_timeline_paso2_desc',
        label: 'Paso 2 · descripción',
        rows: 3,
        full: true,
      },
      {
        key: 'timelinePaso3Titulo',
        name: 'txt_timeline_paso3_titulo',
        label: 'Paso 3 · título',
        rows: 1,
      },
      {
        key: 'timelinePaso3Desc',
        name: 'txt_timeline_paso3_desc',
        label: 'Paso 3 · descripción',
        rows: 3,
        full: true,
      },
      {
        key: 'timelinePaso4Titulo',
        name: 'txt_timeline_paso4_titulo',
        label: 'Paso 4 · título',
        rows: 1,
      },
      {
        key: 'timelinePaso4Desc',
        name: 'txt_timeline_paso4_desc',
        label: 'Paso 4 · descripción',
        rows: 3,
        full: true,
      },
      {
        key: 'timelinePaso5Titulo',
        name: 'txt_timeline_paso5_titulo',
        label: 'Paso 5 · título',
        rows: 1,
      },
      {
        key: 'timelinePaso5Desc',
        name: 'txt_timeline_paso5_desc',
        label: 'Paso 5 · descripción',
        rows: 3,
        full: true,
      },
    ],
  },
  {
    id: 'cta',
    titulo: 'Llamado a participar (CTA)',
    campos: [
      { key: 'ctaEyebrow', name: 'txt_cta_eyebrow', label: 'Antetítulo', rows: 1 },
      { key: 'ctaTitulo', name: 'txt_cta_titulo', label: 'Título', rows: 3 },
      { key: 'ctaParrafo', name: 'txt_cta_parrafo', label: 'Párrafo', rows: 4, full: true },
      { key: 'ctaBoton', name: 'txt_cta_boton', label: 'Texto del botón', rows: 1 },
    ],
  },
  {
    id: 'proximas',
    titulo: 'Próximas actividades (portada)',
    campos: [
      {
        key: 'proximasTitulo',
        name: 'txt_proximas_titulo',
        label: 'Título de la sección',
        rows: 1,
      },
      {
        key: 'proximasSubtitulo',
        name: 'txt_proximas_subtitulo',
        label: 'Subtítulo de la sección',
        rows: 2,
      },
      {
        key: 'proximasBoton',
        name: 'txt_proximas_boton',
        label: 'Botón «Ver todas las actividades»',
        rows: 1,
      },
      {
        key: 'proximasVacio',
        name: 'txt_proximas_vacio',
        label: 'Mensaje cuando no hay actividades programadas',
        rows: 3,
        full: true,
      },
    ],
  },
  {
    id: 'aviso',
    titulo: 'Franja de avisos (portada)',
    campos: [
      {
        key: 'avisoEtiqueta',
        name: 'txt_aviso_etiqueta',
        label: 'Identificación de la franja',
        rows: 1,
      },
      { key: 'avisoBoton', name: 'txt_aviso_boton', label: 'Botón «Ver aviso»', rows: 1 },
    ],
  },
  {
    id: 'footer',
    titulo: 'Pie de página (Footer)',
    campos: [
      {
        key: 'footerEntidad',
        name: 'txt_footer_entidad',
        label: 'Nombre de la entidad / municipio',
        rows: 1,
      },
      {
        key: 'footerDesc',
        name: 'txt_footer_desc',
        label: 'Descripción del portal',
        rows: 4,
        full: true,
      },
      {
        key: 'footerContacto',
        name: 'txt_footer_contacto',
        label: 'Dirección y datos de contacto',
        rows: 3,
        full: true,
      },
      {
        key: 'footerEmail',
        name: 'txt_footer_email',
        label: 'Correo de contacto oficial',
        rows: 1,
      },
      { key: 'footerCopyright', name: 'txt_footer_copyright', label: 'Aviso de derechos', rows: 1 },
      { key: 'footerFirma', name: 'txt_footer_firma', label: 'Firma del portal', rows: 1 },
    ],
  },
]

export function textosDeFormData(formData: FormData): Record<string, string> {
  const textos: Record<string, string> = {}
  for (const grupo of GRUPOS_TEXTOS) {
    for (const campo of grupo.campos) {
      textos[campo.key] = String(formData.get(campo.name) ?? '')
    }
  }
  return textos
}
