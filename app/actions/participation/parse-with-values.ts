/**
 * Interpreta el multipart conservando lo ya escrito cuando el parseo aborta por
 * límites de archivo (413).
 *
 * `parseFormData` (remix) consume el body y lanza sin devolver el FormData
 * parcial en cuanto un archivo excede el tamaño o el número máximo. El
 * navegador no puede repoblar un `<input type="file">`, pero sí los campos de
 * texto que ya viajaban en esa misma petición; perderlos obligaba al ciudadano
 * a reescribirlo todo. Este helper recorre los parts con `parseMultipartRequest`
 * para quedarse con ese FormData parcial y devolverlo junto al motivo del 413.
 */
import {
  FileUpload,
  MaxFilesExceededError,
  MaxFileSizeExceededError,
  parseFormData,
} from 'remix/form-data-parser'
import {
  isMultipartRequest,
  parseMultipartRequest,
  type MultipartParserOptions,
} from 'remix/multipart-parser'

export type LimitErrorKind = 'maxfiles' | 'maxfilesize'

export interface ParticipationParseResult {
  formData: FormData
  /** Límite de archivos que abortó el parseo, si hubo 413. */
  limitError?: LimitErrorKind
}

export interface ParseParticipationOptions {
  maxFiles: number
  maxFileSize: number
  maxTotalSize: number
}

/**
 * Igual que `parseFormData`, pero en un 413 por límite de archivos devuelve el
 * FormData parcial (los campos de texto ya leídos) en vez de perderlo.
 */
export async function parseParticipationForm(
  request: Request,
  options: ParseParticipationOptions,
  uploadHandler: (file: FileUpload) => Promise<File | undefined>,
): Promise<ParticipationParseResult> {
  // Los límites de archivo solo aplican a multipart; el resto (url-encoded) lo
  // resuelve parseFormData sin riesgo de 413.
  if (!isMultipartRequest(request)) {
    const formData = await parseFormData(request, options, uploadHandler)
    return { formData }
  }

  const formData = new FormData()
  let fileCount = 0
  const parserOptions: MultipartParserOptions = {
    maxFileSize: options.maxFileSize,
    maxTotalSize: options.maxTotalSize,
  }

  try {
    for await (const part of parseMultipartRequest(request, parserOptions)) {
      const fieldName = part.name
      if (!fieldName) continue
      if (part.isFile) {
        if (++fileCount > options.maxFiles) throw new MaxFilesExceededError(options.maxFiles)
        const value = await uploadHandler(new FileUpload(part, fieldName))
        if (value != null) formData.append(fieldName, value)
      } else {
        formData.append(fieldName, part.text)
      }
    }
    return { formData }
  } catch (error) {
    if (error instanceof MaxFileSizeExceededError) return { formData, limitError: 'maxfilesize' }
    if (error instanceof MaxFilesExceededError) return { formData, limitError: 'maxfiles' }
    throw error
  }
}
