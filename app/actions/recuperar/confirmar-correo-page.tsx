/**
 * Confirmar correo — pantalla a la que lleva el enlace del mensaje.
 *
 * Muestra un botón en vez de aplicar el cambio al abrirse: los antivirus y los
 * previsualizadores de enlaces de muchos clientes de correo visitan las URL de
 * los mensajes, y un GET que consumiera el token lo quemaría antes de que la
 * persona llegara a verlo.
 */
import type { Handle } from 'remix/ui'

import { routes } from '../../routes.ts'
import { Button } from '../../ui/button.tsx'
import { AuthShell } from '../../ui/login/auth-shell.tsx'
import type { LoginAlert as LoginAlertType } from '../../ui/login/types.ts'

export interface ConfirmarCorreoPageProps {
  token?: string
  alert?: LoginAlertType
  /** El enlace ya no sirve: se ofrece la salida en vez del botón. */
  invalido?: boolean
  /** Cambio aplicado: se muestra el acuse y el acceso al portal. */
  confirmado?: string
}

export function ConfirmarCorreoPage(handle: Handle<ConfirmarCorreoPageProps>) {
  return () => {
    const { token, alert, invalido, confirmado } = handle.props

    const encabezado = confirmado
      ? 'Correo confirmado'
      : invalido
        ? 'Enlace no válido'
        : 'Confirma tu correo'

    return (
      <AuthShell
        documentTitle="Confirmar correo – Portal de Ordenamiento Ecológico"
        description="Confirma la dirección de correo nueva de tu cuenta del Portal de Ordenamiento Ecológico."
        heading={encabezado}
        subtitle={
          confirmado
            ? 'Ya puedes entrar con la dirección nueva'
            : invalido
              ? 'Pide el cambio otra vez desde Mi cuenta'
              : 'Un paso más para cambiar tu dirección de acceso'
        }
        alert={alert}
      >
        {confirmado ? (
          <div class="login__notice">
            <p class="login__notice-text">
              A partir de ahora inicia sesión con <strong>{confirmado}</strong>. Avisamos también a
              tu dirección anterior, por si el cambio no lo pediste tú.
            </p>
            <div class="login__actions">
              <Button href={routes.login.index.href()} variant="primary" fullWidth>
                Iniciar sesión
              </Button>
            </div>
          </div>
        ) : invalido ? (
          <div class="login__notice">
            <p class="login__notice-text">
              Este enlace ya venció o se usó antes. Entra con tu correo actual y vuelve a pedir el
              cambio desde <strong>Mi cuenta</strong>.
            </p>
            <div class="login__actions">
              <Button href={routes.login.index.href()} variant="primary" fullWidth>
                Volver a iniciar sesión
              </Button>
            </div>
          </div>
        ) : (
          <form
            class="login__form"
            method="POST"
            action={routes.confirmarCorreo.action.href()}
            noValidate
          >
            <input type="hidden" name="token" value={token} />
            <p class="login__intro">
              Pulsa el botón para terminar el cambio. Hasta entonces, tu cuenta sigue usando la
              dirección anterior.
            </p>
            <Button buttonType="submit" variant="primary" fullWidth class="login__submit">
              Confirmar mi correo nuevo
            </Button>
            <a class="login__forgot login__forgot--block" href={routes.login.index.href()}>
              ← Cancelar
            </a>
          </form>
        )}
      </AuthShell>
    )
  }
}
