import type { Handle } from 'remix/ui'

import { adminRoutes } from '../../routes.ts'
import { AdminLayout } from '../../ui/admin/admin-layout.tsx'

export interface CuentaPageProps {
  user: { name: string; role: string }
  profile?: { name?: string; email?: string; role?: string; created_at?: string; avatar_ruta?: string } | null
  ok?: string | null
  error?: string | null
}

function iniciales(name?: string | null): string {
  if (!name) return '?'
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase()
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase()
}

export function CuentaPage(handle: Handle<CuentaPageProps>) {
  return () => {
    const { user, profile, ok, error } = handle.props
    const displayName = profile?.name ?? user.name
    const displayEmail = profile?.email ?? '—'
    const displayRole = profile?.role ?? user.role
    const createdAt = profile?.created_at
      ? new Date(profile.created_at).toLocaleDateString('es-MX')
      : '—'
    const hasAvatar = Boolean(profile?.avatar_ruta)

    return (
      <AdminLayout user={user} active="cuenta" title="Mi cuenta">
        <h1 class="page-title">Mi cuenta</h1>
        <p class="breadcrumb">
          <a href={adminRoutes.index.href()}>Vista general</a> / Mi cuenta
        </p>

        {ok === 'avatar' && (
          <div class="panel" style="border-left:4px solid #16a34a; background:#f0fdf4;">
            Foto actualizada
          </div>
        )}
        {error === 'avatar' && (
          <div class="panel" style="border-left:4px solid #dc2626; background:#fef2f2;">
            No se pudo actualizar (JPG, PNG, WEBP o GIF, máx. 5 MB)
          </div>
        )}

        <div class="panel">
          <h2 class="panel__title">Datos de la sesión</h2>
          <div style="display:flex; gap:20px; align-items:center; flex-wrap:wrap; margin-bottom:16px;">
            {hasAvatar ? (
              <img
                src={adminRoutes.cuentaAvatar.href()}
                alt="Foto de perfil"
                style="width:96px; height:96px; border-radius:50%; object-fit:cover; border:2px solid #e2e8f0;"
              />
            ) : (
              <div
                style="width:96px; height:96px; border-radius:50%; background:#64748b; color:#fff; display:flex; align-items:center; justify-content:center; font-size:32px; font-weight:700;"
              >
                {iniciales(displayName)}
              </div>
            )}
            <div>
              <p>
                Nombre: <strong>{displayName ?? '—'}</strong>
              </p>
              <p>
                Correo: <strong>{displayEmail}</strong>
              </p>
              <p>
                Rol:{' '}
                <span class={'badge ' + (displayRole === 'admin' ? 'procedente' : 'en-proceso')}>
                  {displayRole === 'admin' ? 'Administrador' : 'Usuario'}
                </span>
              </p>
              <p>
                Miembro desde: <strong>{createdAt}</strong>
              </p>
            </div>
          </div>

          <form
            method="post"
            action={adminRoutes.cuenta.action.href()}
            encType="multipart/form-data"
            style="margin-top:12px;"
          >
            <input type="hidden" name="intent" value="avatar" />
            <div class="form-field" style="margin-bottom:10px;">
              <label for="avatar">Foto de perfil (JPG, PNG, WEBP o GIF, máx. 5 MB)</label>
              <input id="avatar" name="avatar" type="file" accept="image/*" required />
            </div>
            <button type="submit" class="btn btn--dark">
              Subir foto
            </button>
          </form>
        </div>
      </AdminLayout>
    )
  }
}
