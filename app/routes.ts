import { form, get, route } from 'remix/routes'

const basePath = (process.env.BASE_PATH ?? '/ordena').replace(/\/$/, '')

export const routes = route({
  assets: get(`${basePath}/assets/*path`),
  home: `${basePath}`,
  homeSlash: `${basePath}/`,
  login: form(`${basePath}/login`),
  participation: form(`${basePath}/participation`),
  poetdum: {
    show: get(`${basePath}/poetdum`),
  },
})

/**
 * Mapa anidado del admin (Bitácora Ambiental).
 * Se mapea completo con UN controller en app/actions/admin/controller.tsx.
 */
export const adminRoutes = route({
  index: get(`${basePath}/admin`),
  reuniones: form(`${basePath}/admin/reuniones`),
  exportar: get(`${basePath}/admin/exportar`),
  usuarios: form(`${basePath}/admin/usuarios`),
  participaciones: get(`${basePath}/admin/participaciones`),
  participacionDetalle: get(`${basePath}/admin/participaciones/:id`),
  participacionNueva: form(`${basePath}/admin/participaciones/nueva`),
  participacionEnviar: form(`${basePath}/admin/participaciones/:id/enviar`),
  word: get(`${basePath}/admin/participaciones/:id/word`),
  adjunto: get(`${basePath}/admin/participaciones/:id/adjuntos/:aid`),
  avisos: form(`${basePath}/admin/avisos`),
  poel: form(`${basePath}/admin/poel`),
  estadisticas: get(`${basePath}/admin/estadisticas`),
  cuenta: get(`${basePath}/admin/cuenta`),
  personalizacion: form(`${basePath}/admin/personalizacion`),
})

