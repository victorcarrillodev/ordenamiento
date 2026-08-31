import { email, maxLength, minLength } from 'remix/data-schema/checks'
import * as s from 'remix/data-schema'
import * as f from 'remix/data-schema/form-data'

export interface AdminFormErrors {
  nombre?: string
  correo?: string
  calle?: string
  colonia?: string
  municipio?: string
  cp?: string
  observacion?: string
}

const CALLE_MIN_MSG = 'Indica una calle válida (entre 3 y 200 caracteres)'

/**
 * Validación server-side del formulario admin de alta física.
 *
 * `nombre`, `correo` y `observacion` son obligatorios. El resto de campos de
 * domicilio (calle, colonia, municipio, cp) se validan sólo cuando vienen
 * presentes: el alta admin permite dejar vacío el municipio del aporte, que el
 * controller sustituye por el default «San Pedro Tlaquepaque».
 */
export const adminSchema = f.object({
  nombre: f.field(s.string().pipe(minLength(2))),
  correo: f.field(s.string().pipe(email())),
  domicilio: f.field(s.defaulted(s.string(), '')),
  municipio_participante: f.field(s.defaulted(s.string(), '')),
  institucion: f.field(s.defaulted(s.string(), '')),
  ocupacion: f.field(s.defaulted(s.string(), '')),
  calle: f.field(
    s
      .defaulted(s.string(), '')
      .pipe(maxLength(200))
      .refine((v) => v === '' || v.trim().length >= 3, CALLE_MIN_MSG),
  ),
  colonia: f.field(
    s
      .defaulted(s.string(), '')
      .refine((v) => v.trim().length === 0 || v.trim().length >= 2, 'Indica tu colonia'),
  ),
  municipio: f.field(
    s
      .defaulted(s.string(), '')
      .refine((v) => v.trim().length === 0 || v.trim().length >= 2, 'Indica tu municipio'),
  ),
  cp: f.field(
    s
      .defaulted(s.string(), '')
      .refine((v) => v === '' || /^\d{5}$/.test(v), 'El código postal debe tener 5 dígitos'),
  ),
  direccion_origen: f.field(s.defaulted(s.string(), '')),
  latitud: f.field(s.defaulted(s.string(), '')),
  longitud: f.field(s.defaulted(s.string(), '')),
  observacion: f.field(s.string().pipe(minLength(10))),
  fuente: f.field(s.defaulted(s.string(), '')),
  genero: f.field(s.defaulted(s.string(), '')),
  tematica: f.field(s.defaulted(s.string(), '')),
})

export function toAdminFormErrors(issues?: readonly s.Issue[]): AdminFormErrors {
  const errors: AdminFormErrors = {}
  for (const issue of issues ?? []) {
    const key = issue.path?.[0] as keyof AdminFormErrors | undefined
    if (key && !errors[key]) {
      errors[key] = issue.message
    }
  }
  return errors
}
