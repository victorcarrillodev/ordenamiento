/**
 * Personalización y marca.
 *
 * Un estudio de edición: a la izquierda los controles agrupados por sección, a la derecha una
 * maqueta que se repinta mientras se edita, y abajo el resumen de lo que se va a guardar con
 * su motivo. Tiene tres pestañas (cada una con su dirección, para poder compartirla):
 * «Portal ciudadano», «Panel administrativo» e «Historial de cambios».
 *
 * La interactividad (vista previa en vivo, contraste, deshacer, resumen de cambios, orden de
 * las fotos…) vive en `public/personalizacion.js` y se engancha por atributos `data-pz-*`.
 * No hay manejadores en línea (la CSP no los admite) y sin JavaScript todo sigue siendo un
 * formulario que se envía.
 */
import type { Handle } from 'remix/ui'

import { adminRoutes, routes } from '../../routes.ts'
import { AdminLayout } from '../../ui/admin/admin-layout.tsx'
import { AdminAlert } from '../../ui/admin/alert.tsx'
import { Icon } from '../../ui/admin/icon.tsx'
import type { ThemeData } from '../../ui/civic-horizon.ts'
import { HistorialCambios, type AuditLogEntry } from './personalizacion-historial.tsx'
import { FormularioPanel } from './personalizacion-panel.tsx'
import { FormularioPortal } from './personalizacion-portal.tsx'

export type { AuditLogEntry } from './personalizacion-historial.tsx'

export type TabPersonalizacion = 'usuario' | 'panel' | 'historial'

export interface PersonalizacionPageProps {
  user: { name: string; role: string }
  theme: ThemeData
  auditLogs: AuditLogEntry[]
  mensaje?: string
  error?: string
  tabActiva?: TabPersonalizacion
}

const TABS: Array<{ clave: TabPersonalizacion; etiqueta: string; icono: string }> = [
  { clave: 'usuario', etiqueta: 'Portal ciudadano', icono: 'mdi:web' },
  { clave: 'panel', etiqueta: 'Panel administrativo', icono: 'mdi:view-dashboard-outline' },
  { clave: 'historial', etiqueta: 'Historial de cambios', icono: 'mdi:history' },
]

/** Los tres pasos de siempre, a la vista: lo que más tranquiliza es saber que nada se publica sin guardar. */
function Guia() {
  return () => (
    <details class="pz-guia">
      <summary class="pz-guia__resumen">
        <Icon name="mdi:lightbulb-on-outline" size={18} />
        <span>
          <strong>¿Cómo funciona?</strong> Cambia, mira la vista previa y guarda: nada se publica
          hasta entonces.
        </span>
        <span class="pz-guia__flecha" aria-hidden="true">
          <Icon name="mdi:chevron-down" size={20} />
        </span>
      </summary>
      <ol class="pz-guia__pasos">
        <li>
          <span class="pz-guia__numero" aria-hidden="true">
            1
          </span>
          <span>
            <strong>Elige o ajusta.</strong> Parte de una paleta y afina cada color, foto o ícono.
          </span>
        </li>
        <li>
          <span class="pz-guia__numero" aria-hidden="true">
            2
          </span>
          <span>
            <strong>Revisa la vista previa.</strong> Se actualiza al instante y avisa si un texto
            deja de leerse. Los cambios aún no están publicados.
          </span>
        </li>
        <li>
          <span class="pz-guia__numero" aria-hidden="true">
            3
          </span>
          <span>
            <strong>Guarda con un motivo.</strong> Queda en el historial y puedes volver a cualquier
            versión anterior.
          </span>
        </li>
      </ol>
    </details>
  )
}

/** La prueba del correo: no es de marca, pero vive aquí porque usa la plantilla institucional. */
function PruebaDeCorreo(handle: Handle<{ tab: TabPersonalizacion }>) {
  return () => (
    <details class="panel pz-herramientas">
      <summary class="pz-herramientas__resumen">
        <Icon name="mdi:email-fast-outline" size={18} />
        <span>
          <strong>Herramientas · Prueba de correo</strong>
          <small>Comprueba que el servidor puede enviar los correos del portal.</small>
        </span>
        <span class="pz-guia__flecha" aria-hidden="true">
          <Icon name="mdi:chevron-down" size={20} />
        </span>
      </summary>
      <div class="pz-herramientas__cuerpo">
        <p class="pz-herramientas__texto">
          Envía un correo de prueba con la plantilla institucional al destinatario que indiques. Si
          el servidor de correo no está configurado, aquí verás el aviso.
        </p>
        <form
          method="post"
          action={adminRoutes.personalizacion.index.href()}
          class="pz-herramientas__form"
        >
          <input type="hidden" name="_action" value="testMail" />
          <input type="hidden" name="tab" value={handle.props.tab} />
          <div class="form-field pz-herramientas__campo">
            <label for="smtp-test-para">Correo destino</label>
            <input
              id="smtp-test-para"
              name="para"
              type="email"
              required
              placeholder="tu.correo@ejemplo.com"
            />
          </div>
          <button type="submit" class="btn btn--dark">
            <Icon name="mdi:send-outline" size={16} /> Enviar correo de prueba
          </button>
        </form>
      </div>
    </details>
  )
}

export function PersonalizacionPage(handle: Handle<PersonalizacionPageProps>) {
  return () => {
    const { user, theme, auditLogs, mensaje, error, tabActiva = 'usuario' } = handle.props

    return (
      <AdminLayout
        user={user}
        active="personalizacion"
        title="Personalización y marca"
        subtitle="Colores, logotipos, fotos, íconos y textos del portal y del panel, con vista previa."
        theme={theme?.panel}
        actions={
          <>
            <a class="btn btn--white" href={routes.home.href()} target="_blank" rel="noreferrer">
              <Icon name="mdi:open-in-new" size={16} /> Ver portal en vivo
            </a>
            <a class="btn btn--white" href={adminRoutes.personalizacionTextos.index.href()}>
              <Icon name="mdi:text-box-edit-outline" size={16} /> Editar textos
            </a>
          </>
        }
      >
        <div class="pz-pagina" data-pz-pagina>
          {mensaje ? <AdminAlert type="success" message={mensaje} /> : null}
          {error ? <AdminAlert type="error" message={error} /> : null}

          <Guia />

          {/* Las pestañas son enlaces con su propia dirección, igual que en Estadísticas:
              se pueden compartir y sobreviven a una recarga. */}
          <div class="tabs" role="tablist" aria-label="Qué quieres personalizar">
            {TABS.map((tab) => (
              <a
                key={tab.clave}
                role="tab"
                aria-selected={tabActiva === tab.clave ? 'true' : 'false'}
                class={'tabs__item' + (tabActiva === tab.clave ? ' active' : '')}
                href={`?tab=${tab.clave}`}
                data-pz-pestana
              >
                <Icon name={tab.icono} size={16} />
                {tab.etiqueta}
                {tab.clave === 'historial' ? (
                  <span class="tabs__count">{auditLogs.length}</span>
                ) : null}
              </a>
            ))}
          </div>

          {tabActiva === 'usuario' ? <FormularioPortal theme={theme} /> : null}
          {tabActiva === 'panel' ? <FormularioPanel theme={theme} usuario={user.name} /> : null}
          {tabActiva === 'historial' ? <HistorialCambios registros={auditLogs} /> : null}

          <PruebaDeCorreo tab={tabActiva} />
        </div>
      </AdminLayout>
    )
  }
}
