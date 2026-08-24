import { form, get, route } from 'remix/routes'

export const routes = route({
  assets: get('/assets/*path'),
  home: '/',
  login: form('login'),
  participation: form('participation'),

  poetdum:{
    show:get("/poetdum")
  }

})

/**
 * Mapa anidado del admin (Bitácora Ambiental).
 * Se mapea completo con UN controller en app/actions/admin/controller.tsx.
 */
export const adminRoutes = route({
  index: get('admin'),
  reuniones: form('admin/reuniones'),
  exportar: get('admin/exportar'),
  usuarios: form('admin/usuarios'),
  participaciones: get('admin/participaciones'),
  participacionDetalle: get('admin/participaciones/:id'),
  participacionNueva: form('admin/participaciones/nueva'),
  participacionEnviar: form('admin/participaciones/:id/enviar'),
  word: get('admin/participaciones/:id/word'),
  adjunto: get('admin/participaciones/:id/adjuntos/:aid'),
  avisos: form('admin/avisos'),
  poel: form('admin/poel'),
  estadisticas: get('admin/estadisticas'),
  cuenta: get('admin/cuenta'),
})
