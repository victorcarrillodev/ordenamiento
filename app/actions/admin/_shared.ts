import { fetchJsonOr } from '../../backend.ts'

export interface Reunion {
  id: number
  titulo: string
  fecha: string
  hora_inicio: string | null
  hora_fin: string | null
}

export async function reunionesDe(request: Request): Promise<Reunion[]> {
  const data = await fetchJsonOr<{ reuniones: Reunion[] }>(request, '/api/reuniones', {
    reuniones: [],
  })
  return data.reuniones
}
