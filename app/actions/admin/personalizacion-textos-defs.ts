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
      { key: 'navbarTitulo', name: 'txt_navbar_titulo', label: 'Título del portal (aria-label de la marca)', rows: 2 },
      { key: 'navEnlaceInicio', name: 'txt_nav_enlace_inicio', label: 'Enlace «Inicio y proceso»', rows: 1 },
      { key: 'navEnlacePoetdum', name: 'txt_nav_enlace_poetdum', label: 'Enlace «Elaboración del POETDUM»', rows: 1 },
      { key: 'navCtaRegistrar', name: 'txt_nav_cta_registrar', label: 'Botón «Registra tu participación»', rows: 1 },
    ],
  },
  {
    id: 'hero',
    titulo: 'Portada (Hero)',
    campos: [
      { key: 'heroCintillo', name: 'txt_hero_cintillo', label: 'Cintillo superior', rows: 2 },
      { key: 'heroTitulo', name: 'txt_hero_titulo', label: 'Título principal', rows: 2 },
      { key: 'heroTituloResaltado', name: 'txt_hero_resaltado', label: 'Frase resaltada en oro', rows: 2 },
      { key: 'heroSubtitulo', name: 'txt_hero_subtitulo', label: 'Subtítulo descriptivo', rows: 4, full: true },
      { key: 'heroBtn1', name: 'txt_hero_btn1', label: 'Texto botón principal', rows: 1 },
      { key: 'heroBtn2', name: 'txt_hero_btn2', label: 'Texto botón participar', rows: 1 },
      { key: 'heroScrollIndicador', name: 'txt_hero_scroll', label: 'Indicador de scroll («Explorar»)', rows: 1 },
    ],
  },
  {
    id: 'que-es',
    titulo: '¿Qué es este sitio?',
    campos: [
      { key: 'queEsCintillo', name: 'txt_que_es_cintillo', label: 'Cintillo de sección', rows: 1 },
      { key: 'queEsTitulo', name: 'txt_que_es_titulo', label: 'Título de sección', rows: 3 },
      { key: 'queEsParrafo1', name: 'txt_que_es_parrafo1', label: 'Párrafo 1', rows: 4, full: true },
      { key: 'queEsParrafo2', name: 'txt_que_es_parrafo2', label: 'Párrafo 2', rows: 5, full: true },
      { key: 'queEsBullet1', name: 'txt_que_es_bullet1', label: 'Viñeta 1', rows: 2 },
      { key: 'queEsBullet2', name: 'txt_que_es_bullet2', label: 'Viñeta 2', rows: 2 },
      { key: 'queEsBullet3', name: 'txt_que_es_bullet3', label: 'Viñeta 3', rows: 2 },
      { key: 'queEsBullet4', name: 'txt_que_es_bullet4', label: 'Viñeta 4', rows: 2 },
      { key: 'queEsPieImagen', name: 'txt_que_es_pie_imagen', label: 'Pie de imagen', rows: 1 },
    ],
  },
  {
    id: 'tarjetas',
    titulo: 'Tarjetas de acción',
    campos: [
      { key: 'tarjetasEyebrow', name: 'txt_tarjetas_eyebrow', label: 'Antetítulo de la sección', rows: 1 },
      { key: 'tarjetasTitulo', name: 'txt_tarjetas_titulo', label: 'Título de la sección', rows: 3 },
      { key: 'card1Eyebrow', name: 'txt_card1_eyebrow', label: 'Tarjeta 1 · antetítulo', rows: 1 },
      { key: 'card1Titulo', name: 'txt_card1_titulo', label: 'Tarjeta 1 · título', rows: 1 },
      { key: 'card1Desc', name: 'txt_card1_desc', label: 'Tarjeta 1 · descripción', rows: 3, full: true },
      { key: 'card1Cta', name: 'txt_card1_cta', label: 'Tarjeta 1 · enlace', rows: 1 },
      { key: 'card2Eyebrow', name: 'txt_card2_eyebrow', label: 'Tarjeta 2 · antetítulo', rows: 1 },
      { key: 'card2Titulo', name: 'txt_card2_titulo', label: 'Tarjeta 2 · título', rows: 1 },
      { key: 'card2Desc', name: 'txt_card2_desc', label: 'Tarjeta 2 · descripción', rows: 3, full: true },
      { key: 'card2Cta', name: 'txt_card2_cta', label: 'Tarjeta 2 · enlace', rows: 1 },
      { key: 'card3Eyebrow', name: 'txt_card3_eyebrow', label: 'Tarjeta 3 · antetítulo', rows: 1 },
      { key: 'card3Titulo', name: 'txt_card3_titulo', label: 'Tarjeta 3 · título', rows: 1 },
      { key: 'card3Desc', name: 'txt_card3_desc', label: 'Tarjeta 3 · descripción', rows: 3, full: true },
      { key: 'card3Cta', name: 'txt_card3_cta', label: 'Tarjeta 3 · enlace', rows: 1 },
      { key: 'card4Eyebrow', name: 'txt_card4_eyebrow', label: 'Tarjeta 4 · antetítulo', rows: 1 },
      { key: 'card4Titulo', name: 'txt_card4_titulo', label: 'Tarjeta 4 · título', rows: 1 },
      { key: 'card4Desc', name: 'txt_card4_desc', label: 'Tarjeta 4 · descripción', rows: 3, full: true },
      { key: 'card4Cta', name: 'txt_card4_cta', label: 'Tarjeta 4 · enlace', rows: 1 },
    ],
  },
  {
    id: 'programa',
    titulo: '¿Qué es el Programa?',
    campos: [
      { key: 'programaTitulo', name: 'txt_programa_titulo', label: 'Título de la sección', rows: 3 },
      { key: 'programaParrafo1', name: 'txt_programa_parrafo1', label: 'Párrafo 1', rows: 4, full: true },
      { key: 'programaParrafo2', name: 'txt_programa_parrafo2', label: 'Párrafo 2', rows: 4, full: true },
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
      { key: 'timelineEyebrow', name: 'txt_timeline_eyebrow', label: 'Antetítulo de la sección', rows: 1 },
      { key: 'timelineTitulo', name: 'txt_timeline_titulo', label: 'Título de la sección', rows: 3 },
      { key: 'timelinePaso1Titulo', name: 'txt_timeline_paso1_titulo', label: 'Paso 1 · título', rows: 1 },
      { key: 'timelinePaso1Desc', name: 'txt_timeline_paso1_desc', label: 'Paso 1 · descripción', rows: 3, full: true },
      { key: 'timelinePaso2Titulo', name: 'txt_timeline_paso2_titulo', label: 'Paso 2 · título', rows: 1 },
      { key: 'timelinePaso2Desc', name: 'txt_timeline_paso2_desc', label: 'Paso 2 · descripción', rows: 3, full: true },
      { key: 'timelinePaso3Titulo', name: 'txt_timeline_paso3_titulo', label: 'Paso 3 · título', rows: 1 },
      { key: 'timelinePaso3Desc', name: 'txt_timeline_paso3_desc', label: 'Paso 3 · descripción', rows: 3, full: true },
      { key: 'timelinePaso4Titulo', name: 'txt_timeline_paso4_titulo', label: 'Paso 4 · título', rows: 1 },
      { key: 'timelinePaso4Desc', name: 'txt_timeline_paso4_desc', label: 'Paso 4 · descripción', rows: 3, full: true },
      { key: 'timelinePaso5Titulo', name: 'txt_timeline_paso5_titulo', label: 'Paso 5 · título', rows: 1 },
      { key: 'timelinePaso5Desc', name: 'txt_timeline_paso5_desc', label: 'Paso 5 · descripción', rows: 3, full: true },
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
    id: 'reuniones',
    titulo: 'Calendario de reuniones (portada)',
    campos: [
      { key: 'reunionesEyebrow', name: 'txt_reuniones_eyebrow', label: 'Antetítulo de la sección', rows: 1 },
      { key: 'reunionesTitulo', name: 'txt_reuniones_titulo', label: 'Título de la sección', rows: 2 },
      { key: 'reunionesPanelVacio', name: 'txt_reuniones_panel_vacio', label: 'Panel derecho · aviso «selecciona un día»', rows: 2 },
    ],
  },
  {
    id: 'footer',
    titulo: 'Pie de página (Footer)',
    campos: [
      { key: 'footerEntidad', name: 'txt_footer_entidad', label: 'Nombre de la entidad / municipio', rows: 1 },
      { key: 'footerDesc', name: 'txt_footer_desc', label: 'Descripción del portal', rows: 4, full: true },
      { key: 'footerContacto', name: 'txt_footer_contacto', label: 'Dirección y datos de contacto', rows: 3, full: true },
      { key: 'footerEmail', name: 'txt_footer_email', label: 'Correo de contacto oficial', rows: 1 },
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
