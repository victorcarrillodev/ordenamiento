import type { Handle } from 'remix/ui'

import {
  ETIQUETA_ESTADO,
  nombreDeArchivo,
  pesoLegible,
  separarArchivos,
  TIPOS_ARCHIVO,
  type ActividadGestion,
  type ArchivoActividad,
} from '../../data/programa.ts'
import { adminRoutes, routes } from '../../routes.ts'
import { AdminAlert } from '../../ui/admin/alert.tsx'
import { AdminLayout } from '../../ui/admin/admin-layout.tsx'
import { Icon } from '../../ui/admin/icon.tsx'
import { Button } from '../../ui/button.tsx'
import { fechaLarga } from '../../utils/calendario.ts'
import { ACUSES, type Acuse, type ValoresActividad } from './actividad-datos.ts'
import { ActividadFormulario } from './actividad-form.tsx'

export interface ActividadPageProps {
  user: { name: string; role: string }
  valores: ValoresActividad
  /** Solo al editar: el registro guardado, con sus archivos y su visibilidad. */
  actividad?: ActividadGestion
  error?: string
  acuse?: Acuse
}

/** Resumen de dónde aparece hoy la actividad: el sistema lo decide, aquí se explica. */
function DondeAparece(handle: Handle<{ actividad: ActividadGestion }>) {
  return () => {
    const { actividad: a } = handle.props
    const v = a.visibilidad
    const publicada = a.publicacion === 'publicado'
    const aviso =
      v.aviso === 'vigente'
        ? `en la franja de avisos hasta el ${fechaLarga(a.aviso_fin ?? a.fecha)}`
        : v.aviso === 'programado'
          ? `desde el ${fechaLarga(a.aviso_inicio ?? a.fecha)}`
          : v.aviso === 'vencido'
            ? 'su vigencia ya terminó'
            : 'sin aviso'
    const lugares: Array<{ nombre: string; si: boolean; nota?: string }> = [
      { nombre: 'Próximas actividades', si: v.proximas },
      { nombre: 'Calendario de actividades', si: v.calendario },
      { nombre: 'Avances del Programa', si: v.avances },
      { nombre: 'Aviso en la portada', si: publicada && v.aviso === 'vigente', nota: aviso },
    ]
    return (
      <section class="panel act-visibilidad" aria-labelledby="donde-aparece">
        <h2 id="donde-aparece" class="panel__title panel__title--icono">
          <Icon name="mdi:eye-outline" /> Dónde aparece hoy en el portal
        </h2>
        {publicada ? null : (
          <p class="act-visibilidad__nota">
            Está en <strong>{a.publicacion === 'borrador' ? 'borrador' : 'oculta'}</strong>: no se
            muestra en ninguna sección pública hasta que la publiques.
          </p>
        )}
        <ul class="act-visibilidad__lista">
          {lugares.map((l) => (
            <li key={l.nombre} class={l.si ? 'si' : 'no'}>
              <Icon name={l.si ? 'mdi:check-circle' : 'mdi:minus-circle-outline'} size={16} />
              <span>
                {l.nombre}
                {l.nota ? <small> · {l.nota}</small> : null}
              </span>
            </li>
          ))}
        </ul>
        {v.fechaPasada ? (
          <AdminAlert type="warning">
            La fecha ya pasó y sigue como «{ETIQUETA_ESTADO[a.estado]}». Si ya se realizó, cámbiala
            a «Realizada» y agrega su resultado: aparecerá en Avances del Programa.
          </AdminAlert>
        ) : null}
      </section>
    )
  }
}

function ArchivoFila(handle: Handle<{ archivo: ArchivoActividad }>) {
  return () => {
    const { archivo } = handle.props
    const ver = routes.poetdum.archivo.href({ aid: archivo.id })
    const nombre = nombreDeArchivo(archivo)
    return (
      <li class="act-archivo">
        <div class="act-archivo__info">
          {archivo.tipo === 'Fotografía' ? (
            <img class="act-archivo__miniatura" src={ver} alt="" loading="lazy" />
          ) : (
            <span class="act-archivo__icono" aria-hidden="true">
              <Icon name="mdi:file-document-outline" size={22} />
            </span>
          )}
          <div class="act-archivo__texto">
            <strong title={archivo.nombre_original}>{nombre}</strong>
            <small>
              {archivo.tipo}
              {pesoLegible(archivo.size) ? ` · ${pesoLegible(archivo.size)}` : ''}
            </small>
          </div>
        </div>
        <form method="post" class="act-archivo__editar">
          <input type="hidden" name="intent" value="archivo_editar" />
          <input type="hidden" name="aid" value={archivo.id} />
          <select name="tipo" aria-label={`Tipo de ${nombre}`}>
            {TIPOS_ARCHIVO.map((t) => (
              <option key={t} value={t} selected={t === archivo.tipo}>
                {t}
              </option>
            ))}
          </select>
          <input
            name="titulo"
            maxlength={300}
            value={archivo.titulo}
            placeholder={archivo.nombre_original}
            aria-label={`Nombre visible de ${nombre}`}
          />
          <Button buttonType="submit" variant="outlined" size="sm" title="Guardar tipo y nombre">
            <Icon name="mdi:content-save-outline" />
          </Button>
        </form>
        <div class="act-archivo__acciones">
          <a class="btn btn--white btn--sm" href={ver} target="_blank" rel="noopener">
            <Icon name="mdi:eye-outline" /> Ver
          </a>
          <a class="btn btn--white btn--sm" href={`${ver}?download=1`}>
            <Icon name="mdi:download" /> Descargar
          </a>
          <form
            method="post"
            class="act-inline"
            data-confirmar={`¿Quitar «${nombre}» de la actividad? El archivo se elimina.`}
          >
            <input type="hidden" name="intent" value="archivo_quitar" />
            <input type="hidden" name="aid" value={archivo.id} />
            <Button buttonType="submit" variant="danger" size="sm" title={`Quitar ${nombre}`}>
              <Icon name="mdi:trash-can-outline" />
            </Button>
          </form>
        </div>
      </li>
    )
  }
}

function ArchivosCargados(handle: Handle<{ actividad: ActividadGestion }>) {
  return () => {
    const { actividad } = handle.props
    const archivos = actividad.archivos ?? []
    const { fotos, documentos } = separarArchivos(archivos)
    return (
      <section class="panel act-seccion" aria-labelledby="archivos-cargados">
        <div class="panel__head">
          <h2 id="archivos-cargados" class="panel__title panel__title--icono" style="margin:0;">
            <Icon name="mdi:folder-outline" /> Archivos de la actividad
          </h2>
          <span class="conteo">{archivos.length}</span>
        </div>
        {archivos.length === 0 ? (
          <p class="empty">
            Todavía no tiene archivos. Súbelos en «Fotografías y documentos» y guarda.
          </p>
        ) : (
          <ul class="act-archivos">
            {[...documentos, ...fotos].map((archivo) => (
              <ArchivoFila key={archivo.id} archivo={archivo} />
            ))}
          </ul>
        )}
      </section>
    )
  }
}

export function ActividadPage(handle: Handle<ActividadPageProps>) {
  return () => {
    const { user, valores, actividad, error, acuse } = handle.props
    const titulo = actividad ? 'Editar actividad' : 'Agregar actividad'
    return (
      <AdminLayout
        user={user}
        active="actividades"
        title={titulo}
        subtitle={
          actividad
            ? 'Actualiza este mismo registro: su estado, resultados, acuerdos y documentos. El portal lo reubica solo.'
            : 'Regístrala una sola vez: el portal la mostrará como próxima, en el calendario o en los avances según su fecha y estado.'
        }
        breadcrumb={
          <>
            <a href={adminRoutes.actividades.index.href()}>Actividades y avances</a>
            <span class="breadcrumb__sep" aria-hidden="true">
              /
            </span>
            {titulo}
          </>
        }
        actions={
          <>
            <a class="btn btn--white" href={adminRoutes.actividades.index.href()}>
              <Icon name="mdi:arrow-left" size={16} /> Volver a la lista
            </a>
            {actividad && actividad.publicacion === 'publicado' ? (
              <a
                class="btn btn--white"
                href={routes.poetdum.actividades.detalle.href({ id: actividad.id })}
                target="_blank"
                rel="noopener"
              >
                <Icon name="mdi:open-in-new" size={16} /> Ver en el portal
              </a>
            ) : null}
          </>
        }
      >
        {error ? <AdminAlert type="error" message={error} /> : null}
        {acuse ? <AdminAlert type="success" message={ACUSES[acuse]} /> : null}

        {actividad ? <DondeAparece actividad={actividad} /> : null}

        <ActividadFormulario
          valores={valores}
          enviar={actividad ? 'Guardar cambios' : 'Guardar actividad'}
        />

        {actividad ? <ArchivosCargados actividad={actividad} /> : null}

        {actividad && actividad.aviso_activo ? (
          <section class="panel act-seccion" aria-labelledby="aviso-correo">
            <h2 id="aviso-correo" class="panel__title panel__title--icono">
              <Icon name="mdi:email-fast-outline" /> Enviar el aviso por correo
            </h2>
            <form method="post" class="act-correo">
              <input type="hidden" name="intent" value="enviar_aviso" />
              <div class="form-field">
                <label for="para">Correo destino</label>
                <input
                  id="para"
                  name="para"
                  type="email"
                  required
                  placeholder="correo@ejemplo.mx"
                />
              </div>
              <Button buttonType="submit" variant="dark">
                <Icon name="mdi:send-outline" /> Enviar
              </Button>
            </form>
          </section>
        ) : null}

        {actividad ? (
          <section class="panel act-peligro" aria-labelledby="eliminar-actividad">
            <h2 id="eliminar-actividad" class="panel__title panel__title--icono">
              <Icon name="mdi:alert-outline" /> Eliminar actividad
            </h2>
            <p class="form-hint">
              Borra la actividad del portal junto con sus archivos. Si solo quieres retirarla de la
              vista pública, cambia su estado de publicación a «Oculto».
            </p>
            <form
              method="post"
              data-confirmar={`¿Eliminar «${actividad.titulo}» y todos sus archivos? No se puede deshacer.`}
            >
              <input type="hidden" name="intent" value="eliminar" />
              <Button buttonType="submit" variant="danger">
                <Icon name="mdi:trash-can-outline" /> Eliminar actividad
              </Button>
            </form>
          </section>
        ) : null}
      </AdminLayout>
    )
  }
}
