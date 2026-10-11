import { redirect } from 'remix/response/redirect'
import { createController } from 'remix/router'

import {
  backendFetch,
  normalizarImagenesDelTema,
  olvidarTemaPublico,
  requireAdminUser,
} from '../../backend.ts'
import { adminRoutes } from '../../routes.ts'
import { RANURAS_IMAGEN_PORTAL, RANURA_LOGO_PANEL } from './personalizacion-datos.ts'
import { configuracionDelPanel, configuracionDelPortal } from './personalizacion-guardado.ts'
import { PersonalizacionPage, type TabPersonalizacion } from './personalizacion-page.tsx'

const TABS: TabPersonalizacion[] = ['usuario', 'panel', 'historial']

function esTab(valor: unknown): valor is TabPersonalizacion {
  return typeof valor === 'string' && (TABS as string[]).includes(valor)
}

/** Dirección de la pantalla con su pestaña y un mensaje (`msg`) o un error (`err`). */
function volverA(tab: TabPersonalizacion, aviso?: { msg?: string; err?: string }): Response {
  const partes = [`tab=${tab}`]
  if (aviso?.msg) partes.push(`msg=${encodeURIComponent(aviso.msg)}`)
  if (aviso?.err) partes.push(`err=${encodeURIComponent(aviso.err)}`)
  return redirect(`${adminRoutes.personalizacion.index.href()}?${partes.join('&')}`)
}

type Subida = { ok: true; url: string } | { ok: false; error: string }

/**
 * Sube una imagen al backend. Antes, si fallaba (pesaba de más, no era una imagen), el
 * guardado seguía como si nada y la persona creía que su logotipo ya estaba puesto: ahora
 * el fallo se explica y no se guarda nada a medias.
 */
async function subirImagen(request: Request, archivo: File): Promise<Subida> {
  const fd = new FormData()
  fd.set('file', archivo)
  const res = await backendFetch(request, '/api/settings/upload', { method: 'POST', body: fd })
  const datos = (await res.json().catch(() => ({}))) as { url?: string; error?: string }
  if (res.ok && datos.url) return { ok: true, url: datos.url }
  return { ok: false, error: `${archivo.name}: ${datos.error ?? 'no se pudo subir la imagen'}` }
}

/** Los archivos reales de un campo (los vacíos que manda el navegador sin elegir nada, no cuentan). */
function archivosDe(formData: FormData, name: string): File[] {
  return formData.getAll(name).filter((f): f is File => f instanceof File && f.size > 0)
}

export default createController(adminRoutes.personalizacion, {
  actions: {
    async index(context) {
      const user = await requireAdminUser(context.request)
      if (user instanceof Response) return user

      const url = new URL(context.request.url)
      const tabParam = url.searchParams.get('tab')
      const tab = esTab(tabParam) ? tabParam : 'usuario'
      const msg = url.searchParams.get('msg') || undefined
      const err = url.searchParams.get('err') || undefined

      const [themeRes, auditRes] = await Promise.all([
        backendFetch(context.request, '/api/settings/theme'),
        backendFetch(context.request, '/api/settings/audit'),
      ])

      const themeData = themeRes.ok ? await themeRes.json() : { theme: {} }
      // Se normaliza igual que en la portada: las vistas previas deben enseñar
      // lo que el portal va a mostrar de verdad, no una ruta muerta. Y como el
      // formulario parte de estos valores, al guardar se corrige la fila de la
      // base sin que nadie tenga que buscar cuál era la ruta buena.
      normalizarImagenesDelTema(themeData.theme)
      const auditData = auditRes.ok ? await auditRes.json() : { logs: [] }

      return context.render(
        <PersonalizacionPage
          user={user}
          theme={themeData.theme}
          auditLogs={auditData.logs || []}
          tabActiva={tab}
          mensaje={msg}
          error={err}
        />,
      )
    },

    async action(context) {
      const user = await requireAdminUser(context.request)
      if (user instanceof Response) return user

      const formData = await context.request.formData()
      const actionType = String(formData.get('_action') ?? 'save')
      const tabCrudo = formData.get('tab')
      const tab = esTab(tabCrudo) ? tabCrudo : 'usuario'

      // ── Acción: Restaurar snapshot desde auditoría ──
      if (actionType === 'restore') {
        const logId = String(formData.get('log_id') ?? '').trim()
        if (!logId) return volverA('historial', { err: 'ID inválido' })
        const res = await backendFetch(context.request, `/api/settings/restore/${logId}`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ motivo: `Restaurado desde registro de auditoría #${logId}` }),
        })
        if (!res.ok) return volverA('historial', { err: 'Error al restaurar' })
        olvidarTemaPublico()
        return volverA('historial', { msg: 'Versión restaurada correctamente' })
      }

      // ── Acción: Probar SMTP (usa POST /api/mail/test, expone útil de diagnóstico sin PII) ──
      if (actionType === 'testMail') {
        const para = String(formData.get('para') ?? '').trim()
        // Validación estricta anti-CRLF/XSS: bloquea \r\n y rechaza formato email inválido.
        // No basta con contains('@'): un payload con CRLF o <script> pasa ese filtro.
        const emailValido = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(para) && !/[\r\n<>]/.test(para)
        if (!para || !emailValido) return volverA(tab, { err: 'Correo destino inválido' })
        const res = await backendFetch(context.request, '/api/mail/test', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ para }),
        })
        if (!res.ok) {
          const errData = (await res.json().catch(() => ({}))) as { error?: string }
          return volverA(tab, { err: errData.error || `Error SMTP (${res.status})` })
        }
        return volverA(tab, { msg: `Correo de prueba enviado a ${para}` })
      }

      // ── Acción: Guardar configuración ──
      const section = formData.get('section') === 'panel' ? 'panel' : 'usuario'
      const motivo = String(formData.get('motivo') ?? '')
        .trim()
        .slice(0, 200)
      if (!motivo) {
        return volverA(tab, { err: 'El motivo del cambio es obligatorio por seguridad' })
      }

      let config: object
      if (section === 'usuario') {
        // Todas las subidas, antes de guardar nada: si una falla no se guarda a medias.
        const hero = await Promise.all(
          archivosDe(formData, 'archivo_hero').map((f) => subirImagen(context.request, f)),
        )
        const porCampo: Record<string, string> = {}
        const fallos: string[] = []
        for (const r of hero) if (!r.ok) fallos.push(r.error)
        for (const ranura of RANURAS_IMAGEN_PORTAL) {
          const archivo = archivosDe(formData, ranura.archivoName)[0]
          if (!archivo) continue
          const r = await subirImagen(context.request, archivo)
          if (r.ok) porCampo[ranura.archivoName] = r.url
          else fallos.push(r.error)
        }
        if (fallos.length > 0) {
          return volverA('usuario', { err: `No se guardó nada. ${fallos.join(' · ')}` })
        }
        config = configuracionDelPortal(formData, {
          hero: hero.flatMap((r) => (r.ok ? [r.url] : [])),
          porCampo,
        })
      } else {
        const logo = archivosDe(formData, RANURA_LOGO_PANEL.archivoName)[0]
        let logoSubido: string | undefined
        if (logo) {
          const r = await subirImagen(context.request, logo)
          if (!r.ok) return volverA('panel', { err: `No se guardó nada. ${r.error}` })
          logoSubido = r.url
        }
        config = configuracionDelPanel(formData, logoSubido)
      }

      const res = await backendFetch(context.request, '/api/settings/theme', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ config, motivo, section }),
      })
      if (!res.ok) {
        const errData = (await res.json().catch(() => ({}))) as { error?: string }
        return volverA(section === 'panel' ? 'panel' : 'usuario', {
          err: errData.error || 'Error al guardar',
        })
      }

      // El portal guarda el tema unos segundos en memoria: se olvida para que quien acaba
      // de guardar lo vea ya, en lugar de pensar que no se guardó.
      olvidarTemaPublico()
      return volverA(section === 'panel' ? 'panel' : 'usuario', {
        msg:
          section === 'panel'
            ? 'Cambios del panel guardados exitosamente'
            : 'Cambios guardados exitosamente',
      })
    },
  },
})
