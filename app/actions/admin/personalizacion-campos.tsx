/**
 * Piezas de los formularios de Personalización: un color, su contraste, una imagen y las
 * secciones que los agrupan.
 *
 * Todo el comportamiento (vista previa en vivo, contraste que se recalcula, deshacer,
 * resumen de cambios) vive en `public/personalizacion.js` y se engancha por atributos
 * `data-pz-*`: el HTML sale completo y correcto del servidor, y sin JavaScript los campos
 * siguen funcionando como un formulario cualquiera.
 */
import type { Handle, RemixNode } from 'remix/ui'

import { EditorTexto } from '../../ui/admin/editor-texto.tsx'
import { Icon } from '../../ui/admin/icon.tsx'
import { ETIQUETA_NIVEL, nivelDeContraste, razonDeContraste } from '../../utils/color.ts'
import {
  FORMATOS_IMAGEN,
  MAX_IMAGEN_MB,
  MAX_TEXTO_PLANO,
  MOTIVOS_SUGERIDOS,
  type RanuraImagen,
} from './personalizacion-datos.ts'
import type { CampoTexto } from './personalizacion-textos-defs.ts'

// ---------------------------------------------------------------------------
// Color
// ---------------------------------------------------------------------------

export interface SelectorDeColorProps {
  /** `id` del selector de color; el campo de texto y los enlaces de ayuda cuelgan de él. */
  id: string
  name: string
  etiqueta: string
  ayuda: string
  /** `#rrggbb` guardado. */
  valor: string
  /** Clave del color (`primario`, `navbarFondo`…): la vista previa y el contraste la usan. */
  clave: string
  zona: string
}

/**
 * Un color: muestra grande, código hexadecimal editable y, cuando se cambia, el botón que
 * lo devuelve a lo guardado. El selector nativo (`type="color"`) es el que viaja en el
 * formulario; el código de texto solo lo acompaña.
 */
export function SelectorDeColor(handle: Handle<SelectorDeColorProps>) {
  return () => {
    const { id, name, etiqueta, ayuda, valor, clave, zona } = handle.props
    return (
      <div class="pz-color" data-pz-color-campo data-zona={zona}>
        <label class="pz-color__etiqueta" for={id}>
          {etiqueta}
        </label>
        <div class="pz-color__control">
          <input
            type="color"
            id={id}
            name={name}
            value={valor}
            class="pz-color__muestra"
            data-pz-color={clave}
            data-etiqueta={etiqueta}
            data-zona={zona}
          />
          <input
            type="text"
            class="pz-color__hex"
            value={valor}
            maxlength={7}
            spellcheck={false}
            autocomplete="off"
            aria-label={`Código del color: ${etiqueta}`}
            data-pz-hex={id}
          />
          <button
            type="button"
            class="pz-color__deshacer"
            data-pz-deshacer={id}
            title={`Volver al color guardado (${valor})`}
            aria-label={`Volver al color guardado de ${etiqueta}`}
            hidden
          >
            <Icon name="mdi:undo" size={15} />
          </button>
        </div>
        <p class="pz-color__ayuda">{ayuda}</p>
        <p class="pz-color__error" data-pz-hex-error hidden>
          Escribe un color como #8c1d3d (tres o seis caracteres).
        </p>
      </div>
    )
  }
}

export interface IndicadorContrasteProps {
  etiqueta: string
  /** Color del texto (`#rrggbb`). */
  texto: string
  /** Color del fondo (`#rrggbb`). */
  fondo: string
  /** Clave del color del texto, o `null` si es fijo (el blanco de un botón). */
  claveTexto: string | null
  claveFondo: string
  zona: string
}

/** El mismo texto que el script escribe al recalcular, para que no cambie al arrancar. */
export function textoDeContraste(razon: number): string {
  return `${(Math.round(razon * 10) / 10).toFixed(1)}:1 · ${ETIQUETA_NIVEL[nivelDeContraste(razon)]}`
}

/**
 * Cuánto se lee un texto sobre su fondo, en vivo: el menú, el pie y el botón primario son
 * lo primero que se vuelve ilegible al cambiar un color sin fijarse. Informa, no impide
 * guardar: es la persona quien decide, pero con el dato a la vista.
 */
export function IndicadorContraste(handle: Handle<IndicadorContrasteProps>) {
  return () => {
    const { etiqueta, texto, fondo, claveTexto, claveFondo, zona } = handle.props
    const razon = razonDeContraste(texto, fondo) ?? 1
    const nivel = nivelDeContraste(razon)
    return (
      <div
        class={`pz-contraste pz-contraste--${nivel}`}
        data-pz-contraste
        data-zona={zona}
        data-clave-texto={claveTexto ?? undefined}
        data-texto-fijo={claveTexto ? undefined : texto}
        data-clave-fondo={claveFondo}
      >
        <span
          class="pz-contraste__muestra"
          style={`color:${texto};background:${fondo}`}
          aria-hidden="true"
        >
          Aa
        </span>
        <span class="pz-contraste__texto">
          <strong>{etiqueta}</strong>
          <small data-pz-razon>{textoDeContraste(razon)}</small>
        </span>
        <span class="pz-contraste__icono pz-contraste__icono--ok" aria-hidden="true">
          <Icon name="mdi:check-circle-outline" size={18} />
        </span>
        <span class="pz-contraste__icono pz-contraste__icono--mal" aria-hidden="true">
          <Icon name="mdi:alert-circle-outline" size={18} />
        </span>
      </div>
    )
  }
}

// ---------------------------------------------------------------------------
// Imagen
// ---------------------------------------------------------------------------

export interface SelectorDeImagenProps {
  ranura: RanuraImagen
  /** Dirección guardada (ya normalizada: nunca una ruta interna del backend). */
  url: string
  /** Imagen que se ve cuando el campo queda vacío (la que trae el proyecto). */
  porDefecto: string
}

/**
 * Una imagen del portal: se ve como se verá (el logotipo sobre el color del menú o del pie,
 * la ilustración sobre claro), con su dirección, la carga de un archivo nuevo, lo que se
 * recomienda y por qué se rechazaría. Sin foto elegida, «Quitar» deja la que trae el
 * proyecto.
 */
export function SelectorDeImagen(handle: Handle<SelectorDeImagenProps>) {
  return () => {
    const { ranura, url, porDefecto } = handle.props
    const idUrl = `i-${ranura.urlName}`
    return (
      <div
        class={`pz-imagen pz-imagen--${ranura.forma}`}
        data-pz-imagen
        data-fondo={ranura.fondo}
        data-zona={ranura.zona}
      >
        <div class="pz-imagen__cabecera">
          <label class="pz-imagen__titulo" for={idUrl}>
            {ranura.titulo}
          </label>
          <p class="pz-imagen__donde">{ranura.dondeSale}</p>
        </div>
        <div class="pz-imagen__vista">
          {url ? (
            <img src={url} alt={`Vista previa: ${ranura.titulo}`} data-pz-imagen-vista />
          ) : (
            <span class="pz-imagen__vacia" data-pz-imagen-vacia>
              <Icon name="mdi:image-plus-outline" size={24} /> Sin imagen
            </span>
          )}
        </div>
        <div class="pz-imagen__campos">
          <input
            type="text"
            id={idUrl}
            name={ranura.urlName}
            value={url}
            placeholder="/ruta/del/sitio.webp o https://…"
            class="pz-imagen__url"
            data-pz-url-imagen
            data-defecto={porDefecto}
            data-etiqueta={ranura.titulo}
            data-zona={ranura.zona}
            inputmode="url"
            autocomplete="off"
            spellcheck={false}
          />
          <div class="pz-imagen__acciones">
            <label class="btn btn--white btn--sm pz-subir">
              <Icon name="mdi:file-upload-outline" size={15} /> Subir imagen
              <input
                type="file"
                name={ranura.archivoName}
                accept="image/*"
                class="solo-lector"
                data-pz-archivo
                data-etiqueta={ranura.titulo}
                data-zona={ranura.zona}
              />
            </label>
            <button type="button" class="btn btn--white btn--sm" data-pz-quitar-imagen>
              <Icon name="mdi:close" size={15} /> Quitar
            </button>
          </div>
        </div>
        <p class="pz-imagen__tip">
          <Icon name="mdi:information-outline" size={14} /> {ranura.recomendado} Hasta{' '}
          {MAX_IMAGEN_MB} MB; {FORMATOS_IMAGEN}.
        </p>
        <p class="pz-imagen__aviso" data-pz-imagen-aviso hidden></p>
      </div>
    )
  }
}

// ---------------------------------------------------------------------------
// Secciones del estudio
// ---------------------------------------------------------------------------

export interface SeccionEstudioProps {
  /** Ancla de la sección (`#pz-colores`) y clave con la que el script cuenta sus cambios. */
  clave: string
  numero: number
  titulo: string
  descripcion: string
  icono: string
  /** Abierta al cargar (por omisión sí). */
  abierta?: boolean
  children?: RemixNode
}

/**
 * Una sección plegable del editor. Muestra cuántos de sus campos están modificados (lo
 * rellena el script), así quien se pierde en un formulario largo sabe dónde tocó.
 */
export function SeccionEstudio(handle: Handle<SeccionEstudioProps>) {
  return () => {
    const { clave, numero, titulo, descripcion, icono, abierta = true, children } = handle.props
    return (
      <details class="pz-seccion" id={`pz-${clave}`} data-pz-seccion={clave} open={abierta}>
        <summary class="pz-seccion__cabecera">
          <span class="pz-seccion__numero" aria-hidden="true">
            {numero}
          </span>
          <span class="pz-seccion__titulos">
            <span class="pz-seccion__titulo">
              <Icon name={icono} size={17} /> {titulo}
            </span>
            <span class="pz-seccion__descripcion">{descripcion}</span>
          </span>
          <span class="pz-seccion__estado" data-pz-estado-seccion={clave} hidden></span>
          <span class="pz-seccion__flecha" aria-hidden="true">
            <Icon name="mdi:chevron-down" size={20} />
          </span>
        </summary>
        <div class="pz-seccion__cuerpo">{children}</div>
      </details>
    )
  }
}

// ---------------------------------------------------------------------------
// Guardar
// ---------------------------------------------------------------------------

export interface SeccionGuardarProps {
  /** Claves de `MOTIVOS_SUGERIDOS` que se ofrecen como sugerencia. */
  sugerencias: string[]
  /** Qué decir mientras no hay nada que guardar. */
  textoVacio: string
  /** Ejemplo del campo del motivo. */
  ejemploMotivo: string
}

/**
 * El cierre del formulario: qué se va a guardar (lo escribe el script a partir de lo que
 * cambió), por qué (el motivo es obligatorio: queda en el historial con quién y cuándo) y
 * los dos botones. Sin cambios, guardar se desactiva: un registro de historial vacío no
 * le sirve a nadie.
 */
export function SeccionGuardar(handle: Handle<SeccionGuardarProps>) {
  return () => {
    const { sugerencias, textoVacio, ejemploMotivo } = handle.props
    return (
      <section class="pz-guardar" id="pz-guardar" aria-labelledby="pz-guardar-titulo">
        <div class="pz-guardar__resumen">
          <h3 class="pz-guardar__titulo" id="pz-guardar-titulo">
            <Icon name="mdi:clipboard-list-outline" size={18} /> Cambios que se guardarán
            <span class="pz-conteo" data-pz-conteo>
              0
            </span>
          </h3>
          <ul class="pz-resumen" data-pz-resumen>
            <li class="pz-resumen__vacio" data-pz-resumen-vacio>
              {textoVacio}
            </li>
          </ul>
        </div>
        <div class="pz-guardar__motivo">
          <label class="pz-guardar__etiqueta" for="motivo">
            Motivo del cambio <span class="pz-obligatorio">Obligatorio</span>
          </label>
          <p class="pz-guardar__ayuda">
            Queda en el historial con tu nombre, la fecha y la hora, y permite restaurar la versión
            anterior.
          </p>
          <input
            type="text"
            id="motivo"
            name="motivo"
            required
            minlength={4}
            maxlength={200}
            autocomplete="off"
            placeholder={ejemploMotivo}
            data-pz-motivo
          />
          <div class="pz-sugerencias" role="group" aria-label="Motivos sugeridos">
            <span>Sugerencias:</span>
            {sugerencias.map((k) => (
              <button
                type="button"
                key={k}
                class="pz-sugerencia"
                data-pz-motivo-sugerido={MOTIVOS_SUGERIDOS[k]}
                data-pz-motivo-de={k}
              >
                {MOTIVOS_SUGERIDOS[k]}
              </button>
            ))}
          </div>
        </div>
        <div class="pz-guardar__botones">
          <button type="button" class="btn btn--white" data-pz-descartar disabled>
            <Icon name="mdi:undo" size={16} /> Descartar cambios
          </button>
          <button type="submit" class="btn btn--green pz-boton-guardar" data-pz-guardar>
            <Icon name="mdi:content-save-outline" size={16} /> Guardar cambios
          </button>
        </div>
        <p class="pz-guardar__nota">
          <Icon name="mdi:information-outline" size={14} /> Los cambios se publican al guardar; en
          el portal pueden tardar unos segundos en verse.
        </p>
      </section>
    )
  }
}

/** Franja fija al pie de la ventana que aparece con cambios sin guardar. */
export function BarraDeCambios() {
  return () => (
    <div class="pz-barra" data-pz-barra hidden>
      <span class="pz-barra__estado">
        <span class="pz-barra__punto" aria-hidden="true"></span>
        <strong data-pz-barra-texto>Cambios sin guardar</strong>
      </span>
      <span class="pz-barra__acciones">
        <button type="button" class="btn btn--white btn--sm" data-pz-descartar>
          <Icon name="mdi:undo" size={15} /> Descartar
        </button>
        <a class="btn btn--green btn--sm" href="#pz-guardar" data-pz-ir-guardar>
          <Icon name="mdi:content-save-outline" size={15} /> Ir a guardar
        </a>
      </span>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Texto
// ---------------------------------------------------------------------------

export interface CampoDeTextoProps {
  campo: CampoTexto
  /** El texto guardado. */
  valor: string
}

/**
 * Un texto del portal. Los de párrafo llevan el editor con formato (negritas y alineación);
 * los títulos, etiquetas y botones, una caja de texto con su contador. Cada uno dice, si
 * hace falta, de qué se trata, se marca cuando se modifica y (los de texto plano) ofrece
 * volver al texto guardado. Mientras se escribe, lo que se ve en la maqueta cambia.
 */
export function CampoDeTexto(handle: Handle<CampoDeTextoProps>) {
  return () => {
    const { campo, valor } = handle.props
    return (
      <div
        class={'pz-texto' + (campo.full ? ' pz-texto--ancho' : '')}
        data-pz-texto={campo.key}
        data-etiqueta={campo.label}
      >
        {campo.rico ? (
          <EditorTexto name={campo.name} label={campo.label} valor={valor} filas={campo.rows} />
        ) : (
          <>
            <div class="pz-texto__cabecera">
              <label class="pz-texto__etiqueta" for={`t-${campo.name}`}>
                {campo.label}
              </label>
              <span class="pz-texto__contador">
                <span data-pz-contador-texto>{Array.from(valor).length}</span> / {MAX_TEXTO_PLANO}
              </span>
            </div>
            <textarea
              id={`t-${campo.name}`}
              name={campo.name}
              rows={campo.rows}
              maxlength={MAX_TEXTO_PLANO}
              value={valor}
              class="pz-texto__campo"
              data-pz-texto-campo
            />
          </>
        )}
        {campo.ayuda ? <p class="pz-texto__ayuda">{campo.ayuda}</p> : null}
        {campo.rico ? null : (
          <button type="button" class="pz-texto__deshacer" data-pz-deshacer-texto hidden>
            <Icon name="mdi:undo" size={14} /> Volver al texto guardado
          </button>
        )}
      </div>
    )
  }
}

// ---------------------------------------------------------------------------
// Guía rápida
// ---------------------------------------------------------------------------

export interface GuiaRapidaProps {
  /** La frase de una línea que se ve con la guía cerrada. */
  titulo: string
  resumen: string
  pasos: Array<{ titulo: string; detalle: string }>
}

/**
 * «¿Cómo funciona?»: tres pasos plegables. Lo que más tranquiliza a quien edita el portal es
 * saber, desde el primer vistazo, que nada se publica hasta guardar.
 */
export function GuiaRapida(handle: Handle<GuiaRapidaProps>) {
  return () => {
    const { titulo, resumen, pasos } = handle.props
    return (
      <details class="pz-guia">
        <summary class="pz-guia__resumen">
          <Icon name="mdi:lightbulb-on-outline" size={18} />
          <span>
            <strong>{titulo}</strong> {resumen}
          </span>
          <span class="pz-guia__flecha" aria-hidden="true">
            <Icon name="mdi:chevron-down" size={20} />
          </span>
        </summary>
        <ol class="pz-guia__pasos">
          {pasos.map((paso, i) => (
            <li key={paso.titulo}>
              <span class="pz-guia__numero" aria-hidden="true">
                {i + 1}
              </span>
              <span>
                <strong>{paso.titulo}</strong> {paso.detalle}
              </span>
            </li>
          ))}
        </ol>
      </details>
    )
  }
}
