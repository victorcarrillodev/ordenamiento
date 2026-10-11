/**
 * Textos del portal.
 *
 * El mismo estudio que Personalización: los textos agrupados por la parte del portal en la que
 * salen (cada grupo es una sección plegable), una maqueta del portal que cambia MIENTRAS se
 * escribe (títulos, botones, accesos, banner y pie) y, al cierre, el resumen exacto de lo que
 * se va a guardar con su motivo. Un campo vacío muestra en el portal el texto original; la
 * maqueta hace lo mismo.
 */
import type { Handle } from 'remix/ui'

import { adminRoutes, routes } from '../../routes.ts'
import { AdminLayout } from '../../ui/admin/admin-layout.tsx'
import { AdminAlert } from '../../ui/admin/alert.tsx'
import { Icon } from '../../ui/admin/icon.tsx'
import type { ThemeData } from '../../ui/civic-horizon.ts'
import {
  BarraDeCambios,
  CampoDeTexto,
  GuiaRapida,
  SeccionEstudio,
  SeccionGuardar,
} from './personalizacion-campos.tsx'
import { GRUPOS_TEXTOS } from './personalizacion-textos-defs.ts'
import { VistaPortal, VistaPreviaLateral, propsDeVistaPortal } from './personalizacion-vista.tsx'

export interface PersonalizacionTextosPageProps {
  user: { name: string; role: string }
  theme: ThemeData
  mensaje?: string
  error?: string
}

/** En qué parte del portal sale cada grupo de textos, y con qué icono se reconoce. */
export const INFO_DE_GRUPO: Record<string, { icono: string; donde: string }> = {
  navbar: { icono: 'mdi:dock-top', donde: 'La barra superior de todas las páginas del portal.' },
  hero: {
    icono: 'mdi:image-area',
    donde: 'Lo primero que se ve al abrir el portal: cintillo, título, texto y botones.',
  },
  'que-es': {
    icono: 'mdi:help-circle-outline',
    donde: 'La sección que explica qué es la Bitácora, junto a su ilustración.',
  },
  informacion: {
    icono: 'mdi:view-grid-outline',
    donde: 'Los cuatro accesos de «Sobre el Programa»: fases, avances, calendario y seguimiento.',
  },
  programa: {
    icono: 'mdi:book-open-variant',
    donde: 'La sección que explica qué es el Programa de Ordenamiento.',
  },
  timeline: {
    icono: 'mdi:timeline-outline',
    donde: 'Las cinco etapas del proceso, con su línea de tiempo.',
  },
  cta: {
    icono: 'mdi:bullhorn-outline',
    donde: 'El banner que invita a registrar una participación.',
  },
  proximas: {
    icono: 'mdi:calendar-clock-outline',
    donde: 'La lista de próximas actividades de la portada.',
  },
  aviso: {
    icono: 'mdi:alert-decagram-outline',
    donde: 'La franja de avisos de la parte superior de la portada.',
  },
  footer: { icono: 'mdi:dock-bottom', donde: 'El pie de página con los datos de contacto.' },
}

const PASOS = [
  {
    titulo: 'Busca la sección.',
    detalle: 'Los textos están agrupados por la parte del portal en la que salen.',
  },
  {
    titulo: 'Escribe.',
    detalle: 'La maqueta cambia al instante. Un campo vacío muestra el texto original del portal.',
  },
  {
    titulo: 'Guarda con un motivo.',
    detalle: 'Queda en el historial con tu nombre; los textos se publican al guardar.',
  },
]

export function PersonalizacionTextosPage(handle: Handle<PersonalizacionTextosPageProps>) {
  return () => {
    const { user, theme, mensaje, error } = handle.props
    const txt: Record<string, string> = theme?.usuario?.textos || {}
    const total = GRUPOS_TEXTOS.reduce((n, g) => n + g.campos.length, 0)

    return (
      <AdminLayout
        user={user}
        active="personalizacion"
        title="Textos del portal"
        subtitle={`Los ${total} textos visibles del portal ciudadano, agrupados por sección y con vista previa. Un campo vacío muestra el texto por defecto.`}
        theme={theme?.panel}
        actions={
          <>
            <a class="btn btn--white" href={routes.home.href()} target="_blank" rel="noreferrer">
              <Icon name="mdi:open-in-new" size={16} /> Ver portal en vivo
            </a>
            <a class="btn btn--white" href={adminRoutes.personalizacion.index.href()}>
              <Icon name="mdi:arrow-left" size={16} /> Volver a personalización
            </a>
          </>
        }
      >
        <div class="pz-pagina" data-pz-pagina>
          {mensaje ? <AdminAlert type="success" message={mensaje} /> : null}
          {error ? <AdminAlert type="error" message={error} /> : null}

          <GuiaRapida
            titulo="¿Cómo funciona?"
            resumen="Escribe, mira la vista previa y guarda: nada se publica hasta entonces."
            pasos={PASOS}
          />

          <details class="panel pz-herramientas">
            <summary class="pz-herramientas__resumen">
              <Icon name="mdi:format-bold" size={18} />
              <span>
                <strong>Formato del texto</strong>
                <small>Negritas y alineación en los textos de párrafo.</small>
              </span>
              <span class="pz-guia__flecha" aria-hidden="true">
                <Icon name="mdi:chevron-down" size={20} />
              </span>
            </summary>
            <div class="pz-herramientas__cuerpo">
              <p class="pz-herramientas__texto">
                Los textos de párrafo (los que llevan barra de formato) admiten{' '}
                <strong>negritas</strong> y alineación a la izquierda, centrada, a la derecha o
                justificada. Selecciona el texto y elige el formato en la barra; con Enter empiezas
                un párrafo nuevo y con Mayús + Enter, un salto de línea. El formato se conserva al
                guardar y se ve igual en la página pública. Los títulos, botones y enlaces llevan
                solo texto.
              </p>
            </div>
          </details>

          <form
            class="pz"
            data-pz="textos"
            method="post"
            action={adminRoutes.personalizacionTextos.index.href()}
          >
            <input type="hidden" name="section" value="usuario" />

            <div class="pz-estudio">
              <div class="pz-editor">
                <nav class="pz-indice" aria-label="Secciones de textos">
                  {GRUPOS_TEXTOS.map((g) => (
                    <a key={g.id} href={`#pz-g-${g.id}`}>
                      {g.titulo}
                    </a>
                  ))}
                  <a href="#pz-guardar">Guardar</a>
                </nav>

                {GRUPOS_TEXTOS.map((g, i) => {
                  const info = INFO_DE_GRUPO[g.id] ?? { icono: 'mdi:text-box-outline', donde: '' }
                  return (
                    <SeccionEstudio
                      key={g.id}
                      clave={`g-${g.id}`}
                      numero={i + 1}
                      titulo={g.titulo}
                      descripcion={`${info.donde} ${g.campos.length} ${g.campos.length === 1 ? 'texto' : 'textos'}.`.trim()}
                      icono={info.icono}
                      abierta={i < 2}
                    >
                      <div class="pz-textos-grid">
                        {g.campos.map((campo) => (
                          <CampoDeTexto
                            key={campo.key}
                            campo={campo}
                            valor={txt[campo.key] || ''}
                          />
                        ))}
                      </div>
                    </SeccionEstudio>
                  )
                })}

                <SeccionGuardar
                  sugerencias={['textos', 'redaccion', 'programa']}
                  textoVacio="Todavía no hay cambios. Escribe en cualquier texto para poder guardar."
                  ejemploMotivo="Ej. Corrección de redacción en la portada"
                />
              </div>

              <VistaPreviaLateral
                titulo="Vista previa"
                etiqueta="Vista previa del portal"
                conDispositivos
                pie="Los textos se ven aquí mientras los escribes. Los colores, las fotos y los íconos son los guardados."
                enlaceEnVivo={routes.home.href()}
              >
                <VistaPortal {...propsDeVistaPortal(theme)} />
              </VistaPreviaLateral>
            </div>

            <BarraDeCambios />
          </form>
        </div>
      </AdminLayout>
    )
  }
}
