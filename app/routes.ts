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
  },
  
  test:{
    show:get(`${basePath}/poetdum`)
  }

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
  word: get(`${basePath}/admin/participaciones/:id/word`),
  adjunto: get(`${basePath}/admin/participaciones/:id/adjuntos/:aid`),
  participacionDetalle: get(`${basePath}/admin/participaciones/:id`),
  avisos: form(`${basePath}/admin/avisos`),
  poel: form(`${basePath}/admin/poel`),
  estadisticas: get(`${basePath}/admin/estadisticas`),
  cuenta: get(`${basePath}/admin/cuenta`),
  personalizacion: form(`${basePath}/admin/personalizacion`),
})
