import { writeFileSync } from 'node:fs'
import { it } from 'vitest'
import * as s from 'remix/data-schema'
import { MAX_FILE_BYTES, MAX_FILES, MAX_TOTAL_BYTES } from '../../utils/uploads.ts'
import { participationSchema, errorMap } from './schema.ts'
import { parseParticipationForm } from './parse-with-values.ts'

function makeFd() {
  const fd = new FormData()
  fd.set('nombre', 'Límite Interno')
  fd.set('email', 'limite@ejemplo.com')
  fd.set('colonia', 'Centro')
  fd.set('municipio', 'Guadalajara')
  fd.set('observacion', 'Observación válida con suficiente longitud para el límite')
  fd.set('consentimiento', '1')
  return fd
}

it('debug direct', async () => {
  const out: Record<string, unknown> = {}
  const req = new Request('http://localhost/ordena/participation', { method: 'POST', body: makeFd() })
  const { formData } = await parseParticipationForm(
    req,
    { maxFiles: MAX_FILES, maxFileSize: MAX_FILE_BYTES, maxTotalSize: MAX_TOTAL_BYTES },
    async () => undefined,
  )
  out.keys = [...formData.keys()]
  const p = s.parseSafe(participationSchema, formData, { errorMap })
  out.success = p.success
  out.issues = p.success ? [] : p.issues.map((i) => ({ path: i.path, code: i.code, message: i.message }))
  // mimica lo que hace staticWithPrefix: new Request(sameUrl, context.request)
  const req2 = new Request('http://localhost/ordena/participation', req)
  const r2 = await parseParticipationForm(
    req2,
    { maxFiles: MAX_FILES, maxFileSize: MAX_FILE_BYTES, maxTotalSize: MAX_TOTAL_BYTES },
    async () => undefined,
  )
  out.keys2 = [...r2.formData.keys()]
  const p2 = s.parseSafe(participationSchema, r2.formData, { errorMap })
  out.success2 = p2.success
  out.issues2 = p2.success ? [] : p2.issues.map((i) => ({ path: i.path, code: i.code }))
  writeFileSync('/tmp/debug-out.txt', JSON.stringify(out, null, 2))
})
