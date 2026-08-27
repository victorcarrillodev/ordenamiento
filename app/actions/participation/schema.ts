import { email, minLength } from 'remix/data-schema/checks'
import * as s from 'remix/data-schema'
import * as f from 'remix/data-schema/form-data'

export interface FormErrors {
  nombre?: string
  email?: string
  calle?: string
  colonia?: string
  municipio?: string
  cp?: string
  institucion?: string
  observacion?: string
  consentimiento?: string
  archivos?: string
}

/**
 * Lo que el ciudadano escribió, para repintarlo cuando el envío no prospera.
 *
 * No incluye los adjuntos: el navegador no permite repoblar un input de tipo
 * file, así que esos hay que volver a seleccionarlos.
 */
export interface FormValues {
  nombre?: string
  email?: string
  calle?: string
  colonia?: string
  municipio?: string
  cp?: string
  direccion_origen?: string
  institucion?: string
  observacion?: string
  consentimiento?: boolean
}

const CAMPOS_DE_TEXTO = [
  'nombre',
  'email',
  'calle',
  'colonia',
  'municipio',
  'cp',
  'direccion_origen',
  'institucion',
  'observacion',
] as const

/** Rescata del envío fallido lo que se pueda volver a pintar en el formulario. */
export function toFormValues(formData: FormData): FormValues {
  const values: FormValues = {}
  for (const campo of CAMPOS_DE_TEXTO) {
    const valor = formData.get(campo)
    if (typeof valor === 'string' && valor !== '') values[campo] = valor
  }
  values.consentimiento = formData.get('consentimiento') === '1'
  return values
}

export const participationSchema = f.object({
  nombre: f.field(s.string().pipe(minLength(2))),
  email: f.field(s.string().pipe(email())),
  calle: f.field(s.defaulted(s.string(), '')),
  colonia: f.field(s.string().pipe(minLength(2))),
  municipio: f.field(s.string().pipe(minLength(2))),
  cp: f.field(s.defaulted(s.string(), '')),
  direccion_origen: f.field(s.defaulted(s.string(), 'manual')),
  institucion: f.field(s.defaulted(s.string(), '')),
  observacion: f.field(s.string().pipe(minLength(10))),
  consentimiento: f.field(
    s
      .string()
      .refine(
        (v) => v === '1',
        'Debes aceptar el aviso de privacidad para enviar tu participación',
      ),
  ),
})

export function toFormErrors(issues?: readonly s.Issue[]): FormErrors {
  const errors: FormErrors = {}
  for (const issue of issues ?? []) {
    const key = issue.path?.[0] as keyof FormErrors | undefined
    if (key && !errors[key]) {
      errors[key] = issue.message
    }
  }
  return errors
}

export function errorMap(ctx: s.ErrorMapContext): string | undefined {
  const field = ctx.path?.[0]
  if (ctx.code === 'string.min_length') {
    if (field === 'nombre') return 'El nombre debe tener al menos 2 caracteres'
    if (field === 'colonia') return 'Indica tu colonia'
    if (field === 'municipio') return 'Indica tu municipio'
    if (field === 'observacion') return 'La observación debe tener al menos 10 caracteres'
  }
  if (ctx.code === 'string.email' || ctx.code === 'string.format') {
    return 'Ingresa un correo electrónico válido'
  }
  if (ctx.code === 'type.string') {
    if (field === 'consentimiento') {
      return 'Debes aceptar el aviso de privacidad para enviar tu participación'
    }
    return 'Este campo es obligatorio'
  }
}
