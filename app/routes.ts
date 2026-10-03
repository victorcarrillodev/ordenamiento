import { form, get, post, route } from 'remix/routes'

const basePath = (process.env.BASE_PATH ?? '/ordena').replace(/\/$/, '')

export const routes = route({
  assets: get(`${basePath}/assets/*path`),
  home: `${basePath}`,
  homeSlash: `${basePath}/`,
  colonias: get(`${basePath}/api/colonias`),
  login: form(`${basePath}/login`),
  // Recuperación de contraseña: pedir el enlace y canjearlo. Públicas por
  // definición — quien las usa es justo quien no puede iniciar sesión.
  recuperar: form(`${basePath}/recuperar`),
  restablecer: form(`${basePath}/restablecer`),
  // Confirmación del correo nuevo. Pública porque el enlace llega por correo,
  // y con POST propio: el GET solo muestra el botón (ver el controller).
  confirmarCorreo: form(`${basePath}/confirmar-correo`),
  // Imágenes que sube el administrador en Personalización. Viven en el
  // backend, al que el navegador no llega: esta ruta las proxea bajo el
  // prefijo público, igual que los adjuntos del panel.
  marca: get(`${basePath}/marca/*path`),
  participationLogin: get(`${basePath}/participation/login`),
  logout: post(`${basePath}/logout`),
  participation: form(`${basePath}/participation`),
  // Descarga del acuse en PDF con el enlace firmado que recibe quien acaba de participar.
  acuse: get(`${basePath}/participation/acuse/:folio`),
  // Información y avances del Programa (POETDUM). Cada actividad se registra
  // una vez en el panel y aparece sola donde corresponde según su estado.
  poetdum: {
    show: get(`${basePath}/poetdum`),
    avances: get(`${basePath}/poetdum/avances`),
    calendario: get(`${basePath}/poetdum/calendario`),
    seguimiento: get(`${basePath}/poetdum/seguimiento`),
    // Proxy de los archivos de las actividades (el navegador no llega al
    // backend; el patrón del repo es proxear con backendFetch).
    archivo: get(`${basePath}/poetdum/archivos/:aid`),
    actividades: {
      // Todas las próximas actividades («Ver todas las actividades»).
      show: get(`${basePath}/poetdum/actividades`),
      detalle: get(`${basePath}/poetdum/actividades/:id`),
      // Enlaces de versiones anteriores: los ids se conservaron al migrar,
      // así que redirigen al archivo equivalente.
      foto: get(`${basePath}/poetdum/actividades/:id/fotos/:fid`),
    },
    // Proyecto del Programa y «Participaciones y respuestas»: los PDF que el área
    // responsable publicó. El navegador no llega al backend: estas rutas los proxean.
    proyectoArchivo: get(`${basePath}/poetdum/proyecto/:id/archivo`),
    participacionArchivo: get(`${basePath}/poetdum/participaciones/:folio/:documento`),
    documentos: {
      show: get(`${basePath}/poetdum/documentos`),
      archivo: get(`${basePath}/poetdum/documentos/:id/archivo`),
    },
    indicadores: { show: get(`${basePath}/poetdum/indicadores`) },
  },
  error: get(`${basePath}/error/:code`),
  errorDefault: get(`${basePath}/error`),
})

/**
 * Mapa anidado del admin (Bitácora).
 * Las rutas fijas y específicas (/nueva, /enviar, etc.) se definen antes
 * de los parámetros dinámicos (/:id) para evitar que :id capture rutas fijas.
 */
export const adminRoutes = route({
  index: get(`${basePath}/admin`),
  exportar: get(`${basePath}/admin/exportar`),
  usuarios: form(`${basePath}/admin/usuarios`),
  participacionNueva: form(`${basePath}/admin/participaciones/nueva`),
  // Registro presencial: captura asistida o formato para llenar a mano. Van antes
  // de `:id` para que este no las capture.
  presencial: get(`${basePath}/admin/participaciones/presencial`),
  // Con GET que regresa al selector: tras el POST el navegador se queda en esta dirección y recargar no debe dar 404.
  formatoNuevo: form(`${basePath}/admin/participaciones/formatos`),
  formatoPdf: get(`${basePath}/admin/participaciones/formatos/:id/pdf`),
  participaciones: get(`${basePath}/admin/participaciones`),
  participacionEnviar: form(`${basePath}/admin/participaciones/:id/enviar`),
  // Documentos PDF de la participación (oficio de respuesta, versiones públicas,
  // formato escaneado): una sola acción con varias intenciones, y el archivo aparte.
  participacionDocumentos: form(`${basePath}/admin/participaciones/:id/documentos`),
  participacionDocumento: get(`${basePath}/admin/participaciones/:id/documentos/:tipo/archivo`),
  participacionResolver: form(`${basePath}/admin/participaciones/:id/resolucion`),
  word: get(`${basePath}/admin/participaciones/:id/word`),
  // Acuse en PDF de una participación, para imprimirlo e integrarlo al expediente.
  participacionAcuse: get(`${basePath}/admin/participaciones/:id/acuse`),
  adjunto: get(`${basePath}/admin/participaciones/:id/adjuntos/:aid`),
  adjuntoVista: get(`${basePath}/admin/participaciones/:id/adjuntos/:aid/vista`),
  participacionDetalle: get(`${basePath}/admin/participaciones/:id`),
  // «Actividades y avances del Programa»: sustituye a los apartados separados
  // de avisos, reuniones, sesiones POEL, actividades y documentos.
  actividades: form(`${basePath}/admin/actividades`),
  actividadNueva: form(`${basePath}/admin/actividades/nueva`),
  actividadEditar: form(`${basePath}/admin/actividades/:id`),
  indicadores: form(`${basePath}/admin/indicadores`),
  // Inicio y cierre de la consulta pública.
  consulta: form(`${basePath}/admin/consulta`),
  // Documentos del Proyecto del Programa: una acción con varias intenciones y el archivo aparte.
  proyecto: form(`${basePath}/admin/consulta/proyecto`),
  proyectoArchivo: get(`${basePath}/admin/consulta/proyecto/:id/archivo`),
  estadisticas: get(`${basePath}/admin/estadisticas`),
  sesiones: get(`${basePath}/admin/sesiones`),
  // Aviso de presencia que manda `public/presencia.js` mientras la persona tiene el
  // panel a la vista: es lo que mide el tiempo de uso en el registro de sesiones.
  // La ruta lleva `/api/` a propósito: `server.ts` convierte en página de error
  // cualquier respuesta no exitosa que no sea de una ruta `/api/`, y el script
  // necesita ver el 401 tal cual para dejar de avisar cuando la sesión terminó.
  latido: post(`${basePath}/admin/api/sesion/latido`),
  cuenta: form(`${basePath}/admin/cuenta`),
  cuentaAvatar: get(`${basePath}/admin/cuenta/avatar`),
  personalizacion: form(`${basePath}/admin/personalizacion`),
  personalizacionTextos: form(`${basePath}/admin/personalizacion/textos`),
})
