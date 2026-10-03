import type { Handle } from 'remix/ui'

import { canonizarTextoRico, LIMITE_TEXTO_RICO } from '../../utils/texto-rico.ts'
import { ParrafosRicos } from '../texto-rico.tsx'

export interface EditorTextoProps {
  /** Nombre del campo que viaja con el formulario. */
  name: string
  /** Texto de la etiqueta; también nombra la barra de formato. */
  label: string
  /** El texto guardado: HTML canónico o texto plano de antes del editor. */
  valor?: string
  /** Alto del campo de texto de respaldo, en renglones. */
  filas?: number
}

type Boton = {
  /** Comando que ejecuta `public/editor-texto.js`. */
  comando: 'negrita' | 'izquierda' | 'centro' | 'derecha' | 'justificado'
  etiqueta: string
  atajo?: string
  /** Trazo del icono (cuadrícula de 16 × 16); la negrita lleva una «N». */
  trazo?: string
}

const BOTONES: Boton[] = [
  { comando: 'negrita', etiqueta: 'Negrita', atajo: 'Ctrl+B' },
  {
    comando: 'izquierda',
    etiqueta: 'Alinear a la izquierda',
    trazo: 'M2 3h12M2 6.5h7M2 10h12M2 13.5h7',
  },
  { comando: 'centro', etiqueta: 'Centrar', trazo: 'M2 3h12M4.5 6.5h7M2 10h12M4.5 13.5h7' },
  {
    comando: 'derecha',
    etiqueta: 'Alinear a la derecha',
    trazo: 'M2 3h12M7 6.5h7M2 10h12M7 13.5h7',
  },
  { comando: 'justificado', etiqueta: 'Justificar', trazo: 'M2 3h12M2 6.5h12M2 10h12M2 13.5h12' },
]

/**
 * Campo de texto con formato (negritas y alineación del párrafo) de «Textos del
 * portal». Es una mejora progresiva sobre un `<textarea>`:
 *
 *  · Sin JavaScript queda el campo de texto con el código del texto (el mismo
 *    que se guarda), de modo que guardar no pierde el formato que ya tenga.
 *  · Con `public/editor-texto.js` se muestra la barra de formato y el área
 *    editable, el campo de texto se oculta y sigue siendo el que viaja con el
 *    formulario: el script lo mantiene al día con lo que se ve en el área.
 *
 * Lo que llega al servidor lo deja canónico el backend al guardar: aquí no se
 * confía en nada de lo que mande el navegador.
 */
export function EditorTexto(handle: Handle<EditorTextoProps>) {
  return () => {
    const { name, label, valor = '', filas = 4 } = handle.props
    const id = `editor-${name}`

    return (
      <div class="editor-texto" data-editor-texto data-max={LIMITE_TEXTO_RICO}>
        <label id={`${id}-etiqueta`} for={id} class="editor-texto__etiqueta">
          {label}
        </label>
        <div class="editor-texto__marco">
          <div
            class="editor-texto__barra"
            role="toolbar"
            aria-label={`Formato de «${label}»`}
            data-barra
            hidden
          >
            {BOTONES.map((boton) => (
              <button
                key={boton.comando}
                type="button"
                class="editor-texto__boton"
                data-comando={boton.comando}
                aria-pressed="false"
                aria-label={boton.etiqueta}
                title={boton.atajo ? `${boton.etiqueta} (${boton.atajo})` : boton.etiqueta}
              >
                {boton.trazo ? (
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 16 16"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="1.6"
                    stroke-linecap="round"
                    aria-hidden="true"
                    focusable="false"
                  >
                    <path d={boton.trazo} />
                  </svg>
                ) : (
                  <strong aria-hidden="true">N</strong>
                )}
              </button>
            ))}
          </div>
          <div
            id={`${id}-area`}
            class="editor-texto__area"
            contenteditable="true"
            role="textbox"
            aria-multiline="true"
            aria-labelledby={`${id}-etiqueta`}
            data-area
            hidden
          >
            <ParrafosRicos valor={valor} />
          </div>
          <textarea
            id={id}
            name={name}
            rows={filas}
            class="editor-texto__fuente"
            value={canonizarTextoRico(valor)}
          />
        </div>
        <p class="editor-texto__aviso" data-aviso role="status" hidden></p>
      </div>
    )
  }
}
