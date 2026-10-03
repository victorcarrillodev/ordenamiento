/**
 * Cuánto dura una sesión desde que se emite: la cookie y el token vencen a los
 * 7 días, sin renovarse. Vive aparte para que la bitácora de sesiones sepa
 * cuándo una sesión ya no puede usarse sin importar `auth.ts` (que firma
 * tokens y calcula hashes al cargarse).
 */
export const DURACION_SESION_S = 60 * 60 * 24 * 7
