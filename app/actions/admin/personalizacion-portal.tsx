/**
 * Pestaña «Portal ciudadano» de Personalización: el editor (a la izquierda) y la maqueta del
 * portal que se repinta en vivo (a la derecha).
 *
 * Nada de lo que se cambia aquí se publica hasta guardar: la maqueta enseña cómo quedaría y
 * el resumen de cambios dice exactamente qué se va a guardar. El comportamiento está en
 * `public/personalizacion.js`; este archivo solo produce el HTML (que ya es un formulario
 * válido sin JavaScript).
 */
import type { Handle } from 'remix/ui'

import { adminRoutes, routes } from '../../routes.ts'
import { Icon } from '../../ui/admin/icon.tsx'
import {
  HERO_IMAGEN_POR_DEFECTO,
  IMAGEN_POR_DEFECTO,
  type ThemeData,
} from '../../ui/civic-horizon.ts'
import { intensidadDeCapa, CAPA_MAX, CAPA_MIN } from '../../utils/color.ts'
import {
  GRUPOS_COLOR_PORTAL,
  ICONOS_PORTAL,
  PALETAS_PORTAL,
  PARES_CONTRASTE_PORTAL,
  RANURAS_IMAGEN_PORTAL,
  SEGUNDOS_POR_FOTO,
  coloresDelPortal,
  fotosDeLaPortada,
  iconosDelPortal,
  type ColoresPortal,
  type RanuraImagen,
} from './personalizacion-datos.ts'
import {
  BarraDeCambios,
  IndicadorContraste,
  SeccionEstudio,
  SeccionGuardar,
  SelectorDeColor,
  SelectorDeImagen,
} from './personalizacion-campos.tsx'
import { VistaPortal, VistaPreviaLateral, propsDeVistaPortal } from './personalizacion-vista.tsx'
import { GRUPOS_TEXTOS } from './personalizacion-textos-defs.ts'

/** Lo que se ve cuando una imagen queda vacía: la que trae el proyecto. */
const DEFECTO_DE_IMAGEN: Record<RanuraImagen['clave'], string> = {
  logoNavbar: IMAGEN_POR_DEFECTO.logo,
  logoFooter: IMAGEN_POR_DEFECTO.logo,
  imagenEcologia: IMAGEN_POR_DEFECTO.ecologia,
  imagenPrograma: IMAGEN_POR_DEFECTO.programa,
  adminLogo: IMAGEN_POR_DEFECTO.logo,
}

export interface FormularioPortalProps {
  theme: ThemeData
}

/** ¿Estos colores son exactamente los de la paleta? */
function esIgual(a: ColoresPortal, b: ColoresPortal): boolean {
  return (Object.keys(a) as Array<keyof ColoresPortal>).every((k) => a[k] === b[k])
}

function FilaDeFoto(handle: Handle<{ url: string; n: number }>) {
  return () => {
    const { url, n } = handle.props
    return (
      <li class="pz-foto" data-pz-foto>
        <span class="pz-foto__orden" data-pz-foto-n>
          {n}
        </span>
        <span class="pz-foto__miniatura">
          {/* Sin dirección no hay <img>: una imagen sin `src` es una pieza rota; el script la
              crea cuando se escribe una dirección. */}
          {url ? <img src={url} alt="" data-pz-foto-img /> : null}
        </span>
        <input
          type="text"
          name="hero_imagenes[]"
          value={url}
          placeholder="/ruta/del/sitio.webp o https://…"
          class="pz-foto__url"
          aria-label={`Dirección de la foto ${n}`}
          data-pz-url-foto
          inputmode="url"
          autocomplete="off"
          spellcheck={false}
        />
        <span class="pz-foto__acciones">
          <button
            type="button"
            class="pz-foto__mover"
            data-pz-foto-accion="subir"
            title="Subir esta foto en el orden del carrusel"
            aria-label="Subir esta foto en el orden del carrusel"
          >
            <Icon name="mdi:arrow-up" size={16} />
          </button>
          <button
            type="button"
            class="pz-foto__mover"
            data-pz-foto-accion="bajar"
            title="Bajar esta foto en el orden del carrusel"
            aria-label="Bajar esta foto en el orden del carrusel"
          >
            <Icon name="mdi:arrow-down" size={16} />
          </button>
          <button
            type="button"
            class="btn btn--peligro btn--sm"
            data-pz-foto-accion="quitar"
            title="Quitar esta foto del carrusel"
          >
            <Icon name="mdi:trash-can-outline" size={15} /> Quitar
          </button>
        </span>
      </li>
    )
  }
}

export function FormularioPortal(handle: Handle<FormularioPortalProps>) {
  return () => {
    const { theme } = handle.props
    // `ThemeData` es JSON del backend, laxo a propósito (ver civic-horizon.ts).
    const u = theme?.usuario ?? {}
    const imagenes: Record<string, string> = u.imagenes ?? {}
    const colores = coloresDelPortal(theme)
    const iconos = iconosDelPortal(theme)
    const fotos = fotosDeLaPortada(theme, HERO_IMAGEN_POR_DEFECTO)
    const intensidad = intensidadDeCapa(u.colores?.heroGradienteInicio)
    const urlDe = (clave: string, porDefecto: string) => imagenes[clave] || porDefecto
    const paletaActiva = PALETAS_PORTAL.find((p) => esIgual(p.colores, colores))
    const totalCampos = GRUPOS_TEXTOS.reduce((n, g) => n + g.campos.length, 0)

    return (
      <form
        class="pz"
        data-pz="portal"
        style={`--pz-fondo-menu:${colores.navbarFondo};--pz-fondo-pie:${colores.footerFondo}`}
        method="post"
        action={adminRoutes.personalizacion.index.href()}
        enctype="multipart/form-data"
      >
        <input type="hidden" name="section" value="usuario" />
        <input type="hidden" name="tab" value="usuario" />

        <div class="pz-estudio">
          <div class="pz-editor">
            <nav class="pz-indice" aria-label="Secciones del editor">
              <a href="#pz-paletas">Paletas</a>
              <a href="#pz-colores">Colores</a>
              <a href="#pz-fotos">Fotos de portada</a>
              <a href="#pz-imagenes">Logotipos</a>
              <a href="#pz-iconos">Íconos</a>
              <a href="#pz-textos">Textos</a>
              <a href="#pz-guardar">Guardar</a>
            </nav>

            <SeccionEstudio
              clave="paletas"
              numero={1}
              titulo="Empieza por una paleta"
              descripcion="Un clic aplica siete colores que ya combinan bien. Después puedes ajustar cada uno."
              icono="mdi:palette-swatch-outline"
            >
              <div class="pz-paletas" role="group" aria-label="Paletas de colores del portal">
                {PALETAS_PORTAL.map((p) => (
                  <button
                    type="button"
                    key={p.id}
                    class="pz-paleta"
                    data-pz-paleta
                    data-colores={JSON.stringify(p.colores)}
                    aria-pressed={paletaActiva?.id === p.id ? 'true' : 'false'}
                    title={`Aplicar la paleta ${p.nombre}`}
                  >
                    <span
                      class="pz-paleta__mini"
                      aria-hidden="true"
                      style={`--m-primario:${p.colores.primario};--m-acento:${p.colores.acento};--m-secundario:${p.colores.secundario};--m-menu-fondo:${p.colores.navbarFondo};--m-menu-texto:${p.colores.navbarTexto};--m-pie-fondo:${p.colores.footerFondo};--m-pie-texto:${p.colores.footerTexto}`}
                    >
                      <span class="pz-paleta__menu">
                        <i></i>
                        <i></i>
                        <b></b>
                      </span>
                      <span class="pz-paleta__portada">
                        <i></i>
                        <b></b>
                      </span>
                      <span class="pz-paleta__tarjetas">
                        <i></i>
                        <i></i>
                        <i></i>
                      </span>
                      <span class="pz-paleta__pie">
                        <i></i>
                      </span>
                    </span>
                    <span class="pz-paleta__nombre">{p.nombre}</span>
                    <span class="pz-paleta__descripcion">{p.descripcion}</span>
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
              titulo="Colores"
              descripcion="Ajusta cada color y comprueba, al instante, que los textos se lean."
              icono="mdi:palette-outline"
            >
              <div class="pz-grupos-color">
                {GRUPOS_COLOR_PORTAL.map((g) => (
                  <fieldset class="pz-grupo" key={g.id}>
                    <legend class="pz-grupo__titulo">
                      <Icon name={g.icono} size={16} /> {g.titulo}
                    </legend>
                    <p class="pz-grupo__descripcion">{g.descripcion}</p>
                    <div class="pz-grupo__campos">
                      {g.campos.map((campo) => (
                        <SelectorDeColor
                          key={campo.clave}
                          id={`c-${campo.clave}`}
                          name={campo.name}
                          etiqueta={campo.etiqueta}
                          ayuda={campo.ayuda}
                          valor={colores[campo.clave]}
                          clave={campo.clave}
                          zona={campo.zona}
                        />
                      ))}
                    </div>
                  </fieldset>
                ))}
              </div>
              <div class="pz-contrastes" role="group" aria-label="Legibilidad de los textos">
                <p class="pz-contrastes__titulo">
                  <Icon name="mdi:eye-check-outline" size={16} /> ¿Se lee bien?
                  <small>
                    Cuánto contraste hay entre cada texto y su fondo. Desde 4.5:1 se lee
                    cómodamente.
                  </small>
                </p>
                {PARES_CONTRASTE_PORTAL.map((par) => (
                  <IndicadorContraste
                    key={par.id}
                    etiqueta={par.etiqueta}
                    texto={par.texto === '#ffffff' ? '#ffffff' : colores[par.texto]}
                    fondo={colores[par.fondo]}
                    claveTexto={par.texto === '#ffffff' ? null : par.texto}
                    claveFondo={par.fondo}
                    zona={par.zona}
                  />
                ))}
              </div>
            </SeccionEstudio>

            <SeccionEstudio
              clave="fotos"
              numero={3}
              titulo="Fotos de la portada"
              descripcion="Una foto se muestra fija; con dos o más, la portada pasa sola de una a otra."
              icono="mdi:image-multiple-outline"
            >
              <div
                class="pz-fotos"
                data-pz-fotos
                data-inicial={JSON.stringify(fotos)}
                data-zona="portada"
              >
                <p
                  class="pz-fotos__estado"
                  data-pz-fotos-estado
                  data-segundos={SEGUNDOS_POR_FOTO}
                  role="status"
                >
                  <Icon name="mdi:view-carousel-outline" size={16} />
                  <span data-pz-fotos-texto>
                    {fotos.length === 1
                      ? '1 foto: la portada se muestra fija.'
                      : `${fotos.length} fotos: la portada pasa a la siguiente cada ${SEGUNDOS_POR_FOTO} segundos.`}
                  </span>
                </p>
                <ol class="pz-fotos__lista" data-pz-fotos-lista>
                  {fotos.map((url, i) => (
                    <FilaDeFoto key={url} url={url} n={i + 1} />
                  ))}
                </ol>
                <template data-pz-foto-plantilla>
                  <FilaDeFoto url="" n={0} />
                </template>
                <div class="pz-fotos__acciones">
                  <button type="button" class="btn btn--white" data-pz-agregar-foto>
                    <Icon name="mdi:link-plus" size={16} /> Agregar por dirección
                  </button>
                  <label class="pz-subida" data-pz-zona-subida>
                    <Icon name="mdi:cloud-upload-outline" size={22} />
                    <span class="pz-subida__texto">
                      <strong>Sube fotos desde tu computadora</strong>
                      <small>
                        Arrástralas aquí o haz clic. Se suman al carrusel al guardar. Horizontales,
                        de al menos 1600 × 700 px.
                      </small>
                    </span>
                    <input
                      type="file"
                      name="archivo_hero"
                      accept="image/*"
                      multiple
                      class="solo-lector"
                      data-pz-archivo-hero
                      data-etiqueta="Fotos nuevas de la portada"
                    />
                  </label>
                </div>
                <p class="pz-imagen__aviso" data-pz-fotos-aviso hidden></p>
              </div>

              <div class="pz-capa" data-zona="capa">
                <label class="pz-capa__titulo" for="hero_capa">
                  Capa de color sobre las fotos
                  <small>
                    Oscurece las fotos para que el texto blanco se lea. Toma el color primario y
                    también tiñe el banner «Participación ciudadana».
                  </small>
                </label>
                <div class="pz-capa__control">
                  <span>Fotos más nítidas</span>
                  <input
                    type="range"
                    id="hero_capa"
                    name="hero_capa"
                    min={CAPA_MIN}
                    max={CAPA_MAX}
                    step={1}
                    value={intensidad}
                    data-pz-capa
                    data-etiqueta="Capa de color sobre las fotos"
                    data-zona="capa"
                  />
                  <span>Capa más intensa</span>
                  <output class="pz-capa__valor" data-pz-capa-valor for="hero_capa">
                    {intensidad} %
                  </output>
                </div>
              </div>
            </SeccionEstudio>

            <SeccionEstudio
              clave="imagenes"
              numero={4}
              titulo="Logotipos e ilustraciones"
              descripcion="Cada imagen se ve sobre el color en el que aparece en el portal."
              icono="mdi:image-outline"
            >
              <div class="pz-imagenes">
                {RANURAS_IMAGEN_PORTAL.map((ranura) => (
                  <SelectorDeImagen
                    key={ranura.clave}
                    ranura={ranura}
                    url={urlDe(ranura.clave, DEFECTO_DE_IMAGEN[ranura.clave])}
                    porDefecto={DEFECTO_DE_IMAGEN[ranura.clave]}
                  />
                ))}
              </div>
            </SeccionEstudio>

            <SeccionEstudio
              clave="iconos"
              numero={5}
              titulo="Íconos de «Sobre el Programa»"
              descripcion="El emoji de cada uno de los cuatro accesos de la portada."
              icono="mdi:emoticon-outline"
            >
              <div class="pz-iconos">
                {ICONOS_PORTAL.map((icono) => (
                  <div class="pz-icono" key={icono.clave} data-pz-icono data-zona="accesos">
                    <div class="pz-icono__cabecera">
                      <span class="pz-icono__actual" data-pz-icono-actual aria-hidden="true">
                        {iconos[icono.clave]}
                      </span>
                      <label class="pz-icono__titulo" for={`i-${icono.name}`}>
                        {icono.titulo}
                      </label>
                    </div>
                    <input
                      type="text"
                      id={`i-${icono.name}`}
                      name={icono.name}
                      value={iconos[icono.clave]}
                      maxlength={8}
                      class="pz-icono__campo"
                      autocomplete="off"
                      data-pz-icono-campo={icono.name.replace('ico_card', '')}
                      data-etiqueta={`Ícono de «${icono.titulo}»`}
                      data-zona="accesos"
                    />
                    <div class="pz-icono__sugeridos" role="group" aria-label="Íconos sugeridos">
                      {icono.sugeridos.map((emoji) => (
                        <button
                          type="button"
                          key={emoji}
                          class="pz-emoji"
                          data-pz-emoji={emoji}
                          title={`Usar ${emoji}`}
                          aria-label={`Usar ${emoji}`}
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
              <p class="pz-nota">
                <Icon name="mdi:lightbulb-on-outline" size={14} /> También puedes pegar cualquier
                otro emoji en el campo de texto.
              </p>
            </SeccionEstudio>

            <SeccionEstudio
              clave="textos"
              numero={6}
              titulo="Textos del portal"
              descripcion="Títulos, párrafos, botones y pie de página, agrupados por sección."
              icono="mdi:text-box-edit-outline"
              abierta={false}
            >
              <div class="pz-textos">
                <div>
                  <p class="pz-textos__resumen">
                    <strong>{totalCampos} textos</strong> en {GRUPOS_TEXTOS.length} secciones se
                    editan en una página propia, con vista previa de cada cambio.
                  </p>
                  <ul class="pz-textos__grupos">
                    {GRUPOS_TEXTOS.map((g) => (
                      <li key={g.id}>{g.titulo}</li>
                    ))}
                  </ul>
                </div>
                <a class="btn btn--dark" href={adminRoutes.personalizacionTextos.index.href()}>
                  <Icon name="mdi:text-box-edit-outline" size={16} /> Editar textos del portal
                </a>
              </div>
            </SeccionEstudio>

            <SeccionGuardar
              sugerencias={['colores', 'fotos', 'logos', 'iconos']}
              textoVacio="Todavía no hay cambios. Modifica un color, una foto o un ícono para poder guardar."
              ejemploMotivo="Ej. Actualización de colores para la temporada"
            />
          </div>

          <VistaPreviaLateral
            titulo="Vista previa"
            etiqueta="Vista previa del portal"
            conDispositivos
            pie="Toca una parte de la maqueta para ir a lo que la cambia. Los textos son los que ya están guardados."
            enlaceEnVivo={routes.home.href()}
          >
            <VistaPortal {...propsDeVistaPortal(theme)} />
          </VistaPreviaLateral>
        </div>

        <BarraDeCambios />
      </form>
    )
  }
}
