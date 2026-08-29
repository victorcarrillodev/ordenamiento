import { redirect } from 'remix/response/redirect'
import { createController } from 'remix/router'

import { backendFetch, requireAdminUser } from '../../backend.ts'
import { adminRoutes } from '../../routes.ts'
import { PersonalizacionPage } from './personalizacion-page.tsx'

async function uploadFileIfNeeded(request: Request, file: File | null): Promise<string | null> {
  if (!file || !(file instanceof File) || file.size === 0) return null
  const fd = new FormData()
  fd.set('file', file)
  const res = await backendFetch(request, '/api/settings/upload', {
    method: 'POST',
    body: fd,
  })
  if (res.ok) {
    const data = (await res.json()) as { url: string }
    return data.url
  }
  return null
}

export default createController(adminRoutes.personalizacion, {
  actions: {
    async index(context) {
      const user = await requireAdminUser(context.request)
      if (user instanceof Response) return user

      const url = new URL(context.request.url)
      const tab = (url.searchParams.get('tab') as 'usuario' | 'panel' | 'historial') || 'usuario'
      const msg = url.searchParams.get('msg') || undefined
      const err = url.searchParams.get('err') || undefined

      const [themeRes, auditRes] = await Promise.all([
        backendFetch(context.request, '/api/settings/theme'),
        backendFetch(context.request, '/api/settings/audit'),
      ])

      const themeData = themeRes.ok ? await themeRes.json() : { theme: {} }
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
      const tab = String(formData.get('tab') ?? 'usuario')

      // ── Acción: Restaurar snapshot desde auditoría ──
      if (actionType === 'restore') {
        const logId = String(formData.get('log_id') ?? '').trim()
        if (!logId) {
          return redirect(
            `${adminRoutes.personalizacion.index.href()}?tab=historial&err=ID+inválido`,
          )
        }
        const res = await backendFetch(context.request, `/api/settings/restore/${logId}`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ motivo: `Restaurado desde registro de auditoría #${logId}` }),
        })
        if (!res.ok) {
          return redirect(
            `${adminRoutes.personalizacion.index.href()}?tab=historial&err=Error+al+restaurar`,
          )
        }
        return redirect(
          `${adminRoutes.personalizacion.index.href()}?tab=historial&msg=Versión+restaurada+correctamente`,
        )
      }

      // ── Acción: Probar SMTP (usa POST /api/mail/test, expone útil de diagnóstico sin PII) ──
      if (actionType === 'testMail') {
        const para = String(formData.get('para') ?? '').trim()
        const tabRet = String(formData.get('tab') ?? 'usuario')
        // Validación estricta anti-CRLF/XSS: bloquea \r\n y rechaza formato email inválido.
        // No basta con contains('@'): un payload con CRLF o <script> pasa ese filtro.
        const emailValido = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(para) && !/[\r\n<>]/.test(para)
        if (!para || !emailValido) {
          return redirect(
            `${adminRoutes.personalizacion.index.href()}?tab=${tabRet}&err=${encodeURIComponent('Correo destino inválido')}`,
          )
        }
        const res = await backendFetch(context.request, '/api/mail/test', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ para }),
        })
        if (!res.ok) {
          const errData = (await res.json().catch(() => ({}))) as { error?: string }
          const msg = errData.error || `Error SMTP (${res.status})`
          return redirect(
            `${adminRoutes.personalizacion.index.href()}?tab=${tabRet}&err=${encodeURIComponent(msg)}`,
          )
        }
        return redirect(
          `${adminRoutes.personalizacion.index.href()}?tab=${tabRet}&msg=${encodeURIComponent(`Correo de prueba enviado a ${para}`)}`,
        )
      }

      // ── Acción: Guardar configuración ──
      const section = String(formData.get('section') ?? 'usuario') as 'usuario' | 'panel'
      const motivo = String(formData.get('motivo') ?? '').trim()
      if (!motivo) {
        return redirect(
          `${adminRoutes.personalizacion.index.href()}?tab=${tab}&err=El+motivo+del+cambio+es+obligatorio+por+seguridad`,
        )
      }

      if (section === 'usuario') {
        // Manejar subida de fotos
        const fileHero = formData.get('archivo_hero') as File | null
        const fileNavLogo = formData.get('archivo_logo_navbar') as File | null
        const fileFooterLogo = formData.get('archivo_logo_footer') as File | null
        const fileEcoImg = formData.get('archivo_imagen_ecologia') as File | null
        const fileProgramaImg = formData.get('archivo_imagen_programa') as File | null

        const [
          uploadedHero,
          uploadedNavLogo,
          uploadedFooterLogo,
          uploadedEcoImg,
          uploadedProgramaImg,
        ] = await Promise.all([
          uploadFileIfNeeded(context.request, fileHero),
          uploadFileIfNeeded(context.request, fileNavLogo),
          uploadFileIfNeeded(context.request, fileFooterLogo),
          uploadFileIfNeeded(context.request, fileEcoImg),
          uploadFileIfNeeded(context.request, fileProgramaImg),
        ])

        const rawHeroImages = formData.getAll('hero_imagenes[]').map(String).filter(Boolean)
        if (uploadedHero) {
          rawHeroImages.push(uploadedHero)
        }

        const config = {
          usuario: {
            colores: {
              primario: String(formData.get('color_primario') ?? '#8c1d3d'),
              acento: String(formData.get('color_acento') ?? '#e0b84a'),
              secundario: String(formData.get('color_secundario') ?? '#2d6a4f'),
              navbarFondo: String(formData.get('color_navbar_fondo') ?? '#ffffff'),
              navbarTexto: String(formData.get('color_navbar_texto') ?? '#1a1d26'),
              footerFondo: String(formData.get('color_footer_fondo') ?? '#0f1117'),
              footerTexto: String(formData.get('color_footer_texto') ?? '#ffffff'),
            },
            imagenes: {
              logoNavbar: uploadedNavLogo || String(formData.get('logo_navbar') ?? ''),
              logoFooter: uploadedFooterLogo || String(formData.get('logo_footer') ?? ''),
              heroImagenes: rawHeroImages.length > 0 ? rawHeroImages : undefined,
              imagenEcologia: uploadedEcoImg || String(formData.get('imagen_ecologia') ?? ''),
              imagenPrograma: uploadedProgramaImg || String(formData.get('imagen_programa') ?? ''),
            },
            iconos: {
              cardPrograma: String(formData.get('ico_card1') ?? '🏛️'),
              cardProceso: String(formData.get('ico_card2') ?? '⚙️'),
              cardCalendario: String(formData.get('ico_card3') ?? '📅'),
              cardDocumentos: String(formData.get('ico_card4') ?? '📄'),
            },
            textos: {
              heroCintillo: String(formData.get('txt_hero_cintillo') ?? ''),
              heroTitulo: String(formData.get('txt_hero_titulo') ?? ''),
              heroTituloResaltado: String(formData.get('txt_hero_resaltado') ?? ''),
              heroSubtitulo: String(formData.get('txt_hero_subtitulo') ?? ''),
              heroBtn1: String(formData.get('txt_hero_btn1') ?? 'Conoce el programa'),
              heroBtn2: String(formData.get('txt_hero_btn2') ?? 'Registra tu participación'),
              card1Titulo: String(formData.get('txt_card1_titulo') ?? ''),
              card1Desc: String(formData.get('txt_card1_desc') ?? ''),
              card2Titulo: String(formData.get('txt_card2_titulo') ?? ''),
              card2Desc: String(formData.get('txt_card2_desc') ?? ''),
              card3Titulo: String(formData.get('txt_card3_titulo') ?? ''),
              card3Desc: String(formData.get('txt_card3_desc') ?? ''),
              card4Titulo: String(formData.get('txt_card4_titulo') ?? ''),
              card4Desc: String(formData.get('txt_card4_desc') ?? ''),
              footerEntidad: String(formData.get('txt_footer_entidad') ?? ''),
              footerEmail: String(formData.get('txt_footer_email') ?? ''),
              footerContacto: String(formData.get('txt_footer_contacto') ?? ''),
            },
          },
        }

        const res = await backendFetch(context.request, '/api/settings/theme', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ config, motivo, section: 'usuario' }),
        })

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}))
          return redirect(
            `${adminRoutes.personalizacion.index.href()}?tab=usuario&err=${encodeURIComponent(errData.error || 'Error al guardar')}`,
          )
        }

        return redirect(
          `${adminRoutes.personalizacion.index.href()}?tab=usuario&msg=Cambios+guardados+exitosamente`,
        )
      } else if (section === 'panel') {
        const fileAdminLogo = formData.get('archivo_admin_logo') as File | null
        const uploadedAdminLogo = await uploadFileIfNeeded(context.request, fileAdminLogo)

        const config = {
          panel: {
            sidebarFondo: String(formData.get('panel_sidebar_fondo') ?? '#ffffff'),
            sidebarTexto: String(formData.get('panel_sidebar_texto') ?? '#475066'),
            topbarFondo: String(formData.get('panel_topbar_fondo') ?? '#2e3440'),
            colorAcento: String(formData.get('panel_color_acento') ?? '#2563eb'),
            adminBg: String(formData.get('panel_admin_bg') ?? '#f4f6fb'),
            adminLogo: uploadedAdminLogo || String(formData.get('panel_admin_logo') ?? ''),
            adminTitulo: String(formData.get('panel_admin_titulo') ?? ''),
          },
        }

        const res = await backendFetch(context.request, '/api/settings/theme', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ config, motivo, section: 'panel' }),
        })

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}))
          return redirect(
            `${adminRoutes.personalizacion.index.href()}?tab=panel&err=${encodeURIComponent(errData.error || 'Error al guardar')}`,
          )
        }

        return redirect(
          `${adminRoutes.personalizacion.index.href()}?tab=panel&msg=Cambios+del+panel+guardados+exitosamente`,
        )
      }

      return redirect(adminRoutes.personalizacion.index.href())
    },
  },
})
