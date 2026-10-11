/**
 * Pestaña «Panel administrativo» de Personalización: los colores y la identidad del propio
 * panel, con una maqueta del panel que se repinta en vivo. Funciona igual que la del portal
 * (ver `personalizacion-portal.tsx`): nada se aplica hasta guardar y el resumen de cambios
 * dice qué se va a guardar.
 */
import type { Handle } from 'remix/ui'

import { adminRoutes } from '../../routes.ts'
import { Icon } from '../../ui/admin/icon.tsx'
import { IMAGEN_POR_DEFECTO, type ThemeData } from '../../ui/civic-horizon.ts'
import {
  CAMPOS_COLOR_PANEL,
  MAX_TITULO_PANEL,
  PALETAS_PANEL,
  PARES_CONTRASTE_PANEL,
  RANURA_LOGO_PANEL,
  TITULO_PANEL_POR_DEFECTO,
  coloresDelPanel,
  type ColoresPanel,
} from './personalizacion-datos.ts'
import {
  BarraDeCambios,
  IndicadorContraste,
  SeccionEstudio,
  SeccionGuardar,
  SelectorDeColor,
  SelectorDeImagen,
} from './personalizacion-campos.tsx'
import { VistaPanel } from './personalizacion-vista.tsx'

export interface FormularioPanelProps {
  theme: ThemeData
  /** Nombre de quien está editando, para la maqueta. */
  usuario: string
}

function esIgual(a: ColoresPanel, b: ColoresPanel): boolean {
  return (Object.keys(a) as Array<keyof ColoresPanel>).every((k) => a[k] === b[k])
}

/** Los campos de color agrupados por la parte del panel que pintan. */
const GRUPOS_PANEL: Array<{
  id: string
  titulo: string
  descripcion: string
  icono: string
  claves: Array<keyof ColoresPanel>
}> = [
  {
    id: 'barra',
    titulo: 'Barra superior',
    descripcion: 'La franja con el título de cada pantalla y tu nombre.',
    icono: 'mdi:dock-top',
    claves: ['topbarFondo', 'topbarTexto'],
  },
  {
    id: 'menu',
    titulo: 'Menú lateral',
    descripcion: 'La columna de la izquierda con las secciones del panel.',
    icono: 'mdi:dock-left',
    claves: ['sidebarFondo', 'sidebarTexto'],
  },
  {
    id: 'pantallas',
    titulo: 'Pantallas',
    descripcion: 'El fondo de las pantallas y el color que marca lo activo.',
    icono: 'mdi:view-dashboard-outline',
    claves: ['colorAcento', 'adminBg'],
  },
]

export function FormularioPanel(handle: Handle<FormularioPanelProps>) {
  return () => {
    const { theme, usuario } = handle.props
    const p = theme?.panel ?? {}
    const colores = coloresDelPanel(theme)
    const paletaActiva = PALETAS_PANEL.find((x) => esIgual(x.colores, colores))
    const logo: string = p.adminLogo || IMAGEN_POR_DEFECTO.logo
    const titulo: string = p.adminTitulo || TITULO_PANEL_POR_DEFECTO

    return (
      <form
        class="pz"
        data-pz="panel"
        style={`--pz-fondo-lateral:${colores.sidebarFondo}`}
        method="post"
        action={adminRoutes.personalizacion.index.href()}
        enctype="multipart/form-data"
      >
        <input type="hidden" name="section" value="panel" />
        <input type="hidden" name="tab" value="panel" />

        <div class="pz-estudio">
          <div class="pz-editor">
            <nav class="pz-indice" aria-label="Secciones del editor">
              <a href="#pz-paletas">Paletas</a>
              <a href="#pz-colores">Colores</a>
              <a href="#pz-identidad">Logotipo y título</a>
              <a href="#pz-guardar">Guardar</a>
            </nav>

            <SeccionEstudio
              clave="paletas"
              numero={1}
              titulo="Empieza por una paleta"
              descripcion="Un clic aplica los seis colores del panel. Después puedes ajustar cada uno."
              icono="mdi:palette-swatch-outline"
            >
              <div class="pz-paletas" role="group" aria-label="Paletas de colores del panel">
                {PALETAS_PANEL.map((x) => (
                  <button
                    type="button"
                    key={x.id}
                    class="pz-paleta"
                    data-pz-paleta
                    data-colores={JSON.stringify(x.colores)}
                    aria-pressed={paletaActiva?.id === x.id ? 'true' : 'false'}
                    title={`Aplicar la paleta ${x.nombre}`}
                  >
                    <span
                      class="pz-paleta__mini pz-paleta__mini--panel"
                      aria-hidden="true"
                      style={`--m-lateral-fondo:${x.colores.sidebarFondo};--m-lateral-texto:${x.colores.sidebarTexto};--m-barra-fondo:${x.colores.topbarFondo};--m-barra-texto:${x.colores.topbarTexto};--m-acento:${x.colores.colorAcento};--m-fondo:${x.colores.adminBg}`}
                    >
                      <span class="pz-paleta__lateral">
                        <i></i>
                        <i></i>
                        <i></i>
                      </span>
                      <span class="pz-paleta__barra">
                        <i></i>
                      </span>
                      <span class="pz-paleta__contenido">
                        <i></i>
                        <b></b>
                      </span>
                    </span>
                    <span class="pz-paleta__nombre">{x.nombre}</span>
                    <span class="pz-paleta__descripcion">{x.descripcion}</span>
                    <span class="pz-paleta__marca">
                      <Icon name="mdi:check" size={12} /> En uso
                    </span>
                  </button>
                ))}
              </div>
              <p class="pz-nota" data-pz-paleta-nota hidden>
                <Icon name="mdi:tune-variant" size={14} /> Tus colores son personalizados: no
                coinciden con ninguna paleta.
              </p>
            </SeccionEstudio>

            <SeccionEstudio
              clave="colores"
              numero={2}
              titulo="Colores del panel"
              descripcion="Cambian para todas las personas que usan el panel."
              icono="mdi:palette-outline"
            >
              <div class="pz-grupos-color">
                {GRUPOS_PANEL.map((g) => (
                  <fieldset class="pz-grupo" key={g.id}>
                    <legend class="pz-grupo__titulo">
                      <Icon name={g.icono} size={16} /> {g.titulo}
                    </legend>
                    <p class="pz-grupo__descripcion">{g.descripcion}</p>
                    <div class="pz-grupo__campos">
                      {g.claves.map((clave) => {
                        const campo = CAMPOS_COLOR_PANEL.find((c) => c.clave === clave)!
                        return (
                          <SelectorDeColor
                            key={clave}
                            id={`p-${clave}`}
                            name={campo.name}
                            etiqueta={campo.etiqueta}
                            ayuda={campo.ayuda}
                            valor={colores[clave]}
                            clave={clave}
                            zona={campo.zona}
                          />
                        )
                      })}
                    </div>
                  </fieldset>
                ))}
              </div>
              <div class="pz-contrastes" role="group" aria-label="Legibilidad de los textos">
                <p class="pz-contrastes__titulo">
                  <Icon name="mdi:eye-check-outline" size={16} /> ¿Se lee bien?
                  <small>
                    El texto de las barras y el acento sobre el fondo. Desde 4.5:1 el texto se lee
                    cómodamente; el acento necesita al menos 3:1.
                  </small>
                </p>
                {PARES_CONTRASTE_PANEL.map((par) => (
                  <IndicadorContraste
                    key={par.id}
                    etiqueta={par.etiqueta}
                    texto={colores[par.texto]}
                    fondo={colores[par.fondo]}
                    claveTexto={par.texto}
                    claveFondo={par.fondo}
                    zona={par.zona}
                  />
                ))}
              </div>
            </SeccionEstudio>

            <SeccionEstudio
              clave="identidad"
              numero={3}
              titulo="Logotipo y título"
              descripcion="Lo que se ve en la parte alta del menú lateral."
              icono="mdi:card-account-details-outline"
            >
              <div class="pz-identidad">
                <SelectorDeImagen
                  ranura={RANURA_LOGO_PANEL}
                  url={logo}
                  porDefecto={IMAGEN_POR_DEFECTO.logo}
                />
                <div class="pz-titulo-panel" data-zona="sidebar">
                  <label class="pz-imagen__titulo" for="panel_admin_titulo">
                    Título bajo el logotipo
                  </label>
                  <p class="pz-imagen__donde">Admite dos líneas: usa Enter para separarlas.</p>
                  <textarea
                    id="panel_admin_titulo"
                    name="panel_admin_titulo"
                    rows={2}
                    maxlength={MAX_TITULO_PANEL}
                    value={titulo}
                    data-pz-titulo-panel
                    data-etiqueta="Título del menú lateral"
                    data-zona="sidebar"
                  />
                  <p class="pz-titulo-panel__contador">
                    <span data-pz-contador="panel_admin_titulo">{titulo.length}</span> /{' '}
                    {MAX_TITULO_PANEL} caracteres
                  </p>
                </div>
              </div>
            </SeccionEstudio>

            <SeccionGuardar
              sugerencias={['panel']}
              textoVacio="Todavía no hay cambios. Modifica un color, el logotipo o el título para poder guardar."
              ejemploMotivo="Ej. Cambio de colores del panel de administración"
            />
          </div>

          <aside class="pz-lateral" aria-label="Vista previa del panel">
            <div class="pz-lateral__cuerpo">
              <details class="pz-previa" open>
                <summary class="pz-previa__cabecera">
                  <span class="pz-previa__titulo">
                    <Icon name="mdi:eye-outline" size={17} /> Vista previa del panel
                    <span class="pz-previa__vivo" data-pz-estado-vista>
                      Igual que lo publicado
                    </span>
                  </span>
                </summary>
                <div class="pz-previa__marco" aria-hidden="true">
                  <VistaPanel colores={colores} logo={logo} titulo={titulo} usuario={usuario} />
                </div>
                <p class="pz-previa__pie">
                  <Icon name="mdi:gesture-tap" size={14} /> Toca una parte de la maqueta para ir a
                  lo que la cambia.
                </p>
              </details>
            </div>
          </aside>
        </div>

        <BarraDeCambios />
      </form>
    )
  }
}
