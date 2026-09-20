import { sql } from './db/pool.ts'
import { crearActividad, hoyEnMexico, validarActividad } from './services/actividades.ts'
import { createParticipation } from './services/participations.ts'
import { nextFolio } from './services/folio.ts'

/**
 * Datos reales de demostración (idempotente por correo/folio único).
 * Solo inserta si la tabla está vacía en su categoría, para no duplicar.
 */
export async function seedDemoData(): Promise<void> {
  // Actividades y avances del Programa: una muestra del flujo completo
  // (realizadas en avances, programadas en el calendario, un aviso vigente).
  const actividadesCount = await sql<{ n: string }[]>`SELECT count(*)::text AS n FROM actividades`
  if (Number(actividadesCount[0].n) === 0) {
    const hoy = hoyEnMexico()
    const dia = (desplazamiento: number) => {
      const [a, m, d] = hoy.split('-').map(Number)
      return new Date(Date.UTC(a, m - 1, d + desplazamiento)).toISOString().slice(0, 10)
    }
    const muestras: Array<Record<string, string>> = [
      {
        titulo: 'Firma del convenio de coordinación con SEMADET',
        fase: 'Formulación',
        tipo: 'Firma de convenio',
        estado: 'realizada',
        fecha: dia(-120),
        hora_inicio: '11:00',
        lugar: 'Palacio Municipal',
        descripcion:
          'Firma del convenio de coordinación para la elaboración del Programa de Ordenamiento Ecológico Territorial y de Desarrollo Urbano.',
        resultados: 'Convenio firmado por el Municipio y la SEMADET.',
        acuerdos: 'Integrar el Comité de Ordenamiento Ecológico en los siguientes 60 días.',
      },
      {
        titulo: 'Instalación del Comité de Ordenamiento Ecológico',
        fase: 'Formulación',
        tipo: 'Sesión del Comité',
        estado: 'realizada',
        fecha: dia(-60),
        hora_inicio: '10:00',
        hora_fin: '12:00',
        lugar: 'Salón de Cabildo',
        descripcion: 'Sesión de instalación del Comité y aprobación de su programa de trabajo.',
        resultados: 'Comité instalado con 18 integrantes.',
        acuerdos: 'Aprobado el calendario de sesiones ordinarias.',
      },
      {
        titulo: 'Taller sectorial de diagnóstico',
        fase: 'Formulación',
        tipo: 'Taller',
        estado: 'realizada',
        fecha: dia(-30),
        hora_inicio: '09:00',
        hora_fin: '13:00',
        lugar: 'Casa de la Cultura',
        descripcion: 'Diagnóstico del territorio con los sectores productivo, social y académico.',
        resultados: 'Se identificaron 12 zonas prioritarias para conservación.',
      },
      {
        titulo: 'Segunda sesión ordinaria del Comité',
        fase: 'Formulación',
        tipo: 'Sesión del Comité',
        estado: 'programada',
        fecha: dia(7),
        hora_inicio: '10:00',
        hora_fin: '12:00',
        lugar: 'Salón de Cabildo',
        descripcion: 'Revisión de la caracterización y el diagnóstico del territorio.',
      },
      {
        titulo: 'Foro de consulta pública',
        fase: 'Formulación',
        tipo: 'Consulta pública',
        estado: 'programada',
        fecha: dia(14),
        hora_inicio: '17:00',
        hora_fin: '19:00',
        lugar: 'Centro Cultural El Refugio',
        descripcion: 'Presentación de la propuesta del Programa y recepción de observaciones.',
        aviso_activo: '1',
        aviso_titulo: 'Apertura de la consulta pública',
        aviso_descripcion:
          'Participa en el foro de consulta pública y presenta tus observaciones y propuestas.',
        aviso_inicio: hoy,
        aviso_fin: dia(14),
      },
      {
        titulo: 'Sesión de Cabildo para la aprobación del Programa',
        fase: 'Expedición',
        tipo: 'Sesión de Cabildo',
        estado: 'programada',
        fecha: dia(45),
        hora_inicio: '12:00',
        lugar: 'Salón de Cabildo',
        descripcion:
          'Presentación del proyecto del Programa para su análisis y, en su caso, aprobación.',
      },
    ]
    for (const muestra of muestras) {
      const validacion = validarActividad(muestra, hoy)
      if (!validacion.ok) throw new Error(`[seed] actividad inválida: ${validacion.error}`)
      await crearActividad(sql, validacion.datos, [], null)
    }
    console.log(`[seed] Actividades: ${muestras.length}`)
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
