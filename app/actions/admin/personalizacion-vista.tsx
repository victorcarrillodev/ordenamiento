/**
 * Maquetas de la vista previa de Personalización.
 *
 * No son un iframe al sitio real (eso enseñaría lo último que se GUARDÓ, no lo que se está
 * editando): son una réplica reducida del portal y del panel, dibujada solo con variables
 * CSS. El script cambia esas variables en el elemento `.pz-vista` y todo se repinta sin
 * tocar una sola pieza más. Las reglas de color imitan las del portal real: el primer
 * botón de la portada es del color de ACENTO (no del primario), el primario tiñe la capa
 * sobre las fotos y el banner de participación, el secundario pinta el segundo acceso y
 * el final de la línea de las fases.
 *
 * Cada pieza lleva `data-zona`: al enfocar un campo del editor se ilumina lo que pinta, y
 * un clic en la maqueta lleva al campo que lo cambia (`data-ir`).
 */
import type { Handle } from 'remix/ui'

import { Icon } from '../../ui/admin/icon.tsx'
import type { CapaDePortada } from '../../utils/color.ts'
import { textoPlanoDe } from '../../utils/texto-rico.ts'
import type { ColoresPanel, ColoresPortal } from './personalizacion-datos.ts'

// ---------------------------------------------------------------------------
// Portal
// ---------------------------------------------------------------------------

export interface VistaPortalProps {
  colores: ColoresPortal
  capa: CapaDePortada
  fotos: string[]
  logoMenu: string
  logoPie: string
  imagenEcologia: string
  imagenPrograma: string
  /** Emojis de los cuatro accesos, en el orden en que salen en el portal. */
  iconos: [string, string, string, string]
  /** `usuario.textos` del tema guardado (puede traer cualquier forma). */
  textos: Record<string, unknown>
}

/** Texto del tema: lo guardado si es un texto no vacío, si no el de respaldo. */
function t(textos: Record<string, unknown>, clave: string, respaldo: string): string {
  const valor = textos[clave]
  return typeof valor === 'string' && valor.trim() !== '' ? valor : respaldo
}

/** Las variables CSS con las que se pinta la maqueta del portal. */
export function variablesDeVistaPortal(
  c: ColoresPortal,
  capa: CapaDePortada,
  foto: string,
): string {
  return [
    `--v-primario:${c.primario}`,
    `--v-acento:${c.acento}`,
    `--v-secundario:${c.secundario}`,
    `--v-menu-fondo:${c.navbarFondo}`,
    `--v-menu-texto:${c.navbarTexto}`,
    `--v-pie-fondo:${c.footerFondo}`,
    `--v-pie-texto:${c.footerTexto}`,
    `--v-capa-inicio:${capa.inicio}`,
    `--v-capa-centro:${capa.centro}`,
    `--v-capa-fin:${capa.fin}`,
    `--v-foto:url("${foto}")`,
  ].join(';')
}

export function VistaPortal(handle: Handle<VistaPortalProps>) {
  return () => {
    const {
      colores,
      capa,
      fotos,
      logoMenu,
      logoPie,
      imagenEcologia,
      imagenPrograma,
      iconos,
      textos,
    } = handle.props
    const primeraFoto = fotos[0] ?? ''

    const accesos = [
      { icono: iconos[0], titulo: t(textos, 'fasesTitulo', 'Conoce las fases'), color: 'primario' },
      {
        icono: iconos[1],
        titulo: t(textos, 'avancesTitulo', 'Avances del Programa'),
        color: 'secundario',
      },
      {
        icono: iconos[2],
        titulo: t(textos, 'calendarioTitulo', 'Calendario de actividades'),
        color: 'acento',
      },
      {
        icono: iconos[3],
        titulo: t(textos, 'seguimientoTitulo', 'Seguimiento y evaluación'),
        color: 'fijo',
      },
    ]

    return (
      <div
        class="pz-vista pz-vista--portal"
        data-pz-vista="portal"
        data-dispositivo="escritorio"
        style={variablesDeVistaPortal(colores, capa, primeraFoto)}
      >
        <div class="pz-v">
          <div class="pz-v-menu" data-zona="menu" data-ir="pz-colores">
            <img
              class="pz-v-menu__logo"
              src={logoMenu}
              alt=""
              data-pz-v-logo-menu
              data-ir="pz-imagenes"
            />
            <span class="pz-v-menu__enlaces">
              <span>{t(textos, 'navEnlaceInicio', 'Inicio y proceso')}</span>
              <span>{t(textos, 'navEnlacePoetdum', 'Elaboración del POETDUM')}</span>
            </span>
            <span class="pz-v-menu__cta" data-zona="primario">
              {t(textos, 'navCtaRegistrar', 'Registra tu participación')}
            </span>
          </div>

          <div class="pz-v-portada" data-zona="portada" data-ir="pz-fotos">
            <div class="pz-v-portada__foto" aria-hidden="true"></div>
            <div class="pz-v-portada__capa" data-zona="capa primario" aria-hidden="true"></div>
            <div class="pz-v-portada__contenido">
              <span class="pz-v-portada__cintillo" data-zona="acento">
                {t(textos, 'heroCintillo', 'Bitácora de Ordenamiento Territorial')}
              </span>
              <strong class="pz-v-portada__titulo">
                {t(textos, 'heroTitulo', 'Bitácora de Ordenamiento Territorial')}
              </strong>
              <span class="pz-v-portada__resaltado" data-zona="acento">
                {t(textos, 'heroTituloResaltado', 'Ordenamiento Territorial')}
              </span>
              <span class="pz-v-portada__subtitulo">
                {textoPlanoDe(textos.heroSubtitulo as string | undefined) ||
                  'Un espacio público y transparente que reúne información y facilita la participación ciudadana.'}
              </span>
              <span class="pz-v-portada__botones">
                <span class="pz-v-boton pz-v-boton--acento" data-zona="acento">
                  {t(textos, 'heroBtn1', 'Conoce la Bitácora')}
                </span>
                <span class="pz-v-boton pz-v-boton--borde">
                  {t(textos, 'heroBtn2', 'Registra tu participación')}
                </span>
              </span>
            </div>
            <span class="pz-v-portada__puntos" data-pz-v-puntos aria-hidden="true"></span>
          </div>

          <div class="pz-v-accesos" data-zona="accesos" data-ir="pz-iconos">
            {accesos.map((a, i) => (
              <span
                class={`pz-v-acceso pz-v-acceso--${a.color}`}
                key={a.titulo}
                data-zona={a.color}
              >
                <span class="pz-v-acceso__icono" data-pz-v-icono={i + 1}>
                  {a.icono}
                </span>
                <span class="pz-v-acceso__titulo">{a.titulo}</span>
                <span class="pz-v-acceso__enlace">Ver más</span>
              </span>
            ))}
          </div>

          <div class="pz-v-seccion" data-zona="secciones" data-ir="pz-imagenes">
            <span class="pz-v-seccion__texto">
              <strong>
                {t(textos, 'queEsTitulo', 'Conoce la Bitácora de Ordenamiento Territorial')}
              </strong>
              <span class="pz-v-linea"></span>
              <span class="pz-v-linea pz-v-linea--corta"></span>
            </span>
            <img class="pz-v-seccion__imagen" src={imagenEcologia} alt="" data-pz-v-ecologia />
          </div>

          <div
            class="pz-v-seccion pz-v-seccion--inversa"
            data-zona="secciones"
            data-ir="pz-imagenes"
          >
            <img class="pz-v-seccion__imagen" src={imagenPrograma} alt="" data-pz-v-programa />
            <span class="pz-v-seccion__texto">
              <strong>{t(textos, 'programaTitulo', '¿Qué es el Programa de Ordenamiento?')}</strong>
              <span class="pz-v-linea"></span>
              <span class="pz-v-linea pz-v-linea--corta"></span>
            </span>
          </div>

          <div class="pz-v-fases" data-zona="primario acento secundario" data-ir="pz-colores">
            <span class="pz-v-fases__linea" aria-hidden="true"></span>
            <span class="pz-v-fases__pasos" aria-hidden="true">
              <i></i>
              <i></i>
              <i></i>
              <i></i>
              <i></i>
            </span>
          </div>

          <div class="pz-v-banda" data-zona="capa primario" data-ir="pz-fotos">
            <strong>{t(textos, 'ctaTitulo', 'Tu voz transforma el territorio')}</strong>
            <span class="pz-v-boton pz-v-boton--acento" data-zona="acento">
              {t(textos, 'ctaBoton', 'Registra tu participación')}
            </span>
          </div>

          <div class="pz-v-pie" data-zona="pie" data-ir="pz-colores">
            <img
              class="pz-v-pie__logo"
              src={logoPie}
              alt=""
              data-pz-v-logo-pie
              data-ir="pz-imagenes"
            />
            <span class="pz-v-pie__datos">
              <strong>{t(textos, 'footerEntidad', 'Municipio de San Pedro Tlaquepaque')}</strong>
              <span>{t(textos, 'footerEmail', 'ordenamiento@tlaquepaque.gob.mx')}</span>
            </span>
          </div>
        </div>
      </div>
    )
  }
}

// ---------------------------------------------------------------------------
// Panel
// ---------------------------------------------------------------------------

export interface VistaPanelProps {
  colores: ColoresPanel
  logo: string
  titulo: string
  usuario: string
}

export function variablesDeVistaPanel(c: ColoresPanel): string {
  return [
    `--v-lateral-fondo:${c.sidebarFondo}`,
    `--v-lateral-texto:${c.sidebarTexto}`,
    `--v-barra-fondo:${c.topbarFondo}`,
    `--v-barra-texto:${c.topbarTexto}`,
    `--v-acento:${c.colorAcento}`,
    `--v-fondo:${c.adminBg}`,
  ].join(';')
}

export function VistaPanel(handle: Handle<VistaPanelProps>) {
  return () => {
    const { colores, logo, titulo, usuario } = handle.props
    return (
      <div
        class="pz-vista pz-vista--panel"
        data-pz-vista="panel"
        style={variablesDeVistaPanel(colores)}
      >
        <div class="pz-vp">
          <aside class="pz-vp__lateral" data-zona="sidebar" data-ir="pz-colores">
            <span class="pz-vp__marca" data-ir="pz-identidad">
              <img src={logo} alt="" data-pz-vp-logo />
              <span class="pz-vp__titulo" data-pz-vp-titulo>
                {titulo}
              </span>
            </span>
            <span class="pz-vp__grupo">Panel</span>
            <span class="pz-vp__item pz-vp__item--activo" data-zona="acento">
              <Icon name="mdi:view-dashboard-outline" size={12} /> Vista general
            </span>
            <span class="pz-vp__item">
              <Icon name="mdi:chart-bar" size={12} /> Estadísticas
            </span>
            <span class="pz-vp__grupo">Participación</span>
            <span class="pz-vp__item">
              <Icon name="mdi:laptop" size={12} /> Digitales
            </span>
            <span class="pz-vp__item">
              <Icon name="mdi:clipboard-text-outline" size={12} /> Físicas
            </span>
          </aside>
          <div class="pz-vp__principal" data-zona="fondo" data-ir="pz-colores">
            <div class="pz-vp__barra" data-zona="topbar">
              <strong>Vista general</strong>
              <span class="pz-vp__usuario">{usuario}</span>
            </div>
            <div class="pz-vp__contenido">
              <div class="pz-vp__tarjetas">
                <span class="pz-vp__tarjeta">
                  <strong>128</strong>
                  <small>Digitales</small>
                </span>
                <span class="pz-vp__tarjeta">
                  <strong>46</strong>
                  <small>Físicas</small>
                </span>
                <span class="pz-vp__tarjeta">
                  <strong>12</strong>
                  <small>En proceso</small>
                </span>
              </div>
              <div class="pz-vp__panel">
                <span class="pz-vp__pestanas">
                  <span class="pz-vp__pestana pz-vp__pestana--activa" data-zona="acento">
                    Lista
                  </span>
                  <span class="pz-vp__pestana">Calendario</span>
                </span>
                <span class="pz-v-linea"></span>
                <span class="pz-v-linea"></span>
                <span class="pz-v-linea pz-v-linea--corta"></span>
                <span class="pz-vp__boton" data-zona="topbar">
                  Agregar
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }
}
