import { sql } from './db/pool.ts'
import { migrate } from './db/migrate.ts'
import { registerUser } from './auth/auth.ts'
import { createParticipation } from './services/participations.ts'
import { nextFolio } from './services/folio.ts'
import { ingestParticipation } from './services/ingest.ts'

async function seed() {
  await migrate()

  // Usuarios: un admin y un usuario normal
  try {
    await registerUser({
      email: 'admin@tlaquepaque.gob.mx',
      name: 'Admin',
      password: 'admin123',
      role: 'admin',
    })
    console.log('[seed] admin creado')
  } catch {
    // ya existía
  }
  try {
    await registerUser({
      email: 'ciudadano@test.com',
      name: 'Ciudadano',
      password: 'user123',
      role: 'user',
    })
    console.log('[seed] usuario creado')
  } catch {
    // ya existía
  }

  const muestras = [
    {
      origen: 'digital' as const,
      nombre: 'Darina Mishelle Hernández Madrid',
      correo: 'darina@test.com',
      colonia: 'Centro',
      municipio: 'Tlaquepaque',
      institucion: '',
      ocupacion: 'Ciudadana',
      observacion:
        'Solicitud de uso de suelo para área verde en la colonia Centro. El dictamen técnico evalúa la protección de áreas verdes y la conservación de la biodiversidad según el ordenamiento ecológico territorial.',
    },
    {
      origen: 'fisica' as const,
      nombre: 'Manuel González',
      correo: 'manuel@test.com',
      colonia: 'Lomas del Sur',
      municipio: 'Tlaquepaque',
      institucion: 'Empresa Constructora',
      ocupacion: 'Ingeniero',
      observacion:
        'Estudio de impacto ambiental para cambio de uso de suelo a industria ligera. Se analizan la cercanía a zonas habitacionales, la red de drenaje municipal y el manejo de residuos sólidos.',
    },
  ]

  for (const m of muestras) {
    const folio = await nextFolio()
    const created = await createParticipation(
      {
        folio,
        origen: m.origen,
        nombre: m.nombre,
        correo: m.correo,
        colonia: m.colonia,
        municipio: m.municipio,
        institucion: m.institucion,
        ocupacion: m.ocupacion,
        observacion: m.observacion,
        creadoPor: 1,
      },
      folio,
    )
    const result = await ingestParticipation(created.participationId, {
      folio,
      nombre: m.nombre,
      colonia: m.colonia,
      municipio: m.municipio,
      institucion: m.institucion,
      ocupacion: m.ocupacion,
      observacion: m.observacion,
    })
    console.log('[seed]', folio, m.origen, '→', result.chunks, 'chunks')
  }

  const count = await sql<{ n: string }[]>`SELECT count(*)::text AS n FROM participations`
  console.log('[seed] total participaciones:', count[0].n)

  await sql.end()
}

seed()
