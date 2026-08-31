import { form, get, post, route } from 'remix/routes'

const basePath = (process.env.BASE_PATH ?? '/ordena').replace(/\/$/, '')

export const routes = route({
  assets: get(`${basePath}/assets/*path`),
  home: `${basePath}`,
  homeSlash: `${basePath}/`,
  colonias: get(`${basePath}/api/colonias`),
  login: form(`${basePath}/login`),
  participationLogin: get(`${basePath}/participation/login`),
  logout: post(`${basePath}/logout`),
  participation: form(`${basePath}/participation`),
  poetdum: {
    show: get(`${basePath}/poetdum`),
    sesionImagen: get(`${basePath}/poetdum/sesiones/:id/imagen`),
    actividades: {
      show: get(`${basePath}/poetdum/actividades`),
      // Proxy de la foto servida por el backend (el navegador no accede al
      // backend directamente; el patrón del repo es proxear con backendFetch).
      foto: get(`${basePath}/poetdum/actividades/:id/fotos/:fid`),
    },
    documentos: {
      show: get(`${basePath}/poetdum/documentos`),
      // Proxy de descarga de archivo del repositorio de documentos.
      archivo: get(`${basePath}/poetdum/documentos/:id/archivo`),
    },
    indicadores: { show: get(`${basePath}/poetdum/indicadores`) },
  },
  error: get(`${basePath}/error/:code`),
  errorDefault: get(`${basePath}/error`),
})

/**
 * Mapa anidado del admin (Bitácora Ambiental).
 * Las rutas fijas y específicas (/nueva, /enviar, etc.) se definen antes
 * de los parámetros dinámicos (/:id) para evitar que :id capture rutas fijas.
 */
export const adminRoutes = route({
  index: get(`${basePath}/admin`),
  reuniones: form(`${basePath}/admin/reuniones`),
  exportar: get(`${basePath}/admin/exportar`),
  usuarios: form(`${basePath}/admin/usuarios`),
  participacionNueva: form(`${basePath}/admin/participaciones/nueva`),
  participaciones: get(`${basePath}/admin/participaciones`),
  participacionEnviar: form(`${basePath}/admin/participaciones/:id/enviar`),
  participacionResolver: form(`${basePath}/admin/participaciones/:id/resolucion`),
  word: get(`${basePath}/admin/participaciones/:id/word`),
  adjunto: get(`${basePath}/admin/participaciones/:id/adjuntos/:aid`),
  participacionDetalle: get(`${basePath}/admin/participaciones/:id`),
  avisos: form(`${basePath}/admin/avisos`),
  poel: form(`${basePath}/admin/poel`),
  poelImagen: get(`${basePath}/admin/poel/:id/imagen`),
  poelArchivo: get(`${basePath}/admin/poel/archivos/:aid`),
  actividades: form(`${basePath}/admin/actividades`),
  documentos: form(`${basePath}/admin/documentos`),
  indicadores: form(`${basePath}/admin/indicadores`),
  estadisticas: get(`${basePath}/admin/estadisticas`),
  cuenta: form(`${basePath}/admin/cuenta`),
  cuentaAvatar: get(`${basePath}/admin/cuenta/avatar`),
  personalizacion: form(`${basePath}/admin/personalizacion`),
})
