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
import type { Handle, RemixNode } from 'remix/ui'

import { Icon } from '../../ui/admin/icon.tsx'
import {
  HERO_IMAGEN_POR_DEFECTO,
  IMAGEN_POR_DEFECTO,
  type ThemeData,
} from '../../ui/civic-horizon.ts'
import { capaDePortada, intensidadDeCapa, type CapaDePortada } from '../../utils/color.ts'
import { textoPlanoDe } from '../../utils/texto-rico.ts'
import {
  coloresDelPortal,
  fotosDeLaPortada,
  iconosDelPortal,
  type ColoresPanel,
  type ColoresPortal,
} from './personalizacion-datos.ts'

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

/**
 * Lo que necesita la maqueta del portal a partir del tema guardado: colores, capa, fotos,
 * imágenes (con la del proyecto cuando no hay una), íconos y textos. La usan la pantalla del
 * portal y la de textos, para que enseñen exactamente lo mismo.
 */
export function propsDeVistaPortal(theme: ThemeData): VistaPortalProps {
  const u = theme?.usuario ?? {}
  const imagenes: Record<string, string> = u.imagenes ?? {}
  const colores = coloresDelPortal(theme)
  const iconos = iconosDelPortal(theme)
  return {
    colores,
    capa: capaDePortada(colores.primario, intensidadDeCapa(u.colores?.heroGradienteInicio)),
    fotos: fotosDeLaPortada(theme, HERO_IMAGEN_POR_DEFECTO),
    logoMenu: imagenes.logoNavbar || IMAGEN_POR_DEFECTO.logo,
    logoPie: imagenes.logoFooter || IMAGEN_POR_DEFECTO.logo,
    imagenEcologia: imagenes.imagenEcologia || IMAGEN_POR_DEFECTO.ecologia,
    imagenPrograma: imagenes.imagenPrograma || IMAGEN_POR_DEFECTO.programa,
    iconos: [iconos.cardPrograma, iconos.cardProceso, iconos.cardCalendario, iconos.cardDocumentos],
    textos: u.textos ?? {},
  }
}

/** Texto del tema: lo guardado si es un texto no vacío, si no el de respaldo. */
function t(textos: Record<string, unknown>, clave: string, respaldo: string): string {
  const valor = textos[clave]
  return typeof valor === 'string' && valor.trim() !== '' ? valor : respaldo
}

/** Los textos de la portada que la maqueta parte o resume: los de respaldo del portal real. */
const TITULO_POR_DEFECTO = 'Bitácora de Ordenamiento Territorial'
const RESALTADO_POR_DEFECTO = 'Ordenamiento Territorial'
const SUBTITULO_POR_DEFECTO =
  'Un espacio público y transparente que reúne información y facilita la participación ciudadana.'

/**
 * Un texto de la maqueta. Lleva su clave (`data-pz-v-texto`) para que la pantalla de textos
 * lo cambie mientras se escribe, y el texto de respaldo (`data-defecto`): un campo vacío
 * muestra en el portal el texto por defecto, y la maqueta debe hacer lo mismo.
 */
function Tx(
  handle: Handle<{
    textos: Record<string, unknown>
    clave: string
    respaldo: string
    class?: string
    zona?: string
  }>,
) {
  return () => {
    const { textos, clave, respaldo, zona } = handle.props
    return (
      <span
        class={handle.props.class}
        data-zona={zona}
        data-pz-v-texto={clave}
        data-defecto={respaldo}
      >
        {t(textos, clave, respaldo)}
      </span>
    )
  }
}

/**
 * El título de la portada tal como lo parte el portal: si contiene la frase destacada, lo que
 * va antes, la frase (en el color de acento y en su propio renglón) y lo que va después; si
 * no la contiene, el título entero y sin destacar. Es la misma regla de `HeroSection`
 * (home-page.tsx), que usa solo la primera parte antes y la segunda después de la frase.
 */
export function partirTitulo(
  titulo: string,
  resaltado: string,
): { antes: string; resaltado: string; despues: string } {
  if (resaltado !== '' && titulo.includes(resaltado)) {
    const partes = titulo.split(resaltado)
    return { antes: partes[0], resaltado, despues: partes[1] ?? '' }
  }
  return { antes: titulo, resaltado: '', despues: '' }
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
    const titulo = partirTitulo(
      t(textos, 'heroTitulo', TITULO_POR_DEFECTO),
      t(textos, 'heroTituloResaltado', RESALTADO_POR_DEFECTO),
    )

    const accesos = [
      { icono: iconos[0], clave: 'fasesTitulo', respaldo: 'Conoce las fases', color: 'primario' },
      {
        icono: iconos[1],
        clave: 'avancesTitulo',
        respaldo: 'Avances del Programa',
        color: 'secundario',
      },
      {
        icono: iconos[2],
        clave: 'calendarioTitulo',
        respaldo: 'Calendario de actividades',
        color: 'acento',
      },
      {
        icono: iconos[3],
        clave: 'seguimientoTitulo',
        respaldo: 'Seguimiento y evaluación',
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
              <Tx textos={textos} clave="navEnlaceInicio" respaldo="Inicio y proceso" />
              <Tx textos={textos} clave="navEnlacePoetdum" respaldo="Elaboración del POETDUM" />
            </span>
            <Tx
              textos={textos}
              clave="navCtaRegistrar"
              respaldo="Registra tu participación"
              class="pz-v-menu__cta"
              zona="primario"
            />
          </div>

          <div class="pz-v-portada" data-zona="portada" data-ir="pz-fotos">
            <div class="pz-v-portada__foto" aria-hidden="true"></div>
            <div class="pz-v-portada__capa" data-zona="capa primario" aria-hidden="true"></div>
            <div class="pz-v-portada__contenido">
              <Tx
                textos={textos}
                clave="heroCintillo"
                respaldo="Bitácora de Ordenamiento Territorial"
                class="pz-v-portada__cintillo"
                zona="acento"
              />
              <strong
                class="pz-v-portada__titulo"
                data-pz-v-titulo
                data-defecto-titulo={TITULO_POR_DEFECTO}
                data-defecto-resaltado={RESALTADO_POR_DEFECTO}
              >
                <span data-pz-v-titulo-antes>{titulo.antes}</span>
                <span class="pz-v-portada__resaltado" data-zona="acento" data-pz-v-resaltado>
                  {titulo.resaltado}
                </span>
                <span data-pz-v-titulo-despues>{titulo.despues}</span>
              </strong>
              <span
                class="pz-v-portada__subtitulo"
                data-pz-v-texto="heroSubtitulo"
                data-defecto={SUBTITULO_POR_DEFECTO}
              >
                {textoPlanoDe(textos.heroSubtitulo as string | undefined) || SUBTITULO_POR_DEFECTO}
              </span>
              <span class="pz-v-portada__botones">
                <Tx
                  textos={textos}
                  clave="heroBtn1"
                  respaldo="Conoce la Bitácora"
                  class="pz-v-boton pz-v-boton--acento"
                  zona="acento"
                />
                <Tx
                  textos={textos}
                  clave="heroBtn2"
                  respaldo="Registra tu participación"
                  class="pz-v-boton pz-v-boton--borde"
                />
              </span>
            </div>
            <span class="pz-v-portada__puntos" data-pz-v-puntos aria-hidden="true"></span>
          </div>

          <div class="pz-v-accesos" data-zona="accesos" data-ir="pz-iconos">
            {accesos.map((a, i) => (
              <span class={`pz-v-acceso pz-v-acceso--${a.color}`} key={a.clave} data-zona={a.color}>
                <span class="pz-v-acceso__icono" data-pz-v-icono={i + 1}>
                  {a.icono}
                </span>
                <Tx
                  textos={textos}
                  clave={a.clave}
                  respaldo={a.respaldo}
                  class="pz-v-acceso__titulo"
                />
                <span class="pz-v-acceso__enlace">Ver más</span>
              </span>
            ))}
          </div>

          <div class="pz-v-seccion" data-zona="secciones" data-ir="pz-imagenes">
            <span class="pz-v-seccion__texto">
              <Tx
                textos={textos}
                clave="queEsTitulo"
                respaldo="Conoce la Bitácora de Ordenamiento Territorial"
                class="pz-v-seccion__titulo"
              />
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
              <Tx
                textos={textos}
                clave="programaTitulo"
                respaldo="¿Qué es el Programa de Ordenamiento?"
                class="pz-v-seccion__titulo"
              />
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
            <Tx
              textos={textos}
              clave="ctaTitulo"
              respaldo="Tu voz transforma el territorio"
              class="pz-v-banda__titulo"
            />
            <Tx
              textos={textos}
              clave="ctaBoton"
              respaldo="Registra tu participación"
              class="pz-v-boton pz-v-boton--acento"
              zona="acento"
            />
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
              <Tx
                textos={textos}
                clave="footerEntidad"
                respaldo="Municipio de San Pedro Tlaquepaque"
                class="pz-v-pie__entidad"
              />
              <Tx textos={textos} clave="footerEmail" respaldo="ordenamiento@tlaquepaque.gob.mx" />
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

// ---------------------------------------------------------------------------
// Columna de la vista previa
// ---------------------------------------------------------------------------

export interface VistaPreviaLateralProps {
  /** Nombre de lo que se ve («Vista previa», «Vista previa del panel»). */
  titulo: string
  /** Etiqueta accesible de la columna. */
  etiqueta: string
  /** Ofrece cambiar entre computadora y teléfono (la maqueta del portal sí lo admite). */
  conDispositivos?: boolean
  /** Qué hace tocar la maqueta; va al pie. */
  pie: string
  /** Enlace al portal publicado bajo la vista previa. */
  enlaceEnVivo?: string
  children?: RemixNode
}

/**
 * La tarjeta de la vista previa con su cabecera: el estado («Igual que lo publicado» o «Con
 * cambios sin guardar», que escribe el script), el cambio de dispositivo y la maqueta. Es
 * plegable: en pantallas estrechas queda fija arriba y se puede reducir a su cabecera.
 */
export function VistaPreviaLateral(handle: Handle<VistaPreviaLateralProps>) {
  return () => {
    const { titulo, etiqueta, conDispositivos, pie, enlaceEnVivo, children } = handle.props
    return (
      <aside class="pz-lateral" aria-label={etiqueta}>
        <div class="pz-lateral__cuerpo">
          <details class="pz-previa" open>
            <summary class="pz-previa__cabecera">
              <span class="pz-previa__titulo">
                <Icon name="mdi:eye-outline" size={17} /> {titulo}
                <span class="pz-previa__vivo" data-pz-estado-vista>
                  Igual que lo publicado
                </span>
              </span>
              {conDispositivos ? (
                <span class="pz-dispositivos" role="group" aria-label="Tamaño de pantalla">
                  <button
                    type="button"
                    class="pz-dispositivo"
                    data-pz-dispositivo="escritorio"
                    aria-pressed="true"
                    title="Ver como en una computadora"
                  >
                    <Icon name="mdi:monitor" size={16} /> Computadora
                  </button>
                  <button
                    type="button"
                    class="pz-dispositivo"
                    data-pz-dispositivo="movil"
                    aria-pressed="false"
                    title="Ver como en un teléfono"
                  >
                    <Icon name="mdi:cellphone" size={16} /> Teléfono
                  </button>
                </span>
              ) : null}
            </summary>
            <div class="pz-previa__marco" aria-hidden="true">
              {children}
            </div>
            <p class="pz-previa__pie">
              <Icon name="mdi:gesture-tap" size={14} /> {pie}
            </p>
          </details>
          {enlaceEnVivo ? (
            <a
              class="pz-lateral__en-vivo"
              href={enlaceEnVivo}
              target="_blank"
              rel="noreferrer"
              data-pz-portal-en-vivo
            >
              <Icon name="mdi:open-in-new" size={14} /> Ver el portal publicado
            </a>
          ) : null}
        </div>
      </aside>
    )
  }
}
