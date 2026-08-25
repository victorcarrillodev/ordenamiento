import type { Handle } from 'remix/ui'

import { adminRoutes } from '../../routes.ts'
import { AdminLayout } from '../../ui/admin/admin-layout.tsx'

export interface AvisosPageProps {
  user: { name: string; role: string }
  avisos: Array<{
    id: number
    titulo: string
    descripcion: string
    activo: boolean
    fecha?: string
  }>
  reuniones?: Array<{
    id: number
    titulo: string
    fecha: string
    hora_inicio?: string
    hora_fin?: string
  }>
  sesiones?: Array<{
    id: number
    categoria: string
    titulo: string
    fecha?: string
    ubicacion?: string
  }>
  error?: string
}

export function AvisosPage(handle: Handle<AvisosPageProps>) {
  return () => {
    const { user, avisos, reuniones = [], sesiones = [], error } = handle.props

    // Generar datos para el calendario del mes actual
    const hoy = new Date()
    const anio = hoy.getFullYear()
    const mes = hoy.getMonth() // 0-indexed
    const nombreMeses = [
      'Enero',
      'Febrero',
      'Marzo',
      'Abril',
      'Mayo',
      'Junio',
      'Julio',
      'Agosto',
      'Septiembre',
      'Octubre',
      'Noviembre',
      'Diciembre',
    ]
    const diasSemana = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']

    // Primer día del mes (0 = domingo, 1 = lunes...)
    const primerDia = new Date(anio, mes, 1).getDay()
    const offsetInicio = primerDia === 0 ? 6 : primerDia - 1 // Lunes = 0
    const totalDias = new Date(anio, mes + 1, 0).getDate()

    // Agrupar eventos por día
    const eventosPorDia: Record<
      number,
      Array<{ tipo: 'aviso' | 'reunion' | 'poel'; titulo: string; subtitulo?: string }>
    > = {}

    // 1) Avisos
    avisos.forEach((a, idx) => {
      // Si no tiene fecha específica, distribuir de muestra o en el día de hoy
      const diaNum = Math.min(totalDias, Math.max(1, hoy.getDate() - idx * 2))
      if (!eventosPorDia[diaNum]) eventosPorDia[diaNum] = []
      eventosPorDia[diaNum].push({
        tipo: 'aviso',
        titulo: a.titulo,
        subtitulo: a.descripcion?.slice(0, 40) + (a.descripcion?.length > 40 ? '…' : ''),
      })
    })

    // 2) Reuniones
    reuniones.forEach((r) => {
      if (r.fecha) {
        const [, m, d] = r.fecha.split('-').map(Number)
        if (m === mes + 1 && d >= 1 && d <= totalDias) {
          if (!eventosPorDia[d]) eventosPorDia[d] = []
          eventosPorDia[d].push({
            tipo: 'reunion',
            titulo: r.titulo,
            subtitulo: r.hora_inicio ? `🕒 ${r.hora_inicio}` : undefined,
          })
        }
      }
    })

    // 3) Sesiones POEL
    sesiones.forEach((s) => {
      if (s.fecha) {
        const [, m, d] = s.fecha.split('-').map(Number)
        if (m === mes + 1 && d >= 1 && d <= totalDias) {
          if (!eventosPorDia[d]) eventosPorDia[d] = []
          eventosPorDia[d].push({
            tipo: 'poel',
            titulo: s.titulo,
            subtitulo: s.ubicacion ? `📍 ${s.ubicacion}` : undefined,
          })
        }
      }
    })

    return (
      <AdminLayout user={user} active="avisos" title="Gestión de Avisos y Calendario">
        <h1 class="page-title">Avisos y Calendario de Bitácora</h1>
        <p class="breadcrumb">
          <a href={adminRoutes.index.href()}>Vista general</a> / Avisos y Calendario
        </p>

        {error ? <p class="form-error">{error}</p> : null}

        {/* Panel Nuevo Aviso */}
        <div class="panel">
          <h2 class="panel__title">Publicar nuevo aviso o comunicado</h2>
          <form
            method="post"
            class="form-row"
            style="display: flex; flex-wrap: wrap; gap: 16px; align-items: flex-end;"
          >
            <div class="form-field" style="flex: 1; min-width: 240px;">
              <label for="titulo">Título del aviso *</label>
              <input
                id="titulo"
                name="titulo"
                required
                placeholder="Ej. Convocatoria a consulta pública..."
              />
            </div>
            <div class="form-field" style="flex: 2; min-width: 280px;">
              <label for="descripcion">Descripción o cuerpo del mensaje</label>
              <input
                id="descripcion"
                name="descripcion"
                placeholder="Detalles, enlaces o indicaciones para la ciudadanía..."
              />
            </div>
            <div class="form-field" style="flex: 1; min-width: 220px;">
              <label for="correo_destino">Enviar copia por correo (opcional)</label>
              <input
                id="correo_destino"
                name="correo_destino"
                type="email"
                placeholder="correo@ejemplo.com"
              />
            </div>
            <button type="submit" class="btn btn--dark" style="height: 42px; margin-bottom: 2px;">
              ＋ Publicar y Notificar
            </button>
          </form>
        </div>

        {/* Panel Calendario de Bitácora */}
        <div class="panel">
          <div
            class="panel__head"
            style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;"
          >
            <div>
              <h2 class="panel__title" style="margin: 0;">
                📅 Calendario de Actividades — {nombreMeses[mes]} {anio}
              </h2>
              <p style="margin: 4px 0 0 0; font-size: 13px; color: #64748B;">
                Agenda institucional integrada: Avisos oficiales, Reuniones de trabajo y Sesiones
                POEL
              </p>
            </div>
            <div style="display: flex; gap: 8px; font-size: 12px;">
              <span style="display: inline-flex; align-items: center; gap: 4px; padding: 4px 8px; background: #FAF5FF; color: #7E22CE; border-radius: 6px; border: 1px solid #E9D5FF; font-weight: 600;">
                📢 Aviso
              </span>
              <span style="display: inline-flex; align-items: center; gap: 4px; padding: 4px 8px; background: #F0FDF4; color: #166534; border-radius: 6px; border: 1px solid #BBF7D0; font-weight: 600;">
                👥 Reunión
              </span>
              <span style="display: inline-flex; align-items: center; gap: 4px; padding: 4px 8px; background: #FEFCE8; color: #854D0E; border-radius: 6px; border: 1px solid #FEF08A; font-weight: 600;">
                🏛️ POEL
              </span>
            </div>
          </div>

          {/* Cuadrícula del Calendario */}
          <div style="border: 1px solid #E2E8F0; border-radius: 12px; overflow: hidden; background: #FFFFFF;">
            {/* Días de la semana */}
            <div style="display: grid; grid-template-columns: repeat(7, 1fr); background: #F8FAFC; border-bottom: 1px solid #E2E8F0; text-align: center; font-weight: 700; font-size: 13px; color: #475569; padding: 10px 0;">
              {diasSemana.map((d) => (
                <div key={d}>{d}</div>
              ))}
            </div>

            {/* Días del mes */}
            <div style="display: grid; grid-template-columns: repeat(7, 1fr); auto-rows: minmax(95px, auto);">
              {/* Días vacíos previos al 1 de mes */}
              {Array.from({ length: offsetInicio }).map((_, i) => (
                <div
                  key={'empty-' + i}
                  style="border-right: 1px solid #F1F5F9; border-bottom: 1px solid #F1F5F9; background: #F8FAFC40;"
                />
              ))}

              {/* Días del mes */}
              {Array.from({ length: totalDias }).map((_, i) => {
                const dia = i + 1
                const esHoy = dia === hoy.getDate()
                const evts = eventosPorDia[dia] || []

                return (
                  <div
                    key={'dia-' + dia}
                    style={`border-right: 1px solid #F1F5F9; border-bottom: 1px solid #F1F5F9; padding: 8px; position: relative; background: ${
                      esHoy ? '#FDF8F6' : '#FFFFFF'
                    };`}
                  >
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
                      <span
                        style={`font-size: 12.5px; font-weight: 800; ${
                          esHoy
                            ? 'background: #8B1E3F; color: #FFFFFF; width: 22px; height: 22px; border-radius: 50%; display: flex; align-items: center; justify-content: center;'
                            : 'color: #334155;'
                        }`}
                      >
                        {dia}
                      </span>
                      {esHoy ? (
                        <span style="font-size: 10px; font-weight: 700; color: #8B1E3F; text-transform: uppercase;">
                          Hoy
                        </span>
                      ) : null}
                    </div>

                    <div style="display: flex; flex-direction: column; gap: 4px;">
                      {evts.map((e, eIdx) => {
                        let bg = '#FAF5FF'
                        let color = '#7E22CE'
                        let border = '#E9D5FF'
                        let icon = '📢'
                        if (e.tipo === 'reunion') {
                          bg = '#F0FDF4'
                          color = '#166534'
                          border = '#BBF7D0'
                          icon = '👥'
                        } else if (e.tipo === 'poel') {
                          bg = '#FEFCE8'
                          color = '#854D0E'
                          border = '#FEF08A'
                          icon = '🏛️'
                        }

                        return (
                          <div
                            key={eIdx}
                            title={`${e.titulo}${e.subtitulo ? ' — ' + e.subtitulo : ''}`}
                            style={`font-size: 11px; padding: 3px 6px; border-radius: 4px; background: ${bg}; color: ${color}; border: 1px solid ${border}; font-weight: 600; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;`}
                          >
                            {icon} {e.titulo}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* Panel Lista de Avisos */}
        <div class="panel">
          <h2 class="panel__title">Avisos registrados en el sistema</h2>
          <div class="table-wrap">
            <table>
              <thead>
                <tr>
                  <th style="width: 25%;">Título</th>
                  <th style="width: 40%;">Descripción</th>
                  <th style="width: 12%;">Estado</th>
                  <th style="width: 23%;">Acciones y Notificación</th>
                </tr>
              </thead>
              <tbody>
                {avisos.length === 0 ? (
                  <tr>
                    <td colspan={4} class="empty">
                      No hay avisos publicados
                    </td>
                  </tr>
                ) : (
                  avisos.map((a) => (
                    <tr key={a.id}>
                      <td style="font-weight: 700; color: #1E293B;">📢 {a.titulo}</td>
                      <td style="color: #475569; font-size: 13.5px;">{a.descripcion || '—'}</td>
                      <td>
                        <span class={'badge ' + (a.activo ? 'procedente' : 'no-procedente')}>
                          {a.activo ? 'Activo' : 'Inactivo'}
                        </span>
                      </td>
                      <td>
                        <div style="display: flex; gap: 8px; align-items: center;">
                          {/* Botón Reenviar por Correo */}
                          <form method="post" style="margin: 0; display: flex; gap: 4px;">
                            <input type="hidden" name="intent" value="enviar_correo" />
                            <input type="hidden" name="id" value={String(a.id)} />
                            <input
                              type="email"
                              name="para"
                              placeholder="Enviar a correo..."
                              required
                              style="font-size: 12px; padding: 4px 8px; width: 140px; height: 32px; border: 1px solid #CBD5E1; border-radius: 6px;"
                            />
                            <button
                              type="submit"
                              class="btn btn--dark"
                              title="Enviar aviso por correo"
                              style="padding: 4px 8px; font-size: 12px; height: 32px;"
                            >
                              ✉️ Enviar
                            </button>
                          </form>

                          {/* Botón Eliminar */}
                          <form method="post" style="margin: 0;">
                            <input type="hidden" name="intent" value="eliminar" />
                            <input type="hidden" name="id" value={String(a.id)} />
                            <button
                              type="submit"
                              class="btn btn--red"
                              title="Eliminar aviso"
                              style="padding: 4px 8px; font-size: 12px; height: 32px;"
                            >
                              🗑
                            </button>
                          </form>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </AdminLayout>
    )
  }
}
