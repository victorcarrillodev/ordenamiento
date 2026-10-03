/**
 * Lo que dibuja la pantalla «Consulta pública»: la etapa y los documentos del
 * Proyecto del Programa. Lo usan la vista y las acciones que la vuelven a dibujar
 * tras un error.
 */
import { fetchJsonOr } from '../../backend.ts'
import { PROYECTO_VACIO, type ProyectoPublico } from '../../data/proyecto.ts'
import type { EstadoConsultaAdmin } from './consulta-page.tsx'

export const ESTADO_VACIO: EstadoConsultaAdmin = { etapa: 'pendiente', inicio: null, cierre: null }

export async function datosDeConsulta(request: Request): Promise<{
  estado: EstadoConsultaAdmin
  proyecto: ProyectoPublico
}> {
  const [estado, proyecto] = await Promise.all([
    fetchJsonOr<EstadoConsultaAdmin>(request, '/api/consulta', ESTADO_VACIO),
    fetchJsonOr<ProyectoPublico>(request, '/api/proyecto/gestion', PROYECTO_VACIO),
  ])
  return { estado, proyecto: { ...PROYECTO_VACIO, ...proyecto } }
}
