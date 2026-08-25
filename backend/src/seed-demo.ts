import { sql } from './db/pool.ts'
import { createReunion } from './services/reuniones.ts'
import { createAviso } from './services/avisos.ts'
import { createPoelSesion } from './services/poel.ts'
import { createParticipation } from './services/participations.ts'
import { nextFolio } from './services/folio.ts'

/**
 * Datos reales de demostración (idempotente por correo/folio único).
 * Solo inserta si la tabla está vacía en su categoría, para no duplicar.
 */
export async function seedDemoData(): Promise<void> {
  // Sesiones POEL
  const poelCount = await sql<{ n: string }[]>`SELECT count(*)::text AS n FROM poel_sesiones`
  if (Number(poelCount[0].n) === 0) {
    const sesiones: Array<[string, number, string, string, string, string]> = [
      [
        'Presentación',
        1,
        'Presentación del Programa',
        'Contexto y objetivos del POEL',
        '2026-08-25',
        'Salón de Cabildo',
      ],
      [
        'Diagnóstico',
        2,
        'Diagnóstico territorial',
        'Análisis del uso de suelo actual',
        '2026-08-26',
        'Centro Municipal',
      ],
      [
        'Sesión ciudadana',
        3,
        'Foro ciudadano',
        'Aportaciones de la ciudadanía',
        '2026-08-27',
        'Plaza Principal',
      ],
      [
        'Taller',
        4,
        'Taller de escenarios',
        'Construcción de escenarios futuros',
        '2026-08-28',
        'Casa de la Cultura',
      ],
    ]
    for (const [c, o, t, d, f, u] of sesiones)
      await createPoelSesion({
        categoria: c,
        orden: o,
        titulo: t,
        descripcion: d,
        fecha: f,
        ubicacion: u,
      })
    console.log('[seed] POEL: 4 sesiones')
  }

  // Avisos
  const avisosCount = await sql<{ n: string }[]>`SELECT count(*)::text AS n FROM avisos`
  if (Number(avisosCount[0].n) === 0) {
    await createAviso({
      titulo: 'Convocatoria a la sesión pública',
      descripcion: 'Se invita a la ciudadanía a participar en la sesión pública del 28 de agosto.',
    })
    await createAviso({
      titulo: 'Período de consulta',
      descripcion:
        'El borrador del Programa está disponible para consulta del 1 al 30 de septiembre.',
    })
    console.log('[seed] Avisos: 2')
  }

  // Reuniones
  const reunionesCount = await sql<{ n: string }[]>`SELECT count(*)::text AS n FROM reuniones`
  if (Number(reunionesCount[0].n) === 0) {
    await createReunion({
      titulo: 'Sesión POEL agosto',
      fecha: '2026-08-24',
      horaInicio: '10:00',
      horaFin: '12:30',
    })
    await createReunion({
      titulo: 'Mesa técnica de diagnóstico',
      fecha: '2026-08-20',
      horaInicio: '09:00',
      horaFin: '13:00',
    })
    console.log('[seed] Reuniones: 2')
  }

  // Participaciones con métricas (solo si no hay con fuente/sexo aún)
  const metricCount = await sql<{ n: string }[]>`
    SELECT count(*)::text AS n FROM participations WHERE fuente <> '' OR genero <> ''
  `
  if (Number(metricCount[0].n) === 0) {
    const muestras: Array<[string, string, string, string, string, string, string]> = [
      [
        'digital',
        'Danya Michelle Hernández Madrid',
        'Persona ciudadana',
        'Mujer',
        'Servicios Ambientales',
        'Procedente',
        'Propuesta para conservar el parque central y reducir la erosión.',
      ],
      [
        'digital',
        'Sebastián González',
        'Persona ciudadana',
        'Hombre',
        'Desarrollo urbano y gestión de suelo',
        'En proceso',
        'Solicitud de revisión del uso de suelo en la zona norte.',
      ],
      [
        'digital',
        'María Fernanda López',
        'Empresa',
        'Mujer',
        'Servicios Ambientales',
        'No procedente',
        'Estudio de impacto ambiental para bodega logística.',
      ],
      [
        'digital',
        'Jorge Ramírez',
        'Organización',
        'Hombre',
        'Gestión del Agua',
        'Procedente',
        'Propuesta de captación pluvial en la escuela primaria.',
      ],
      [
        'digital',
        'Lucía Herrera',
        'Dependencia',
        'Mujer',
        'Gestión de Riesgo',
        'Procedente',
        'Plan de evacuación por inundaciones en la ribera.',
      ],
      [
        'fisica',
        'Administrador Municipal',
        'Dependencia',
        'Otro',
        'Infraestructura',
        'En proceso',
        'Registro de vialidad para el corredor industrial.',
      ],
      [
        'fisica',
        'Carlos Mendoza',
        'Empresa',
        'Hombre',
        'Equipamiento',
        'No procedente',
        'Inspección técnica de obra en predio no autorizado.',
      ],
    ]
    for (const [origen, nombre, fuente, genero, tematica, estado, obs] of muestras) {
      const folio = await nextFolio()
      await createParticipation(
        {
          origen: origen as 'digital' | 'fisica',
          nombre,
          correo: nombre.toLowerCase().replace(/[^a-z]+/g, '.') + '@example.com',
          municipio: 'Tlaquepaque',
          colonia: 'Centro',
          observacion: obs,
          estado: estado as 'Procedente' | 'En proceso' | 'No procedente',
          fuente,
          genero,
          tematica,
        },
        folio,
      )
    }
    console.log('[seed] Participaciones con métricas: 7')
  }
}
