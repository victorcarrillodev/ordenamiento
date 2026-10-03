import type { Handle } from 'remix/ui'

import type { EtapaConsulta } from '../../data/consulta.ts'
import { routes } from '../../routes.ts'
import { AdminAlert } from '../../ui/admin/alert.tsx'
import { AdminLayout } from '../../ui/admin/admin-layout.tsx'
import { Icon } from '../../ui/admin/icon.tsx'
import { Button } from '../../ui/button.tsx'

export interface EstadoConsultaAdmin {
  etapa: EtapaConsulta
  inicio: string | null
  cierre: string | null
}

export interface ConsultaPageProps {
  user: { name: string; role: string }
  estado: EstadoConsultaAdmin
  /** Etapa a la que se acaba de pasar, para confirmarlo. */
  cambio?: EtapaConsulta
  error?: string
}

const TITULO: Record<EtapaConsulta, string> = {
  pendiente: 'Pendiente de iniciar',
  abierta: 'Abierta: se reciben participaciones',
  concluida: 'Concluida',
}

const CONFIRMACION: Record<EtapaConsulta, string> = {
  pendiente:
    'Consulta pública: se deshizo el inicio. El Proyecto del Programa vuelve a estar oculto.',
  abierta:
    'La consulta pública está abierta: el Proyecto del Programa es visible y se reciben participaciones.',
  concluida: 'La consulta pública concluyó: ya no se reciben participaciones nuevas.',
}

/** Lo que ve y puede hacer la ciudadanía en cada etapa. */
const CAMBIOS: ReadonlyArray<{ etapa: EtapaConsulta; titulo: string; puntos: string[] }> = [
  {
    etapa: 'pendiente',
    titulo: 'Antes de iniciar',
    puntos: [
      'El apartado «Proyecto del Programa» no se muestra en el portal: puedes cargar y ordenar los documentos desde ahora.',
      'El formulario avisa que la consulta aún no inicia y no se reciben participaciones.',
    ],
  },
  {
    etapa: 'abierta',
    titulo: 'Con la consulta abierta',
    puntos: [
      '«Proyecto del Programa» se hace visible, con los documentos cargados.',
      'Se reciben participaciones en línea y en ventanilla.',
      '«Participaciones y respuestas» muestra los registros a medida que se publican sus versiones públicas.',
    ],
  },
  {
    etapa: 'concluida',
    titulo: 'Al concluir el periodo',
    puntos: [
      'Ya no se reciben participaciones nuevas, en línea ni en ventanilla.',
      'El Proyecto, las participaciones y los oficios publicados siguen disponibles.',
      'El área responsable puede seguir cargando y publicando respuestas.',
      'El portal muestra el mensaje «Consulta pública concluida».',
    ],
  },
]

function fecha(iso: string | null): string {
  if (!iso) return '—'
  const d = new Date(iso)
  return isNaN(d.getTime())
    ? iso
    : d.toLocaleString('es-MX', {
        dateStyle: 'long',
        timeStyle: 'short',
        timeZone: 'America/Mexico_City',
      })
}

function Accion(
  handle: Handle<{
    etapa: EtapaConsulta
    texto: string
    confirmar: string
    variante?: 'dark' | 'outlined'
  }>,
) {
  return () => {
    const { etapa, texto, confirmar, variante = 'dark' } = handle.props
    return (
      <form method="post" data-confirmar={confirmar}>
        <input type="hidden" name="etapa" value={etapa} />
        <Button buttonType="submit" variant={variante}>
          {texto}
        </Button>
      </form>
    )
  }
}

export function ConsultaPage(handle: Handle<ConsultaPageProps>) {
  return () => {
    const { user, estado, cambio, error } = handle.props
    const { etapa } = estado
    return (
      <AdminLayout
        user={user}
        active="consulta"
        title="Consulta pública"
        subtitle="Inicia y concluye el periodo en que se reciben observaciones y propuestas al Proyecto del Programa."
        actions={
          <a
            class="btn btn--white"
            href={routes.poetdum.show.href()}
            target="_blank"
            rel="noreferrer"
          >
            <Icon name="mdi:open-in-new" size={16} /> Ver en el portal
          </a>
        }
      >
        {error ? <AdminAlert type="error" message={error} /> : null}
        {cambio ? <AdminAlert type="success" message={CONFIRMACION[cambio]} /> : null}

        <section
          class={`panel act-programa${etapa === 'abierta' ? ' act-programa--aprobado' : ''}`}
        >
          <h2 class="panel__title panel__title--icono">
            <Icon name="mdi:bullhorn-outline" /> Etapa actual: {TITULO[etapa]}
          </h2>
          <p class="form-hint">
            Inicio: <strong>{fecha(estado.inicio)}</strong> · Cierre:{' '}
            <strong>{fecha(estado.cierre)}</strong>
          </p>

          <div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:12px;">
            {etapa === 'pendiente' ? (
              <Accion
                etapa="abierta"
                texto="Iniciar consulta pública"
                confirmar="¿Iniciar la consulta pública? El Proyecto del Programa se hará visible y se empezarán a recibir participaciones."
              />
            ) : null}
            {etapa === 'abierta' ? (
              <>
                <Accion
                  etapa="concluida"
                  texto="Concluir consulta pública"
                  confirmar="¿Concluir la consulta pública? Dejarán de recibirse participaciones nuevas, en línea y en ventanilla."
                />
                <Accion
                  etapa="pendiente"
                  texto="Deshacer el inicio"
                  variante="outlined"
                  confirmar="¿Deshacer el inicio? El Proyecto del Programa volverá a estar oculto y se dejarán de recibir participaciones."
                />
              </>
            ) : null}
            {etapa === 'concluida' ? (
              <Accion
                etapa="abierta"
                texto="Reabrir la consulta"
                variante="outlined"
                confirmar="¿Reabrir la consulta pública? Volverán a recibirse participaciones nuevas."
              />
            ) : null}
          </div>
        </section>

        <section class="panel">
          <h2 class="panel__title">Qué cambia en cada etapa</h2>
          <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:16px;">
            {CAMBIOS.map((c) => (
              <div key={c.etapa} class={'campo' + (c.etapa === etapa ? ' campo--actual' : '')}>
                <span class="meta-label">
                  {c.titulo}
                  {c.etapa === etapa ? ' · etapa actual' : ''}
                </span>
                <ul style="margin:6px 0 0;padding-left:18px;display:grid;gap:4px;">
                  {c.puntos.map((punto) => (
                    <li key={punto}>{punto}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>
      </AdminLayout>
    )
  }
}
