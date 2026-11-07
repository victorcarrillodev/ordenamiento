/** Genera ejemplos desde el mismo HTML que se envía, sin SMTP ni datos personales reales. */
import { mkdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { renderCorreoAcuse, renderCorreoRespuesta } from '../backend/src/services/mail.ts'
import type { DatosParticipacion } from '../backend/src/services/acuse-datos.ts'

const destino = join(process.cwd(), 'artifacts', 'correos')
await mkdir(destino, { recursive: true })
const muestra: DatosParticipacion = {
  id: 'vista-previa',
  folio: 'SPAGU-DGTPU-E-0001',
  origen: 'digital',
  nombre: 'Persona de ejemplo',
  correo: 'persona@example.com',
  fechaRecepcion: new Date('2026-11-07T16:00:00Z'),
  alcance_ubicacion: 'municipio',
  calle: '',
  colonia: '',
  codigo_postal: '',
  institucion: 'Participación individual',
  tematica: 'Medio ambiente',
  tematica_otra: '',
  observacion:
    'Proponemos conservar las áreas verdes y mejorar la conexión peatonal entre los espacios públicos de San Pedro Tlaquepaque.',
  adjuntos: ['Propuesta ciudadana.pdf'],
  estado: 'En proceso',
  fuente: 'Ciudadanía',
  fuente_otra: '',
  genero: 'Prefiero no decir',
  domicilio: 'Dato de ejemplo',
  municipio_participante: 'San Pedro Tlaquepaque',
  ocupacion: '',
}
await writeFile(join(destino, 'acuse.html'), renderCorreoAcuse(muestra))
await writeFile(join(destino, 'respuesta.html'), renderCorreoRespuesta({ folio: muestra.folio }))
await writeFile(
  join(destino, 'index.html'),
  `<!doctype html><html lang="es"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Vista previa de los correos</title><style>body{margin:0;background:#edf0f5;color:#243449;font:16px Arial,sans-serif}header{padding:28px 32px;background:#681a36;color:white;border-bottom:5px solid #b28b46}h1{margin:0 0 10px}nav{display:flex;gap:20px;margin:20px 0}a{color:#741c3c}main{padding:20px 32px}.ejemplos{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,350px),1fr));gap:24px}iframe{width:100%;height:900px;border:1px solid #dce2eb;border-radius:14px;background:white}</style><header><h1>Así se verán los correos</h1>Ejemplos con datos ficticios · El mismo HTML que utiliza Ordena.</header><main><nav><a href="acuse.html">Abrir acuse completo</a><a href="respuesta.html">Abrir respuesta completa</a></nav><div class="ejemplos"><section><h2>Acuse de recepción</h2><iframe title="Correo de acuse de recepción" src="acuse.html"></iframe></section><section><h2>Respuesta a la participación</h2><iframe title="Correo de respuesta" src="respuesta.html"></iframe></section></div><p>La apariencia final puede variar entre Gmail, Outlook y otros lectores. Esta vista previa no envía correos.</p></main></html>`,
)
console.log(`Vista previa generada: ${destino}`)
