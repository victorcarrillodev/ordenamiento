import type { Handle } from 'remix/ui'
import { css } from 'remix/ui'
import { colors, FONT_STACK } from '../ui/civic-horizon.ts'
import { NavBar } from '../ui/nav-bar.tsx'
import { Document } from './document.tsx'

export type HttpErrorCode = 400 | 401 | 403 | 404 | 429 | 500 | 502 | 503 | 504

export interface ErrorInfo {
  code: number
  badge: string
  title: string
  description: string
  image: string
  primaryAction: {
    label: string
    href: string
    icon: string
  }
  secondaryAction?: {
    label: string
    href: string
    icon: string
  }
}

const basePath = (process.env.BASE_PATH ?? '/ordena').replace(/\/$/, '')

export const ERROR_CATALOG: Record<number, ErrorInfo> = {
  400: {
    code: 400,
    badge: 'Solicitud Incorrecta',
    title: 'No pudimos procesar tu solicitud',
    description:
      'La petición enviada contiene parámetros no válidos, incompletos o con un formato que el servidor no puede interpretar. Por favor verifica la información ingresada.',
    image: `${basePath}/assets/img/vector/vector_2.webp`,
    primaryAction: {
      label: 'Volver al inicio',
      href: `${basePath}`,
      icon: 'mdi:home',
    },
    secondaryAction: {
      label: 'Registrar participación',
      href: `${basePath}/participation`,
      icon: 'mdi:file-document-edit',
    },
  },
  401: {
    code: 401,
    badge: 'Sesión Requerida',
    title: 'Acceso no autorizado',
    description:
      'Para consultar este módulo necesitas contar con una sesión activa en el portal de administración del Programa de Ordenamiento Territorial.',
    image: `${basePath}/assets/img/vector/vector_3.webp`,
    primaryAction: {
      label: 'Iniciar sesión',
      href: `${basePath}/login`,
      icon: 'mdi:login',
    },
    secondaryAction: {
      label: 'Volver al inicio',
      href: `${basePath}`,
      icon: 'mdi:home',
    },
  },
  403: {
    code: 403,
    badge: 'Acceso Restringido',
    title: 'Permisos insuficientes',
    description:
      'Tu cuenta no cuenta con los privilegios administrativos requeridos para ver o modificar esta sección. Si consideras que se trata de un error, contacta al administrador del sistema.',
    image: `${basePath}/assets/img/vector/vector_3.webp`,
    primaryAction: {
      label: 'Ir a mi cuenta',
      href: `${basePath}/admin/cuenta`,
      icon: 'mdi:account-cog',
    },
    secondaryAction: {
      label: 'Volver al inicio',
      href: `${basePath}`,
      icon: 'mdi:home',
    },
  },
  404: {
    code: 404,
    badge: 'Página No Encontrada',
    title: 'El territorio que buscas no está en el mapa',
    description:
      'La dirección o recurso que intentas consultar no existe, fue movido o el enlace está desactualizado. Puedes explorar el portal desde la página principal o consultar el POETDUM.',
    image: `${basePath}/assets/img/vector/vector_1.webp`,
    primaryAction: {
      label: 'Volver al inicio',
      href: `${basePath}`,
      icon: 'mdi:home',
    },
    secondaryAction: {
      label: 'Subir participación',
      href: `${basePath}/participation`,
      icon: 'mdi:file-document-edit',
    },
  },
  429: {
    code: 429,
    badge: 'Límite de Peticiones',
    title: 'Demasiadas solicitudes en poco tiempo',
    description:
      'Hemos detectado una cantidad inusual de peticiones desde tu conexión. Por motivos de seguridad y estabilidad del servicio, por favor espera unos segundos antes de volver a intentar.',
    image: `${basePath}/assets/img/vector/vector_5.webp`,
    primaryAction: {
      label: 'Reintentar ahora',
      href: `${basePath}`,
      icon: 'mdi:refresh',
    },
    secondaryAction: {
      label: 'Volver al inicio',
      href: `${basePath}`,
      icon: 'mdi:home',
    },
  },
  500: {
    code: 500,
    badge: 'Error del Servidor',
    title: 'Ocurrió un problema inesperado',
    description:
      'El servidor experimentó un error interno mientras procesaba tu petición. Nuestro equipo de soporte técnico ha sido notificado para resolverlo lo antes posible.',
    image: `${basePath}/assets/img/vector/vector_4.webp`,
    primaryAction: {
      label: 'Volver a la portada',
      href: `${basePath}`,
      icon: 'mdi:home',
    },
    secondaryAction: {
      label: 'Ir a participar',
      href: `${basePath}/participation`,
      icon: 'mdi:file-document-edit',
    },
  },
  502: {
    code: 502,
    badge: 'Puerta de Enlace Incorrecta',
    title: 'Error de comunicación con el backend',
    description:
      'El servidor intermedio no recibió una respuesta válida del servicio principal de base de datos o autenticación. Por favor intenta nuevamente en unos momentos.',
    image: `${basePath}/assets/img/vector/vector_4.webp`,
    primaryAction: {
      label: 'Reintentar',
      href: `${basePath}`,
      icon: 'mdi:refresh',
    },
    secondaryAction: {
      label: 'Volver al inicio',
      href: `${basePath}`,
      icon: 'mdi:home',
    },
  },
  503: {
    code: 503,
    badge: 'Servicio No Disponible',
    title: 'Sistema en mantenimiento programado',
    description:
      'Estamos realizando labores de optimización o actualización en el portal de Ordenamiento Territorial de San Pedro Tlaquepaque. Estaremos de vuelta muy pronto.',
    image: `${basePath}/assets/img/vector/vector_4.webp`,
    primaryAction: {
      label: 'Comprobar disponibilidad',
      href: `${basePath}`,
      icon: 'mdi:refresh',
    },
    secondaryAction: {
      label: 'Consultar POETDUM',
      href: `${basePath}/poetdum`,
      icon: 'mdi:map-search',
    },
  },
  504: {
    code: 504,
    badge: 'Tiempo de Espera Agotado',
    title: 'El servidor tardó demasiado en responder',
    description:
      'La solicitud tardó más tiempo del esperado en procesarse. Te sugerimos revisar tu conexión a internet o intentar de nuevo en un momento.',
    image: `${basePath}/assets/img/vector/vector_4.webp`,
    primaryAction: {
      label: 'Reintentar',
      href: `${basePath}`,
      icon: 'mdi:refresh',
    },
    secondaryAction: {
      label: 'Volver al inicio',
      href: `${basePath}`,
      icon: 'mdi:home',
    },
  },
}

export interface ErrorPageProps {
  code?: number
  customTitle?: string
  customDescription?: string
}

export function ErrorPage(handle: Handle<ErrorPageProps>) {
  return () => {
    const { code = 404, customTitle, customDescription } = handle.props
    const info = ERROR_CATALOG[code] ?? ERROR_CATALOG[404]

    const title = customTitle || info.title
    const description = customDescription || info.description

    const pageWrapperStyle = css({
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      backgroundColor: '#f8fafc',
      fontFamily: FONT_STACK,
      paddingTop: '85px',
      color: colors.gray900,
    })

    const mainContainerStyle = css({
      flex: 1,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '48px 24px',
    })

    const cardStyle = css({
      maxWidth: '880px',
      width: '100%',
      backgroundColor: '#ffffff',
      borderRadius: '16px',
      boxShadow: '0 10px 40px -10px rgba(15, 23, 42, 0.08), 0 0 1px 1px rgba(15, 23, 42, 0.05)',
      overflow: 'hidden',
      display: 'grid',
      gridTemplateColumns: '1.1fr 0.9fr',
      '@media (max-width: 768px)': {
        gridTemplateColumns: '1fr',
      },
    })

    const contentSectionStyle = css({
      padding: '48px 40px',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      '@media (max-width: 480px)': {
        padding: '32px 24px',
      },
    })

    const imageSectionStyle = css({
      backgroundColor: '#fdf8f9',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '40px',
      borderLeft: '1px solid rgba(140, 29, 61, 0.06)',
      position: 'relative',
      overflow: 'hidden',
      '@media (max-width: 768px)': {
        borderLeft: 'none',
        borderTop: '1px solid rgba(140, 29, 61, 0.06)',
        padding: '32px 24px',
      },
    })

    const badgeStyle = css({
      display: 'inline-flex',
      alignItems: 'center',
      gap: '6px',
      fontSize: '12px',
      fontWeight: 700,
      textTransform: 'uppercase',
      letterSpacing: '0.08em',
      color: colors.burgundy900,
      backgroundColor: 'rgba(140, 29, 61, 0.08)',
      padding: '4px 12px',
      borderRadius: '20px',
      width: 'fit-content',
      marginBottom: '16px',
    })

    const codeDisplayStyle = css({
      fontSize: 'clamp(48px, 6vw, 68px)',
      fontWeight: 900,
      lineHeight: 1,
      letterSpacing: '-0.03em',
      color: colors.burgundy900,
      margin: '0 0 12px 0',
      display: 'flex',
      alignItems: 'baseline',
      gap: '12px',
    })

    const titleStyle = css({
      fontSize: '22px',
      fontWeight: 700,
      color: '#1e293b',
      lineHeight: 1.35,
      margin: '0 0 14px 0',
    })

    const descriptionStyle = css({
      fontSize: '14.5px',
      color: '#64748b',
      lineHeight: 1.6,
      margin: '0 0 28px 0',
    })

    const actionsContainerStyle = css({
      display: 'flex',
      flexWrap: 'wrap',
      gap: '12px',
      alignItems: 'center',
    })

    const primaryBtnStyle = css({
      display: 'inline-flex',
      alignItems: 'center',
      gap: '8px',
      backgroundColor: colors.burgundy900,
      color: '#ffffff',
      padding: '12px 24px',
      borderRadius: '8px',
      fontSize: '14px',
      fontWeight: 600,
      textDecoration: 'none',
      boxShadow: '0 4px 14px rgba(140, 29, 61, 0.25)',
      transition: 'all 160ms ease',
      '&:hover': {
        backgroundColor: colors.burgundy800,
        transform: 'translateY(-1px)',
        boxShadow: '0 6px 20px rgba(140, 29, 61, 0.35)',
      },
    })

    const secondaryBtnStyle = css({
      display: 'inline-flex',
      alignItems: 'center',
      gap: '8px',
      backgroundColor: '#f1f5f9',
      color: '#334155',
      padding: '12px 20px',
      borderRadius: '8px',
      fontSize: '14px',
      fontWeight: 600,
      textDecoration: 'none',
      border: '1px solid #cbd5e1',
      transition: 'all 160ms ease',
      '&:hover': {
        backgroundColor: '#e2e8f0',
        color: '#0f172a',
      },
    })

    return (
      <Document
        title={`Error ${info.code} – ${info.badge} · Portal de Ordenamiento Territorial`}
        description={description}
      >
        <NavBar />
        <div mix={pageWrapperStyle}>
          <div mix={mainContainerStyle}>
            <div mix={cardStyle}>
              <div mix={contentSectionStyle}>
                <div mix={badgeStyle}>
                  <span>⚠️</span>
                  <span>{info.badge}</span>
                </div>

                <div mix={codeDisplayStyle}>
                  <span>{info.code}</span>
                </div>

                <h1 mix={titleStyle}>{title}</h1>
                <p mix={descriptionStyle}>{description}</p>

                <div mix={actionsContainerStyle}>
                  <a href={info.primaryAction.href} mix={primaryBtnStyle}>
                    <iconify-icon icon={info.primaryAction.icon} width="18" height="18" />
                    <span>{info.primaryAction.label}</span>
                  </a>

                  {info.secondaryAction && (
                    <a href={info.secondaryAction.href} mix={secondaryBtnStyle}>
                      <iconify-icon icon={info.secondaryAction.icon} width="18" height="18" />
                      <span>{info.secondaryAction.label}</span>
                    </a>
                  )}
                </div>
              </div>

              <div mix={imageSectionStyle}>
                <img
                  src={info.image}
                  alt=""
                  style="max-width: 100%; max-height: 280px; object-fit: contain; filter: drop-shadow(0 12px 24px rgba(140, 29, 61, 0.12)); border-radius: 12px;"
                />
              </div>
            </div>
          </div>

          <footer
            mix={css({
              textAlign: 'center',
              padding: '24px',
              fontSize: '12px',
              color: '#94a3b8',
              borderTop: '1px solid #e2e8f0',
              backgroundColor: '#ffffff',
            })}
          >
            <p style="margin: 0;">
              Gobierno Municipal de San Pedro Tlaquepaque · Coordinación General de Gestión Integral
              de la Ciudad
            </p>
          </footer>
        </div>
      </Document>
    )
  }
}
