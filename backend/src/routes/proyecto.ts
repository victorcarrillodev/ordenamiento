/**
 * Proyecto del Programa: el documento técnico y los documentos gráficos de la
 * consulta pública, en PDF.
 *
 *  · `GET    /api/proyecto`                          pública: lo que el portal muestra. Con la consulta
 *                                                    pendiente no entrega nada: el apartado está oculto.
 *  · `GET    /api/proyecto/gestion`                  admin: todos los documentos, esté o no visible el apartado
 *  · `GET    /api/proyecto/documentos/:id/archivo`   el PDF (`?download=1` lo descarga): público con la
 *                                                    consulta abierta o concluida; el panel siempre
 *  · `POST   /api/proyecto/documentos`               admin: carga varios PDF (multipart: seccion, archivo…, titulo…)
 *  · `PATCH  /api/proyecto/documentos/:id`           admin: `{ titulo }`
 *  · `POST   /api/proyecto/documentos/:id/mover`     admin: `{ direccion: "arriba" | "abajo" }`
 *  · `DELETE /api/proyecto/documentos/:id`           admin
 */
import { puedeEntrarAlPanel } from '../auth/roles.ts'
import { MAX_FILE_BYTES, MAX_TOTAL_BYTES } from '../files/limits.ts'
import { servirPdf } from '../files/servir-pdf.ts'
import { leerEstadoConsulta } from '../services/consulta.ts'
import {
  borrarArchivoDeDisco,
  escribirPdf,
  validarPdf,
} from '../services/documentos-participacion.ts'
import {
  agregarDocumentos,
  contarSeccion,
  eliminarDocumentoProyecto,
  esSeccionProyecto,
  limpiarTitulo,
  listarProyecto,
  MAX_DOCUMENTOS_POR_ENVIO,
  MAX_DOCUMENTOS_POR_SECCION,
  moverDocumento,
  obtenerArchivoProyecto,
  renombrarDocumento,
  tituloDeArchivo,
  type DocumentoProyecto,
  type NuevoDocumentoProyecto,
} from '../services/proyecto.ts'
import { sql } from '../db/pool.ts'
import { bodyTooLarge, json, logger } from '../utils.ts'
import { exigirAdmin, matchPath, uuidInvalido, type ManejadorRuta } from './ruta.ts'

const porSeccion = (docs: DocumentoProyecto[]) => ({
  tecnico: docs.filter((d) => d.seccion === 'tecnico'),
  grafico: docs.filter((d) => d.seccion === 'grafico'),
})

export const rutasProyecto: ManejadorRuta = async (ctx) => {
  const { pathname } = ctx.url

  if (pathname === '/api/proyecto' && ctx.method === 'GET') {
    const { etapa } = await leerEstadoConsulta()
    // Antes de iniciar la consulta el apartado no existe para el público: ni títulos ni nada.
    if (etapa === 'pendiente') return json({ visible: false, etapa, tecnico: [], grafico: [] })
    return json({ visible: true, etapa, ...porSeccion(await listarProyecto()) })
  }

  if (pathname === '/api/proyecto/gestion' && ctx.method === 'GET') {
    const prohibido = exigirAdmin(ctx)
    if (prohibido) return prohibido
    const { etapa } = await leerEstadoConsulta()
    return json({ visible: etapa !== 'pendiente', etapa, ...porSeccion(await listarProyecto()) })
  }

  const archivo =
    ctx.method === 'GET' ? matchPath(pathname, '/api/proyecto/documentos/:id/archivo') : null
  if (archivo) {
    const invalido = uuidInvalido(archivo.id)
    if (invalido) return invalido
    // El panel puede ver todo para revisarlo antes de que inicie la consulta.
    if (!puedeEntrarAlPanel(ctx.user?.role)) {
      const { etapa } = await leerEstadoConsulta()
      if (etapa === 'pendiente') return json({ error: 'No encontrado' }, 404)
    }
    const doc = await obtenerArchivoProyecto(archivo.id)
    if (!doc) return json({ error: 'No encontrado' }, 404)
    return servirPdf({
      ruta: doc.ruta,
      nombre: doc.nombre,
      descarga: ctx.url.searchParams.get('download') === '1',
    })
  }

  if (pathname === '/api/proyecto/documentos' && ctx.method === 'POST') {
    const prohibido = exigirAdmin(ctx)
    if (prohibido) return prohibido
    return cargar(ctx.request, ctx.user!.id)
  }

  const uno = matchPath(pathname, '/api/proyecto/documentos/:id')
  const mover =
    ctx.method === 'POST' ? matchPath(pathname, '/api/proyecto/documentos/:id/mover') : null
  const coincide =
    mover ?? (uno && (ctx.method === 'PATCH' || ctx.method === 'DELETE') ? uno : null)
  if (!coincide) return null

  const prohibido = exigirAdmin(ctx)
  if (prohibido) return prohibido
  const invalido = uuidInvalido(coincide.id)
  if (invalido) return invalido

  if (mover) {
    const cuerpo = (await ctx.request.json().catch(() => ({}))) as { direccion?: unknown }
    if (cuerpo.direccion !== 'arriba' && cuerpo.direccion !== 'abajo') {
      return json({ error: 'direccion inválida: arriba o abajo' }, 400)
    }
    return (await moverDocumento(coincide.id, cuerpo.direccion))
      ? json({ ok: true })
      : json({ error: 'No encontrado' }, 404)
  }

  if (ctx.method === 'PATCH') {
    const cuerpo = (await ctx.request.json().catch(() => ({}))) as { titulo?: unknown }
    const titulo = limpiarTitulo(typeof cuerpo.titulo === 'string' ? cuerpo.titulo : '')
    if (!titulo) return json({ error: 'Escribe el nombre con que se presenta el documento' }, 422)
    return (await renombrarDocumento(coincide.id, titulo))
      ? json({ ok: true, titulo })
      : json({ error: 'No encontrado' }, 404)
  }

  return (await eliminarDocumentoProyecto(coincide.id))
    ? json({ ok: true })
    : json({ error: 'No encontrado' }, 404)
}

/** Carga uno o varios PDF a una sección; si alguno no es válido no se guarda ninguno. */
async function cargar(request: Request, subidoPor: string): Promise<Response> {
  if (bodyTooLarge(request, MAX_TOTAL_BYTES + 1024 * 1024)) {
    return json({ error: 'El envío supera el tamaño máximo permitido' }, 413)
  }
  let form: FormData
  try {
    form = await request.formData()
  } catch {
    return json({ error: 'Formulario inválido' }, 400)
  }

  const seccion = form.get('seccion')
  if (!esSeccionProyecto(seccion)) return json({ error: 'Elige la sección del documento' }, 400)

  const archivos = form.getAll('archivo').filter((a): a is File => a instanceof File && a.size > 0)
  if (archivos.length === 0) return json({ error: 'Elige al menos un archivo PDF' }, 422)
  if (archivos.length > MAX_DOCUMENTOS_POR_ENVIO) {
    return json({ error: `Máximo ${MAX_DOCUMENTOS_POR_ENVIO} archivos por envío` }, 400)
  }
  if ((await contarSeccion(seccion)) + archivos.length > MAX_DOCUMENTOS_POR_SECCION) {
    return json(
      { error: `Cada sección admite hasta ${MAX_DOCUMENTOS_POR_SECCION} documentos` },
      409,
    )
  }
  const titulos = form.getAll('titulo').map((t) => (typeof t === 'string' ? t : ''))

  // Primero se valida todo, para no dejar una carga a medias.
  const validados: Array<{ buffer: Buffer; nombre: string; titulo: string }> = []
  for (const [i, archivo] of archivos.entries()) {
    if (archivo.size > MAX_FILE_BYTES) {
      return json({ error: `El archivo «${archivo.name}» supera el tamaño máximo permitido` }, 413)
    }
    const pdf = await validarPdf(archivo)
    if (!pdf.ok) return json({ error: `«${archivo.name}»: ${pdf.error}` }, pdf.status)
    validados.push({
      buffer: pdf.buffer,
      nombre: pdf.nombre,
      titulo: limpiarTitulo(titulos[i] ?? '') || tituloDeArchivo(pdf.nombre),
    })
  }

  const escritos: string[] = []
  try {
    const nuevos: NuevoDocumentoProyecto[] = []
    for (const v of validados) {
      const ruta = await escribirPdf(v.buffer, v.nombre)
      escritos.push(ruta)
      nuevos.push({
        seccion,
        titulo: v.titulo,
        nombreOriginal: v.nombre,
        size: v.buffer.length,
        rutaLocal: ruta,
        subidoPor,
      })
    }
    const creados = await sql.begin((tx) => agregarDocumentos(tx, nuevos))
    return json({ documentos: creados }, 201)
  } catch (err) {
    await Promise.allSettled(escritos.map((r) => borrarArchivoDeDisco(r)))
    logger.error('proyecto.cargar', err)
    return json({ error: 'No se pudieron guardar los documentos' }, 500)
  }
}
